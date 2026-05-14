import { Suspense } from 'react'
import { useOsStore } from '../store/osStore'
import { Window } from '../windowing/Window'
import { SnapPreview } from './SnapPreview'
import { Taskbar } from './Taskbar'
import { StartMenu } from './StartMenu'
import { QuickSettings } from './QuickSettings'
import { Widgets } from './Widgets'
import { getApp } from '../apps/registry'
import { useClock } from '../lib/useClock'
import { useWeather } from '../lib/useWeather'

function WindowLoader() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="win-loader">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  )
}

export function Desktop() {
  const windows = useOsStore((s) => s.windows)
  const wallpaper = useOsStore((s) => s.settings.wallpaper)

  // Ambient services running while desktop is mounted.
  useClock()
  useWeather()

  return (
    <div
      id="windows-layer"
      className="relative h-screen w-screen overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${wallpaper})` }}
    >
      {windows.map((win) => {
        const def = getApp(win.app)
        const Component = def?.Component
        return (
          <Window key={win.id} win={win}>
            {Component ? (
              <Suspense fallback={<WindowLoader />}>
                <Component />
              </Suspense>
            ) : (
              <div className="p-6 text-sm opacity-60">App not found: {win.app}</div>
            )}
          </Window>
        )
      })}

      <SnapPreview />
      <Widgets />
      <StartMenu />
      <QuickSettings />
      <Taskbar />
    </div>
  )
}
