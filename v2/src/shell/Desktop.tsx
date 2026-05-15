import { Suspense } from 'react'
import { useOsStore } from '../store/osStore'
import { Window } from '../windowing/Window'
import { WindowContextProvider } from '../windowing/WindowContext'
import { SnapPreview } from './SnapPreview'
import { Taskbar } from './Taskbar'
import { StartMenu } from './StartMenu'
import { QuickSettings } from './QuickSettings'
import { Widgets } from './Widgets'
import { CookieBanner } from './CookieBanner'
import { DesktopIcons } from './DesktopIcons'
import { ContextMenu } from './ContextMenu'
import { useBreakpoint } from '../lib/useBreakpoint'
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
  useBreakpoint()

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
      id="windows-layer"
      className="relative h-screen w-screen overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${wallpaper})` }}
      onContextMenu={onDesktopContextMenu}
    >
      <DesktopIcons />
      {windows.map((win) => {
        const def = getApp(win.app)
        const Component = def?.Component
        return (
          <Window key={win.id} win={win}>
            {Component ? (
              <WindowContextProvider value={win}>
                <Suspense fallback={<WindowLoader />}>
                  <Component />
                </Suspense>
              </WindowContextProvider>
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
      <CookieBanner />
      <ContextMenu />
    </div>
  )
}
