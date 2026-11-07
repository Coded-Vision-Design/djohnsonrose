// Each app's code is a separate chunk, fetched the first time it opens. Once
// the desktop is idle, fetch the apps visitors open most, so they open at once.
// These are the same imports as registry.ts, so the browser reuses the modules.

export const LIKELY_APPS = ['explorer', 'notepad', 'word', 'terminal'] as const

type LikelyApp = (typeof LIKELY_APPS)[number]
type Loaders = Record<LikelyApp, () => Promise<unknown>>

const LOADERS: Loaders = {
  explorer: () => import('./explorer/Explorer'),
  notepad: () => import('./notepad/Notepad'),
  word: () => import('./word/Word'),
  terminal: () => import('./terminal/Terminal'),
}

/** Loads every likely app. A failure is left for the app's own open to report. */
export function loadLikelyApps(loaders: Loaders = LOADERS): Promise<unknown[]> {
  return Promise.all(LIKELY_APPS.map((id) => loaders[id]().catch(() => undefined)))
}

interface IdleWindow {
  requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

const saveDataOn = () =>
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true

/**
 * Runs load once the browser is idle (within 5 s), or after 2 s where there is
 * no requestIdleCallback (Safari). Skipped when the visitor asks to save data.
 * Returns a function that cancels it.
 */
export function preloadWhenIdle(
  load: () => Promise<unknown> = loadLikelyApps,
  win: IdleWindow = window,
  saveData = saveDataOn(),
): () => void {
  if (saveData) return () => {}
  const run = () => void load()
  if (win.requestIdleCallback) {
    const id = win.requestIdleCallback(run, { timeout: 5000 })
    return () => win.cancelIdleCallback?.(id)
  }
  const timer = setTimeout(run, 2000)
  return () => clearTimeout(timer)
}
