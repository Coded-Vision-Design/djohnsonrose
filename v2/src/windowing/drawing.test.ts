import { describe, it, expect } from 'vitest'
import {
  HISTORY_LIMIT,
  MAX_CANVAS,
  MAX_SIZE,
  MAX_ZOOM,
  MIN_CANVAS,
  MIN_SIZE,
  MIN_ZOOM,
  PAINT_PALETTE,
  PS_MENUS,
  ZOOM_LEVELS,
  canvasPixel,
  canvasPosition,
  clampRect,
  clampSize,
  clampZoom,
  commandState,
  cropPixels,
  drawingShortcut,
  emptyHistory,
  floodFill,
  forgetLayer,
  linePoints,
  paintInitialState,
  parseColour,
  photoshopInitialState,
  pointsBounds,
  recordStep,
  redoStep,
  resizeCanvas,
  shapeEnd,
  shapeOutline,
  textLines,
  toHex,
  undoStep,
  unionRect,
  zoomIndex,
  zoomStep,
} from '../../../assets/js/windowing/drawing.js'

// The drawing rules Paint and Photoshop share in both builds. The controllers
// that use them on a real canvas are covered by e2e/drawing.spec.ts.

const px = (data: Uint8ClampedArray, w: number, x: number, y: number) => {
  const i = (y * w + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

const solid = (w: number, h: number, r: number, g: number, b: number, a = 255) => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i += 4) data.set([r, g, b, a], i)
  return data
}

const RED = { r: 255, g: 0, b: 0 }

describe('colours', () => {
  it('reads six and three digit hex', () => {
    expect(parseColour('#ff7f27')).toEqual({ r: 255, g: 127, b: 39 })
    expect(parseColour('#0Af')).toEqual({ r: 0, g: 170, b: 255 })
    expect(parseColour('  #000000 ')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('refuses anything that is not a colour', () => {
    expect(parseColour('red')).toBeNull()
    expect(parseColour('#12345')).toBeNull()
    expect(parseColour('#gggggg')).toBeNull()
    expect(parseColour(undefined)).toBeNull()
  })

  it('writes hex, padding small values and clamping out of range ones', () => {
    expect(toHex(0, 0, 15)).toBe('#00000f')
    expect(toHex(255, 255, 255)).toBe('#ffffff')
    expect(toHex(300, -4, 127.6)).toBe('#ff0080')
    expect(toHex(Number.NaN, 0, 0)).toBe('#000000')
  })

  it('round-trips every colour in the palette', () => {
    for (const { hex } of PAINT_PALETTE) {
      const { r, g, b } = parseColour(hex)!
      expect(toHex(r, g, b)).toBe(hex)
    }
  })
})

describe('canvas points', () => {
  const rect = { left: 100, top: 50, width: 800, height: 600 }

  it('maps a pointer to the pixel under it', () => {
    expect(canvasPixel(100, 50, rect, 800, 600)).toEqual({ x: 0, y: 0 })
    expect(canvasPixel(500.7, 350.2, rect, 800, 600)).toEqual({ x: 400, y: 300 })
  })

  it('keeps the far edge inside the canvas, where rounding gave the height', () => {
    // Math.round gave 600 here, one past the last row, and the fill never ended.
    expect(canvasPixel(899.6, 649.6, rect, 800, 600)).toEqual({ x: 799, y: 599 })
    expect(canvasPixel(900, 650, rect, 800, 600)).toEqual({ x: 799, y: 599 })
  })

  it('scales by the zoom the canvas is shown at', () => {
    const zoomed = { left: 0, top: 0, width: 1600, height: 1200 }
    expect(canvasPixel(801, 3, zoomed, 800, 600)).toEqual({ x: 400, y: 1 })
    expect(canvasPosition(801, 3, zoomed, 800, 600)).toEqual({ x: 400.5, y: 1.5 })
  })

  it('clamps points outside the canvas, and survives an empty box', () => {
    expect(canvasPixel(-20, 2000, rect, 800, 600)).toEqual({ x: 0, y: 599 })
    expect(canvasPixel(10, 10, { left: 0, top: 0, width: 0, height: 0 }, 800, 600)).toEqual({ x: 0, y: 0 })
    expect(canvasPosition(Number.NaN, 10, rect, 800, 600)).toEqual({ x: 0, y: -40 })
  })
})

describe('linePoints', () => {
  it('walks a straight line pixel by pixel, both ends included', () => {
    expect(linePoints(0, 0, 3, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ])
  })

  it('handles diagonals, steep lines and going backwards', () => {
    expect(linePoints(0, 0, 2, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ])
    const steep = linePoints(5, 9, 4, 0)
    expect(steep).toHaveLength(10)
    expect(steep[0]).toEqual({ x: 5, y: 9 })
    expect(steep.at(-1)).toEqual({ x: 4, y: 0 })
  })

  it('gives one point for a dot and none for nonsense', () => {
    expect(linePoints(2.7, 3.2, 2.1, 3.9)).toEqual([{ x: 2, y: 3 }])
    expect(linePoints(Number.NaN, 0, 4, 4)).toEqual([])
  })
})

describe('floodFill', () => {
  it('fills a uniform canvas and reports the box it changed', () => {
    const data = solid(4, 4, 255, 255, 255)
    const box = floodFill(data, 4, 4, 1, 2, RED)
    expect(box).toEqual({ x: 0, y: 0, width: 4, height: 4, count: 16 })
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) expect(px(data, 4, x, y)).toEqual([255, 0, 0, 255])
  })

  it('stops at a different colour', () => {
    const w = 5
    const data = solid(w, 5, 255, 255, 255)
    for (let y = 0; y < 5; y++) data.set([0, 0, 0, 255], (y * w + 2) * 4)
    const box = floodFill(data, w, 5, 0, 0, RED)
    expect(box).toEqual({ x: 0, y: 0, width: 2, height: 5, count: 10 })
    expect(px(data, w, 1, 4)).toEqual([255, 0, 0, 255])
    expect(px(data, w, 2, 0)).toEqual([0, 0, 0, 255])
    expect(px(data, w, 3, 0)).toEqual([255, 255, 255, 255])
  })

  it('fills from every corner and edge of the canvas', () => {
    const w = 6
    const h = 4
    for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1], [3, h - 1], [w - 1, 2]]) {
      const data = solid(w, h, 255, 255, 255)
      expect(floodFill(data, w, h, x, y, RED)?.count).toBe(w * h)
    }
  })

  it('does nothing, and ends, for a seed off the canvas', () => {
    const data = solid(4, 3, 255, 255, 255)
    const before = Uint8ClampedArray.from(data)
    // y = height is what Math.round used to hand it.
    expect(floodFill(data, 4, 3, 2, 3, RED)).toBeNull()
    expect(floodFill(data, 4, 3, 4, 0, RED)).toBeNull()
    expect(floodFill(data, 4, 3, -1, 0, RED)).toBeNull()
    expect(floodFill(data, 4, 3, Number.NaN, 0, RED)).toBeNull()
    expect(data).toEqual(before)
  })

  it('floors a fractional seed rather than missing the canvas', () => {
    const data = solid(3, 3, 255, 255, 255)
    expect(floodFill(data, 3, 3, 2.9, 2.9, RED)?.count).toBe(9)
  })

  it('is a no-op when the seed already has the fill colour', () => {
    const data = solid(3, 3, 100, 200, 50)
    const before = Uint8ClampedArray.from(data)
    expect(floodFill(data, 3, 3, 1, 1, { r: 100, g: 200, b: 50 })).toBeNull()
    expect(data).toEqual(before)
  })

  it('ends even when the colour is out of range or the buffer is short', () => {
    const data = solid(3, 3, 255, 255, 255)
    // 300 is stored as 255, which used to match the target forever.
    expect(floodFill(data, 3, 3, 0, 0, { r: 300, g: 255, b: 255, a: 254 })?.count).toBe(9)
    expect(px(data, 3, 2, 2)).toEqual([255, 255, 255, 254])
    expect(floodFill(new Uint8ClampedArray(8), 3, 3, 0, 0, RED)).toBeNull()
    expect(floodFill(solid(3, 3, 0, 0, 0), 3, 3, 0, 0, null)).toBeNull()
  })

  it('fills transparent pixels on a layer, leaving painted ones alone', () => {
    const data = solid(3, 1, 0, 0, 0, 0)
    data.set([10, 20, 30, 255], 4)
    expect(floodFill(data, 3, 1, 0, 0, RED)?.count).toBe(1)
    expect(px(data, 3, 2, 0)).toEqual([0, 0, 0, 0])
  })

  it('handles a large canvas quickly, from its last pixel', () => {
    const data = solid(800, 600, 255, 255, 255)
    const started = performance.now()
    expect(floodFill(data, 800, 600, 799, 599, RED)?.count).toBe(800 * 600)
    expect(performance.now() - started).toBeLessThan(2000)
  })
})

describe('boxes', () => {
  it('bounds points with padding, and joins boxes', () => {
    expect(pointsBounds([{ x: 10, y: 5 }, { x: 4, y: 9 }], 2)).toEqual({ x: 2, y: 3, width: 10, height: 8 })
    expect(pointsBounds([], 2)).toBeNull()
    expect(unionRect(null, { x: 1, y: 1, width: 2, height: 2 })).toEqual({ x: 1, y: 1, width: 2, height: 2 })
    expect(unionRect({ x: 0, y: 0, width: 2, height: 2 }, { x: 5, y: 1, width: 1, height: 4 })).toEqual({
      x: 0,
      y: 0,
      width: 6,
      height: 5,
    })
  })

  it('clamps a box to whole pixels on the canvas, or gives null when it misses', () => {
    expect(clampRect({ x: -3.5, y: 2.2, width: 10, height: 4 }, 5, 5)).toEqual({ x: 0, y: 2, width: 5, height: 3 })
    expect(clampRect({ x: 9, y: 0, width: 4, height: 4 }, 5, 5)).toBeNull()
    expect(clampRect({ x: 1, y: 1, width: 0, height: 3 }, 5, 5)).toBeNull()
  })

  it('crops pixels out of an image', () => {
    const image = { width: 3, height: 2, data: new Uint8ClampedArray(24).map((_, i) => i) }
    expect(Array.from(cropPixels(image, { x: 1, y: 1, width: 2, height: 1 }))).toEqual([16, 17, 18, 19, 20, 21, 22, 23])
    expect(cropPixels(image, { x: 0, y: 0, width: 0, height: 0 })).toHaveLength(0)
  })
})

describe('zoom', () => {
  it('steps through the zoom levels from anywhere', () => {
    expect(zoomStep(100, 1)).toBe(150)
    expect(zoomStep(100, -1)).toBe(75)
    expect(zoomStep(120, 1)).toBe(150)
    expect(zoomStep(120, -1)).toBe(100)
  })

  it('stops at the ends', () => {
    expect(zoomStep(MAX_ZOOM, 1)).toBe(MAX_ZOOM)
    expect(zoomStep(MIN_ZOOM, -1)).toBe(MIN_ZOOM)
  })

  it('clamps and repairs a zoom value, and finds the nearest level', () => {
    expect(clampZoom(5000)).toBe(MAX_ZOOM)
    expect(clampZoom(1)).toBe(MIN_ZOOM)
    expect(clampZoom('abc')).toBe(100)
    expect(clampZoom(149.6)).toBe(150)
    expect(zoomIndex(100)).toBe(ZOOM_LEVELS.indexOf(100))
    expect(zoomIndex(170)).toBe(ZOOM_LEVELS.indexOf(150))
    expect(zoomIndex(Number.NaN)).toBe(ZOOM_LEVELS.indexOf(100))
  })
})

describe('sizes', () => {
  it('keeps the brush size whole and in range', () => {
    expect(clampSize(4)).toBe(4)
    expect(clampSize(0)).toBe(MIN_SIZE)
    expect(clampSize(999)).toBe(MAX_SIZE)
    expect(clampSize('7.6')).toBe(8)
    expect(clampSize(undefined)).toBe(4)
  })

  it('resizes the canvas from the handle that was dragged', () => {
    const start = { width: 800, height: 600 }
    expect(resizeCanvas(start, { x: 40.4, y: 99 }, 'x')).toEqual({ width: 840, height: 600 })
    expect(resizeCanvas(start, { x: 40, y: -100 }, 'y')).toEqual({ width: 800, height: 500 })
    expect(resizeCanvas(start, { x: -10, y: 10 }, 'xy')).toEqual({ width: 790, height: 610 })
  })

  it('never makes the canvas smaller or larger than allowed', () => {
    const start = { width: 800, height: 600 }
    expect(resizeCanvas(start, { x: -5000, y: -5000 }, 'xy')).toEqual({ width: MIN_CANVAS, height: MIN_CANVAS })
    expect(resizeCanvas(start, { x: 1e9, y: 0 }, 'x')).toEqual({ width: MAX_CANVAS, height: 600 })
    expect(resizeCanvas(start, { x: Number.NaN, y: 3 }, 'nonsense')).toEqual(start)
  })
})

describe('shapes', () => {
  const from = { x: 10, y: 10 }

  it('outlines each shape inside the box that was dragged', () => {
    expect(shapeOutline('line', from, { x: 2, y: 30 })).toEqual({ kind: 'line', points: [from, { x: 2, y: 30 }] })
    expect(shapeOutline('rectangle', from, { x: 2, y: 30 })).toEqual({
      kind: 'polygon',
      points: [
        { x: 2, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 30 },
        { x: 2, y: 30 },
      ],
    })
    expect(shapeOutline('ellipse', from, { x: 30, y: 20 })).toEqual({ kind: 'ellipse', cx: 20, cy: 15, rx: 10, ry: 5 })
    expect(shapeOutline('rounded', from, { x: 30, y: 30 })).toEqual({
      kind: 'rounded',
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      radius: 5,
    })
    expect(shapeOutline('triangle', from, { x: 30, y: 30 })).toEqual({
      kind: 'polygon',
      points: [
        { x: 20, y: 10 },
        { x: 30, y: 30 },
        { x: 10, y: 30 },
      ],
    })
  })

  it('gives a star ten points, its first at the top centre', () => {
    const star = shapeOutline('star', { x: 0, y: 0 }, { x: 100, y: 100 })
    expect(star?.kind).toBe('polygon')
    const points = (star as { points: { x: number; y: number }[] }).points
    expect(points).toHaveLength(10)
    expect(points[0].x).toBeCloseTo(50)
    expect(points[0].y).toBeCloseTo(0)
  })

  it('knows no other shapes', () => {
    expect(shapeOutline('hexagon', from, from)).toBeNull()
  })

  it('makes squares, circles and 45 degree lines while Shift is held', () => {
    expect(shapeEnd('rectangle', from, { x: 30, y: 15 }, true)).toEqual({ x: 30, y: 30 })
    expect(shapeEnd('ellipse', from, { x: 0, y: 40 }, true)).toEqual({ x: -20, y: 40 })
    expect(shapeEnd('line', from, { x: 40, y: 12 }, true)).toEqual({ x: 40, y: 10 })
    const diagonal = shapeEnd('line', from, { x: 30, y: 28 }, true)
    expect(diagonal.x - from.x).toBeCloseTo(diagonal.y - from.y)
    expect(shapeEnd('rectangle', from, { x: 30, y: 15 }, false)).toEqual({ x: 30, y: 15 })
  })
})

describe('text', () => {
  it('splits text into lines, whatever the line ends', () => {
    expect(textLines('one\r\ntwo\nthree')).toEqual(['one', 'two', 'three'])
    expect(textLines('')).toEqual([''])
  })
})

describe('history', () => {
  const step = (n: number, layer = 'paint') => ({ layer, x: 0, y: 0, before: `b${n}`, after: `a${n}` })

  it('undoes and redoes steps in order', () => {
    let history = recordStep(recordStep(emptyHistory(), step(1)), step(2))
    const undone = undoStep(history)!
    expect(undone.step).toEqual(step(2))
    history = undone.history
    const redone = redoStep(history)!
    expect(redone.step).toEqual(step(2))
    expect(redone.history.done).toHaveLength(2)
    expect(redone.history.undone).toHaveLength(0)
  })

  it('forgets what was undone once something new is drawn', () => {
    let history = recordStep(recordStep(emptyHistory(), step(1)), step(2))
    history = undoStep(history)!.history
    history = recordStep(history, step(3))
    expect(history.done.map((s) => s.before)).toEqual(['b1', 'b3'])
    expect(redoStep(history)).toBeNull()
  })

  it('keeps only the most recent steps', () => {
    let history = emptyHistory()
    for (let n = 0; n < HISTORY_LIMIT + 5; n++) history = recordStep(history, step(n))
    expect(history.done).toHaveLength(HISTORY_LIMIT)
    expect(history.done[0].before).toBe('b5')
    expect(recordStep(emptyHistory(), step(1), 0).done).toHaveLength(1)
  })

  it('has nothing to undo or redo when empty', () => {
    expect(undoStep(emptyHistory())).toBeNull()
    expect(redoStep(emptyHistory())).toBeNull()
  })

  it('drops the steps of a deleted layer and keeps the rest', () => {
    let history = recordStep(recordStep(recordStep(emptyHistory(), step(1, 'l1')), step(2, 'l2')), step(3, 'l1'))
    history = undoStep(history)!.history
    history = forgetLayer(history, 'l1')
    expect(history.done.map((s) => s.layer)).toEqual(['l2'])
    expect(history.undone).toEqual([])
  })
})

describe('shortcuts', () => {
  const key = (k: string, mods: Partial<KeyboardEvent> = {}) =>
    ({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods }) as KeyboardEvent

  it('maps undo, redo and zoom in both apps', () => {
    expect(drawingShortcut(key('z', { ctrlKey: true }), 'paint')).toBe('undo')
    expect(drawingShortcut(key('Z', { ctrlKey: true, shiftKey: true }), 'paint')).toBe('redo')
    expect(drawingShortcut(key('y', { metaKey: true }), 'photoshop')).toBe('redo')
    expect(drawingShortcut(key('=', { ctrlKey: true }), 'paint')).toBe('zoomIn')
    expect(drawingShortcut(key('-', { ctrlKey: true }), 'photoshop')).toBe('zoomOut')
    expect(drawingShortcut(key('0', { ctrlKey: true }), 'paint')).toBe('zoomReset')
  })

  it("gives Photoshop its tool letters, brush size keys and Delete", () => {
    expect(drawingShortcut(key('b'), 'photoshop')).toBe('tool:brush')
    expect(drawingShortcut(key('V'), 'photoshop')).toBe('tool:move')
    expect(drawingShortcut(key(']'), 'photoshop')).toBe('sizeUp')
    expect(drawingShortcut(key('['), 'photoshop')).toBe('sizeDown')
    expect(drawingShortcut(key('Delete'), 'photoshop')).toBe('clearLayer')
    expect(drawingShortcut(key('b'), 'paint')).toBeNull()
  })

  it('leaves everything else to the shell, including Ctrl+S and Alt', () => {
    expect(drawingShortcut(key('s', { ctrlKey: true }), 'paint')).toBeNull()
    expect(drawingShortcut(key('z', { ctrlKey: true, altKey: true }), 'paint')).toBeNull()
    expect(drawingShortcut(key('b', { ctrlKey: true }), 'photoshop')).toBeNull()
    expect(drawingShortcut(key('x'), 'photoshop')).toBeNull()
  })
})

describe('commands and menus', () => {
  it('greys out what cannot be done', () => {
    const paint = paintInitialState()
    expect(commandState('undo', paint).disabled).toBe(true)
    expect(commandState('undo', { ...paint, canUndo: true }).disabled).toBe(false)
    expect(commandState('zoomReset', paint).disabled).toBe(true)
    expect(commandState('zoomIn', { ...paint, zoom: MAX_ZOOM }).disabled).toBe(true)
    expect(commandState('zoomOut', { ...paint, zoom: MIN_ZOOM }).disabled).toBe(true)
    expect(commandState('save', paint).disabled).toBe(false)
  })

  it('stops the last layer being deleted, and too many being added', () => {
    const ps = photoshopInitialState()
    expect(commandState('deleteLayer', ps).disabled).toBe(false)
    expect(commandState('deleteLayer', { ...ps, layers: ps.layers.slice(0, 1) }).disabled).toBe(true)
    const many = Array.from({ length: 8 }, (_, i) => ({ ...ps.layers[0], id: `l${i}` }))
    expect(commandState('newLayer', { ...ps, layers: many }).disabled).toBe(true)
  })

  it('lists only menu items that do something', () => {
    const ids = PS_MENUS.flatMap((menu) => menu.items.filter((item) => item.id).map((item) => item.id))
    const ps = photoshopInitialState()
    for (const id of ids) expect(commandState(id!, ps)).toEqual(expect.objectContaining({ known: true }))
    expect(commandState('nonsense', ps).known).toBe(false)
  })
})

describe('starting state', () => {
  it('opens Paint on a blank 800 by 600 page with the pencil', () => {
    const state = paintInitialState()
    expect(state).toMatchObject({ tool: 'pencil', width: 800, height: 600, zoom: 100, colours: ['#000000', '#ffffff'] })
    expect(paintInitialState()).not.toBe(state)
  })

  it('opens Photoshop with three layers and the logo selected', () => {
    const state = photoshopInitialState()
    expect(state.layers.map((layer) => layer.name)).toEqual(['Background', 'Logo', 'Highlights'])
    expect(state.layers.find((layer) => layer.id === state.active)?.name).toBe('Logo')
    expect(state.tool).toBe('brush')
  })
})
