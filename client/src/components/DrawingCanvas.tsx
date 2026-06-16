import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  type Tool, type Stroke, type Point, type CanvasState,
  uid, drawStroke, redrawCanvas, floodFill, generateThumbnail
} from "../lib/canvasEngine";

interface DrawingCanvasProps {
  tool: Tool;
  color: string;
  opacity: number;
  brushSize: number;
  canvasState: CanvasState;
  onStrokeComplete: (stroke: Stroke) => void;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  zoom: number;
  panOffset: { x: number; y: number };
  onPanChange: (delta: { x: number; y: number }) => void;
}

export interface DrawingCanvasRef {
  exportPNG: () => string;
  getThumbnail: () => string;
  getCanvas: () => HTMLCanvasElement | null;
  redraw: () => void;
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
  tool, color, opacity, brushSize, canvasState,
  onStrokeComplete, onCanvasReady, zoom, panOffset, onPanChange
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Current stroke state
  const isDrawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  const lastPoint = useRef<Point | null>(null);

  // Pan state
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lastPan = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL('image/png');
    },
    getThumbnail: () => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return generateThumbnail(canvas);
    },
    getCanvas: () => canvasRef.current,
    redraw: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      redrawCanvas(ctx, canvasState);
    }
  }));

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    redrawCanvas(ctx, canvasState);
    onCanvasReady(canvas);
  }, []);

  // Redraw when state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    redrawCanvas(ctx, canvasState);
  }, [canvasState]);

  // Get point from event (touch or mouse)
  const getPoint = useCallback((e: TouchEvent | MouseEvent | PointerEvent, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number, pressure = 0.5;

    if ('touches' in e) {
      const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
      // Use touch force if available (Apple Pencil)
      pressure = (touch as any).force ?? 0.5;
    } else if ('pressure' in e) {
      clientX = (e as PointerEvent).clientX;
      clientY = (e as PointerEvent).clientY;
      pressure = (e as PointerEvent).pressure || 0.5;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    // Convert screen coords to canvas coords accounting for zoom and pan
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = ((clientX - rect.left) * scaleX);
    const y = ((clientY - rect.top) * scaleY);

    return { x, y, pressure: Math.max(0.1, Math.min(1.0, pressure)), time: Date.now() };
  }, []);

  const startStroke = useCallback((point: Point) => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    if (tool === 'fill') {
      const ctx = canvas.getContext('2d')!;
      floodFill(ctx, point.x, point.y, color, 30);
      // Create a "fill" stroke for state tracking
      const fillStroke: Stroke = {
        id: uid(),
        tool: 'fill' as Tool,
        color,
        opacity,
        size: brushSize,
        points: [point],
        smoothing: 0.5,
      };
      onStrokeComplete(fillStroke);
      return;
    }

    const stroke: Stroke = {
      id: uid(),
      tool,
      color,
      opacity,
      size: brushSize,
      points: [point],
      smoothing: 0.5,
    };

    currentStroke.current = stroke;
    lastPoint.current = point;
    isDrawing.current = true;

    // Draw initial dot
    const octx = overlay.getContext('2d')!;
    octx.clearRect(0, 0, overlay.width, overlay.height);
    drawStroke(octx, stroke);
  }, [tool, color, opacity, brushSize, onStrokeComplete]);

  const continueStroke = useCallback((point: Point) => {
    if (!isDrawing.current || !currentStroke.current) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    // Add point with minimum distance check
    const last = lastPoint.current;
    if (last) {
      const dist = Math.hypot(point.x - last.x, point.y - last.y);
      if (dist < 1) return; // Skip tiny movements
    }

    currentStroke.current.points.push(point);
    lastPoint.current = point;

    // Redraw current stroke on overlay
    const octx = overlay.getContext('2d')!;
    octx.clearRect(0, 0, overlay.width, overlay.height);
    drawStroke(octx, currentStroke.current);
  }, []);

  const endStroke = useCallback(() => {
    if (!isDrawing.current || !currentStroke.current) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    // Clear overlay
    const octx = overlay.getContext('2d')!;
    octx.clearRect(0, 0, overlay.width, overlay.height);

    // Commit stroke
    const stroke = currentStroke.current;
    onStrokeComplete(stroke);

    isDrawing.current = false;
    currentStroke.current = null;
    lastPoint.current = null;
  }, [onStrokeComplete]);

  // Pointer events (best for Apple Pencil + mouse)
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Two finger pan
    if (e.pointerType === 'touch' && e.isPrimary === false) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      lastPan.current = panOffset;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getPoint(e.nativeEvent, canvas);
    startStroke(point);
  }, [getPoint, startStroke, panOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (isPanning.current) {
      onPanChange({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getPoint(e.nativeEvent, canvas);
    continueStroke(point);
  }, [getPoint, continueStroke, onPanChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }
    endStroke();
  }, [endStroke]);

  // Touch events for pinch-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
  }, []);

  const cursorClass =
    tool === 'eraser' ? 'canvas-erase' :
    tool === 'fill' ? 'cursor-crosshair' :
    'canvas-draw';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-[#1a1a2e] ${cursorClass}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      {/* Canvas checkerboard background (shows transparency) */}
      <div
        className="absolute"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Checkerboard pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(45deg, #ccc 25%, transparent 25%),
              linear-gradient(-45deg, #ccc 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #ccc 75%),
              linear-gradient(-45deg, transparent 75%, #ccc 75%)
            `,
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: '#fff',
            width: canvasState.width,
            height: canvasState.height,
          }}
        />

        {/* Main drawing canvas */}
        <canvas
          ref={canvasRef}
          width={canvasState.width}
          height={canvasState.height}
          style={{
            position: 'relative',
            display: 'block',
          }}
          data-testid="drawing-canvas"
        />

        {/* Overlay canvas for live stroke preview */}
        <canvas
          ref={overlayRef}
          width={canvasState.width}
          height={canvasState.height}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div
          className="absolute bottom-4 right-4 px-2 py-1 rounded text-xs font-mono bg-black/60 text-white/60"
          style={{ pointerEvents: 'none' }}
        >
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';
export default DrawingCanvas;
