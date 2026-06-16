import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tool, Stroke, CanvasState } from "../lib/canvasEngine";
import { uid, redrawCanvas, generateThumbnail } from "../lib/canvasEngine";
import DrawingCanvas, { type DrawingCanvasRef } from "../components/DrawingCanvas";
import Toolbar from "../components/Toolbar";
import Gallery from "../components/Gallery";
import type { Drawing } from "@shared/schema";
import { Save, Check } from "lucide-react";

const DEFAULT_WIDTH = 1366;
const DEFAULT_HEIGHT = 1024;

function makeEmptyState(backgroundColor = '#ffffff'): CanvasState {
  return {
    strokes: [],
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    backgroundColor,
  };
}

export default function DrawPage() {
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1a1a1a');
  const [opacity, setOpacity] = useState(1.0);
  const [brushSize, setBrushSize] = useState(6);
  const [recentColors, setRecentColors] = useState<string[]>(['#ef4444', '#3b82f6', '#22c55e', '#eab308']);

  const [canvasState, setCanvasState] = useState<CanvasState>(makeEmptyState());
  const [undoStack, setUndoStack] = useState<CanvasState[]>([makeEmptyState()]);
  const [undoIndex, setUndoIndex] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [showGallery, setShowGallery] = useState(false);
  const [currentDrawingId, setCurrentDrawingId] = useState<number | null>(null);
  const [drawingName, setDrawingName] = useState('Untitled Drawing');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const canvasRef = useRef<DrawingCanvasRef>(null);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ id, name, canvasData, thumbnail }: {
      id: number | null;
      name: string;
      canvasData: string;
      thumbnail: string;
    }) => {
      const payload = {
        name,
        thumbnail,
        canvasData,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      if (id) {
        return apiRequest('PATCH', `/api/drawings/${id}`, { ...payload, updatedAt: Date.now() });
      }
      return apiRequest('POST', `/api/drawings`, payload);
    },
    onSuccess: async (res) => {
      const data = await res.json();
      setCurrentDrawingId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/drawings'] });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
  });

  const handleStrokeComplete = useCallback((stroke: Stroke) => {
    setCanvasState(prev => {
      const newState: CanvasState = {
        ...prev,
        strokes: stroke.tool === 'fill' as Tool
          ? [...prev.strokes, stroke]
          : [...prev.strokes, stroke],
      };

      // Push to undo stack
      setUndoStack(stack => {
        const newStack = stack.slice(0, undoIndex + 1);
        newStack.push(newState);
        return newStack;
      });
      setUndoIndex(i => i + 1);

      return newState;
    });
  }, [undoIndex]);

  const handleUndo = useCallback(() => {
    if (undoIndex <= 0) return;
    const newIndex = undoIndex - 1;
    setUndoIndex(newIndex);
    setCanvasState(undoStack[newIndex]);
  }, [undoIndex, undoStack]);

  const handleRedo = useCallback(() => {
    if (undoIndex >= undoStack.length - 1) return;
    const newIndex = undoIndex + 1;
    setUndoIndex(newIndex);
    setCanvasState(undoStack[newIndex]);
  }, [undoIndex, undoStack]);

  const handleClearCanvas = useCallback(() => {
    if (!confirm('Clear the canvas? This cannot be undone.')) return;
    const fresh = makeEmptyState(canvasState.backgroundColor);
    setCanvasState(fresh);
    setUndoStack([fresh]);
    setUndoIndex(0);
  }, [canvasState.backgroundColor]);

  const handleColorChange = useCallback((newColor: string) => {
    setColor(newColor);
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== newColor);
      return [newColor, ...filtered].slice(0, 8);
    });
  }, []);

  const handleSaveLocal = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${drawingName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [drawingName]);

  const handleSaveToGallery = useCallback(async () => {
    if (saveMutation.isPending) return;
    setSaveStatus('saving');

    const canvasEl = canvasRef.current?.getCanvas();
    const thumbnail = canvasEl ? generateThumbnail(canvasEl, 400) : '';
    const canvasData = JSON.stringify(canvasState.strokes);

    saveMutation.mutate({
      id: currentDrawingId,
      name: drawingName,
      canvasData,
      thumbnail,
    });
  }, [saveMutation, canvasState, currentDrawingId, drawingName]);

  const handleNewDrawing = useCallback(() => {
    if (canvasState.strokes.length > 0) {
      if (!confirm('Start a new drawing? Current unsaved work will be lost.')) return;
    }
    const fresh = makeEmptyState();
    setCanvasState(fresh);
    setUndoStack([fresh]);
    setUndoIndex(0);
    setCurrentDrawingId(null);
    setDrawingName('Untitled Drawing');
    setShowGallery(false);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [canvasState.strokes.length]);

  const handleOpenDrawing = useCallback((drawing: Drawing) => {
    try {
      const strokes = JSON.parse(drawing.canvasData) as Stroke[];
      const state: CanvasState = {
        strokes,
        width: drawing.width,
        height: drawing.height,
        backgroundColor: '#ffffff',
      };
      setCanvasState(state);
      setUndoStack([state]);
      setUndoIndex(0);
      setCurrentDrawingId(drawing.id);
      setDrawingName(drawing.name);
      setShowGallery(false);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    } catch (e) {
      console.error('Failed to load drawing', e);
    }
  }, []);

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.25, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z * 0.8, 0.2));
  const handleZoomReset = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

  const handlePanChange = useCallback((delta: { x: number; y: number }) => {
    setPanOffset(prev => ({ x: prev.x + delta.x, y: prev.y + delta.y }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
        if (e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); }
        if (e.key === 'y') { e.preventDefault(); handleRedo(); }
        if (e.key === 's') { e.preventDefault(); handleSaveToGallery(); }
      } else {
        // Tool shortcuts
        const shortcuts: Record<string, Tool> = {
          'p': 'pen', 'b': 'brush', 'm': 'marker',
          'c': 'pencil', 'w': 'watercolor', 'e': 'eraser', 'f': 'fill',
        };
        if (shortcuts[e.key]) setTool(shortcuts[e.key]);
        if (e.key === '+' || e.key === '=') handleZoomIn();
        if (e.key === '-') handleZoomOut();
        if (e.key === '0') handleZoomReset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, handleSaveToGallery]);

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ background: 'hsl(220 15% 8%)' }}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-[72px] right-0 z-30 flex items-center justify-between px-4"
        style={{
          height: 48,
          background: 'hsl(220 18% 10%)',
          borderBottom: '1px solid hsl(220 12% 18%)',
        }}
      >
        {/* Drawing name */}
        <input
          className="bg-transparent text-sm text-white/70 font-medium outline-none hover:text-white/90 focus:text-white transition-colors max-w-xs"
          value={drawingName}
          onChange={e => setDrawingName(e.target.value)}
          data-testid="drawing-name-input"
        />

        {/* Tool info */}
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="capitalize">{tool}</span>
          <span>{brushSize}px</span>
          <span>{Math.round(opacity * 100)}%</span>
          <div
            className="w-4 h-4 rounded-full border border-white/20"
            style={{ backgroundColor: color }}
          />
        </div>

        {/* Save button */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: saveStatus === 'saved' ? 'hsl(120 60% 30%)' : 'hsl(210 100% 50%)',
            color: 'white',
            opacity: saveMutation.isPending ? 0.7 : 1,
          }}
          onClick={handleSaveToGallery}
          disabled={saveMutation.isPending}
          data-testid="btn-save-gallery"
        >
          {saveStatus === 'saved' ? (
            <><Check size={14} /> Saved</>
          ) : saveStatus === 'saving' ? (
            <span className="animate-pulse">Saving…</span>
          ) : (
            <><Save size={14} /> Save</>
          )}
        </button>
      </div>

      {/* Left toolbar */}
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        color={color}
        onColorChange={handleColorChange}
        opacity={opacity}
        onOpacityChange={setOpacity}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoIndex > 0}
        canRedo={undoIndex < undoStack.length - 1}
        onClearCanvas={handleClearCanvas}
        onSaveLocal={handleSaveLocal}
        onNewDrawing={handleNewDrawing}
        onOpenGallery={() => setShowGallery(true)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        zoom={zoom}
        recentColors={recentColors}
      />

      {/* Canvas area */}
      <div
        className="absolute"
        style={{
          left: 72,
          top: 48,
          right: 0,
          bottom: 0,
        }}
      >
        <DrawingCanvas
          ref={canvasRef}
          tool={tool}
          color={color}
          opacity={opacity}
          brushSize={brushSize}
          canvasState={canvasState}
          onStrokeComplete={handleStrokeComplete}
          onCanvasReady={() => {}}
          zoom={zoom}
          panOffset={panOffset}
          onPanChange={handlePanChange}
        />
      </div>

      {/* Gallery overlay */}
      {showGallery && (
        <Gallery
          onOpen={handleOpenDrawing}
          onNewDrawing={handleNewDrawing}
          onClose={() => setShowGallery(false)}
        />
      )}

      {/* Keyboard shortcuts hint */}
      <div
        className="absolute bottom-3 right-4 text-xs text-white/20 pointer-events-none"
        style={{ fontSize: 11 }}
      >
        P=Pen B=Brush M=Marker C=Pencil W=Water E=Eraser F=Fill  ⌘Z=Undo  ⌘S=Save
      </div>
    </div>
  );
}
