import { Suspense } from 'react'
import { useOsStore, TASKBAR_HEIGHT } from '../store/osStore'
import { Window } from '../windowing/Window'
import { SnapPreview } from './SnapPreview'
import { getApp, listApps } from '../apps/registry'

// Temporary in-Desktop launcher until the real Taskbar/StartMenu lands in Phase 1B.
function PlaceholderLauncher() {
  const openApp = useOsStore((s) => s.openApp)
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 px-3 py-2 rounded-full bg-black/40 backdrop-blur-md flex gap-2 text-white text-xs"
      style={{ bottom: TASKBAR_HEIGHT + 12 }}
    >
      <span className="self-center opacity-60 pr-2">Phase 1A launcher:</span>
      {listApps().map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => openApp(a.id, a.title)}
          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition"
        >
          {a.title}
        </button>
      ))}
    </div>
  )
}

// Bottom strip placeholder for the real taskbar (Phase 1B).
function PlaceholderTaskbar() {
  const windows = useOsStore((s) => s.windows)
  const toggleMinimize = useOsStore((s) => s.toggleMinimize)
  return (
    <div
      className="absolute left-0 right-0 bottom-0 taskbar-glass flex items-center px-4 text-xs text-black dark:text-white border-t border-black/5 dark:border-white/10"
      style={{ height: TASKBAR_HEIGHT }}
    >
      <span className="opacity-60 mr-3">Taskbar (Phase 1B):</span>
      {windows.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => toggleMinimize(w.id)}
          className="px-3 py-1 mr-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          {w.title}
          {w.minimized && ' (min)'}
        </button>
      ))}
    </div>
  )
}

export function Desktop() {
  const windows = useOsStore((s) => s.windows)
  const wallpaper = useOsStore((s) => s.settings.wallpaper)

  return (
    <div
      id="windows-layer"
      className="relative h-screen w-screen overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${wallpaper})` }}
    >
      {/* Render every open window */}
      {windows.map((win) => {
        const def = getApp(win.app)
        const Component = def?.Component
        return (
          <Window key={win.id} win={win}>
            {Component ? (
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center">
                    <div className="win-loader">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  </div>
                }
              >
                <Component />
              </Suspense>
            ) : (
              <div className="p-6 text-sm opacity-60">App not found: {win.app}</div>
            )}
          </Window>
        )
      })}

      <SnapPreview />
      <PlaceholderLauncher />
      <PlaceholderTaskbar />
    </div>
  )
}
