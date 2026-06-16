import { useState } from "react";
import {
  Pen, PaintbrushVertical, Brush, Pencil, Eraser,
  Droplets, PaintBucket, Undo2, Redo2, Trash2,
  ZoomIn, ZoomOut, Maximize2, Download, FolderOpen, Plus,
  Sun, Moon, ChevronRight, ChevronLeft
} from "lucide-react";
import type { Tool } from "../lib/canvasEngine";
import ColorPicker from "./ColorPicker";

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  color: string;
  onColorChange: (color: string) => void;
  opacity: number;
  onOpacityChange: (v: number) => void;
  brushSize: number;
  onBrushSizeChange: (v: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearCanvas: () => void;
  onSaveLocal: () => void;
  onNewDrawing: () => void;
  onOpenGallery: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  zoom: number;
  recentColors: string[];
}

type ToolDef = {
  id: Tool;
  icon: React.ReactNode;
  label: string;
};

const TOOLS: ToolDef[] = [
  { id: 'pen', icon: <Pen size={20} />, label: 'Pen' },
  { id: 'brush', icon: <Brush size={20} />, label: 'Brush' },
  { id: 'marker', icon: <PaintbrushVertical size={20} />, label: 'Marker' },
  { id: 'pencil', icon: <Pencil size={20} />, label: 'Pencil' },
  { id: 'watercolor', icon: <Droplets size={20} />, label: 'Watercolor' },
  { id: 'eraser', icon: <Eraser size={20} />, label: 'Eraser' },
  { id: 'fill', icon: <PaintBucket size={20} />, label: 'Fill' },
];

export default function Toolbar({
  tool, onToolChange,
  color, onColorChange,
  opacity, onOpacityChange,
  brushSize, onBrushSizeChange,
  onUndo, onRedo, canUndo, canRedo,
  onClearCanvas, onSaveLocal, onNewDrawing, onOpenGallery,
  onZoomIn, onZoomOut, onZoomReset, zoom,
  recentColors,
}: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleColorClick = () => {
    setShowBrushPanel(false);
    setShowColorPicker(v => !v);
  };

  const handleBrushClick = () => {
    setShowColorPicker(false);
    setShowBrushPanel(v => !v);
  };

  return (
    <div
      className="absolute left-0 top-0 bottom-0 flex flex-col z-40 transition-all duration-200"
      style={{ width: collapsed ? 0 : 72 }}
    >
      {/* Sidebar */}
      <div
        className="h-full flex flex-col items-center py-3 gap-1 overflow-hidden"
        style={{
          width: 72,
          background: 'hsl(220 18% 10%)',
          borderRight: '1px solid hsl(220 12% 18%)',
          transform: collapsed ? 'translateX(-100%)' : 'none',
          transition: 'transform 0.2s ease',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo */}
        <div className="mb-2 px-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="DrawPad">
            <rect width="32" height="32" rx="8" fill="hsl(210 100% 60%)"/>
            <path d="M8 22L14 10L20 18L24 14L28 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="10" r="2.5" fill="white"/>
          </svg>
        </div>

        {/* Drawing tools */}
        <div className="w-full px-2 flex flex-col gap-0.5">
          {TOOLS.map(({ id, icon, label }) => (
            <button
              key={id}
              className={`tool-btn w-full relative group ${tool === id ? 'active' : ''}`}
              onClick={() => onToolChange(id)}
              title={label}
              data-testid={`tool-${id}`}
            >
              {icon}
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="w-8 h-px bg-white/10 my-1" />

        {/* Color button */}
        <div className="relative w-full px-2">
          <button
            className={`tool-btn w-full relative group ${showColorPicker ? 'active' : ''}`}
            onClick={handleColorClick}
            title="Color"
            data-testid="tool-color"
          >
            <div
              className="w-6 h-6 rounded-full border-2 border-white/30"
              style={{ backgroundColor: color }}
            />
            <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              Color
            </span>
          </button>

          {showColorPicker && (
            <ColorPicker
              color={color}
              onChange={onColorChange}
              onClose={() => setShowColorPicker(false)}
            />
          )}
        </div>

        {/* Recent colors */}
        <div className="flex flex-col gap-1 px-3">
          {recentColors.slice(0, 4).map((c, i) => (
            <button
              key={i}
              className="w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              onClick={() => onColorChange(c)}
              title={c}
              data-testid={`recent-color-${i}`}
            />
          ))}
        </div>

        <div className="w-8 h-px bg-white/10 my-1" />

        {/* Brush size button */}
        <div className="relative w-full px-2">
          <button
            className={`tool-btn w-full relative group ${showBrushPanel ? 'active' : ''}`}
            onClick={handleBrushClick}
            title="Brush Size"
            data-testid="tool-brush-size"
          >
            <div
              className="rounded-full bg-white/60"
              style={{
                width: Math.max(4, Math.min(22, brushSize * 0.7)),
                height: Math.max(4, Math.min(22, brushSize * 0.7)),
              }}
            />
            <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              Size & Opacity
            </span>
          </button>

          {showBrushPanel && (
            <div
              className="absolute left-[60px] top-0 z-50 fade-in rounded-2xl p-4 shadow-2xl border"
              style={{
                width: 200,
                background: 'hsl(220 18% 12%)',
                borderColor: 'hsl(220 12% 22%)',
              }}
            >
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/60">Size</span>
                  <span className="text-xs font-mono text-white/80">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="80"
                  value={brushSize}
                  onChange={e => onBrushSizeChange(parseInt(e.target.value))}
                  className="w-full"
                  data-testid="brush-size-slider"
                />
                {/* Size preview */}
                <div className="flex items-center justify-center mt-2" style={{ height: 48 }}>
                  <div
                    className="rounded-full"
                    style={{
                      width: Math.min(brushSize, 48),
                      height: Math.min(brushSize, 48),
                      backgroundColor: color,
                      opacity: opacity,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/60">Opacity</span>
                  <span className="text-xs font-mono text-white/80">{Math.round(opacity * 100)}%</span>
                </div>
                <div
                  className="relative h-4 rounded-full overflow-hidden"
                  style={{ background: `linear-gradient(to right, transparent, ${color})` }}
                >
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.01"
                    value={opacity}
                    onChange={e => onOpacityChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    data-testid="opacity-slider"
                  />
                  <div
                    className="absolute top-0 bottom-0 flex items-center"
                    style={{ left: `${(opacity - 0.05) / 0.95 * 100}%`, pointerEvents: 'none' }}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md border border-white/50 -ml-2" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Undo / Redo */}
        <button
          className={`tool-btn w-full px-2 relative group ${!canUndo ? 'opacity-30' : ''}`}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          data-testid="btn-undo"
        >
          <Undo2 size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Undo
          </span>
        </button>
        <button
          className={`tool-btn w-full px-2 relative group ${!canRedo ? 'opacity-30' : ''}`}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          data-testid="btn-redo"
        >
          <Redo2 size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Redo
          </span>
        </button>

        <div className="w-8 h-px bg-white/10 my-1" />

        {/* Zoom */}
        <button className="tool-btn w-full px-2 relative group" onClick={onZoomIn} title="Zoom In" data-testid="btn-zoom-in">
          <ZoomIn size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Zoom In</span>
        </button>
        <button
          className="tool-btn w-full px-2 relative group"
          onClick={onZoomReset}
          title={`${Math.round(zoom * 100)}%`}
          data-testid="btn-zoom-reset"
        >
          <span className="text-xs font-mono text-white/60">{Math.round(zoom * 100)}%</span>
          <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Reset Zoom</span>
        </button>
        <button className="tool-btn w-full px-2 relative group" onClick={onZoomOut} title="Zoom Out" data-testid="btn-zoom-out">
          <ZoomOut size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Zoom Out</span>
        </button>

        <div className="w-8 h-px bg-white/10 my-1" />

        {/* Actions */}
        <button className="tool-btn w-full px-2 relative group" onClick={onSaveLocal} title="Save PNG" data-testid="btn-save">
          <Download size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Save PNG</span>
        </button>
        <button className="tool-btn w-full px-2 relative group" onClick={onOpenGallery} title="Gallery" data-testid="btn-gallery">
          <FolderOpen size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Gallery</span>
        </button>
        <button className="tool-btn w-full px-2 relative group" onClick={onNewDrawing} title="New Drawing" data-testid="btn-new">
          <Plus size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">New Drawing</span>
        </button>
        <button className="tool-btn w-full px-2 relative group text-red-400 hover:text-red-300" onClick={onClearCanvas} title="Clear Canvas" data-testid="btn-clear">
          <Trash2 size={18} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Clear All</span>
        </button>

        <div className="h-2" />
      </div>

      {/* Collapse toggle */}
      <button
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-10 flex items-center justify-center rounded-r z-50"
        style={{
          background: 'hsl(220 18% 14%)',
          border: '1px solid hsl(220 12% 22%)',
          borderLeft: 'none',
        }}
        onClick={() => setCollapsed(v => !v)}
        data-testid="btn-collapse-sidebar"
      >
        {collapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
      </button>
    </div>
  );
}
