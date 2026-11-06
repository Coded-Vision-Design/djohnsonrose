// Paint and Photoshop, shared by both builds. Everything here is
// framework-neutral: pure helpers for colours, canvas points, flood fill,
// shapes, zoom and undo, and one controller per app that owns its canvases,
// its pointer gestures (mouse, touch and pen alike) and its shortcuts. Each
// build only renders the same markup from the state its controller reports,
// so the two cannot differ in how anything draws.

// ---- Constants ---------------------------------------------------------------

export const MIN_SIZE = 1;
export const MAX_SIZE = 64;
export const HISTORY_LIMIT = 20;
export const ZOOM_LEVELS = [25, 50, 75, 100, 150, 200, 300, 400, 600, 800];
export const MIN_ZOOM = ZOOM_LEVELS[0];
export const MAX_ZOOM = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
export const MIN_CANVAS = 16;
export const MAX_CANVAS = 3000;
export const PAINT_SIZE = { width: 800, height: 600 };
export const PS_SIZE = { width: 720, height: 480 };
export const MAX_LAYERS = 8;

const DEFAULT_SIZE = 4;
const TEXT_FAMILY = '"Segoe UI", system-ui, sans-serif';

/** Paint's colour palette, in Paint's own order. */
export const PAINT_PALETTE = [
  { hex: '#000000', name: 'Black' },
  { hex: '#7f7f7f', name: 'Grey 50%' },
  { hex: '#880015', name: 'Dark red' },
  { hex: '#ed1c24', name: 'Red' },
  { hex: '#ff7f27', name: 'Orange' },
  { hex: '#fff200', name: 'Yellow' },
  { hex: '#22b14c', name: 'Green' },
  { hex: '#00a2e8', name: 'Turquoise' },
  { hex: '#3f48cc', name: 'Indigo' },
  { hex: '#a349a4', name: 'Purple' },
  { hex: '#ffffff', name: 'White' },
  { hex: '#c3c3c3', name: 'Grey 25%' },
  { hex: '#b97a57', name: 'Brown' },
  { hex: '#ffaec9', name: 'Rose' },
  { hex: '#ffc90e', name: 'Gold' },
  { hex: '#efe4b0', name: 'Light yellow' },
  { hex: '#b5e61d', name: 'Lime' },
  { hex: '#99d9ea', name: 'Light turquoise' },
  { hex: '#7092be', name: 'Blue grey' },
  { hex: '#c8bfe7', name: 'Lavender' },
];

/** Photoshop's swatches panel. */
export const PS_SWATCHES = [
  { hex: '#000000', name: 'Black' },
  { hex: '#1e1e1e', name: 'Charcoal' },
  { hex: '#ffffff', name: 'White' },
  { hex: '#0078d4', name: 'Windows blue' },
  { hex: '#31a8ff', name: 'Photoshop blue' },
  { hex: '#cc2927', name: 'Red' },
  { hex: '#ec1ea0', name: 'Magenta' },
  { hex: '#ffaa00', name: 'Amber' },
  { hex: '#ffe600', name: 'Yellow' },
  { hex: '#00d68f', name: 'Mint' },
  { hex: '#6c63ff', name: 'Violet' },
  { hex: '#a855f7', name: 'Purple' },
];

/** Paint's Tools group, three by two as in Paint. */
export const PAINT_TOOLS = [
  { id: 'pencil', label: 'Pencil' },
  { id: 'fill', label: 'Fill with colour' },
  { id: 'text', label: 'Text' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'picker', label: 'Colour picker' },
  { id: 'zoom', label: 'Magnifier' },
];

export const PAINT_SHAPES = [
  { id: 'line', label: 'Line' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'ellipse', label: 'Oval' },
  { id: 'rounded', label: 'Rounded rectangle' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'star', label: 'Star' },
];

export const PAINT_TABS = [
  { id: 'file', label: 'File' },
  { id: 'home', label: 'Home' },
  { id: 'view', label: 'View' },
];

/** Photoshop's tool rail, with the letters that pick each tool. */
export const PS_TOOLS = [
  { id: 'move', label: 'Move', key: 'V' },
  { id: 'brush', label: 'Brush', key: 'B' },
  { id: 'eraser', label: 'Eraser', key: 'E' },
  { id: 'bucket', label: 'Paint bucket', key: 'G' },
  { id: 'text', label: 'Type', key: 'T' },
];

/** Photoshop's menus. Every item runs a command, through run(id). */
export const PS_MENUS = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'new', label: 'New' },
      { id: 'save', label: 'Export as PNG' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
      { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z' },
      { separator: true },
      { id: 'clearLayer', label: 'Clear layer', shortcut: 'Delete' },
    ],
  },
  {
    id: 'layer',
    label: 'Layer',
    items: [
      { id: 'newLayer', label: 'New layer' },
      { id: 'deleteLayer', label: 'Delete layer' },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { id: 'zoomIn', label: 'Zoom in', shortcut: 'Ctrl++' },
      { id: 'zoomOut', label: 'Zoom out', shortcut: 'Ctrl+-' },
      { id: 'zoomReset', label: 'Actual size', shortcut: 'Ctrl+0' },
    ],
  },
];

/** Line icons on a 24 by 24 grid, drawn with the current colour. */
export const DRAWING_ICONS = {
  pencil: 'M4 20l1.2-4.6L15 5.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8zM13.6 7l3.4 3.4',
  brush: 'M19.5 4.5 11.5 12.5M12.8 13.8l-2.6-2.6M10.2 11.2c-2.4 0-3.8 1.5-3.8 3.9 0 1.8-1.2 3-2.9 3.4 4.6 1.4 9.3-.4 9.3-4.7',
  eraser: 'M8 20h12M5.2 15.8l9.6-9.6a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L11 18H7.4zM10 11l4 4',
  fill: 'M5.4 10.6 11 5l7 7-6.4 6.4a2 2 0 0 1-2.8 0l-3.4-3.4a2 2 0 0 1 0-2.8zM4.8 12.6h13M20 15.5s1.5 1.8 1.5 2.9a1.5 1.5 0 0 1-3 0c0-1.1 1.5-2.9 1.5-2.9z',
  text: 'M5 7V4.5h14V7M12 4.5v15M9 19.5h6',
  picker: 'M13 7l4 4M15.6 4.4a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L17 11l-4-4zM14 9.5 5.5 18l-1 2.5 2.5-1 8.5-8.5',
  zoom: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.3 15.3 20 20',
  zoomIn: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.3 15.3 20 20M8 10.5h5M10.5 8v5',
  zoomOut: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.3 15.3 20 20M8 10.5h5',
  actual: 'M4 4h16v16H4zM9 9h6v6H9z',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  line: 'M5 19 19 5',
  rectangle: 'M4 6h16v12H4z',
  ellipse: 'M12 6c4.4 0 8 2.7 8 6s-3.6 6-8 6-8-2.7-8-6 3.6-6 8-6z',
  rounded: 'M8 6h8a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z',
  triangle: 'M12 4.5l8.5 15h-17z',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z',
  new: 'M6 3h8l4 4v14H6zM14 3v4h4',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  clear: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  move: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',
  eye: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  pointer: 'M5 3l5.5 15 2.2-6.3L19 9.5z',
  size: 'M4 4h6M4 4v6M20 20h-6M20 20v-6M4 20h6M4 20v-6M20 4h-6M20 4v6',
};

// ---- Small helpers ---------------------------------------------------------------

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const finite = (value, fallback) => {
  const number = typeof value === 'string' && value.trim() === '' ? Number.NaN : Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const px = (value) => `${Math.round(value * 100) / 100}px`;

// ---- Colours ---------------------------------------------------------------------

/** '#rgb' or '#rrggbb' as { r, g, b }, or null when it is not a colour. */
export function parseColour(value) {
  const text = String(value ?? '').trim().toLowerCase();
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(text);
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text);
  const parts = long ? long.slice(1) : short ? short.slice(1).map((digit) => digit + digit) : null;
  if (!parts) return null;
  const [r, g, b] = parts.map((part) => parseInt(part, 16));
  return { r, g, b };
}

/** Three channels as '#rrggbb', rounded and kept in range. */
export function toHex(r, g, b) {
  const part = (value) => clamp(Math.round(finite(value, 0)), 0, 255).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** A fill colour as whole channels from 0 to 255, opaque unless it says otherwise. */
function channels(colour) {
  if (!colour || typeof colour !== 'object') return null;
  const part = (value, fallback) => clamp(Math.round(finite(value, fallback)), 0, 255);
  return { r: part(colour.r, 0), g: part(colour.g, 0), b: part(colour.b, 0), a: part(colour.a, 255) };
}

// ---- Points, lines and boxes ----------------------------------------------------------

/** Where a pointer is in canvas pixels, as a continuous position. */
export function canvasPosition(clientX, clientY, rect, width, height) {
  const x = rect.width > 0 ? ((finite(clientX, rect.left) - rect.left) * width) / rect.width : 0;
  const y = rect.height > 0 ? ((finite(clientY, rect.top) - rect.top) * height) / rect.height : 0;
  return { x, y };
}

/**
 * The pixel under a pointer: floored, then kept on the canvas. Rounding could
 * give the width or the height, one past the last pixel.
 */
export function canvasPixel(clientX, clientY, rect, width, height) {
  const { x, y } = canvasPosition(clientX, clientY, rect, width, height);
  return {
    x: clamp(Math.floor(x), 0, Math.max(0, Math.floor(width) - 1)),
    y: clamp(Math.floor(y), 0, Math.max(0, Math.floor(height) - 1)),
  };
}

/** Every pixel on a straight line, both ends included (Bresenham). */
export function linePoints(x0, y0, x1, y1) {
  if (![x0, y0, x1, y1].every(Number.isFinite)) return [];
  const limit = MAX_CANVAS * 4;
  let x = clamp(Math.floor(x0), -limit, limit);
  let y = clamp(Math.floor(y0), -limit, limit);
  const tx = clamp(Math.floor(x1), -limit, limit);
  const ty = clamp(Math.floor(y1), -limit, limit);
  const dx = Math.abs(tx - x);
  const dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1;
  const sy = y < ty ? 1 : -1;
  let error = dx + dy;
  const points = [];
  for (;;) {
    points.push({ x, y });
    if (x === tx && y === ty) return points;
    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      x += sx;
    }
    if (twice <= dx) {
      error += dx;
      y += sy;
    }
  }
}

/** The box around some points, grown by pad on every side, or null for none. */
export function pointsBounds(points, pad = 0) {
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs) - pad;
  const top = Math.min(...ys) - pad;
  return { x: left, y: top, width: Math.max(...xs) + pad - left, height: Math.max(...ys) + pad - top };
}

/** The box around two boxes. Either may be null. */
export function unionRect(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  return {
    x: left,
    y: top,
    width: Math.max(a.x + a.width, b.x + b.width) - left,
    height: Math.max(a.y + a.height, b.y + b.height) - top,
  };
}

/** A box grown to whole pixels and cut to the canvas, or null when nothing is left. */
export function clampRect(rect, width, height) {
  const left = clamp(Math.floor(rect.x), 0, width);
  const top = clamp(Math.floor(rect.y), 0, height);
  const right = clamp(Math.ceil(rect.x + rect.width), 0, width);
  const bottom = clamp(Math.ceil(rect.y + rect.height), 0, height);
  if (right <= left || bottom <= top || rect.width <= 0 || rect.height <= 0) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** The RGBA bytes of a box inside an image. The box must lie inside it. */
export function cropPixels(image, rect) {
  const out = new Uint8ClampedArray(Math.max(0, rect.width * rect.height * 4));
  for (let row = 0; row < rect.height; row += 1) {
    const start = ((rect.y + row) * image.width + rect.x) * 4;
    out.set(image.data.subarray(start, start + rect.width * 4), row * rect.width * 4);
  }
  return out;
}

// ---- Flood fill -------------------------------------------------------------------

/**
 * Fills the area of one colour around (x, y) with another, in place, as
 * Paint's bucket does. Returns the box it changed with the number of pixels,
 * or null when nothing changed. Any input is safe: a seed off the image, a
 * short buffer or a bad colour changes nothing, and every pixel is visited at
 * most once, so the fill always ends.
 */
export function floodFill(data, width, height, x, y, colour) {
  const w = Math.floor(finite(width, 0));
  const h = Math.floor(finite(height, 0));
  if (w <= 0 || h <= 0 || !data || data.length < w * h * 4) return null;
  const sx = Math.floor(finite(x, -1));
  const sy = Math.floor(finite(y, -1));
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
  const fill = channels(colour);
  if (!fill) return null;

  const seed = (sy * w + sx) * 4;
  const [tr, tg, tb, ta] = [data[seed], data[seed + 1], data[seed + 2], data[seed + 3]];
  if (tr === fill.r && tg === fill.g && tb === fill.b && ta === fill.a) return null;

  const seen = new Uint8Array(w * h);
  const open = (index) => {
    if (seen[index]) return false;
    const i = index * 4;
    return data[i] === tr && data[i + 1] === tg && data[i + 2] === tb && data[i + 3] === ta;
  };
  let left = sx;
  let right = sx;
  let top = sy;
  let bottom = sy;
  let count = 0;
  const stack = [sx, sy];

  // Scanline fill: run left to the edge of each span, then fill rightwards,
  // queueing the first open pixel of every run above and below.
  while (stack.length) {
    const py = stack.pop();
    let pxl = stack.pop();
    const row = py * w;
    if (!open(row + pxl)) continue;
    while (pxl > 0 && open(row + pxl - 1)) pxl -= 1;
    let above = false;
    let below = false;
    for (; pxl < w && open(row + pxl); pxl += 1) {
      const index = row + pxl;
      seen[index] = 1;
      data[index * 4] = fill.r;
      data[index * 4 + 1] = fill.g;
      data[index * 4 + 2] = fill.b;
      data[index * 4 + 3] = fill.a;
      count += 1;
      if (pxl < left) left = pxl;
      if (pxl > right) right = pxl;
      if (py > 0) {
        const up = open(index - w);
        if (up && !above) stack.push(pxl, py - 1);
        above = up;
      }
      if (py < h - 1) {
        const down = open(index + w);
        if (down && !below) stack.push(pxl, py + 1);
        below = down;
      }
    }
    if (py < top) top = py;
    if (py > bottom) bottom = py;
  }
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1, count };
}

// ---- Zoom, sizes and the canvas -------------------------------------------------------

/** A zoom percentage, whole and in range. Anything unreadable is 100%. */
export function clampZoom(value) {
  return clamp(Math.round(finite(value, 100)), MIN_ZOOM, MAX_ZOOM);
}

/** The next zoom level up (direction 1) or down (-1) from any zoom. */
export function zoomStep(zoom, direction) {
  const current = clampZoom(zoom);
  if (direction > 0) return ZOOM_LEVELS.find((level) => level > current) ?? MAX_ZOOM;
  return [...ZOOM_LEVELS].reverse().find((level) => level < current) ?? MIN_ZOOM;
}

/** Where a zoom sits on the zoom slider: the index of the nearest level. */
export function zoomIndex(zoom) {
  const current = clampZoom(zoom);
  let best = 0;
  ZOOM_LEVELS.forEach((level, index) => {
    if (Math.abs(level - current) < Math.abs(ZOOM_LEVELS[best] - current)) best = index;
  });
  return best;
}

/** A brush size, whole and in range. */
export function clampSize(value) {
  return clamp(Math.round(finite(value, DEFAULT_SIZE)), MIN_SIZE, MAX_SIZE);
}

/** The canvas size while one of its handles ('x', 'y' or 'xy') is dragged by delta pixels. */
export function resizeCanvas(start, delta, edge) {
  const size = (base, change, moves) =>
    clamp(Math.round(moves ? base + finite(change, 0) : base), MIN_CANVAS, MAX_CANVAS);
  const handle = edge === 'x' || edge === 'y' || edge === 'xy' ? edge : '';
  return {
    width: size(start.width, delta.x, handle.includes('x')),
    height: size(start.height, delta.y, handle.includes('y')),
  };
}

// ---- Shapes -------------------------------------------------------------------------

/**
 * Where a shape ends while it is dragged. With Shift held, boxes become
 * squares and lines snap to the nearest 45 degrees, as in Paint.
 */
export function shapeEnd(shape, from, to, constrain) {
  if (!constrain) return to;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (shape === 'line') {
    // Projects the pointer onto the nearest of the eight directions.
    const step = Math.PI / 4;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    const round = (value) => Math.round(value * 1000) / 1000;
    return { x: round(from.x + Math.cos(angle) * along), y: round(from.y + Math.sin(angle) * along) };
  }
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: from.x + (dx < 0 ? -side : side), y: from.y + (dy < 0 ? -side : side) };
}

/** A shape dragged from one corner to the other, as points, an ellipse or a rounded box. */
export function shapeOutline(shape, from, to) {
  const left = Math.min(from.x, to.x);
  const right = Math.max(from.x, to.x);
  const top = Math.min(from.y, to.y);
  const bottom = Math.max(from.y, to.y);
  const width = right - left;
  const height = bottom - top;
  const cx = left + width / 2;
  const cy = top + height / 2;
  switch (shape) {
    case 'line':
      return { kind: 'line', points: [from, to] };
    case 'rectangle':
      return {
        kind: 'polygon',
        points: [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ],
      };
    case 'rounded':
      return { kind: 'rounded', x: left, y: top, width, height, radius: Math.min(width, height) / 4 };
    case 'ellipse':
      return { kind: 'ellipse', cx, cy, rx: width / 2, ry: height / 2 };
    case 'triangle':
      return {
        kind: 'polygon',
        points: [
          { x: cx, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ],
      };
    case 'star':
      return {
        kind: 'polygon',
        points: Array.from({ length: 10 }, (_, i) => {
          const angle = -Math.PI / 2 + (i * Math.PI) / 5;
          const reach = i % 2 ? 0.4 : 1;
          return { x: cx + Math.cos(angle) * (width / 2) * reach, y: cy + Math.sin(angle) * (height / 2) * reach };
        }),
      };
    default:
      return null;
  }
}

function traceOutline(ctx, outline) {
  ctx.beginPath();
  if (outline.kind === 'ellipse') {
    ctx.ellipse(outline.cx, outline.cy, outline.rx, outline.ry, 0, 0, Math.PI * 2);
  } else if (outline.kind === 'rounded' && ctx.roundRect) {
    ctx.roundRect(outline.x, outline.y, outline.width, outline.height, outline.radius);
  } else if (outline.kind === 'rounded') {
    ctx.rect(outline.x, outline.y, outline.width, outline.height);
  } else {
    outline.points.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    if (outline.kind === 'polygon') ctx.closePath();
  }
}

function strokeOutline(ctx, outline, colour, size) {
  if (!outline) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  traceOutline(ctx, outline);
  ctx.stroke();
  ctx.restore();
}

// ---- Text ----------------------------------------------------------------------------

/** Typed text as lines, whatever ends them. */
export function textLines(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
}

/** Draws text with its top left at the point, and returns the box it may have touched. */
function drawText(ctx, at, value, look) {
  const lines = textLines(value);
  let width = 0;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = look.colour;
  ctx.font = `${look.weight} ${look.size}px ${TEXT_FAMILY}`;
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => {
    ctx.fillText(line, at.x, at.y + i * look.line);
    width = Math.max(width, ctx.measureText(line).width);
  });
  ctx.restore();
  return { x: at.x - look.size, y: at.y - look.size, width: width + look.size * 2, height: lines.length * look.line + look.size * 2 };
}

/**
 * The text box typed into on the canvas. It opens where the pointer was let
 * go, places its text on Enter or when it loses focus, and Escape drops it.
 * Shift+Enter starts a new line.
 */
function createTextBox(element, { scale, commit }) {
  let spot = null;
  const place = () => {
    if (!spot || !element) return;
    const s = scale();
    element.style.left = px(spot.at.x * s);
    element.style.top = px(spot.at.y * s);
    element.style.color = spot.look.colour;
    element.style.font = `${spot.look.weight} ${px(spot.look.size * s)}/${px(spot.look.line * s)} ${TEXT_FAMILY}`;
  };
  const close = (keep) => {
    if (!spot) return;
    const { at, look } = spot;
    spot = null;
    const value = element.value;
    element.hidden = true;
    element.value = '';
    if (keep && value.trim()) commit(at, value, look);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(false);
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      close(true);
    }
  };
  const onBlur = () => close(true);
  element?.addEventListener('keydown', onKey);
  element?.addEventListener('blur', onBlur);
  return {
    open(at, look) {
      close(true);
      if (!element) return;
      spot = { at, look };
      element.value = '';
      element.hidden = false;
      place();
      element.focus({ preventScroll: true });
    },
    close,
    place,
    dispose() {
      element?.removeEventListener('keydown', onKey);
      element?.removeEventListener('blur', onBlur);
      spot = null;
    },
  };
}

// ---- History -------------------------------------------------------------------------

/**
 * Undo history. Each step holds a box of one layer's pixels before and after
 * an edit, so it costs only the area that changed. A step marked resize
 * holds the whole canvas, whose size changed too.
 */
export const emptyHistory = () => ({ done: [], undone: [] });

export function recordStep(history, step, limit = HISTORY_LIMIT) {
  const done = [...history.done, step];
  return { done: done.slice(Math.max(0, done.length - Math.max(1, limit))), undone: [] };
}

export function undoStep(history) {
  if (!history.done.length) return null;
  const step = history.done[history.done.length - 1];
  return { step, history: { done: history.done.slice(0, -1), undone: [...history.undone, step] } };
}

export function redoStep(history) {
  if (!history.undone.length) return null;
  const step = history.undone[history.undone.length - 1];
  return { step, history: { done: [...history.done, step], undone: history.undone.slice(0, -1) } };
}

/** History without a deleted layer's steps. */
export function forgetLayer(history, layer) {
  const keep = (step) => step.layer !== layer;
  return { done: history.done.filter(keep), undone: history.undone.filter(keep) };
}

// ---- Shortcuts and commands -------------------------------------------------------------

/**
 * The command a key press runs in Paint ('paint') or Photoshop ('photoshop'),
 * or null. Ctrl+S stays with the shell, which opens search with it.
 */
export function drawingShortcut(event, app) {
  const key = String(event.key ?? '');
  const lower = key.toLowerCase();
  const command = event.ctrlKey || event.metaKey;
  if (event.altKey) return null;
  if (command) {
    if (lower === 'z') return event.shiftKey ? 'redo' : 'undo';
    if (lower === 'y') return 'redo';
    if (key === '=' || key === '+') return 'zoomIn';
    if (key === '-' || key === '_') return 'zoomOut';
    if (key === '0') return 'zoomReset';
    return null;
  }
  if (app !== 'photoshop' || event.shiftKey) return null;
  const tool = PS_TOOLS.find((item) => item.key.toLowerCase() === lower);
  if (tool) return `tool:${tool.id}`;
  if (key === ']') return 'sizeUp';
  if (key === '[') return 'sizeDown';
  if (key === 'Delete' || key === 'Backspace') return 'clearLayer';
  return null;
}

const COMMANDS = ['new', 'save', 'clear', 'undo', 'redo', 'zoomIn', 'zoomOut', 'zoomReset', 'clearLayer', 'newLayer', 'deleteLayer'];

/** Whether a command exists and can run now, for menus and buttons. */
export function commandState(id, state) {
  const known = COMMANDS.includes(id);
  const layers = state.layers?.length ?? 1;
  const disabled =
    (id === 'undo' && !state.canUndo) ||
    (id === 'redo' && !state.canRedo) ||
    (id === 'zoomIn' && state.zoom >= MAX_ZOOM) ||
    (id === 'zoomOut' && state.zoom <= MIN_ZOOM) ||
    (id === 'zoomReset' && state.zoom === 100) ||
    (id === 'deleteLayer' && layers <= 1) ||
    (id === 'newLayer' && layers >= MAX_LAYERS);
  return { known, disabled: !known || disabled };
}

// ---- Canvas plumbing -----------------------------------------------------------------

function saveImage(canvas, name) {
  const link = document.createElement('a');
  link.download = name;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/** Pointer moves since the last event, including the ones the browser merged. */
const pointerMoves = (event) => {
  const merged = event.getCoalescedEvents?.() ?? [];
  return merged.length ? merged : [event];
};

function brushSegment(ctx, from, to, colour, size, erase) {
  ctx.save();
  ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (from.x === to.x && from.y === to.y) {
    ctx.arc(to.x, to.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Keeps the canvas point under the anchor where it was, across a zoom change. */
function zoomAround(viewport, target, before, after, anchor, apply) {
  const rect = target.getBoundingClientRect();
  const view = viewport.getBoundingClientRect();
  const at = anchor ?? { x: view.left + view.width / 2, y: view.top + view.height / 2 };
  const point = { x: (at.x - rect.left) / (before / 100), y: (at.y - rect.top) / (before / 100) };
  apply();
  const moved = target.getBoundingClientRect();
  viewport.scrollLeft += moved.left + (point.x * after) / 100 - at.x;
  viewport.scrollTop += moved.top + (point.y * after) / 100 - at.y;
}

/** Keeps a pointer's events coming here while it is down. A pointer that has already gone cannot be captured. */
function capture(element, pointerId) {
  try {
    element.setPointerCapture?.(pointerId);
  } catch {
    // Nothing to capture: its up or cancel event has been sent already.
  }
}

const editable = (target) => target?.closest?.('input, textarea, select, [contenteditable="true"]');

// ---- Paint -----------------------------------------------------------------------------

export function paintInitialState() {
  return {
    tab: 'home',
    tool: 'pencil',
    previous: 'pencil',
    shape: 'rectangle',
    colours: ['#000000', '#ffffff'],
    slot: 0,
    size: DEFAULT_SIZE,
    zoom: 100,
    width: PAINT_SIZE.width,
    height: PAINT_SIZE.height,
    canUndo: false,
    canRedo: false,
  };
}

const PAINT_TOOL_IDS = ['pencil', 'brush', 'eraser', 'fill', 'text', 'picker', 'zoom', 'shape'];
const paintText = (state) => {
  const size = Math.max(12, state.size * 3);
  return { weight: '400', size, line: Math.round(size * 1.25), colour: state.colours[0] };
};

/**
 * Paint. Finds its parts inside root by their data attributes, draws on the
 * canvas there, and reports its state through onChange after every change.
 * isActive says whether its window has focus, for the keyboard shortcuts.
 */
export function createPaint(root, options = {}) {
  const onChange = options.onChange ?? (() => {});
  const isActive = options.isActive ?? (() => true);
  const canvas = root.querySelector('[data-paint-canvas]');
  const frame = root.querySelector('[data-paint-frame]');
  const viewport = root.querySelector('[data-paint-viewport]');
  const readout = root.querySelector('[data-paint-pointer]');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let state = paintInitialState();
  let history = emptyHistory();
  let gesture = null;
  let pending = null;

  const scale = () => state.zoom / 100;
  const whole = () => ctx.getImageData(0, 0, canvas.width, canvas.height);
  const emit = () => {
    state = { ...state, canUndo: history.done.length > 0, canRedo: history.undone.length > 0 };
    onChange(state);
  };
  const update = (changes) => {
    state = { ...state, ...changes };
    emit();
  };

  const text = createTextBox(root.querySelector('[data-paint-text]'), {
    scale,
    commit(at, value, look) {
      const before = whole();
      commit(before, drawText(ctx, at, value, look));
    },
  });

  function layout() {
    const s = scale();
    const shown = pending ?? state;
    frame.style.width = px(shown.width * s);
    frame.style.height = px(shown.height * s);
    canvas.style.width = px(state.width * s);
    canvas.style.height = px(state.height * s);
    canvas.style.imageRendering = state.zoom > 100 ? 'pixelated' : 'auto';
    text.place();
  }

  function blank(width, height) {
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    state = { ...state, width, height };
  }

  function record(step) {
    history = recordStep(history, step);
    emit();
  }

  /** Records what changed inside rect since before was taken. */
  function commit(before, rect) {
    const box = clampRect(rect, canvas.width, canvas.height);
    if (!box) return;
    record({
      layer: 'paint',
      x: box.x,
      y: box.y,
      before: new ImageData(cropPixels(before, box), box.width, box.height),
      after: ctx.getImageData(box.x, box.y, box.width, box.height),
    });
  }

  function restore(step, image) {
    if (step.resize) blank(image.width, image.height);
    ctx.putImageData(image, step.x, step.y);
    layout();
  }

  function resizeTo(size, keep) {
    const before = whole();
    blank(size.width, size.height);
    if (keep) ctx.putImageData(before, 0, 0);
    layout();
    record({ layer: 'paint', x: 0, y: 0, before, after: whole(), resize: true });
  }

  function zoomTo(zoom, anchor) {
    const next = clampZoom(zoom);
    if (next === state.zoom) return;
    zoomAround(viewport, canvas, state.zoom, next, anchor, () => {
      state = { ...state, zoom: next };
      layout();
    });
    emit();
  }

  const zoomBy = (direction, anchor) => zoomTo(zoomStep(state.zoom, direction), anchor);

  const commands = {
    new: () => resizeTo(PAINT_SIZE, false),
    save: () => saveImage(canvas, 'painting.png'),
    clear: () => {
      const before = whole();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      commit(before, { x: 0, y: 0, width: canvas.width, height: canvas.height });
    },
    undo: () => {
      text.close(true);
      const result = undoStep(history);
      if (!result) return;
      history = result.history;
      restore(result.step, result.step.before);
      emit();
    },
    redo: () => {
      text.close(true);
      const result = redoStep(history);
      if (!result) return;
      history = result.history;
      restore(result.step, result.step.after);
      emit();
    },
    zoomIn: () => zoomBy(1),
    zoomOut: () => zoomBy(-1),
    zoomReset: () => zoomTo(100),
  };

  function run(id) {
    if (commandState(id, state).disabled) return;
    commands[id]?.();
  }

  // Pencil and eraser stamp hard squares, as Paint's do; the brush is soft and round.
  function stamp(point, g) {
    const half = Math.floor(g.size / 2);
    ctx.fillStyle = g.colour;
    ctx.fillRect(point.x - half, point.y - half, g.size, g.size);
  }

  function extend(g, to, constrain) {
    if (g.tool === 'shape') {
      const snap = (p) => ({ x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5 });
      const from = snap(g.from);
      const end = snap(shapeEnd(g.shape, g.from, to, constrain));
      ctx.putImageData(g.before, 0, 0);
      strokeOutline(ctx, shapeOutline(g.shape, from, end), g.colour, g.size);
      g.bounds = pointsBounds([from, end], g.size + 2);
    } else if (g.tool === 'brush') {
      brushSegment(ctx, g.last, to, g.colour, g.size, false);
      g.bounds = unionRect(g.bounds, pointsBounds([g.last, to], g.size / 2 + 2));
    } else {
      for (const point of linePoints(g.last.x, g.last.y, to.x, to.y)) stamp(point, g);
      g.bounds = unionRect(g.bounds, pointsBounds([g.last, to], g.size + 1));
    }
    g.last = to;
  }

  function showPointer(event) {
    if (!readout) return;
    const at = canvasPixel(event.clientX, event.clientY, canvas.getBoundingClientRect(), canvas.width, canvas.height);
    readout.textContent = `${at.x}, ${at.y}px`;
  }

  function onDown(event) {
    if (gesture || (event.button !== 0 && event.button !== 2)) return;
    event.preventDefault();
    text.close(true);
    const rect = canvas.getBoundingClientRect();
    const at = canvasPixel(event.clientX, event.clientY, rect, canvas.width, canvas.height);
    const slot = event.button === 2 ? 1 : 0;
    const colour = state.colours[slot];
    const { tool } = state;

    if (tool === 'picker') {
      const [r, g, b] = ctx.getImageData(at.x, at.y, 1, 1).data;
      const colours = [...state.colours];
      colours[slot] = toHex(r, g, b);
      update({ colours, slot, tool: state.previous });
      return;
    }
    if (tool === 'fill') {
      const before = whole();
      const image = whole();
      const box = floodFill(image.data, image.width, image.height, at.x, at.y, parseColour(colour));
      if (!box) return;
      ctx.putImageData(image, 0, 0, box.x, box.y, box.width, box.height);
      commit(before, box);
      return;
    }
    if (tool === 'zoom') {
      zoomBy(slot ? -1 : 1, { x: event.clientX, y: event.clientY });
      return;
    }

    capture(canvas, event.pointerId);
    const from = canvasPosition(event.clientX, event.clientY, rect, canvas.width, canvas.height);
    gesture = {
      id: event.pointerId,
      tool,
      shape: state.shape,
      colour: tool === 'eraser' ? state.colours[1] : colour,
      size: state.size,
      at,
      from,
      last: from,
      before: tool === 'text' ? null : whole(),
      bounds: null,
    };
    if (tool !== 'text' && tool !== 'shape') extend(gesture, from, false);
  }

  function onMove(event) {
    showPointer(event);
    const g = gesture;
    if (!g || event.pointerId !== g.id || g.tool === 'text') return;
    const rect = canvas.getBoundingClientRect();
    for (const move of pointerMoves(event)) {
      extend(g, canvasPosition(move.clientX, move.clientY, rect, canvas.width, canvas.height), move.shiftKey);
    }
  }

  function onUp(event) {
    const g = gesture;
    if (!g || event.pointerId !== g.id) return;
    gesture = null;
    if (g.tool === 'text') {
      // Opened on release, so the press cannot take its focus away again.
      if (event.type === 'pointerup') text.open(g.at, paintText(state));
      return;
    }
    if (g.bounds) commit(g.before, g.bounds);
  }

  function onLeave() {
    if (readout && !gesture) readout.textContent = '';
  }

  function onHandle(event) {
    const handle = event.target.closest?.('[data-paint-resize]');
    if (!handle || gesture || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    text.close(true);
    const edge = handle.getAttribute('data-paint-resize');
    const start = { width: canvas.width, height: canvas.height };
    const s = scale();
    capture(handle, event.pointerId);
    const move = (e) => {
      pending = resizeCanvas(start, { x: (e.clientX - event.clientX) / s, y: (e.clientY - event.clientY) / s }, edge);
      layout();
    };
    const end = (e) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      const size = pending;
      pending = null;
      if (e.type === 'pointerup' && size && (size.width !== start.width || size.height !== start.height)) resizeTo(size, true);
      else layout();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function onWheel(event) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1 : -1, { x: event.clientX, y: event.clientY });
  }

  function onKey(event) {
    if (event.defaultPrevented || !isActive() || editable(event.target)) return;
    const command = drawingShortcut(event, 'paint');
    if (!command) return;
    event.preventDefault();
    run(command);
  }

  const noMenu = (event) => event.preventDefault();

  blank(PAINT_SIZE.width, PAINT_SIZE.height);
  layout();
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('contextmenu', noMenu);
  frame.addEventListener('pointerdown', onHandle);
  viewport.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);

  return {
    get state() {
      return state;
    },
    setTab(tab) {
      if (PAINT_TABS.some((item) => item.id === tab)) update({ tab });
    },
    setTool(tool) {
      if (!PAINT_TOOL_IDS.includes(tool)) return;
      text.close(true);
      update({ tool, previous: tool === 'picker' ? state.previous : tool });
    },
    setShape(shape) {
      if (!PAINT_SHAPES.some((item) => item.id === shape)) return;
      text.close(true);
      update({ tool: 'shape', shape, previous: 'shape' });
    },
    setSize(size) {
      update({ size: clampSize(size) });
    },
    setSlot(slot) {
      update({ slot: slot ? 1 : 0 });
    },
    setColour(value) {
      const rgb = parseColour(value);
      if (!rgb) return;
      const colours = [...state.colours];
      colours[state.slot] = toHex(rgb.r, rgb.g, rgb.b);
      update({ colours });
    },
    setZoom(zoom) {
      zoomTo(zoom);
    },
    run,
    dispose() {
      text.dispose();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('contextmenu', noMenu);
      frame.removeEventListener('pointerdown', onHandle);
      viewport.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      gesture = null;
    },
  };
}

// ---- Photoshop -------------------------------------------------------------------------

export function photoshopInitialState() {
  return {
    tool: 'brush',
    colour: '#0078d4',
    size: 8,
    zoom: 100,
    width: PS_SIZE.width,
    height: PS_SIZE.height,
    layers: [
      { id: 'l1', name: 'Background', visible: true, opacity: 100 },
      { id: 'l2', name: 'Logo', visible: true, opacity: 100 },
      { id: 'l3', name: 'Highlights', visible: true, opacity: 75 },
    ],
    active: 'l2',
    menu: null,
    canUndo: false,
    canRedo: false,
  };
}

const PS_TOOL_IDS = PS_TOOLS.map((tool) => tool.id);
const psText = (state) => {
  const size = Math.max(12, state.size * 3);
  return { weight: '700', size, line: Math.round(size * 1.2), colour: state.colour };
};

/** The document Photoshop opens with, one picture per layer. */
function drawStartingArt(layers) {
  const { width: w, height: h } = PS_SIZE;
  const background = layers.get('l1')?.ctx;
  if (background) {
    const gradient = background.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#0078d4');
    gradient.addColorStop(1, '#1e1e1e');
    background.fillStyle = gradient;
    background.fillRect(0, 0, w, h);
  }
  const logo = layers.get('l2')?.ctx;
  if (logo) {
    logo.save();
    logo.textAlign = 'center';
    logo.fillStyle = '#ffffff';
    logo.font = `700 64px ${TEXT_FAMILY}`;
    logo.fillText('Portfolio OS', w / 2, h / 2 - 10);
    logo.font = `500 18px ${TEXT_FAMILY}`;
    logo.fillStyle = 'rgba(255, 255, 255, 0.7)';
    logo.fillText('untitled-1.psd', w / 2, h / 2 + 24);
    logo.restore();
  }
  const highlights = layers.get('l3')?.ctx;
  if (highlights) {
    for (const [x, y, r] of [[150, 110, 190], [600, 400, 140]]) {
      const glow = highlights.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      highlights.fillStyle = glow;
      highlights.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
}

/**
 * Photoshop. Every layer is a canvas of its own, stacked inside the element
 * marked data-ps-stack, so hiding a layer or changing its opacity is what
 * you see, and the export flattens the visible ones. Drawing goes to the
 * selected layer. Reports its state through onChange after every change.
 */
export function createPhotoshop(root, options = {}) {
  const onChange = options.onChange ?? (() => {});
  const isActive = options.isActive ?? (() => true);
  const stack = root.querySelector('[data-ps-stack]');
  const frame = root.querySelector('[data-ps-frame]');
  const viewport = root.querySelector('[data-ps-viewport]');
  const { width: W, height: H } = PS_SIZE;

  let state = photoshopInitialState();
  let history = emptyHistory();
  let gesture = null;
  let thumbsQueued = 0;
  const surfaces = new Map();

  const scale = () => state.zoom / 100;
  const emit = () => {
    state = { ...state, canUndo: history.done.length > 0, canRedo: history.undone.length > 0 };
    onChange(state);
    queueThumbs();
  };
  const update = (changes) => {
    state = { ...state, ...changes };
    emit();
  };
  const layerById = (id) => state.layers.find((layer) => layer.id === id);
  const active = () => surfaces.get(state.active);

  const text = createTextBox(root.querySelector('[data-ps-text]'), {
    scale,
    commit(at, value, look) {
      const surface = active();
      if (!surface) return;
      const before = surface.ctx.getImageData(0, 0, W, H);
      commit(state.active, before, drawText(surface.ctx, at, value, look));
    },
  });

  function makeSurface(id) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.className = 'ps-layer';
    canvas.setAttribute('data-ps-layer', id);
    const surface = { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }) };
    surfaces.set(id, surface);
    return surface;
  }

  /** Puts the layer canvases in order and shows each as its layer says. */
  function syncLayers() {
    for (const [id, surface] of surfaces) {
      if (!layerById(id)) {
        surface.canvas.remove();
        surfaces.delete(id);
      }
    }
    for (const layer of state.layers) {
      const surface = surfaces.get(layer.id) ?? makeSurface(layer.id);
      stack.appendChild(surface.canvas);
      surface.canvas.hidden = !layer.visible;
      surface.canvas.style.opacity = String(layer.opacity / 100);
    }
  }

  function layout() {
    const s = scale();
    frame.style.width = px(W * s);
    frame.style.height = px(H * s);
    stack.dataset.pixelated = String(state.zoom > 100);
    text.place();
  }

  function queueThumbs() {
    if (thumbsQueued || typeof requestAnimationFrame !== 'function') return;
    thumbsQueued = requestAnimationFrame(() => {
      thumbsQueued = 0;
      for (const layer of state.layers) {
        const thumb = root.querySelector(`[data-ps-thumb="${layer.id}"]`);
        const surface = surfaces.get(layer.id);
        const ctx = thumb?.getContext?.('2d');
        if (!ctx || !surface) continue;
        ctx.clearRect(0, 0, thumb.width, thumb.height);
        ctx.drawImage(surface.canvas, 0, 0, thumb.width, thumb.height);
      }
    });
  }

  function commit(layer, before, rect) {
    const surface = surfaces.get(layer);
    const box = rect && clampRect(rect, W, H);
    if (!surface || !box) return;
    history = recordStep(history, {
      layer,
      x: box.x,
      y: box.y,
      before: new ImageData(cropPixels(before, box), box.width, box.height),
      after: surface.ctx.getImageData(box.x, box.y, box.width, box.height),
    });
    emit();
  }

  function restore(step, image) {
    const surface = surfaces.get(step.layer);
    if (!surface) return;
    surface.ctx.clearRect(step.x, step.y, image.width, image.height);
    surface.ctx.putImageData(image, step.x, step.y);
  }

  function zoomTo(zoom, anchor) {
    const next = clampZoom(zoom);
    if (next === state.zoom) return;
    zoomAround(viewport, stack, state.zoom, next, anchor, () => {
      state = { ...state, zoom: next };
      layout();
    });
    emit();
  }

  function startDocument(blank) {
    text.close(false);
    for (const surface of surfaces.values()) surface.canvas.remove();
    surfaces.clear();
    const fresh = photoshopInitialState();
    const layers = blank ? [{ id: 'l1', name: 'Background', visible: true, opacity: 100 }] : fresh.layers;
    state = { ...state, layers, active: blank ? 'l1' : fresh.active, menu: null };
    syncLayers();
    if (blank) {
      const { ctx } = surfaces.get('l1');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
    } else {
      drawStartingArt(surfaces);
    }
    history = emptyHistory();
  }

  function changeLayer(id, changes) {
    if (!layerById(id)) return;
    state = { ...state, layers: state.layers.map((layer) => (layer.id === id ? { ...layer, ...changes } : layer)) };
    syncLayers();
    emit();
  }

  function newLayer() {
    if (state.layers.length >= MAX_LAYERS) return;
    let n = state.layers.length + 1;
    while (state.layers.some((layer) => layer.id === `l${n}` || layer.name === `Layer ${n}`)) n += 1;
    const layer = { id: `l${n}`, name: `Layer ${n}`, visible: true, opacity: 100 };
    const at = state.layers.findIndex((item) => item.id === state.active) + 1;
    const layers = [...state.layers];
    layers.splice(at, 0, layer);
    state = { ...state, layers, active: layer.id };
    syncLayers();
    emit();
  }

  function deleteLayer() {
    if (state.layers.length <= 1) return;
    text.close(false);
    const index = state.layers.findIndex((layer) => layer.id === state.active);
    const layers = state.layers.filter((layer) => layer.id !== state.active);
    history = forgetLayer(history, state.active);
    state = { ...state, layers, active: layers[Math.max(0, index - 1)].id };
    syncLayers();
    emit();
  }

  const commands = {
    new: () => {
      startDocument(true);
      emit();
    },
    save: () => {
      const out = document.createElement('canvas');
      out.width = W;
      out.height = H;
      const ctx = out.getContext('2d');
      for (const layer of state.layers) {
        if (!layer.visible) continue;
        ctx.globalAlpha = layer.opacity / 100;
        ctx.drawImage(surfaces.get(layer.id).canvas, 0, 0);
      }
      saveImage(out, 'untitled-1.png');
    },
    undo: () => {
      text.close(true);
      const result = undoStep(history);
      if (!result) return;
      history = result.history;
      restore(result.step, result.step.before);
      emit();
    },
    redo: () => {
      text.close(true);
      const result = redoStep(history);
      if (!result) return;
      history = result.history;
      restore(result.step, result.step.after);
      emit();
    },
    clearLayer: () => {
      const surface = active();
      if (!surface) return;
      const before = surface.ctx.getImageData(0, 0, W, H);
      surface.ctx.clearRect(0, 0, W, H);
      commit(state.active, before, { x: 0, y: 0, width: W, height: H });
    },
    newLayer,
    deleteLayer,
    zoomIn: () => zoomTo(zoomStep(state.zoom, 1)),
    zoomOut: () => zoomTo(zoomStep(state.zoom, -1)),
    zoomReset: () => zoomTo(100),
  };

  /** Runs a menu command, a tool letter or a size key, and closes any open menu. */
  function run(id) {
    state = { ...state, menu: null };
    if (id.startsWith('tool:')) setTool(id.slice(5));
    else if (id === 'sizeUp' || id === 'sizeDown') state = { ...state, size: clampSize(state.size + (id === 'sizeUp' ? 1 : -1)) };
    else if (!commandState(id, state).disabled) commands[id]();
    emit();
  }

  function setTool(tool) {
    if (!PS_TOOL_IDS.includes(tool)) return;
    text.close(true);
    update({ tool });
  }

  function extend(g, event, to) {
    const { ctx } = surfaces.get(g.layer);
    if (g.tool === 'move') {
      const dx = Math.round((event.clientX - g.start.x) / scale());
      const dy = Math.round((event.clientY - g.start.y) / scale());
      ctx.clearRect(0, 0, W, H);
      ctx.putImageData(g.before, dx, dy);
      g.bounds = { x: 0, y: 0, width: W, height: H };
    } else {
      brushSegment(ctx, g.last, to, g.colour, g.size, g.tool === 'eraser');
      g.bounds = unionRect(g.bounds, pointsBounds([g.last, to], g.size / 2 + 2));
    }
    g.last = to;
  }

  function onDown(event) {
    if (gesture || event.button !== 0) return;
    event.preventDefault();
    text.close(true);
    const surface = active();
    if (!surface) return;
    const rect = stack.getBoundingClientRect();
    const at = canvasPixel(event.clientX, event.clientY, rect, W, H);
    if (state.tool === 'bucket') {
      const before = surface.ctx.getImageData(0, 0, W, H);
      const image = surface.ctx.getImageData(0, 0, W, H);
      const box = floodFill(image.data, W, H, at.x, at.y, parseColour(state.colour));
      if (!box) return;
      surface.ctx.putImageData(image, 0, 0, box.x, box.y, box.width, box.height);
      commit(state.active, before, box);
      return;
    }
    capture(stack, event.pointerId);
    const from = canvasPosition(event.clientX, event.clientY, rect, W, H);
    gesture = {
      id: event.pointerId,
      tool: state.tool,
      layer: state.active,
      colour: state.colour,
      size: state.size,
      at,
      from,
      last: from,
      start: { x: event.clientX, y: event.clientY },
      before: state.tool === 'text' ? null : surface.ctx.getImageData(0, 0, W, H),
      bounds: null,
    };
    if (state.tool === 'brush' || state.tool === 'eraser') extend(gesture, event, from);
  }

  function onMove(event) {
    const g = gesture;
    if (!g || event.pointerId !== g.id || g.tool === 'text') return;
    const rect = stack.getBoundingClientRect();
    for (const move of pointerMoves(event)) extend(g, move, canvasPosition(move.clientX, move.clientY, rect, W, H));
  }

  function onUp(event) {
    const g = gesture;
    if (!g || event.pointerId !== g.id) return;
    gesture = null;
    if (g.tool === 'text') {
      if (event.type === 'pointerup') text.open(g.at, psText(state));
      return;
    }
    if (g.bounds) commit(g.layer, g.before, g.bounds);
  }

  function onWheel(event) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoomTo(zoomStep(state.zoom, event.deltaY < 0 ? 1 : -1), { x: event.clientX, y: event.clientY });
  }

  function onKey(event) {
    if (event.defaultPrevented || !isActive() || editable(event.target)) return;
    if (event.key === 'Escape' && state.menu) {
      update({ menu: null });
      return;
    }
    const command = drawingShortcut(event, 'photoshop');
    if (!command) return;
    event.preventDefault();
    run(command);
  }

  const noMenu = (event) => event.preventDefault();

  startDocument(false);
  layout();
  stack.addEventListener('pointerdown', onDown);
  stack.addEventListener('pointermove', onMove);
  stack.addEventListener('pointerup', onUp);
  stack.addEventListener('pointercancel', onUp);
  stack.addEventListener('contextmenu', noMenu);
  viewport.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  queueThumbs();

  return {
    get state() {
      return state;
    },
    setTool,
    setColour(value) {
      const rgb = parseColour(value);
      if (rgb) update({ colour: toHex(rgb.r, rgb.g, rgb.b) });
    },
    setSize(size) {
      update({ size: clampSize(size) });
    },
    setZoom(zoom) {
      zoomTo(zoom);
    },
    selectLayer(id) {
      if (layerById(id)) update({ active: id });
    },
    toggleLayer(id) {
      const layer = layerById(id);
      if (layer) changeLayer(id, { visible: !layer.visible });
    },
    setOpacity(id, value) {
      changeLayer(id, { opacity: clamp(Math.round(finite(value, 100)), 0, 100) });
    },
    toggleMenu(id) {
      update({ menu: state.menu === id ? null : id });
    },
    closeMenu() {
      if (state.menu) update({ menu: null });
    },
    run,
    dispose() {
      text.dispose();
      if (thumbsQueued) cancelAnimationFrame(thumbsQueued);
      thumbsQueued = 0;
      stack.removeEventListener('pointerdown', onDown);
      stack.removeEventListener('pointermove', onMove);
      stack.removeEventListener('pointerup', onUp);
      stack.removeEventListener('pointercancel', onUp);
      stack.removeEventListener('contextmenu', noMenu);
      viewport.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      for (const surface of surfaces.values()) surface.canvas.remove();
      surfaces.clear();
      gesture = null;
    },
  };
}
