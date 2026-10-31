import { describe, it, expect } from 'vitest'
import {
  MIN_HEIGHT,
  MIN_WIDTH,
  availableLayouts,
  boundaryPatches,
  boundaryGroup,
  clampFloating,
  detectMode,
  detectSnapTarget,
  fractionToRect,
  getLayout,
  hitSnapBar,
  keyboardPlacement,
  maximizePatch,
  minimizePatch,
  nextFocusedWindow,
  placeNewWindow,
  planAssist,
  reflowPatch,
  resizableEdges,
  resizeRect,
  restorePatch,
  restoreUnderPointer,
  shortcutFromEvent,
  snapBarModel,
  snapFlyoutModel,
  snapPatch,
  unminimizePatch,
  type Desktop,
  type ManagedWindow,
} from '../../../assets/js/windowing/windowing.js'

const desk = (width: number, height: number): Desktop => ({ left: 0, top: 0, width, height })
const D = desk(1920, 1032)

let nextId = 1
const win = (over: Partial<ManagedWindow> = {}): ManagedWindow => ({
  id: nextId++,
  x: 100,
  y: 100,
  width: 800,
  height: 600,
  z: 10,
  state: 'floating',
  ...over,
})

const snapped = (layout: string, zone: string, d = D, over: Partial<ManagedWindow> = {}) => {
  const w = win(over)
  return { ...w, ...snapPatch(w, layout, zone, d) }
}

describe('detectMode', () => {
  it('treats narrow viewports as phones', () => {
    expect(detectMode({ width: 390, height: 844, coarse: true })).toBe('phone')
    expect(detectMode({ width: 375, height: 667, coarse: true })).toBe('phone')
  })

  it('treats landscape phones as phones, despite their width', () => {
    expect(detectMode({ width: 844, height: 390, coarse: true })).toBe('phone')
    expect(detectMode({ width: 932, height: 430, coarse: true })).toBe('phone')
  })

  it('uses tablet mode for touch or for medium widths', () => {
    expect(detectMode({ width: 768, height: 1024, coarse: true })).toBe('tablet')
    expect(detectMode({ width: 1024, height: 768, coarse: true })).toBe('tablet')
    expect(detectMode({ width: 800, height: 600, coarse: false })).toBe('tablet')
  })

  it('uses desktop mode with a mouse at full width', () => {
    expect(detectMode({ width: 1024, height: 768, coarse: false })).toBe('desktop')
    expect(detectMode({ width: 1920, height: 1080, coarse: false })).toBe('desktop')
  })
})

describe('layouts', () => {
  const ids = (d: Desktop, mode: 'desktop' | 'tablet' | 'phone' = 'desktop') =>
    availableLayouts(d, mode).map((l) => l.id)

  it('offers every layout on a large desktop', () => {
    expect(ids(desk(1920, 1032))).toEqual(
      expect.arrayContaining(['halves', 'wide-left', 'wide-right', 'thirds', 'wide-centre', 'quadrants']),
    )
  })

  it('drops layouts whose zones would be below the minimum size', () => {
    const d = desk(1024, 720)
    expect(ids(d)).not.toContain('wide-centre')
    expect(ids(d)).toContain('halves')
  })

  it('offers nothing on a phone', () => {
    expect(ids(desk(390, 796), 'phone')).toEqual([])
  })

  it('offers stacked rows only in portrait', () => {
    expect(ids(desk(768, 976), 'tablet')).toContain('rows')
    expect(ids(desk(1024, 720), 'tablet')).not.toContain('rows')
  })

  it('keeps tablet layouts simple', () => {
    expect(ids(desk(1024, 720), 'tablet')).not.toContain('thirds')
  })

  it('leaves no gaps or overlaps between zones in any layout', () => {
    for (const d of [desk(1920, 1032), desk(1366, 720), desk(1281, 671)]) {
      for (const layout of availableLayouts(d, 'desktop')) {
        const rects = layout.zones.map((z) => fractionToRect(z, d))
        const area = rects.reduce((sum, r) => sum + r.width * r.height, 0)
        expect(area, layout.id).toBe(d.width * d.height)
      }
    }
  })
})

describe('detectSnapTarget', () => {
  const at = (x: number, y: number, d = D) => detectSnapTarget({ x, y }, d, 'desktop')

  it('snaps to the left and right halves at the edges', () => {
    expect(at(3, 500)).toMatchObject({ kind: 'snap', layout: 'halves', zone: 'left' })
    expect(at(1917, 500)).toMatchObject({ kind: 'snap', layout: 'halves', zone: 'right' })
    expect(at(3, 500)?.rect).toEqual({ x: 0, y: 0, width: 960, height: 1032 })
  })

  it('maximises at the top edge', () => {
    expect(at(300, 2)).toMatchObject({ kind: 'maximize', rect: { x: 0, y: 0, width: 1920, height: 1032 } })
  })

  it('snaps into each corner quadrant', () => {
    expect(at(2, 2)).toMatchObject({ layout: 'quadrants', zone: 'top-left' })
    expect(at(1918, 2)).toMatchObject({ layout: 'quadrants', zone: 'top-right' })
    expect(at(2, 1030)).toMatchObject({ layout: 'quadrants', zone: 'bottom-left' })
    expect(at(1918, 1030)).toMatchObject({ layout: 'quadrants', zone: 'bottom-right' })
  })

  it('ignores ordinary movement away from the edges', () => {
    expect(at(500, 500)).toBeNull()
    expect(at(20, 500)).toBeNull()
  })

  it('does not snap on a phone', () => {
    expect(detectSnapTarget({ x: 2, y: 300 }, desk(390, 796), 'phone')).toBeNull()
  })

  it('respects disarmed edges, so a drag starting at the top cannot maximise at once', () => {
    const target = detectSnapTarget({ x: 300, y: 2 }, D, 'desktop', { top: false })
    expect(target).toBeNull()
  })

  it('uses a larger touch threshold on tablets', () => {
    const d = desk(1024, 720)
    expect(detectSnapTarget({ x: 20, y: 300 }, d, 'tablet')).toMatchObject({ zone: 'left' })
    expect(detectSnapTarget({ x: 20, y: 300 }, d, 'desktop')).toBeNull()
  })
})

describe('snap bar', () => {
  it('sits at the top centre of the desktop', () => {
    const bar = snapBarModel(D, 'desktop')
    expect(bar.y).toBeLessThan(20)
    expect(bar.x + bar.width / 2).toBeCloseTo(960, 0)
  })

  it('resolves the pointer to a zone', () => {
    const bar = snapBarModel(D, 'desktop')
    const zone = bar.tiles[0].zones[0]
    const hit = hitSnapBar({ x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 }, bar, D)
    expect(hit).toMatchObject({ kind: 'snap', layout: bar.tiles[0].layout })
    expect(hit?.rect.width).toBeGreaterThan(0)
  })

  it('returns nothing between tiles', () => {
    const bar = snapBarModel(D, 'desktop')
    expect(hitSnapBar({ x: bar.x + 1, y: bar.y + 1 }, bar, D)).toBeNull()
  })
})

describe('snap flyout', () => {
  const anchor = { left: 1000, top: 100, width: 46, height: 32 }

  it('stays inside the desktop near the right edge', () => {
    const f = snapFlyoutModel({ ...anchor, left: 1880 }, D, 'desktop')
    expect(f.x + f.width).toBeLessThanOrEqual(D.width)
  })

  it('stays inside the desktop near the bottom edge', () => {
    const f = snapFlyoutModel({ ...anchor, top: 1000 }, D, 'desktop')
    expect(f.y + f.height).toBeLessThanOrEqual(D.height)
  })

  it('only shows layouts that fit', () => {
    const small = snapFlyoutModel(anchor, desk(1024, 720), 'desktop')
    expect(small.tiles.map((t) => t.layout)).not.toContain('wide-centre')
  })
})

describe('state transitions', () => {
  it('remembers the floating rectangle through a snap and restore', () => {
    const w = win({ x: 111, y: 222, width: 640, height: 480 })
    const s = { ...w, ...snapPatch(w, 'halves', 'left', D) }
    expect(s).toMatchObject({ state: 'snapped', x: 0, y: 0, width: 960, height: 1032 })
    expect({ ...s, ...restorePatch(s, D) }).toMatchObject({
      state: 'floating',
      x: 111,
      y: 222,
      width: 640,
      height: 480,
      snap: null,
    })
  })

  it('maximises to the usable desktop and back', () => {
    const w = win({ x: 50, y: 60 })
    const m = { ...w, ...maximizePatch(w, D) }
    expect(m).toMatchObject({ state: 'maximized', x: 0, y: 0, width: 1920, height: 1032 })
    expect({ ...m, ...restorePatch(m, D) }).toMatchObject({ state: 'floating', x: 50, y: 60 })
  })

  it('returns a maximised snapped window to its snap, not to floating', () => {
    const s = snapped('halves', 'right')
    const m = { ...s, ...maximizePatch(s, D) }
    expect({ ...m, ...restorePatch(m, D) }).toMatchObject({ state: 'snapped', x: 960, width: 960 })
  })

  it('keeps the original floating rectangle across repeated snaps', () => {
    const w = win({ x: 11, y: 22 })
    const a = { ...w, ...snapPatch(w, 'halves', 'left', D) }
    const b = { ...a, ...snapPatch(a, 'quadrants', 'top-right', D) }
    expect({ ...b, ...restorePatch(b, D) }).toMatchObject({ state: 'floating', x: 11, y: 22 })
  })

  it('returns a minimised window to the state it left', () => {
    for (const start of [win(), snapped('halves', 'left')]) {
      const min = { ...start, ...minimizePatch(start) }
      expect(min.state).toBe('minimized')
      expect({ ...min, ...unminimizePatch(min, D) }).toMatchObject({ state: start.state, x: start.x })
    }
    const w = win()
    const max = { ...w, ...maximizePatch(w, D) }
    const min = { ...max, ...minimizePatch(max) }
    expect({ ...min, ...unminimizePatch(min, D) }).toMatchObject({ state: 'maximized', width: 1920 })
  })

  it('refits a snapped window when the desktop changes', () => {
    const s = snapped('halves', 'right')
    const r = reflowPatch(s, desk(1280, 672))
    expect(r).toEqual({ x: 640, y: 0, width: 640, height: 672 })
  })

  it('refits a maximised window when the desktop changes', () => {
    const w = win()
    const m = { ...w, ...maximizePatch(w, D) }
    expect(reflowPatch(m, desk(1280, 672))).toMatchObject({ width: 1280, height: 672 })
  })

  it('brings a stranded floating window back on screen', () => {
    const w = win({ x: 1800, y: 900 })
    const r = { ...w, ...reflowPatch(w, desk(1280, 672)) }
    expect(r.x).toBeLessThan(1280)
    expect(r.y).toBeLessThan(672)
  })

  it('floats a snapped window when its zone no longer fits', () => {
    const s = snapped('thirds', 'left')
    const r = { ...s, ...reflowPatch(s, desk(800, 672)) }
    expect(r.state).toBe('floating')
    expect(r.width).toBeLessThanOrEqual(800)
  })

  it('does not disturb a window that has nothing to change', () => {
    expect(reflowPatch(win(), D)).toBeNull()
  })

  it('leaves real placements alone on a phone, which only changes the display', () => {
    const s = snapped('halves', 'left')
    expect(reflowPatch(s, desk(390, 796), 'phone')).toBeNull()
  })
})

describe('clampFloating', () => {
  it('keeps the title bar reachable', () => {
    const r = clampFloating({ x: 50, y: -300, width: 500, height: 400 }, D)
    expect(r.y).toBe(0)
    const low = clampFloating({ x: 50, y: 5000, width: 500, height: 400 }, D)
    expect(low.y).toBeLessThan(D.height)
  })

  it('keeps part of the window visible horizontally', () => {
    expect(clampFloating({ x: 5000, y: 0, width: 500, height: 400 }, D).x).toBeLessThan(D.width)
    const left = clampFloating({ x: -5000, y: 0, width: 500, height: 400 }, D)
    expect(left.x + left.width).toBeGreaterThan(0)
  })

  it('shrinks a window larger than the desktop', () => {
    const r = clampFloating({ x: 0, y: 0, width: 3000, height: 2000 }, desk(800, 600))
    expect(r).toMatchObject({ width: 800, height: 600 })
  })
})

describe('placeNewWindow', () => {
  it('centres the first window', () => {
    expect(placeNewWindow({ w: 800, h: 600 }, D, 0)).toMatchObject({ x: 560, y: 216, width: 800, height: 600 })
  })

  it('cascades later windows but keeps them on screen', () => {
    for (let i = 0; i < 30; i++) {
      const r = placeNewWindow({ w: 1100, h: 720 }, desk(1280, 672), i)
      expect(r.y + r.height).toBeLessThanOrEqual(672)
      expect(r.x + r.width).toBeLessThanOrEqual(1280)
    }
  })
})

describe('restoreUnderPointer', () => {
  it('keeps the pointer at the same relative position on the title bar', () => {
    const r = restoreUnderPointer(
      { x: 0, y: 0, width: 800, height: 600 },
      { x: 960, y: 10 },
      { x: 0, y: 0, width: 1920, height: 1032 },
      D,
    )
    expect(r.width).toBe(800)
    expect(r.x + 400).toBeCloseTo(960, 0)
    expect(r.y).toBe(0)
  })

  it('never puts the window off the top of the desktop', () => {
    const r = restoreUnderPointer(
      { x: 0, y: 0, width: 800, height: 600 },
      { x: 5, y: 2 },
      { x: 0, y: 0, width: 1920, height: 1032 },
      D,
    )
    expect(r.y).toBeGreaterThanOrEqual(0)
  })
})

describe('resizeRect', () => {
  const start = { x: 200, y: 200, width: 600, height: 400 }

  it('moves only the dragged edge', () => {
    expect(resizeRect(start, 'e', 50, 0, D)).toMatchObject({ x: 200, width: 650 })
    expect(resizeRect(start, 's', 0, 50, D)).toMatchObject({ y: 200, height: 450 })
    expect(resizeRect(start, 'w', -50, 0, D)).toMatchObject({ x: 150, width: 650 })
    expect(resizeRect(start, 'n', 0, -50, D)).toMatchObject({ y: 150, height: 450 })
  })

  it('enforces the minimum size and anchors the opposite edge', () => {
    expect(resizeRect(start, 'e', -9000, 0, D).width).toBe(MIN_WIDTH)
    expect(resizeRect(start, 'w', 9000, 0, D)).toMatchObject({ width: MIN_WIDTH, x: 800 - MIN_WIDTH })
    expect(resizeRect(start, 'n', 0, 9000, D)).toMatchObject({ height: MIN_HEIGHT, y: 600 - MIN_HEIGHT })
  })

  it('cannot pass the top or bottom of the desktop', () => {
    expect(resizeRect(start, 'n', 0, -9000, D).y).toBe(0)
    const r = resizeRect(start, 's', 0, 9000, D)
    expect(r.y + r.height).toBe(D.height)
  })
})

describe('resizableEdges', () => {
  it('allows all eight handles when floating', () => {
    expect(resizableEdges(win(), D)).toHaveLength(8)
  })

  it('allows none when maximised', () => {
    const w = win()
    expect(resizableEdges({ ...w, ...maximizePatch(w, D) }, D)).toEqual([])
  })

  it('allows only inner edges when snapped', () => {
    expect(resizableEdges(snapped('halves', 'left'), D)).toEqual(['e'])
    expect(resizableEdges(snapped('quadrants', 'bottom-right'), D).sort()).toEqual(['n', 'nw', 'w'].sort())
  })
})

describe('shared boundary resizing', () => {
  it('moves both windows on a shared edge', () => {
    const a = snapped('halves', 'left')
    const b = snapped('halves', 'right')
    const group = boundaryGroup([a, b], a.id, 'x', 'after', D)
    expect(group?.position).toBe(960)
    const patches = boundaryPatches(group!, 1100, [a, b], D)
    expect(patches[a.id]).toMatchObject({ width: 1100, x: 0 })
    expect(patches[b.id]).toMatchObject({ x: 1100, width: 820 })
  })

  it('leaves no gap or overlap after moving', () => {
    const a = snapped('halves', 'left')
    const b = snapped('halves', 'right')
    const group = boundaryGroup([a, b], a.id, 'x', 'after', D)!
    const p = boundaryPatches(group, 777, [a, b], D)
    expect(p[a.id].x! + p[a.id].width!).toBe(p[b.id].x)
    expect(p[b.id].x! + p[b.id].width!).toBe(D.width)
  })

  it('enforces the minimum size on both sides', () => {
    const a = snapped('halves', 'left')
    const b = snapped('halves', 'right')
    const group = boundaryGroup([a, b], a.id, 'x', 'after', D)!
    expect(group.min).toBe(MIN_WIDTH)
    expect(group.max).toBe(D.width - MIN_WIDTH)
  })

  it('moves every window on the line in a quadrant grid', () => {
    const q = (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((z) => snapped('quadrants', z))
    const group = boundaryGroup(q, q[0].id, 'x', 'after', D)!
    expect(group.before.sort()).toEqual([q[0].id, q[2].id].sort())
    expect(group.after.sort()).toEqual([q[1].id, q[3].id].sort())
  })

  it('keeps the new size when the desktop later changes', () => {
    const a = snapped('halves', 'left')
    const b = snapped('halves', 'right')
    const group = boundaryGroup([a, b], a.id, 'x', 'after', D)!
    const moved = { ...a, ...boundaryPatches(group, 720, [a, b], D)[a.id] }
    expect(reflowPatch(moved, desk(960, 1032))).toMatchObject({ width: 360 })
  })

  it('ignores floating and minimised windows on the line', () => {
    const a = snapped('halves', 'left')
    const f = win({ x: 960, width: 400 })
    const m = { ...snapped('halves', 'right') }
    const hidden = { ...m, ...minimizePatch(m) }
    expect(boundaryGroup([a, f, hidden], a.id, 'x', 'after', D)!.after).toEqual([])
  })
})

describe('Snap Assist', () => {
  it('offers other windows for the empty zone', () => {
    const a = snapped('halves', 'left', D, { z: 30 })
    const b = win({ z: 20 })
    const c = win({ z: 25 })
    const plan = planAssist([a, b, c], 'halves', D)
    expect(plan).toMatchObject({ layout: 'halves', zone: 'right' })
    expect(plan?.candidates).toEqual([c.id, b.id])
  })

  it('has nothing to offer when no other windows are open', () => {
    expect(planAssist([snapped('halves', 'left')], 'halves', D)).toBeNull()
  })

  it('stops when the layout is full', () => {
    const a = snapped('halves', 'left')
    const b = snapped('halves', 'right')
    expect(planAssist([a, b, win()], 'halves', D)).toBeNull()
  })

  it('moves on to the next empty zone', () => {
    const a = snapped('quadrants', 'top-left')
    const b = snapped('quadrants', 'top-right')
    expect(planAssist([a, b, win()], 'quadrants', D)?.zone).toBe('bottom-left')
  })
})

describe('focus order', () => {
  it('picks the highest window that is not minimised', () => {
    const a = win({ z: 5 })
    const b = win({ z: 9 })
    const c = win({ z: 12, state: 'minimized' })
    expect(nextFocusedWindow([a, b, c])?.id).toBe(b.id)
  })

  it('returns null when everything is minimised', () => {
    expect(nextFocusedWindow([win({ state: 'minimized' })])).toBeNull()
  })
})

describe('keyboard placement', () => {
  it('walks left and right as Windows does', () => {
    expect(keyboardPlacement(win(), 'left', D)).toMatchObject({ type: 'snap', zone: 'left' })
    expect(keyboardPlacement(snapped('halves', 'left'), 'left', D)).toMatchObject({ type: 'snap', zone: 'right' })
    expect(keyboardPlacement(snapped('halves', 'right'), 'left', D)).toMatchObject({ type: 'restore' })
  })

  it('walks up through quadrants to maximised', () => {
    expect(keyboardPlacement(win(), 'up', D)).toMatchObject({ type: 'maximize' })
    expect(keyboardPlacement(snapped('halves', 'left'), 'up', D)).toMatchObject({ zone: 'top-left' })
    expect(keyboardPlacement(snapped('quadrants', 'top-left'), 'up', D)).toMatchObject({ type: 'maximize' })
    expect(keyboardPlacement(snapped('quadrants', 'bottom-left'), 'up', D)).toMatchObject({ zone: 'left' })
  })

  it('walks down through restore to minimised', () => {
    const w = win()
    expect(keyboardPlacement({ ...w, ...maximizePatch(w, D) }, 'down', D)).toMatchObject({ type: 'restore' })
    expect(keyboardPlacement(w, 'down', D)).toMatchObject({ type: 'minimize' })
    expect(keyboardPlacement(snapped('halves', 'left'), 'down', D)).toMatchObject({ zone: 'bottom-left' })
    expect(keyboardPlacement(snapped('quadrants', 'bottom-left'), 'down', D)).toMatchObject({ type: 'minimize' })
  })

  it('does not offer a snap the desktop cannot fit', () => {
    expect(keyboardPlacement(win(), 'left', desk(500, 800))).toBeNull()
  })
})

describe('shortcutFromEvent', () => {
  const key = (init: KeyboardEventInit, target: EventTarget = document.body) => {
    const e = new KeyboardEvent('keydown', init)
    Object.defineProperty(e, 'target', { value: target })
    return e
  }

  it('reads the Windows key combinations', () => {
    expect(shortcutFromEvent(key({ key: 'ArrowLeft', metaKey: true }))).toBe('left')
    expect(shortcutFromEvent(key({ key: 'ArrowUp', metaKey: true }))).toBe('up')
    expect(shortcutFromEvent(key({ key: 'z', metaKey: true }))).toBe('layouts')
    expect(shortcutFromEvent(key({ key: 'F4', altKey: true }))).toBe('close')
  })

  it('offers Alt+Shift fallbacks, as the operating system takes the Windows key', () => {
    expect(shortcutFromEvent(key({ key: 'ArrowRight', altKey: true, shiftKey: true }))).toBe('right')
    expect(shortcutFromEvent(key({ key: 'Z', altKey: true, shiftKey: true }))).toBe('layouts')
  })

  it('leaves editable fields alone', () => {
    for (const tag of ['input', 'textarea', 'select']) {
      const el = document.createElement(tag)
      expect(shortcutFromEvent(key({ key: 'ArrowLeft', metaKey: true }, el))).toBeNull()
    }
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    expect(shortcutFromEvent(key({ key: 'F4', altKey: true }, editable))).toBeNull()
  })

  it('ignores plain keys', () => {
    expect(shortcutFromEvent(key({ key: 'ArrowLeft' }))).toBeNull()
    expect(shortcutFromEvent(key({ key: 'z' }))).toBeNull()
    expect(shortcutFromEvent(key({ key: 'ArrowLeft', altKey: true }))).toBeNull()
  })
})

describe('layout lookup', () => {
  it('finds a layout and returns undefined for an unknown one', () => {
    expect(getLayout('halves')?.zones).toHaveLength(2)
    expect(getLayout('nope')).toBeUndefined()
  })
})
