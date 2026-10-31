// assets/js/windowing/windowing.js
// The window manager core, shared by both builds so that they behave
// identically. v1 (Alpine) and v2 (React) each render windows their own way,
// and both call this module for geometry, snapping, state transitions, pointer
// handling and keyboard shortcuts. Nothing here depends on either framework.
//
// A window's placement is one of four explicit states:
//   floating   x/y/width/height are the live rectangle
//   snapped    the rectangle comes from snap.frac, a fraction of the desktop
//   maximized  the rectangle is the whole usable desktop
//   minimized  hidden; resumeState says which of the above to return to
//
// The last floating rectangle is kept in `floating` while a window is anywhere
// else, so restoring always returns it to where it was.
//
// All coordinates are relative to the usable desktop: the windows layer, which
// excludes the taskbar. Layouts are never computed from window.innerWidth.

export const TASKBAR_HEIGHT = 48
export const MIN_WIDTH = 300
export const MIN_HEIGHT = 200

const DRAG_SLOP = 4 // Movement before a press on the title bar becomes a drag.
const KEEP_VISIBLE_X = 96 // Always leave this much of a window on screen.
const KEEP_VISIBLE_Y = 44 // Always leave the title bar reachable.
const CASCADE_STEP = 30
const CASCADE_LENGTH = 8
const EDGE_MOUSE = 8
const EDGE_TOUCH = 24
const CORNER_REACH = 96
const SNAP_BAR_REACH = 16
const LINE_TOLERANCE = 2 // Windows within this many pixels share an edge.
const ANIMATION_MS = 220

const zone = (id, label, x, y, w, h) => ({ id, label, x, y, w, h })

export const LAYOUTS = [
  { id: 'halves', label: 'Two equal columns', zones: [
    zone('left', 'Left half', 0, 0, 0.5, 1),
    zone('right', 'Right half', 0.5, 0, 0.5, 1),
  ] },
  { id: 'wide-left', label: 'Wide left column', zones: [
    zone('main', 'Left two thirds', 0, 0, 2 / 3, 1),
    zone('side', 'Right third', 2 / 3, 0, 1 / 3, 1),
  ] },
  { id: 'wide-right', label: 'Wide right column', zones: [
    zone('side', 'Left third', 0, 0, 1 / 3, 1),
    zone('main', 'Right two thirds', 1 / 3, 0, 2 / 3, 1),
  ] },
  { id: 'thirds', label: 'Three equal columns', zones: [
    zone('left', 'Left third', 0, 0, 1 / 3, 1),
    zone('centre', 'Centre third', 1 / 3, 0, 1 / 3, 1),
    zone('right', 'Right third', 2 / 3, 0, 1 / 3, 1),
  ] },
  { id: 'wide-centre', label: 'Three columns with a wide centre', zones: [
    zone('left', 'Left column', 0, 0, 0.25, 1),
    zone('centre', 'Wide centre column', 0.25, 0, 0.5, 1),
    zone('right', 'Right column', 0.75, 0, 0.25, 1),
  ] },
  { id: 'quadrants', label: 'Four quadrants', zones: [
    zone('top-left', 'Top left', 0, 0, 0.5, 0.5),
    zone('top-right', 'Top right', 0.5, 0, 0.5, 0.5),
    zone('bottom-left', 'Bottom left', 0, 0.5, 0.5, 0.5),
    zone('bottom-right', 'Bottom right', 0.5, 0.5, 0.5, 0.5),
  ] },
  { id: 'rows', label: 'Two rows', portraitOnly: true, zones: [
    zone('top', 'Top half', 0, 0, 1, 0.5),
    zone('bottom', 'Bottom half', 0, 0.5, 1, 0.5),
  ] },
]

const TABLET_LAYOUTS = ['halves', 'quadrants', 'rows']

const clamp = (value, low, high) => Math.min(Math.max(value, low), Math.max(low, high))

export const rectOf = (win) => ({ x: win.x, y: win.y, width: win.width, height: win.height })

const desktopRect = (desktop) => ({ x: 0, y: 0, width: desktop.width, height: desktop.height })

const sameRect = (a, b) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

/** Phone, tablet or desktop, from the viewport and the primary pointer. */
export function detectMode({ width, height, coarse }) {
  if (width < 640 || Math.min(width, height) < 500) return 'phone'
  if (coarse || width < 1024) return 'tablet'
  return 'desktop'
}

export function getLayout(id) {
  return LAYOUTS.find((layout) => layout.id === id)
}

const zoneFits = (frac, desktop) =>
  frac.w * desktop.width >= MIN_WIDTH && frac.h * desktop.height >= MIN_HEIGHT

/** The layouts whose zones all fit on this desktop. */
export function availableLayouts(desktop, mode = 'desktop') {
  if (mode === 'phone') return []
  const portrait = desktop.height > desktop.width
  return LAYOUTS.filter((layout) => {
    if (layout.portraitOnly && !portrait) return false
    if (mode === 'tablet' && !TABLET_LAYOUTS.includes(layout.id)) return false
    return layout.zones.every((z) => zoneFits(z, desktop))
  })
}

/**
 * Rounds both edges, not the position and size, so that neighbouring zones
 * land on the same pixel and never leave a gap or an overlap.
 */
export function fractionToRect(frac, desktop) {
  const left = Math.round(frac.x * desktop.width)
  const top = Math.round(frac.y * desktop.height)
  const right = Math.round((frac.x + frac.w) * desktop.width)
  const bottom = Math.round((frac.y + frac.h) * desktop.height)
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function snapTarget(layoutId, zoneId, desktop, mode) {
  if (!availableLayouts(desktop, mode).some((layout) => layout.id === layoutId)) return null
  const frac = getLayout(layoutId).zones.find((z) => z.id === zoneId)
  return { kind: 'snap', layout: layoutId, zone: zoneId, rect: fractionToRect(frac, desktop) }
}

/**
 * Which snap target, if any, the pointer is over. `armed` switches off edges
 * the drag started on, so that lifting a window from the top of the screen
 * cannot maximise it straight back.
 */
export function detectSnapTarget(point, desktop, mode, armed = {}) {
  if (mode === 'phone') return null

  const edge = mode === 'tablet' ? EDGE_TOUCH : EDGE_MOUSE
  const reach = Math.min(CORNER_REACH, desktop.height * 0.15)
  const atLeft = armed.left !== false && point.x <= edge
  const atRight = armed.right !== false && point.x >= desktop.width - edge
  const atTop = armed.top !== false && point.y <= edge
  const atBottom = armed.bottom !== false && point.y >= desktop.height - edge
  const nearLeft = point.x <= reach
  const nearRight = point.x >= desktop.width - reach
  const nearTop = point.y <= reach
  const nearBottom = point.y >= desktop.height - reach

  const corner =
    ((atTop && nearLeft) || (atLeft && nearTop)) ? 'top-left' :
    ((atTop && nearRight) || (atRight && nearTop)) ? 'top-right' :
    ((atBottom && nearLeft) || (atLeft && nearBottom)) ? 'bottom-left' :
    ((atBottom && nearRight) || (atRight && nearBottom)) ? 'bottom-right' : null

  if (corner) {
    const target = snapTarget('quadrants', corner, desktop, mode)
    if (target) return target
  }
  if (atTop) return { kind: 'maximize', rect: desktopRect(desktop) }
  if (atLeft) return snapTarget('halves', 'left', desktop, mode)
  if (atRight) return snapTarget('halves', 'right', desktop, mode)
  return null
}

/** Maps a layout's zones into a tile, with a hairline between them. */
function tileZones(layout, tile, originX, originY) {
  const gap = 1
  return layout.zones.map((z) => ({
    zone: z.id,
    label: z.label,
    x: originX + z.x * tile.width + gap,
    y: originY + z.y * tile.height + gap,
    width: z.w * tile.width - gap * 2,
    height: z.h * tile.height - gap * 2,
  }))
}

/** The bar that drops from the top centre while dragging, in desktop pixels. */
export function snapBarModel(desktop, mode) {
  const tile = { width: 64, height: 40 }
  const gap = 8
  const pad = 8
  const fit = Math.floor((desktop.width - pad * 2 - 16 + gap) / (tile.width + gap))
  const layouts = availableLayouts(desktop, mode).slice(0, Math.max(fit, 0))
  const width = pad * 2 + layouts.length * tile.width + Math.max(layouts.length - 1, 0) * gap
  const x = Math.round((desktop.width - width) / 2)
  const y = 8
  return {
    x,
    y,
    width,
    height: pad * 2 + tile.height,
    tiles: layouts.map((layout, i) => {
      const tileX = x + pad + i * (tile.width + gap)
      const tileY = y + pad
      return {
        layout: layout.id,
        label: layout.label,
        x: tileX,
        y: tileY,
        width: tile.width,
        height: tile.height,
        zones: tileZones(layout, tile, tileX, tileY),
      }
    }),
  }
}

const isNearSnapBar = (point, bar) =>
  bar.tiles.length > 0 &&
  point.y <= bar.y + bar.height + SNAP_BAR_REACH &&
  point.x >= bar.x - SNAP_BAR_REACH &&
  point.x <= bar.x + bar.width + SNAP_BAR_REACH

export function hitSnapBar(point, bar, desktop) {
  for (const tile of bar.tiles) {
    for (const z of tile.zones) {
      const inside =
        point.x >= z.x && point.x <= z.x + z.width && point.y >= z.y && point.y <= z.y + z.height
      if (inside) {
        const frac = getLayout(tile.layout).zones.find((candidate) => candidate.id === z.zone)
        return { kind: 'snap', layout: tile.layout, zone: z.zone, rect: fractionToRect(frac, desktop) }
      }
    }
  }
  return null
}

/** The Snap Layouts flyout, anchored to a maximise button in viewport pixels. */
export function snapFlyoutModel(anchor, desktop, mode) {
  const tile = { width: 84, height: 52 }
  const gap = 8
  const pad = 10
  const columns = 3
  const margin = 8
  const layouts = availableLayouts(desktop, mode)
  const rows = Math.ceil(layouts.length / columns)
  const width = pad * 2 + columns * tile.width + (columns - 1) * gap
  const height = pad * 2 + rows * tile.height + Math.max(rows - 1, 0) * gap
  const anchorRight = anchor.left - desktop.left + anchor.width
  const anchorBottom = anchor.top - desktop.top + anchor.height
  return {
    x: clamp(anchorRight - width + margin, margin, desktop.width - width - margin),
    y: clamp(anchorBottom + 4, margin, desktop.height - height - margin),
    width,
    height,
    tiles: layouts.map((layout, i) => ({
      layout: layout.id,
      label: layout.label,
      x: pad + (i % columns) * (tile.width + gap),
      y: pad + Math.floor(i / columns) * (tile.height + gap),
      width: tile.width,
      height: tile.height,
      zones: tileZones(layout, tile, 0, 0),
    })),
  }
}

/** Keeps a floating window reachable, shrinking it if the desktop is smaller. */
export function clampFloating(rect, desktop) {
  const width = clamp(rect.width, Math.min(MIN_WIDTH, desktop.width), desktop.width)
  const height = clamp(rect.height, Math.min(MIN_HEIGHT, desktop.height), desktop.height)
  return {
    x: clamp(rect.x, KEEP_VISIBLE_X - width, desktop.width - KEEP_VISIBLE_X),
    y: clamp(rect.y, 0, desktop.height - KEEP_VISIBLE_Y),
    width,
    height,
  }
}

/** Centres a new window, cascading from the windows already open. */
export function placeNewWindow(size, desktop, count) {
  const width = Math.min(size.w, desktop.width)
  const height = Math.min(size.h, desktop.height)
  const offset = (count % CASCADE_LENGTH) * CASCADE_STEP
  return {
    x: clamp(Math.round((desktop.width - width) / 2) + offset, 0, desktop.width - width),
    y: clamp(Math.round((desktop.height - height) / 2) + offset, 0, desktop.height - height),
    width,
    height,
  }
}

/** The last floating rectangle, wherever the window is now. */
export function floatingRectOf(win) {
  return win.state === 'floating' || !win.floating ? rectOf(win) : win.floating
}

const placementOf = (win) => (win.state === 'minimized' ? win.resumeState ?? 'floating' : win.state)

export function snapPatch(win, layoutId, zoneId, desktop) {
  const frac = getLayout(layoutId).zones.find((z) => z.id === zoneId)
  return {
    state: 'snapped',
    snap: { layout: layoutId, zone: zoneId, frac: { x: frac.x, y: frac.y, w: frac.w, h: frac.h } },
    floating: floatingRectOf(win),
    resumeState: null,
    ...fractionToRect(frac, desktop),
  }
}

export function maximizePatch(win, desktop) {
  return { state: 'maximized', floating: floatingRectOf(win), resumeState: null, ...desktopRect(desktop) }
}

/** A maximised window that was snapped goes back to its snap, as in Windows. */
export function restorePatch(win, desktop) {
  if (win.state === 'maximized' && win.snap) {
    return { state: 'snapped', ...fractionToRect(win.snap.frac, desktop) }
  }
  return {
    state: 'floating',
    snap: null,
    floating: null,
    resumeState: null,
    ...clampFloating(floatingRectOf(win), desktop),
  }
}

/** A snapped or maximised window pulled away by its title bar. */
export function detachPatch(rect) {
  return { state: 'floating', snap: null, floating: null, resumeState: null, ...rect }
}

export function minimizePatch(win) {
  return { state: 'minimized', resumeState: win.state, floating: floatingRectOf(win) }
}

export function unminimizePatch(win, desktop) {
  const state = win.resumeState ?? 'floating'
  const patch = { state, resumeState: null }
  if (state === 'maximized') return { ...patch, ...desktopRect(desktop) }
  if (state === 'snapped' && win.snap) return { ...patch, ...fractionToRect(win.snap.frac, desktop) }
  return { ...patch, floating: null, ...clampFloating(floatingRectOf(win), desktop) }
}

/**
 * Refits a window to a changed desktop. Returns null when nothing moved, so a
 * store can leave the window object alone. A snap that no longer fits falls
 * back to floating rather than shrinking below the minimum size.
 *
 * Phones show every app full screen with CSS alone, so their narrow desktop
 * must not touch real placements: rotating back has to find them intact.
 */
export function reflowPatch(win, desktop, mode = 'desktop') {
  if (mode === 'phone') return null
  const placement = placementOf(win)
  const snapFits = placement === 'snapped' && win.snap && zoneFits(win.snap.frac, desktop)
  const lostSnap = placement === 'snapped' && !snapFits

  let target
  if (snapFits) target = fractionToRect(win.snap.frac, desktop)
  else if (placement === 'maximized') target = desktopRect(desktop)
  else target = clampFloating(floatingRectOf(win), desktop)

  if (!lostSnap && sameRect(rectOf(win), target)) return null

  const patch = { ...target }
  if (lostSnap) {
    patch.snap = null
    patch.floating = null
    if (win.state === 'minimized') patch.resumeState = 'floating'
    else patch.state = 'floating'
  }
  return patch
}

/** Where a maximised or snapped window lands when pulled away under the pointer. */
export function restoreUnderPointer(floating, point, current, desktop) {
  const ratio = current.width > 0 ? (point.x - current.x) / current.width : 0.5
  return clampFloating(
    {
      x: Math.round(point.x - floating.width * ratio),
      y: Math.round(point.y - (point.y - current.y)),
      width: floating.width,
      height: floating.height,
    },
    desktop,
  )
}

/** Resizes from one edge or corner, anchoring the opposite side. */
export function resizeRect(start, dir, dx, dy, desktop) {
  let left = start.x
  let top = start.y
  let right = start.x + start.width
  let bottom = start.y + start.height

  if (dir.includes('e')) right = clamp(right + dx, left + MIN_WIDTH, Math.max(desktop.width, right))
  if (dir.includes('w')) left = clamp(left + dx, Math.min(left, 0), right - MIN_WIDTH)
  if (dir.includes('s')) bottom = clamp(bottom + dy, top + MIN_HEIGHT, Math.max(desktop.height, bottom))
  if (dir.includes('n')) top = clamp(top + dy, 0, bottom - MIN_HEIGHT)

  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** Which resize handles apply: none when maximised, inner edges when snapped. */
export function resizableEdges(win, desktop) {
  if (win.state === 'floating') return ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
  if (win.state !== 'snapped') return []
  const n = win.y > 0
  const s = win.y + win.height < desktop.height
  const w = win.x > 0
  const e = win.x + win.width < desktop.width
  return [
    n && 'n', s && 's', e && 'e', w && 'w',
    n && e && 'ne', n && w && 'nw', s && e && 'se', s && w && 'sw',
  ].filter(Boolean)
}

/**
 * The windows sharing one snapped edge, which move together. `side` is 'after'
 * for the active window's right or bottom edge and 'before' for its left or top.
 */
export function boundaryGroup(windows, activeId, axis, side, desktop) {
  const active = windows.find((w) => w.id === activeId)
  if (!active || active.state !== 'snapped') return null

  const low = axis === 'x' ? 'x' : 'y'
  const size = axis === 'x' ? 'width' : 'height'
  const minSize = axis === 'x' ? MIN_WIDTH : MIN_HEIGHT
  const extent = axis === 'x' ? desktop.width : desktop.height
  const position = side === 'after' ? active[low] + active[size] : active[low]
  if (position <= 0 || position >= extent) return null

  const onLine = (a, b) => Math.abs(a - b) <= LINE_TOLERANCE
  const snapped = windows.filter((w) => w.state === 'snapped')
  const before = snapped.filter((w) => onLine(w[low] + w[size], position))
  const after = snapped.filter((w) => onLine(w[low], position))

  return {
    axis,
    position,
    before: before.map((w) => w.id),
    after: after.map((w) => w.id),
    min: before.reduce((value, w) => Math.max(value, w[low] + minSize), 0),
    max: after.reduce((value, w) => Math.min(value, w[low] + w[size] - minSize), extent),
  }
}

/** Patches that move a shared edge, updating each window's stored fractions. */
export function boundaryPatches(group, position, windows, desktop) {
  const next = clamp(Math.round(position), group.min, group.max)
  const low = group.axis === 'x' ? 'x' : 'y'
  const size = group.axis === 'x' ? 'width' : 'height'
  const patches = {}

  const patchFor = (win, rect) => ({
    ...rect,
    snap: {
      ...win.snap,
      frac: {
        x: rect.x / desktop.width,
        y: rect.y / desktop.height,
        w: rect.width / desktop.width,
        h: rect.height / desktop.height,
      },
    },
  })

  for (const win of windows) {
    if (group.before.includes(win.id)) {
      patches[win.id] = patchFor(win, { ...rectOf(win), [size]: next - win[low] })
    } else if (group.after.includes(win.id)) {
      const high = win[low] + win[size]
      patches[win.id] = patchFor(win, { ...rectOf(win), [low]: next, [size]: high - next })
    }
  }
  return patches
}

/** The first empty zone of a layout, and the windows that could fill it. */
export function planAssist(windows, layoutId, desktop) {
  const layout = getLayout(layoutId)
  const placed = windows.filter((w) => w.state === 'snapped' && w.snap?.layout === layoutId)
  const free = layout.zones.find((z) => !placed.some((w) => w.snap.zone === z.id))
  const candidates = windows
    .filter((w) => !placed.includes(w))
    .sort((a, b) => b.z - a.z)
    .map((w) => w.id)
  if (!free || candidates.length === 0) return null
  return { layout: layoutId, zone: free.id, rect: fractionToRect(free, desktop), candidates }
}

export function nextFocusedWindow(windows) {
  const visible = windows.filter((w) => w.state !== 'minimized')
  if (visible.length === 0) return null
  return visible.reduce((top, w) => (w.z > top.z ? w : top))
}

/** What an arrow shortcut does from the current placement, as in Windows. */
export function keyboardPlacement(win, action, desktop, mode = 'desktop') {
  const snapTo = (layout, zoneId) =>
    snapTarget(layout, zoneId, desktop, mode) ? { type: 'snap', layout, zone: zoneId } : null
  const key = win.state === 'snapped' && win.snap ? `${win.snap.layout}:${win.snap.zone}` : null

  if (action === 'left' || action === 'right') {
    const near = action
    const far = action === 'left' ? 'right' : 'left'
    if (key === `halves:${near}`) return snapTo('halves', far)
    if (key === `halves:${far}`) return { type: 'restore' }
    if (key === `quadrants:top-${near}`) return snapTo('quadrants', `top-${far}`)
    if (key === `quadrants:bottom-${near}`) return snapTo('quadrants', `bottom-${far}`)
    if (key?.startsWith(`quadrants:top-${far}`) || key?.startsWith(`quadrants:bottom-${far}`)) {
      return { type: 'restore' }
    }
    return snapTo('halves', near)
  }

  if (action === 'up') {
    if (win.state === 'maximized') return null
    if (key === 'halves:left') return snapTo('quadrants', 'top-left') ?? { type: 'maximize' }
    if (key === 'halves:right') return snapTo('quadrants', 'top-right') ?? { type: 'maximize' }
    if (key === 'quadrants:bottom-left') return snapTo('halves', 'left')
    if (key === 'quadrants:bottom-right') return snapTo('halves', 'right')
    return { type: 'maximize' }
  }

  if (action === 'down') {
    if (win.state === 'maximized') return { type: 'restore' }
    if (win.state === 'floating') return { type: 'minimize' }
    if (key === 'halves:left') return snapTo('quadrants', 'bottom-left') ?? { type: 'minimize' }
    if (key === 'halves:right') return snapTo('quadrants', 'bottom-right') ?? { type: 'minimize' }
    if (key === 'quadrants:top-left') return snapTo('halves', 'left')
    if (key === 'quadrants:top-right') return snapTo('halves', 'right')
    if (key?.startsWith('quadrants:bottom')) return { type: 'minimize' }
    return { type: 'restore' }
  }

  return null
}

const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }

/**
 * Reads a window shortcut from a keydown, or null. The operating system keeps
 * the Windows key for itself on most machines, so Alt+Shift works as well.
 */
export function shortcutFromEvent(event) {
  if (event.target?.closest?.(EDITABLE)) return null

  const win = event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey
  const fallback = event.altKey && event.shiftKey && !event.metaKey && !event.ctrlKey

  if (win || fallback) {
    if (ARROWS[event.key]) return ARROWS[event.key]
    if (event.key.toLowerCase() === 'z') return 'layouts'
  }
  if (event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey && event.key === 'F4') {
    return 'close'
  }
  return null
}

/** Uses layout sizes, as an entry transition can scale the bounding box. */
export function measureDesktop(element) {
  const box = element.getBoundingClientRect()
  return { left: box.left, top: box.top, width: element.clientWidth, height: element.clientHeight }
}

const toLocal = (event, desktop) => ({
  x: event.clientX - desktop.left,
  y: event.clientY - desktop.top,
})

/** Applies a rectangle straight to the DOM, without touching the store. */
function writeRect(element, rect) {
  element.style.left = `${rect.x}px`
  element.style.top = `${rect.y}px`
  element.style.width = `${rect.width}px`
  element.style.height = `${rect.height}px`
}

/** Lets the next geometry change ease into place. See windowing.css. */
export function animateGeometry(element) {
  if (!element) return
  element.dataset.animating = ''
  clearTimeout(element.windowAnimation)
  element.windowAnimation = setTimeout(() => delete element.dataset.animating, ANIMATION_MS)
}

/**
 * Shared pointer plumbing: capture, one update per frame, and full cleanup.
 * Returns a function that cancels the gesture.
 */
function trackPointer(event, handle, { onFrame, onEnd }) {
  let latest = event
  let frame = 0
  let finished = false

  const flush = () => {
    frame = 0
    onFrame(latest)
  }
  const onMove = (e) => {
    if (e.pointerId !== event.pointerId) return
    latest = e
    if (!frame) frame = requestAnimationFrame(flush)
  }
  const finish = (committed) => {
    if (finished) return
    finished = true
    if (frame) {
      cancelAnimationFrame(frame)
      if (committed) flush()
    }
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onUp)
    handle.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey, true)
    if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId)
    onEnd(committed)
  }
  const onUp = (e) => {
    if (e.pointerId !== event.pointerId) return
    latest = e
    finish(true)
  }
  const onCancel = () => finish(false)
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      finish(false)
    }
  }

  handle.setPointerCapture?.(event.pointerId)
  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onUp)
  handle.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey, true)
  return () => finish(false)
}

/**
 * Moves a window by its title bar. The transform is written directly each
 * frame, so the store and the framework stay idle until the pointer is
 * released. A press that never moves does nothing, so a tap or double-click on
 * the title bar cannot disturb a window.
 */
export function beginWindowDrag(event, ctx) {
  if (event.button !== 0 || !event.isPrimary) return null
  if (ctx.getMode() === 'phone') return null

  const { element } = ctx
  const startDesktop = ctx.getDesktop()
  const start = toLocal(event, startDesktop)
  const startMode = ctx.getMode()
  const edge = startMode === 'tablet' ? EDGE_TOUCH : EDGE_MOUSE
  const startBar = snapBarModel(startDesktop, startMode)

  // Edges the drag began on stay off until the pointer has left them.
  const armed = {
    top: start.y > edge,
    left: start.x > edge,
    right: start.x < startDesktop.width - edge,
    bottom: start.y < startDesktop.height - edge,
  }
  let barArmed = !isNearSnapBar(start, startBar)

  let base = rectOf(ctx.getWindow())
  let grabX = start.x - base.x
  let grabY = start.y - base.y
  let moving = false
  let target = null
  let position = { x: base.x, y: base.y }
  let lastPreview = ''

  const showPreview = (nextTarget, bar) => {
    const key = `${nextTarget?.layout}:${nextTarget?.zone}:${nextTarget?.kind}:${bar ? 1 : 0}`
    if (key === lastPreview) return
    lastPreview = key
    ctx.onPreview(nextTarget ? nextTarget.rect : null, bar, nextTarget)
  }

  const onFrame = (e) => {
    const desktop = ctx.getDesktop()
    const point = toLocal(e, desktop)

    if (!moving) {
      if (Math.hypot(point.x - start.x, point.y - start.y) < DRAG_SLOP) return
      moving = true
      element.dataset.dragging = ''
      const win = ctx.getWindow()
      if (win.state === 'snapped' || win.state === 'maximized') {
        base = restoreUnderPointer(floatingRectOf(win), start, rectOf(win), desktop)
        grabX = start.x - base.x
        grabY = start.y - base.y
        writeRect(element, base)
        ctx.onDetach(base)
      }
    }

    position = {
      x: clamp(point.x - grabX, KEEP_VISIBLE_X - base.width, desktop.width - KEEP_VISIBLE_X),
      y: clamp(point.y - grabY, 0, desktop.height - KEEP_VISIBLE_Y),
    }
    element.style.transform = `translate3d(${position.x - base.x}px, ${position.y - base.y}px, 0)`

    const mode = ctx.getMode()
    if (point.y > edge) armed.top = true
    if (point.x > edge) armed.left = true
    if (point.x < desktop.width - edge) armed.right = true
    if (point.y < desktop.height - edge) armed.bottom = true

    const bar = snapBarModel(desktop, mode)
    if (!isNearSnapBar(point, bar)) barArmed = true

    const overBar = barArmed && isNearSnapBar(point, bar)
    const nextTarget =
      (overBar ? hitSnapBar(point, bar, desktop) : null) ??
      detectSnapTarget(point, desktop, mode, armed)
    target = nextTarget
    showPreview(nextTarget, overBar ? bar : null)
  }

  const onEnd = (committed) => {
    delete element.dataset.dragging
    showPreview(null, null)
    if (!moving) return

    element.style.transform = ''
    if (!committed) {
      writeRect(element, base)
      ctx.onMove(base.x, base.y)
      return
    }
    element.style.left = `${position.x}px`
    element.style.top = `${position.y}px`
    if (target) {
      element.getBoundingClientRect() // Starts the animation from the release point.
      animateGeometry(element)
      if (target.kind === 'maximize') ctx.onMaximize()
      else ctx.onSnap(target.layout, target.zone)
    } else {
      ctx.onMove(position.x, position.y)
    }
  }

  return trackPointer(event, ctx.handle, { onFrame, onEnd })
}

/**
 * Resizes a window from an edge or corner. A snapped window moves its shared
 * edges, taking the neighbouring windows with it.
 */
export function beginWindowResize(event, ctx) {
  if (event.button !== 0 || !event.isPrimary) return null
  if (ctx.getMode() === 'phone') return null

  const { element, dir } = ctx
  const startDesktop = ctx.getDesktop()
  const start = toLocal(event, startDesktop)
  const win = ctx.getWindow()
  const startRect = rectOf(win)
  const windows = ctx.getWindows().filter((w) => w.state !== 'minimized')

  const groups = []
  if (win.state === 'snapped') {
    if (dir.includes('e')) groups.push(boundaryGroup(windows, win.id, 'x', 'after', startDesktop))
    if (dir.includes('w')) groups.push(boundaryGroup(windows, win.id, 'x', 'before', startDesktop))
    if (dir.includes('s')) groups.push(boundaryGroup(windows, win.id, 'y', 'after', startDesktop))
    if (dir.includes('n')) groups.push(boundaryGroup(windows, win.id, 'y', 'before', startDesktop))
  }
  const liveGroups = groups.filter(Boolean)
  let patches = {}
  let rect = startRect

  const root = document.documentElement
  const cursor = root.style.cursor
  root.style.cursor = getComputedStyle(event.target).cursor
  element.dataset.dragging = ''

  const onFrame = (e) => {
    const desktop = ctx.getDesktop()
    const point = toLocal(e, desktop)
    const dx = point.x - start.x
    const dy = point.y - start.y

    if (win.state === 'snapped') {
      // Corners move two edges, so each group builds on the previous result.
      let working = windows
      patches = {}
      for (const group of liveGroups) {
        const delta = group.axis === 'x' ? dx : dy
        const next = boundaryPatches(group, group.position + delta, working, desktop)
        patches = { ...patches, ...next }
        working = working.map((w) => (next[w.id] ? { ...w, ...next[w.id] } : w))
      }
      for (const [id, patch] of Object.entries(patches)) {
        const target = ctx.getElement(Number(id))
        if (target) writeRect(target, patch)
      }
    } else {
      rect = resizeRect(startRect, dir, dx, dy, desktop)
      writeRect(element, rect)
    }
  }

  const onEnd = (committed) => {
    root.style.cursor = cursor
    delete element.dataset.dragging
    if (!committed) {
      for (const w of windows) {
        const target = ctx.getElement(w.id)
        if (target) writeRect(target, rectOf(w))
      }
      return
    }
    if (win.state === 'snapped') ctx.onCommit(patches)
    else ctx.onCommit({ [win.id]: rect })
  }

  return trackPointer(event, ctx.handle, { onFrame, onEnd })
}

/**
 * Reports the usable desktop, and marks the page with the current mode so that
 * CSS can adapt. Also tracks the on-screen keyboard, which on iOS does not
 * resize the layout viewport.
 */
export function watchDesktop(element, onChange) {
  const coarse = window.matchMedia?.('(pointer: coarse)')
  const root = document.documentElement
  let frame = 0

  const update = () => {
    frame = 0
    const desktop = measureDesktop(element)
    if (desktop.width === 0 || desktop.height === 0) return

    const viewport = window.visualViewport
    const keyboard = viewport
      ? Math.max(window.innerHeight - viewport.height - viewport.offsetTop, 0)
      : 0
    const keyboardOpen = keyboard > 120
    root.style.setProperty('--os-keyboard-inset', `${keyboardOpen ? keyboard : 0}px`)
    root.toggleAttribute('data-os-keyboard', keyboardOpen)

    const mode = detectMode({
      width: window.innerWidth,
      height: window.innerHeight,
      coarse: !!coarse?.matches,
    })
    root.dataset.osMode = mode
    onChange(desktop, mode)
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }

  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
  observer?.observe(element)
  window.addEventListener('resize', schedule)
  window.addEventListener('orientationchange', schedule)
  window.visualViewport?.addEventListener('resize', schedule)
  coarse?.addEventListener?.('change', schedule)
  update()

  return () => {
    if (frame) cancelAnimationFrame(frame)
    observer?.disconnect()
    window.removeEventListener('resize', schedule)
    window.removeEventListener('orientationchange', schedule)
    window.visualViewport?.removeEventListener('resize', schedule)
    coarse?.removeEventListener?.('change', schedule)
  }
}

/** The hover Snap Layouts flyout needs a real pointer that can hover. */
export function canHoverLayouts(mode) {
  return mode === 'desktop' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
}
