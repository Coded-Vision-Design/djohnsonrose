// Scanline-stack flood fill — pure function so we can unit-test it without a
// real canvas. Mirrors the algorithm in v1's paint.js exactly.
export function floodFill(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  fill: { r: number; g: number; b: number },
): void {
  const idx = (px: number, py: number) => (py * w + px) * 4
  const start = idx(x, y)
  const tr = data[start]
  const tg = data[start + 1]
  const tb = data[start + 2]
  const ta = data[start + 3]
  if (tr === fill.r && tg === fill.g && tb === fill.b && ta === 255) return

  const stack: number[] = [x, y]
  while (stack.length) {
    const py = stack.pop()!
    const px = stack.pop()!
    const i = idx(px, py)
    if (
      data[i] === tr &&
      data[i + 1] === tg &&
      data[i + 2] === tb &&
      data[i + 3] === ta
    ) {
      data[i] = fill.r
      data[i + 1] = fill.g
      data[i + 2] = fill.b
      data[i + 3] = 255
      if (px > 0) stack.push(px - 1, py)
      if (px < w - 1) stack.push(px + 1, py)
      if (py > 0) stack.push(px, py - 1)
      if (py < h - 1) stack.push(px, py + 1)
    }
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const v = (r << 16) | (g << 8) | b
  return `#${v.toString(16).padStart(6, '0')}`
}
