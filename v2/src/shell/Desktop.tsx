import { Suspense, memo, useEffect, useRef } from 'react'
import { useOsStore, type WinWindow } from '../store/osStore'
import { Window } from '../windowing/Window'
import { WindowContextProvider } from '../windowing/WindowContext'
import { WindowErrorBoundary } from '../windowing/WindowErrorBoundary'
import { SnapUi } from './SnapUi'
import { TaskSwitcher } from './TaskSwitcher'
import { Taskbar } from './Taskbar'
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

  const openContextMenu = useOsStore((s) => s.openContextMenu)
  const minimizeAll = useOsStore((s) => s.minimizeAll)
  const updateSetting = useOsStore((s) => s.updateSetting)
  const resetIconPositions = useOsStore((s) => s.resetIconPositions)
  const openApp = useOsStore((s) => s.openApp)
  const isDark = useOsStore((s) => s.settings.theme === 'dark')

  const openClassicDesktopMenu = (x: number, y: number) => {
    openContextMenu(
      x,
      y,
      [
        { label: 'View', icon: '🖼', disabled: true },
        { label: 'Sort by', icon: '↕', disabled: true },
        { label: 'Refresh', icon: '↻', action: () => window.location.reload() },
        { separator: true },
        { label: 'Paste', icon: '📋', disabled: true },
        { label: 'Paste shortcut', icon: '🔗', disabled: true },
        { separator: true },
        { label: 'New', icon: '✱', disabled: true },
        { label: 'Display settings', icon: '🖥', action: () => openApp('settings') },
        {
          label: 'Personalise',
          icon: '🎨',
          action: () => openApp('settings'),
        },
        { separator: true },
        {
          label: 'Reset icon layout',
          icon: '🔁',
          action: resetIconPositions,
        },
        {
          label: 'Show desktop',
          icon: '⬇',
          action: minimizeAll,
        },
        {
          label: isDark ? 'Light mode' : 'Dark mode',
          icon: isDark ? '☀' : '🌙',
          action: () => updateSetting('theme', isDark ? 'light' : 'dark'),
        },
      ],
      'classic',
    )
  }

  const onDesktopContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const x = e.clientX
    const y = e.clientY
    openContextMenu(x, y, [
      { label: 'View', icon: '👁', disabled: true },
      { label: 'Sort by', icon: '↕', disabled: true },
      { label: 'Refresh', icon: '↻', action: () => window.location.reload() },
      { separator: true },
      {
        label: 'Show desktop',
        icon: '🖥️',
        action: minimizeAll,
      },
      {
        label: 'Reset icon layout',
        icon: '🔁',
        action: resetIconPositions,
      },
      {
        label: isDark ? 'Light mode' : 'Dark mode',
        icon: isDark ? '☀' : '🌙',
        action: () => updateSetting('theme', isDark ? 'light' : 'dark'),
      },
      { separator: true },
      {
        label: 'Show more options',
        icon: '⤓',
        action: () => openClassicDesktopMenu(x, y),
      },
    ])
  }

  return (
    <div
      className="relative h-dvh w-dvw overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${wallpaper})` }}
      onContextMenu={onDesktopContextMenu}
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
