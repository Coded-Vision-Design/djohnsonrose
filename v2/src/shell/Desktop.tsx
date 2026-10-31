import { Suspense, memo, useEffect, useRef, type TouchEvent } from 'react'
import { useOsStore, type WinWindow } from '../store/osStore'
import { Window } from '../windowing/Window'
import { WindowContextProvider } from '../windowing/WindowContext'
import { WindowErrorBoundary } from '../windowing/WindowErrorBoundary'
import { SnapUi } from './SnapUi'
import { TaskSwitcher } from './TaskSwitcher'
import { Taskbar } from './Taskbar'
import { showDesktopMenu } from './menus'
import { StartMenu } from './StartMenu'
import { QuickSettings } from './QuickSettings'
import { Widgets } from './Widgets'
import { CookieBanner } from './CookieBanner'
import { DesktopIcons } from './DesktopIcons'
import { ContextMenu } from './ContextMenu'
import { useWindowShortcuts } from '../windowing/useWindowShortcuts'
import { watchDesktop } from '../../../assets/js/windowing/windowing.js'
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

// Memoised on the window object, which the store only replaces when that window
// changes, so moving one window does not rerender the apps in the others.
const WindowHost = memo(function WindowHost({ win }: { win: WinWindow }) {
  const closeWindow = useOsStore((s) => s.closeWindow)
  const Component = getApp(win.app)?.Component
  return (
    <Window win={win}>
      {Component ? (
        <WindowContextProvider value={win}>
          <WindowErrorBoundary onClose={() => closeWindow(win.id)}>
            <Suspense fallback={<WindowLoader />}>
              <Component />
            </Suspense>
          </WindowErrorBoundary>
        </WindowContextProvider>
      ) : (
        <div className="p-6 text-sm opacity-60">App not found: {win.app}</div>
      )}
    </Window>
  )
})

export function Desktop() {
  const windows = useOsStore((s) => s.windows)
  const wallpaper = useOsStore((s) => s.settings.wallpaper)

  // Ambient services running while desktop is mounted.
  useClock()
  useWeather()
  useWindowShortcuts()

  // The usable desktop is measured from this layer, never from the viewport.
  const windowsLayer = useRef<HTMLDivElement>(null)
  useEffect(
    () => watchDesktop(windowsLayer.current!, (desktop, mode) => useOsStore.getState().setDesktop(desktop, mode)),
    [],
  )

  // Pinching the desktop zooms its icons, as in v1.
  const pinchDistance = useRef(0)
  const fingerGap = ({ touches }: TouchEvent) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
  const onDesktopTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) pinchDistance.current = fingerGap(e)
  }
  const onDesktopTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 2 || (e.target as Element).closest('.os-window')) return
    const gap = fingerGap(e)
    const change = gap - pinchDistance.current
    if (Math.abs(change) <= 2) return
    const { desktopZoom, setDesktopZoom } = useOsStore.getState()
    setDesktopZoom(desktopZoom + (change > 0 ? 0.02 : -0.02))
    pinchDistance.current = gap
  }

  return (
    <div
      className="relative h-dvh w-dvw overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${wallpaper})` }}
      onContextMenu={(e) => {
        e.preventDefault()
        showDesktopMenu(e)
      }}
      onTouchStart={onDesktopTouchStart}
      onTouchMove={onDesktopTouchMove}
    >
      <DesktopIcons />
      <div
        ref={windowsLayer}
        id="windows-layer"
        className="os-windows-layer absolute inset-x-0 top-0"
        style={{ bottom: 'var(--os-taskbar-height)' }}
      >
        {windows.map((win) => (
          <WindowHost key={win.id} win={win} />
        ))}
        <SnapUi />
        <TaskSwitcher />
      </div>

      <Widgets />
      <StartMenu />
      <QuickSettings />
      <Taskbar />
      <CookieBanner />
      <ContextMenu />
    </div>
  )
}
