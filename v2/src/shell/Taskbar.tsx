import { useMemo, useState, useEffect, useRef } from 'react'
import { useOsStore, TASKBAR_HEIGHT } from '../store/osStore'
import { getApp } from '../apps/registry'
import { playSound } from '../lib/sounds'
import { VolumeIcon } from './VolumeIcon'

// 1:1 port of partials/taskbar.php — left widget area, centre pinned + running
// apps with the v1 active indicators (active/inactive/minimized), right system
// tray with hidden-icons chevron popup + mic + wifi/volume tray + clock + peek.

function AppButton({ appId }: { appId: string }) {
  const def = getApp(appId)
  const openApp = useOsStore((s) => s.openApp)
  const toggleMinimize = useOsStore((s) => s.toggleMinimize)
  const windows = useOsStore((s) => s.windows)
  const focusedId = useOsStore((s) => s.focusedWindowId)

  if (!def) return null

  const windowsForApp = windows.filter((w) => w.app === appId)
  const isOpen = windowsForApp.length > 0
  const isFocused = isOpen && windowsForApp.some((w) => w.id === focusedId)
  const allMinimized = isOpen && windowsForApp.every((w) => w.minimized)

  let indicatorClass = ''
  if (isOpen) {
    if (isFocused) indicatorClass = 'app-indicator-active glow'
    else if (allMinimized) indicatorClass = 'app-indicator-minimized'
    else indicatorClass = 'app-indicator-inactive'
  }

  const handleClick = () => {
    if (isOpen && isFocused) {
      // Toggle minimize on the focused window of this app.
      const w = windowsForApp.find((w) => w.id === focusedId)
      if (w) toggleMinimize(w.id)
    } else if (isOpen && allMinimized) {
      toggleMinimize(windowsForApp[0].id)
    } else {
      openApp(appId, def.title, { size: { w: def.defaultSize.w, h: def.defaultSize.h } })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={def.title}
      className={`w-10 h-10 flex items-center justify-center rounded hover:bg-white/10 transition-all relative group ${
        isFocused ? 'bg-white/10 shadow-inner' : ''
      }`}
    >
      <div className="w-7 h-7 rounded flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
        <img src={def.icon} alt="" className="w-full h-full object-contain" />
      </div>
      {indicatorClass && (
        <div
          className={`absolute bottom-1 left-1/2 -translate-x-1/2 app-indicator ${indicatorClass}`}
        />
      )}
    </button>
  )
}

export function Taskbar() {
  const pinned = useOsStore((s) => s.pinnedApps)
  const windows = useOsStore((s) => s.windows)
  // Set preserves order: pinned first, then any not-pinned running apps.
  const openAppIds = useMemo(() => {
    const ids = new Set<string>(pinned)
    for (const w of windows) ids.add(w.app)
    return Array.from(ids)
  }, [pinned, windows])

  const startMenuOpen = useOsStore((s) => s.startMenuOpen)
  const quickSettingsOpen = useOsStore((s) => s.quickSettingsOpen)
  const toggleStartMenu = useOsStore((s) => s.toggleStartMenu)
  const toggleQuickSettings = useOsStore((s) => s.toggleQuickSettings)
  const toggleWidgets = useOsStore((s) => s.toggleWidgets)
  const closeAllPopups = useOsStore((s) => s.closeAllPopups)
  const minimizeAll = useOsStore((s) => s.minimizeAll)
  const openApp = useOsStore((s) => s.openApp)
  const weather = useOsStore((s) => s.weather)
  const clock = useOsStore((s) => s.clock)
  const settings = useOsStore((s) => s.settings)

  const [hiddenIconsOpen, setHiddenIconsOpen] = useState(false)
  const trayRef = useRef<HTMLDivElement>(null)

  // Close hidden-icons popup on outside click.
  useEffect(() => {
    if (!hiddenIconsOpen) return
    const onDown = (e: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(e.target as Node)) {
        setHiddenIconsOpen(false)
      }
    }
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onDown)
    }
  }, [hiddenIconsOpen])

  // Hidden tray icons: dynamic when an app is open, plus constants.
  const runningAppIds = new Set(windows.map((w) => w.app))

  return (
    <div
      className="absolute left-0 right-0 bottom-0 taskbar-glass flex items-center justify-between px-2 z-[9999] border-t border-white/20"
      style={{ height: TASKBAR_HEIGHT }}
    >
      {/* Left — weather widget toggle (v1 puts this in a w-48 container) */}
      <div className="flex items-center w-48 overflow-hidden">
        <button
          type="button"
          data-popup-toggle="widgets"
          onClick={toggleWidgets}
          className="px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer flex items-center space-x-2 transition-colors group"
          title="Widgets"
        >
          <span className="text-xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
            {weather.icon}
          </span>
          <div className="flex flex-col leading-tight text-left">
            <span className="text-[11px] text-black dark:text-white font-semibold">
              {weather.temp}°C
            </span>
            <span className="text-[9px] text-black dark:text-white opacity-60 truncate">
              {weather.condition}
            </span>
          </div>
        </button>
      </div>

      {/* Centre — start, search, task view, divider, pinned/running */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          data-popup-toggle="start"
          onClick={() => {
            playSound('click')
            toggleStartMenu()
          }}
          className={`w-10 h-10 flex items-center justify-center rounded hover:bg-white/10 transition-colors group ${
            startMenuOpen ? 'bg-white/10' : ''
          }`}
          title="Start"
        >
          <img
            src="/assets/img/startmenu.webp"
            alt="Start"
            className="w-6 h-6 transition-transform group-active:scale-90"
          />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!startMenuOpen) toggleStartMenu()
          }}
          className="w-10 h-10 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          title="Search"
        >
          <svg className="w-5 h-5 text-win-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => openApp('taskmanager')}
          className="w-10 h-10 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          title="Task view"
        >
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" />
          </svg>
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {openAppIds.map((id) => (
          <AppButton key={id} appId={id} />
        ))}
      </div>

      {/* Right — tray group */}
      <div
        ref={trayRef}
        className="flex items-center space-x-1 px-2 text-black dark:text-white relative"
      >
        {/* Cross-version flip */}
        <a
          href="/"
          title="Switch to the original PHP (v1) build"
          className="hidden md:flex items-center px-2 py-1 mr-1 rounded text-[10px] font-medium border border-win-blue/30 bg-win-blue/10 text-win-blue hover:bg-win-blue hover:text-white transition-colors"
        >
          🐘 PHP v1
        </a>

        {/* Hidden-icons popup */}
        {hiddenIconsOpen && (
          <div className="absolute bottom-14 right-32 bg-white/90 dark:bg-[#1c1c1c]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl p-2 flex flex-row items-center space-x-1 z-[10001]">
            {runningAppIds.has('outlook') && (
              <button
                type="button"
                onClick={() => {
                  openApp('outlook')
                  setHiddenIconsOpen(false)
                }}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors flex items-center justify-center"
                title="Outlook"
              >
                <img src="/assets/img/outlook.webp" alt="" className="w-5 h-5" />
              </button>
            )}
            {runningAppIds.has('pdfreader') && (
              <button
                type="button"
                onClick={() => {
                  openApp('pdfreader')
                  setHiddenIconsOpen(false)
                }}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                title="PDF Reader"
              >
                <img src="/assets/img/pdf.webp" alt="" className="w-5 h-5" />
              </button>
            )}
            {runningAppIds.has('vscode') && (
              <button
                type="button"
                onClick={() => {
                  openApp('vscode')
                  setHiddenIconsOpen(false)
                }}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                title="VS Code"
              >
                <img src="/assets/img/vscode.webp" alt="" className="w-5 h-5" />
              </button>
            )}
            {settings.bluetooth && (
              <div
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors flex items-center justify-center"
                title="Bluetooth"
              >
                <img src="/assets/img/bluetooth.webp" alt="" className="w-5 h-5 dark:invert opacity-80" />
              </div>
            )}
            <div
              className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors flex items-center justify-center"
              title="Windows Security"
            >
              <img src="/assets/img/win11/view.png" alt="" className="w-5 h-5 dark:invert opacity-70" />
            </div>
            <button
              type="button"
              onClick={() => {
                openApp('settings')
                setHiddenIconsOpen(false)
              }}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors flex items-center justify-center"
              title="Settings"
            >
              <img src="/assets/img/settings.webp" alt="" className="w-5 h-5 opacity-70" />
            </button>
          </div>
        )}

        {/* Chevron */}
        <button
          type="button"
          onClick={() => setHiddenIconsOpen((v) => !v)}
          className={`p-1 rounded hover:bg-white/10 transition-colors ${
            hiddenIconsOpen ? 'bg-white/10' : ''
          }`}
          title="Show hidden icons"
        >
          <img
            src="/assets/img/win11/chevron_up.svg"
            alt=""
            className={`w-3.5 h-3.5 opacity-70 dark:invert transition-transform duration-200 ${
              hiddenIconsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Mic */}
        <div className="p-1 hidden md:block" title="Microphone">
          <img src="/assets/img/win11/mic.svg" alt="" className="w-4 h-4 opacity-80 dark:invert" />
        </div>

        {/* System status group → opens quick settings */}
        <button
          type="button"
          data-popup-toggle="quick-settings"
          onClick={() => {
            playSound('click')
            toggleQuickSettings()
          }}
          className={`tray-group hover:bg-white/10 flex flex-row items-center space-x-2 ${
            quickSettingsOpen ? 'bg-white/20' : ''
          }`}
          title="Network, sound, battery"
        >
          {/* Wi-Fi */}
          <img
            src="/assets/img/wifi.webp"
            alt=""
            className={`w-4 h-4 dark:invert transition-opacity ${
              settings.wifi ? 'opacity-80' : 'grayscale opacity-30'
            }`}
          />

          {/* Volume */}
          <VolumeIcon className="w-4 h-4 transition-opacity" />

          {/* Battery */}
          <div className="flex items-center relative" title="Battery">
            <img
              src="/assets/img/win11/battery.svg"
              alt=""
              className={`w-5 h-5 dark:invert transition-opacity ${
                settings.batterySaver ? 'opacity-60' : 'opacity-80'
              }`}
            />
            {settings.batterySaver && (
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white dark:border-win-dark shadow-sm bg-yellow-500" />
            )}
          </div>
        </button>

        {/* Clock + date */}
        <button
          type="button"
          onClick={closeAllPopups}
          className="px-2 py-1 rounded hover:bg-white/10 text-xs text-right leading-tight transition-colors"
          title="Date and time"
        >
          <div>{clock.time}</div>
          <div className="text-[10px] opacity-70">{clock.date}</div>
        </button>

        {/* Desktop peek */}
        <button
          type="button"
          onClick={minimizeAll}
          aria-label="Show desktop"
          className="w-[2px] hover:bg-white/20 h-8 ml-1 cursor-pointer transition-colors"
        />
      </div>
    </div>
  )
}
