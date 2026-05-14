import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOsStore, WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT } from '../store/osStore'
import { useResize, type ResizeDir } from './useResize'

const resetStore = () => {
  localStorage.clear()
  useOsStore.setState({
    isBooting: false,
    loggedIn: true,
    windows: [],
    focusedWindowId: null,
    nextWindowZ: 100,
    snapPreview: { show: false, x: 0, y: 0, w: 0, h: 0 },
    eventLogs: [],
  })
}

/**
 * Helper: open a window with deterministic geometry, then run `dir` resize
 * starting at (startX, startY) and ending at (endX, endY). Returns the final
 * window state.
 */
function runResize(
  dir: ResizeDir,
  initial: { x: number; y: number; w: number; h: number },
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  useOsStore.getState().openApp('paint')
  const id = useOsStore.getState().windows[0].id
  useOsStore.getState().resizeWindow(id, initial.x, initial.y, initial.w, initial.h)
  // Make sure it isn't maximized (openApp can set this on small screens).
  useOsStore.getState().setMaximized(id, false)

  const { result } = renderHook(() => useResize())

  // Fake target element for cursor capture.
  const target = document.createElement('div')

  act(() => {
    result.current(id, dir, {
      clientX: startX,
      clientY: startY,
      target,
    } as unknown as React.MouseEvent)
  })

  act(() => {
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: endX, clientY: endY }))
  })
  act(() => {
    window.dispatchEvent(new MouseEvent('mouseup'))
  })

  return useOsStore.getState().windows[0]
}

describe('useResize', () => {
  beforeEach(resetStore)

  it('east: grows width only', () => {
    const w = runResize('e', { x: 100, y: 100, w: 500, h: 400 }, 600, 300, 700, 300)
    expect(w).toMatchObject({ x: 100, y: 100, width: 600, height: 400 })
  })

  it('south: grows height only', () => {
    const w = runResize('s', { x: 100, y: 100, w: 500, h: 400 }, 300, 500, 300, 600)
    expect(w).toMatchObject({ x: 100, y: 100, width: 500, height: 500 })
  })

  it('west: shrinks width and shifts x by the same amount', () => {
    const w = runResize('w', { x: 100, y: 100, w: 500, h: 400 }, 100, 300, 200, 300)
    expect(w).toMatchObject({ x: 200, y: 100, width: 400, height: 400 })
  })

  it('north: shrinks height and shifts y by the same amount', () => {
    const w = runResize('n', { x: 100, y: 100, w: 500, h: 400 }, 300, 100, 300, 150)
    expect(w).toMatchObject({ x: 100, y: 150, width: 500, height: 350 })
  })

  it('clamps width at MIN_W when dragging east past the minimum', () => {
    const w = runResize('e', { x: 100, y: 100, w: 500, h: 400 }, 600, 300, 0, 300)
    expect(w.width).toBe(WINDOW_MIN_WIDTH)
  })

  it('clamps width at MIN_W when dragging west past the minimum, anchoring east edge', () => {
    const w = runResize('w', { x: 100, y: 100, w: 500, h: 400 }, 100, 300, 9999, 300)
    expect(w.width).toBe(WINDOW_MIN_WIDTH)
    // East edge anchored: x + width should equal initial right edge (100 + 500 = 600).
    expect(w.x + w.width).toBe(600)
  })

  it('clamps height at MIN_H when dragging north past the minimum, anchoring south edge', () => {
    const w = runResize('n', { x: 100, y: 100, w: 500, h: 400 }, 300, 100, 300, 9999)
    expect(w.height).toBe(WINDOW_MIN_HEIGHT)
    expect(w.y + w.height).toBe(500)
  })

  it('southeast corner: grows width AND height', () => {
    const w = runResize('se', { x: 100, y: 100, w: 500, h: 400 }, 600, 500, 750, 600)
    expect(w).toMatchObject({ x: 100, y: 100, width: 650, height: 500 })
  })

  it('northwest corner: shrinks both dimensions and shifts x/y', () => {
    const w = runResize('nw', { x: 100, y: 100, w: 500, h: 400 }, 100, 100, 200, 150)
    expect(w).toMatchObject({ x: 200, y: 150, width: 400, height: 350 })
  })

  it('does nothing when the window is maximized', () => {
    useOsStore.getState().openApp('paint')
    const id = useOsStore.getState().windows[0].id
    useOsStore.getState().resizeWindow(id, 100, 100, 500, 400)
    useOsStore.getState().setMaximized(id, true)
    const before = { ...useOsStore.getState().windows[0] }

    const { result } = renderHook(() => useResize())
    const target = document.createElement('div')
    act(() => {
      result.current(id, 'e', { clientX: 600, clientY: 300, target } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 800, clientY: 300 }))
    })

    const after = useOsStore.getState().windows[0]
    expect(after.width).toBe(before.width)
    expect(after.height).toBe(before.height)
  })
})
