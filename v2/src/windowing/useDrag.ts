import { useCallback, useRef } from 'react'
import { useOsStore, TASKBAR_HEIGHT } from '../store/osStore'

interface DragData {
  id: number
  startX: number
  startY: number
  initialX: number
  initialY: number
}

// Ports startDrag/doDrag/endDrag from assets/js/components/os/shell.js.
// Includes the unmaximize-on-drag and snap-to-edges behavior.
export function useDrag() {
  const drag = useRef<DragData | null>(null)
  const moveHandler = useRef<((e: MouseEvent) => void) | null>(null)
  const upHandler = useRef<(() => void) | null>(null)

  return useCallback((id: number, event: React.MouseEvent) => {
    const store = useOsStore.getState()
    const win = store.windows.find((w) => w.id === id)
    if (!win) return

    // If maximized: restore to 800x600 anchored under the cursor before dragging.
    let startWin = win
    if (win.maximized) {
      const ratio = event.clientX / window.innerWidth
      const newW = 800
      const newH = 600
      const newX = event.clientX - newW * ratio
      const newY = 0
      store.resizeWindow(id, newX, newY, newW, newH)
      store.setMaximized(id, false)
      startWin = { ...win, maximized: false, x: newX, y: newY, width: newW, height: newH }
    }

    store.focusWindow(id)

    drag.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      initialX: startWin.x,
      initialY: startWin.y,
    }

    const onMove = (e: MouseEvent) => {
      const d = drag.current
      if (!d) return
      const nx = d.initialX + (e.clientX - d.startX)
      const ny = d.initialY + (e.clientY - d.startY)
      useOsStore.getState().moveWindow(d.id, nx, ny)

      // Snap preview (top = maximize, left = left half, right = right half).
      const innerW = window.innerWidth
      const innerH = window.innerHeight
      if (e.clientY < 10) {
        useOsStore.getState().setSnapPreview({
          show: true,
          x: 0,
          y: 0,
          w: innerW,
          h: innerH - TASKBAR_HEIGHT,
        })
      } else if (e.clientX < 10) {
        useOsStore.getState().setSnapPreview({
          show: true,
          x: 0,
          y: 0,
          w: innerW / 2,
          h: innerH - TASKBAR_HEIGHT,
        })
      } else if (e.clientX > innerW - 10) {
        useOsStore.getState().setSnapPreview({
          show: true,
          x: innerW / 2,
          y: 0,
          w: innerW / 2,
          h: innerH - TASKBAR_HEIGHT,
        })
      } else {
        useOsStore.getState().setSnapPreview({ show: false, x: 0, y: 0, w: 0, h: 0 })
      }
    }

    const onUp = () => {
      const d = drag.current
      const snap = useOsStore.getState().snapPreview
      if (d && snap.show) {
        useOsStore.getState().resizeWindow(d.id, snap.x, snap.y, snap.w, snap.h)
        if (snap.w === window.innerWidth) {
          useOsStore.getState().setMaximized(d.id, true)
        }
      }
      useOsStore.getState().setSnapPreview({ show: false, x: 0, y: 0, w: 0, h: 0 })
      drag.current = null
      if (moveHandler.current) window.removeEventListener('mousemove', moveHandler.current)
      if (upHandler.current) window.removeEventListener('mouseup', upHandler.current)
      moveHandler.current = null
      upHandler.current = null
    }

    moveHandler.current = onMove
    upHandler.current = onUp
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])
}
