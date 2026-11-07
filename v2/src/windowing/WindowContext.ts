import { createContext, useContext, useEffect } from 'react'
import type { WinWindow } from '../store/osStore'
import { shareLiveExtras } from '../../../assets/js/windowing/handoff.js'

const WindowContext = createContext<WinWindow | null>(null)

export const WindowContextProvider = WindowContext.Provider

/**
 * Get the WinWindow object for the currently-rendered app. Useful for reading
 * per-window state (id, extras passed via `openApp`, title, etc.) from inside
 * an app's component tree.
 */
export function useCurrentWindow(): WinWindow {
  const w = useContext(WindowContext)
  if (!w) throw new Error('useCurrentWindow() called outside of a Window')
  return w
}

/**
 * Convenience: typed access to the `extra` payload an app was opened with.
 * Returns an empty object when there is nothing.
 */
export function useWindowExtras<T extends Record<string, unknown>>(): T {
  const w = useCurrentWindow()
  return (w.extra ?? {}) as T
}

/**
 * Shares what the app shows now, in the extras' own names, so that the build
 * switch carries it to v1 rather than what the window opened with. See
 * shareLiveExtras in handoff.js. Kept current on every render.
 */
export function useLiveExtras(extras: Record<string, unknown>): void {
  const { id } = useCurrentWindow()
  useEffect(() => shareLiveExtras(id, () => extras))
}
