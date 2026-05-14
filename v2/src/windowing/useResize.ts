import { useCallback, useRef } from 'react'
import { useOsStore, WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT } from '../store/osStore'

export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

interface ResizeData {
  id: number
  startX: number
  startY: number
  initialX: number
  initialY: number
  initialW: number
  initialH: number
  dir: ResizeDir
}

// Ports startResize/doResize from assets/js/components/os/shell.js — 8 handles
// with per-axis clamping to MIN_W/MIN_H. North/west handles also adjust x/y so
// the opposite edge stays anchored.
export function useResize() {
  const data = useRef<ResizeData | null>(null)

  return useCallback((id: number, dir: ResizeDir, event: React.MouseEvent) => {
    const store = useOsStore.getState()
    const win = store.windows.find((w) => w.id === id)
    if (!win || win.maximized) return

    data.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      initialX: win.x,
      initialY: win.y,
      initialW: win.width,
      initialH: win.height,
      dir,
    }

    // Capture the cursor on body so it doesn't flicker over child elements.
    const originalCursor = document.body.style.cursor
    const target = event.target as HTMLElement
    document.body.style.cursor = window.getComputedStyle(target).cursor || ''

    const onMove = (e: MouseEvent) => {
      const d = data.current
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY

      let newX = d.initialX
      let newY = d.initialY
      let newW = d.initialW
      let newH = d.initialH

      if (d.dir.includes('e')) {
        newW = Math.max(WINDOW_MIN_WIDTH, d.initialW + dx)
      }
      if (d.dir.includes('w')) {
        const potential = d.initialW - dx
        if (potential >= WINDOW_MIN_WIDTH) {
          newW = potential
          newX = d.initialX + dx
        } else {
          newX = d.initialX + (d.initialW - WINDOW_MIN_WIDTH)
          newW = WINDOW_MIN_WIDTH
        }
      }
      if (d.dir.includes('s')) {
        newH = Math.max(WINDOW_MIN_HEIGHT, d.initialH + dy)
      }
      if (d.dir.includes('n')) {
        const potential = d.initialH - dy
        if (potential >= WINDOW_MIN_HEIGHT) {
          newH = potential
          newY = d.initialY + dy
        } else {
          newY = d.initialY + (d.initialH - WINDOW_MIN_HEIGHT)
          newH = WINDOW_MIN_HEIGHT
        }
      }

      useOsStore.getState().resizeWindow(d.id, newX, newY, newW, newH)
    }

    const onUp = () => {
      document.body.style.cursor = originalCursor
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      data.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])
}
