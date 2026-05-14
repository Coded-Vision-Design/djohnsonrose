import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOsStore, TASKBAR_HEIGHT } from '../store/osStore'
import { useDrag } from './useDrag'

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

function openAt(x: number, y: number, w = 500, h = 400) {
  useOsStore.getState().openApp('paint')
  const id = useOsStore.getState().windows[0].id
  useOsStore.getState().resizeWindow(id, x, y, w, h)
  useOsStore.getState().setMaximized(id, false)
  return id
}

describe('useDrag', () => {
  beforeEach(resetStore)

  it('moves a window by the cursor delta', () => {
    const id = openAt(100, 100)
    const { result } = renderHook(() => useDrag())

    act(() => {
      result.current(id, { clientX: 200, clientY: 150, button: 0 } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 250, clientY: 200 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    const w = useOsStore.getState().windows[0]
    expect(w.x).toBe(150)
    expect(w.y).toBe(150)
  })

  it('shows snap preview when dragging to the left edge', () => {
    const id = openAt(400, 100)
    const { result } = renderHook(() => useDrag())

    act(() => {
      result.current(id, { clientX: 410, clientY: 110, button: 0 } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 5, clientY: 400 }))
    })

    const snap = useOsStore.getState().snapPreview
    expect(snap.show).toBe(true)
    expect(snap.x).toBe(0)
    expect(snap.w).toBe(window.innerWidth / 2)
    expect(snap.h).toBe(window.innerHeight - TASKBAR_HEIGHT)

    // Clean up the window-level handlers so later tests stay isolated.
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })

  it('shows full-screen snap preview when dragging to the top edge', () => {
    const id = openAt(400, 400)
    const { result } = renderHook(() => useDrag())

    act(() => {
      result.current(id, { clientX: 410, clientY: 410, button: 0 } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 700, clientY: 5 }))
    })

    const snap = useOsStore.getState().snapPreview
    expect(snap.show).toBe(true)
    expect(snap.w).toBe(window.innerWidth)
    expect(snap.h).toBe(window.innerHeight - TASKBAR_HEIGHT)

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })

  it('applies snap geometry on mouseup and clears the preview', () => {
    const id = openAt(400, 100)
    const { result } = renderHook(() => useDrag())

    act(() => {
      result.current(id, { clientX: 410, clientY: 110, button: 0 } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 5, clientY: 400 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    const w = useOsStore.getState().windows[0]
    expect(w.x).toBe(0)
    expect(w.y).toBe(0)
    expect(w.width).toBe(window.innerWidth / 2)
    expect(w.height).toBe(window.innerHeight - TASKBAR_HEIGHT)
    expect(useOsStore.getState().snapPreview.show).toBe(false)
  })

  it('focuses the dragged window', () => {
    openAt(100, 100)
    const calcId = (() => {
      useOsStore.getState().openApp('calculator')
      return useOsStore.getState().windows[1].id
    })()
    const paintId = useOsStore.getState().windows[0].id

    // Currently focused = calc (most recently opened).
    expect(useOsStore.getState().focusedWindowId).toBe(calcId)

    const { result } = renderHook(() => useDrag())
    act(() => {
      result.current(paintId, { clientX: 110, clientY: 110, button: 0 } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(useOsStore.getState().focusedWindowId).toBe(paintId)
  })

  it('unmaximizes a window when starting drag', () => {
    const id = openAt(0, 0)
    useOsStore.getState().setMaximized(id, true)
    const { result } = renderHook(() => useDrag())

    act(() => {
      result.current(id, { clientX: 500, clientY: 10, button: 0 } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(useOsStore.getState().windows[0].maximized).toBe(false)
  })
})
