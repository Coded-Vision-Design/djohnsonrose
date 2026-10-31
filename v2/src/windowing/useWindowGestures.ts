import { useCallback, useEffect, useRef, type PointerEvent, type RefObject } from 'react'
import { useOsStore } from '../store/osStore'
import {
  animateGeometry,
  beginWindowDrag,
  beginWindowResize,
  type ResizeDir,
} from '../../../assets/js/windowing/windowing.js'

const store = () => useOsStore.getState()

/**
 * Connects a window to the shared drag and resize engine. The engine writes to
 * the DOM while a gesture runs, so the store only changes when it finishes.
 */
export function useWindowGestures(id: number, element: RefObject<HTMLDivElement | null>) {
  const stop = useRef<(() => void) | null>(null)

  useEffect(() => () => stop.current?.(), [])

  const shared = useCallback(
    () => ({
      element: element.current!,
      getWindow: () => store().windows.find((w) => w.id === id)!,
      getDesktop: () => store().desktop,
      getMode: () => store().windowMode,
    }),
    [element, id],
  )

  const startDrag = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      stop.current = beginWindowDrag(event.nativeEvent, {
        ...shared(),
        handle: event.currentTarget,
        onDetach: (rect) => store().detachWindow(id, rect),
        onPreview: (rect, bar, target) => store().setSnapPreview({ rect, bar, target }),
        onMove: (x, y) => store().moveWindow(id, x, y),
        onMaximize: () => store().toggleMaximize(id),
        onSnap: (layout, zone) => store().snapWindow(id, layout, zone),
      })
    },
    [id, shared],
  )

  const startResize = useCallback(
    (dir: ResizeDir, event: PointerEvent<HTMLElement>) => {
      stop.current = beginWindowResize(event.nativeEvent, {
        ...shared(),
        handle: event.currentTarget,
        dir,
        getWindows: () => store().windows,
        getElement: (windowId) => document.getElementById(`win-${windowId}`),
        onCommit: (patches) => store().applyWindowPatches(patches),
      })
    },
    [shared],
  )

  const easeNextChange = useCallback(() => animateGeometry(element.current), [element])

  return { startDrag, startResize, easeNextChange }
}
