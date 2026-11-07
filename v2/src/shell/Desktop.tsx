import { Suspense, memo, useEffect, useRef, type TouchEvent } from 'react'
import { useOsStore, type WinWindow } from '../store/osStore'
import { Window } from '../windowing/Window'
import { WindowContextProvider } from '../windowing/WindowContext'
import { WindowErrorBoundary } from '../windowing/WindowErrorBoundary'
import { SnapUi } from './SnapUi'
import { TaskView } from './TaskView'
import { WindowSwitcher } from './WindowSwitcher'
import { Taskbar } from './Taskbar'
import { CalendarFlyout } from './CalendarFlyout'
import { PropertiesDialog, Toast } from './FileDialogs'
import { Tour } from './Tour'
import { showDesktopMenu } from './menus'
import { StartMenu } from './StartMenu'
import { QuickSettings } from './QuickSettings'
import { Widgets } from './Widgets'
import { CookieBanner } from './CookieBanner'
import { DesktopIcons } from './DesktopIcons'
import { ContextMenu } from './ContextMenu'
import { useWindowShortcuts } from '../windowing/useWindowShortcuts'
import { useShellKeys } from './useShellKeys'
import { keepFileLongPress, watchDesktop } from '../../../assets/js/windowing/windowing.js'
import { focusAfterClose } from '../../../assets/js/windowing/shell-ui.js'
import { cssUrl, fingerGap, pinchZoom } from '../../../assets/js/windowing/shell-core.js'
import { getApp } from '../apps/registry'
import { preloadWhenIdle } from '../apps/preload'
import { useClock } from '../lib/useClock'
import { useWeather } from '../lib/useWeather'

// The dots take the text colour, so that they show on light and dark windows.
function WindowLoader() {
  return (
    <div role="status" aria-label="Loading" className="h-full flex items-center justify-center text-black/70 dark:text-white/80">
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
              <Component key={win.revision ?? 0} />
            </Suspense>
          </WindowErrorBoundary>
        </WindowContextProvider>
      ) : (
        <div className="p-6 text-sm opacity-60">App not found: {win.app}</div>
      )}
    </Window>
  )
})

const LONG_PRESS_MS = 600

export function Desktop() {
  const windows = useOsStore((s) => s.windows)
  // Settings previews a wallpaper here before it is saved, as v1 does.
  const wallpaper = useOsStore((s) => s.previewWallpaper ?? s.settings.wallpaper)

  // Ambient services running while desktop is mounted.
  useClock()
  useWeather()
  useWindowShortcuts()
  useShellKeys()

  // When a window closes with focus inside it, focus moves to the window now on
  // top, or back to the app's taskbar button. v1's store.js does the same.
  const shown = useRef(windows)
  useEffect(() => {
    const gone = shown.current.filter((w) => !windows.some((open) => open.id === w.id))
    shown.current = windows
    if (gone.length === 0) return
    const active = document.activeElement
    if (active && active !== document.body) return
    focusAfterClose(useOsStore.getState().focusedWindowId, gone[0].app)
  }, [windows])

  // The usable desktop is measured from this layer, never from the viewport.
  const windowsLayer = useRef<HTMLDivElement>(null)
  useEffect(
    () => watchDesktop(windowsLayer.current!, (desktop, mode) => useOsStore.getState().setDesktop(desktop, mode)),
    [],
  )
  useEffect(() => keepFileLongPress(), [])
  // Fetch the most opened apps once the desktop is idle, so they open at once.
  useEffect(() => preloadWhenIdle(), [])

  // Phones have no right button, so a long press does the same job: it raises
  // the right-click on whatever is under the finger, as in v1. Pinching the
  // desktop zooms its icons.
  const pinch = useRef({ gap: 0, zoom: 1 })
  const press = useRef({ x: 0, y: 0, timer: 0, fired: false })
  const onDesktopTouchStart = (e: TouchEvent) => {
    window.clearTimeout(press.current.timer)
    press.current.fired = false
    if (e.touches.length === 2) {
      pinch.current = { gap: fingerGap(e.touches), zoom: useOsStore.getState().desktopZoom }
      return
    }
    const target = e.target as Element
    const hasOwnMenu = !target.closest('.os-window') || target.closest('[data-explorer-pane]')
    if (!hasOwnMenu || target.closest('.os-task-view, .os-switcher, input, textarea')) return
    const { clientX, clientY } = e.touches[0]
    const timer = window.setTimeout(() => {
      press.current.fired = true
      target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX, clientY }))
    }, LONG_PRESS_MS)
    press.current = { x: clientX, y: clientY, timer, fired: false }
  }
  const onDesktopTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const { clientX, clientY } = e.touches[0]
      if (Math.hypot(clientX - press.current.x, clientY - press.current.y) > 10) {
        window.clearTimeout(press.current.timer)
      }
      return
    }
    if (e.touches.length !== 2 || (e.target as Element).closest('.os-window')) return
    useOsStore.getState().setDesktopZoom(pinchZoom(pinch.current.zoom, pinch.current.gap, fingerGap(e.touches)))
  }

  return (
    <div
      data-os-desktop=""
      className="relative h-dvh w-dvw overflow-hidden bg-[#381759] bg-cover bg-center touch-none"
      style={{ backgroundImage: cssUrl(wallpaper) }}
      onContextMenu={(e) => {
        const target = e.target as Element
        if (target.closest('input, textarea')) return
        e.preventDefault()
        if (!target.closest('.os-window')) showDesktopMenu(e)
      }}
      onTouchStart={onDesktopTouchStart}
      onTouchMove={onDesktopTouchMove}
      onTouchEnd={(e) => {
        window.clearTimeout(press.current.timer)
        // Lifting the finger would click, which would close the menu it just opened.
        if (press.current.fired) e.preventDefault()
      }}
      onTouchCancel={() => window.clearTimeout(press.current.timer)}
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
        <TaskView />
        <WindowSwitcher />
      </div>

      <Widgets />
      <StartMenu />
      <QuickSettings />
      <Taskbar />
      <CalendarFlyout />
      <CookieBanner />
      <ContextMenu />
      <PropertiesDialog />
      <Toast />
      <Tour />
    </div>
  )
}
