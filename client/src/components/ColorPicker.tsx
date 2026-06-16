import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

const PRESETS = [
  "#000000", "#1a1a1a", "#3d3d3d", "#6b6b6b", "#999999", "#cccccc", "#e8e8e8", "#ffffff",
  "#ff0000", "#ff4444", "#ff8800", "#ffaa00", "#ffdd00", "#ffd700", "#aacc00", "#00cc44",
  "#00aa88", "#00aacc", "#0088ff", "#3366ff", "#6644ff", "#9933ff", "#cc33ff", "#ff33aa",
  "#8b0000", "#b34700", "#6b6600", "#005500", "#003366", "#1a0080", "#550066", "#660033",
  "#ffb3b3", "#ffd9b3", "#fff0b3", "#b3ffcc", "#b3f0ff", "#c2c2ff", "#f0b3ff", "#ffb3e6",
  "#704214", "#7d6608", "#145a32", "#1a5276", "#4a235a", "#784212", "#2e4057", "#522e1e",
];

export default function ColorPicker({ color, onChange, onClose }: ColorPickerProps) {
  const [hex, setHex] = useState(color.replace('#', ''));
  const [r, setR] = useState(0);
  const [g, setG] = useState(0);
  const [b, setB] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    if (result) {
      setR(parseInt(result[1], 16));
      setG(parseInt(result[2], 16));
      setB(parseInt(result[3], 16));
      setHex(color.replace('#', ''));
    }
  }, [color]);

  const rgbToHex = (rv: number, gv: number, bv: number) =>
    '#' + [rv, gv, bv].map(x => x.toString(16).padStart(2, '0')).join('');

  const handleHexChange = (v: string) => {
    setHex(v);
    if (/^[0-9a-fA-F]{6}$/.test(v)) {
      onChange('#' + v);
    }
  };

  const handleRgb = (which: 'r' | 'g' | 'b', val: number) => {
    const nv = Math.max(0, Math.min(255, val));
    let nr = r, ng = g, nb = b;
    if (which === 'r') nr = nv;
    if (which === 'g') ng = nv;
    if (which === 'b') nb = nv;
    setR(nr); setG(ng); setB(nb);
    const newHex = rgbToHex(nr, ng, nb);
    setHex(newHex.replace('#', ''));
    onChange(newHex);
  };

  return (
    <div className="absolute left-[76px] top-1/2 -translate-y-1/2 z-50 fade-in"
      style={{ width: 260 }}
    >
      <div className="rounded-2xl p-4 shadow-2xl border"
        style={{
          background: 'hsl(220 18% 12%)',
          borderColor: 'hsl(220 12% 22%)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white/80">Color</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10"
            data-testid="close-color-picker"
          >
            <X size={14} className="text-white/60" />
          </button>
        </div>

        {/* Native color input for hue picking */}
        <div className="mb-3">
          <input
            ref={inputRef}
            type="color"
            value={'#' + hex.padStart(6, '0')}
            onChange={e => {
              const v = e.target.value;
              onChange(v);
              setHex(v.replace('#', ''));
            }}
            className="w-full h-10 rounded-lg cursor-pointer border-0 bg-transparent"
            style={{ appearance: 'none', padding: 0 }}
            data-testid="color-input-native"
          />
        </div>

        {/* RGB Sliders */}
        <div className="space-y-2 mb-3">
          {[
            { label: 'R', val: r, onChange: (v: number) => handleRgb('r', v), color: '#ff5555' },
            { label: 'G', val: g, onChange: (v: number) => handleRgb('g', v), color: '#55ff88' },
            { label: 'B', val: b, onChange: (v: number) => handleRgb('b', v), color: '#5588ff' },
          ].map(({ label, val, onChange: onC, color: c }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs font-mono w-4 text-center" style={{ color: c }}>{label}</span>
              <input
                type="range"
                min="0"
                max="255"
                value={val}
                onChange={e => onC(parseInt(e.target.value))}
                className="flex-1"
                style={{
                  background: `linear-gradient(to right, hsl(220 15% 20%), ${c})`,
                  accentColor: c,
                }}
                data-testid={`slider-${label.toLowerCase()}`}
              />
              <input
                type="number"
                min="0"
                max="255"
                value={val}
                onChange={e => onC(parseInt(e.target.value))}
                className="w-10 text-xs text-center rounded bg-white/10 text-white/80 border border-white/10 py-0.5"
                data-testid={`input-${label.toLowerCase()}`}
              />
            </div>
          ))}
        </div>

        {/* Hex input */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded flex-shrink-0 border border-white/20" style={{ backgroundColor: '#' + hex }} />
          <span className="text-white/40 text-sm">#</span>
          <input
            type="text"
            value={hex.toUpperCase()}
            onChange={e => handleHexChange(e.target.value)}
            maxLength={6}
            className="flex-1 bg-white/10 rounded text-sm text-white/80 border border-white/10 px-2 py-1 font-mono uppercase"
            data-testid="hex-input"
          />
        </div>

        {/* Color presets grid */}
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              className={`color-swatch ${color === preset ? 'selected' : ''}`}
              style={{
                backgroundColor: preset,
                width: '100%',
                aspectRatio: '1',
                borderRadius: '50%',
                border: color === preset ? '2px solid #3b82f6' : '2px solid transparent',
              }}
              onClick={() => onChange(preset)}
              title={preset}
              data-testid={`preset-${preset.replace('#', '')}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
