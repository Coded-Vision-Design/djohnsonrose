import { describe, it, expect } from 'vitest'
import { floodFill, hexToRgb, rgbToHex } from './floodFill'

// Helpers to read a single pixel out of an RGBA buffer for easier assertions.
const px = (data: Uint8ClampedArray, w: number, x: number, y: number) => {
  const i = (y * w + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const
}

const fillBuffer = (
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = a
  }
  return data
}

describe('paint flood fill', () => {
  describe('hexToRgb / rgbToHex', () => {
    it('round-trips black/white', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
      expect(rgbToHex(0, 0, 0)).toBe('#000000')
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
    })

    it('rgbToHex pads short hex correctly', () => {
      expect(rgbToHex(0, 0, 15)).toBe('#00000f')
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
    })
  })

  describe('floodFill', () => {
    it('fills a uniform 4x4 white canvas with red', () => {
      const data = fillBuffer(4, 4, 255, 255, 255)
      floodFill(data, 4, 4, 0, 0, { r: 255, g: 0, b: 0 })
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          expect(px(data, 4, x, y)).toEqual([255, 0, 0, 255])
        }
      }
    })

    it('does not cross a black boundary', () => {
      const w = 5
      const h = 5
      const data = fillBuffer(w, h, 255, 255, 255)
      // Vertical black line at x=2 — splits the canvas in half.
      for (let y = 0; y < h; y++) {
        const i = (y * w + 2) * 4
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      }
      // Fill the left half from (0,0).
      floodFill(data, w, h, 0, 0, { r: 255, g: 0, b: 0 })
      // Left half should be red.
      expect(px(data, w, 0, 0)).toEqual([255, 0, 0, 255])
      expect(px(data, w, 1, 4)).toEqual([255, 0, 0, 255])
      // Black line untouched.
      expect(px(data, w, 2, 0)).toEqual([0, 0, 0, 255])
      // Right half still white.
      expect(px(data, w, 3, 0)).toEqual([255, 255, 255, 255])
      expect(px(data, w, 4, 4)).toEqual([255, 255, 255, 255])
    })

    it('is a no-op when the seed pixel already matches the fill colour', () => {
      const data = fillBuffer(3, 3, 100, 200, 50)
      const snapshot = Uint8ClampedArray.from(data)
      floodFill(data, 3, 3, 1, 1, { r: 100, g: 200, b: 50 })
      expect(data).toEqual(snapshot)
    })

    it('handles a 1x1 canvas', () => {
      const data = fillBuffer(1, 1, 255, 255, 255)
      floodFill(data, 1, 1, 0, 0, { r: 0, g: 128, b: 255 })
      expect(px(data, 1, 0, 0)).toEqual([0, 128, 255, 255])
    })
  })
})
