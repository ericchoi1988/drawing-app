// Canvas drawing engine for iPad-optimized drawing app

export type Tool = 'pen' | 'brush' | 'marker' | 'pencil' | 'watercolor' | 'eraser' | 'fill';

export interface Stroke {
  id: string;
  tool: Tool;
  color: string;
  opacity: number;
  size: number;
  points: Point[];
  smoothing: number;
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

export interface CanvasState {
  strokes: Stroke[];
  width: number;
  height: number;
  backgroundColor: string;
}

// Generate a unique ID
export const uid = () => Math.random().toString(36).slice(2, 10);

// Catmull-Rom spline interpolation for smooth strokes
function catmullRomPoint(
  p0: Point, p1: Point, p2: Point, p3: Point, t: number
): { x: number; y: number } {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2*p0.x - 5*p1.x + 4*p2.x - p3.x) * t2 + (-p0.x + 3*p1.x - 3*p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2*p0.y - 5*p1.y + 4*p2.y - p3.y) * t2 + (-p0.y + 3*p1.y - 3*p2.y + p3.y) * t3),
  };
}

// Get smoothed path points using Catmull-Rom
function getSmoothedPath(points: Point[]): { x: number; y: number; pressure: number }[] {
  if (points.length < 2) return points.map(p => ({ x: p.x, y: p.y, pressure: p.pressure }));
  if (points.length === 2) {
    return [
      { x: points[0].x, y: points[0].y, pressure: points[0].pressure },
      { x: points[1].x, y: points[1].y, pressure: points[1].pressure },
    ];
  }

  const result: { x: number; y: number; pressure: number }[] = [];
  const extended = [points[0], ...points, points[points.length - 1]];

  for (let i = 1; i < extended.length - 2; i++) {
    const steps = 8;
    for (let t = 0; t < steps; t++) {
      const pt = catmullRomPoint(extended[i - 1], extended[i], extended[i + 1], extended[i + 2], t / steps);
      const pressure = extended[i].pressure + (extended[i + 1].pressure - extended[i].pressure) * (t / steps);
      result.push({ x: pt.x, y: pt.y, pressure });
    }
  }
  result.push({ x: points[points.length - 1].x, y: points[points.length - 1].y, pressure: points[points.length - 1].pressure });
  return result;
}

// Parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

// Draw a single stroke on a canvas context
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length < 1) return;

  const { r, g, b } = hexToRgb(stroke.color);
  const alpha = stroke.opacity;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = `rgba(0,0,0,1)`;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  }

  const smoothed = getSmoothedPath(stroke.points);

  switch (stroke.tool) {
    case 'pen':
      drawPen(ctx, smoothed, stroke.size, r, g, b, alpha);
      break;
    case 'brush':
      drawBrush(ctx, smoothed, stroke.size, r, g, b, alpha);
      break;
    case 'marker':
      drawMarker(ctx, smoothed, stroke.size, r, g, b, stroke.opacity);
      break;
    case 'pencil':
      drawPencil(ctx, smoothed, stroke.size, r, g, b, alpha);
      break;
    case 'watercolor':
      drawWatercolor(ctx, smoothed, stroke.size, r, g, b, alpha);
      break;
    case 'eraser':
      drawEraser(ctx, smoothed, stroke.size);
      break;
  }

  ctx.restore();
}

function drawPen(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; pressure: number }[],
  size: number,
  r: number, g: number, b: number, alpha: number
) {
  if (points.length === 0) return;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, (size * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    const pressure = pt.pressure || 0.5;
    const w = size * 0.3 + size * 0.7 * pressure;
    ctx.lineWidth = w;
    ctx.lineTo(pt.x, pt.y);
  }

  ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
  ctx.stroke();
}

function drawBrush(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; pressure: number }[],
  size: number,
  r: number, g: number, b: number, alpha: number
) {
  if (points.length === 0) return;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const pressure = curr.pressure || 0.5;
    const w = size * 0.2 + size * 1.4 * pressure;
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const steps = Math.max(1, Math.floor(dist / 2));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = prev.x + (curr.x - prev.x) * t;
      const y = prev.y + (curr.y - prev.y) * t;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, w * 0.6);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.4})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, w * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; pressure: number }[],
  size: number,
  r: number, g: number, b: number, opacity: number
) {
  if (points.length === 0) return;

  ctx.globalCompositeOperation = 'multiply';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineWidth = size * 1.5;
  ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(opacity * 0.85, 0.85)})`;
  ctx.stroke();
}

function drawPencil(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; pressure: number }[],
  size: number,
  r: number, g: number, b: number, alpha: number
) {
  if (points.length === 0) return;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const pressure = curr.pressure || 0.4;
    const w = size * 0.15 + size * 0.5 * pressure;
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const steps = Math.max(1, Math.floor(dist / 1.5));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = prev.x + (curr.x - prev.x) * t + (Math.random() - 0.5) * w * 0.5;
      const y = prev.y + (curr.y - prev.y) * t + (Math.random() - 0.5) * w * 0.5;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha * (0.3 + Math.random() * 0.3)})`;
      ctx.fillRect(x, y, w * 0.4, w * 0.4);
    }
  }
}

function drawWatercolor(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; pressure: number }[],
  size: number,
  r: number, g: number, b: number, alpha: number
) {
  if (points.length === 0) return;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const pressure = curr.pressure || 0.5;
    const w = size * 0.8 + size * 1.5 * pressure;
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const steps = Math.max(1, Math.floor(dist / 3));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const bx = prev.x + (curr.x - prev.x) * t;
      const by = prev.y + (curr.y - prev.y) * t;

      // Multiple overlapping soft circles
      for (let layer = 0; layer < 4; layer++) {
        const ox = (Math.random() - 0.5) * w * 0.3;
        const oy = (Math.random() - 0.5) * w * 0.3;
        const rr = w * (0.3 + Math.random() * 0.4);
        const grad = ctx.createRadialGradient(bx + ox, by + oy, 0, bx + ox, by + oy, rr);
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.06})`);
        grad.addColorStop(0.6, `rgba(${r},${g},${b},${alpha * 0.03})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx + ox, by + oy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawEraser(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; pressure: number }[],
  size: number
) {
  if (points.length === 0) return;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const pressure = points[i].pressure || 0.5;
    ctx.lineWidth = size * 0.8 + size * 1.2 * pressure;
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = 'rgba(0,0,0,1)';
  ctx.stroke();
}

// Flood fill algorithm
export function floodFill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  fillColor: string,
  tolerance: number = 30
) {
  const canvas = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const px = Math.floor(x);
  const py = Math.floor(y);
  const idx = (py * canvas.width + px) * 4;

  const targetR = data[idx];
  const targetG = data[idx + 1];
  const targetB = data[idx + 2];
  const targetA = data[idx + 3];

  const { r: fr, g: fg, b: fb } = hexToRgb(fillColor);

  // Don't fill if already the fill color
  if (Math.abs(targetR - fr) < 5 && Math.abs(targetG - fg) < 5 && Math.abs(targetB - fb) < 5) return;

  const colorMatch = (i: number) => {
    return (
      Math.abs(data[i] - targetR) <= tolerance &&
      Math.abs(data[i + 1] - targetG) <= tolerance &&
      Math.abs(data[i + 2] - targetB) <= tolerance &&
      Math.abs(data[i + 3] - targetA) <= tolerance
    );
  };

  const stack: [number, number][] = [[px, py]];
  const visited = new Uint8Array(canvas.width * canvas.height);

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height) continue;
    const vi = cy * canvas.width + cx;
    if (visited[vi]) continue;
    visited[vi] = 1;

    const ci = vi * 4;
    if (!colorMatch(ci)) continue;

    data[ci] = fr;
    data[ci + 1] = fg;
    data[ci + 2] = fb;
    data[ci + 3] = 255;

    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

// Redraw all strokes on a canvas
export function redrawCanvas(
  ctx: CanvasRenderingContext2D,
  state: CanvasState
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Fill background
  ctx.fillStyle = state.backgroundColor;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw all strokes
  for (const stroke of state.strokes) {
    drawStroke(ctx, stroke);
  }
}

// Generate thumbnail from canvas
export function generateThumbnail(canvas: HTMLCanvasElement, maxSize: number = 300): string {
  const thumb = document.createElement('canvas');
  const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
  thumb.width = Math.floor(canvas.width * scale);
  thumb.height = Math.floor(canvas.height * scale);
  const tctx = thumb.getContext('2d')!;
  tctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/jpeg', 0.7);
}
