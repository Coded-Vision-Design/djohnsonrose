import { useOsStore, TASKBAR_HEIGHT } from '../store/osStore'
import { getApp } from '../apps/registry'
import { playSound } from '../lib/sounds'
import { VolumeIcon } from './VolumeIcon'

function AppButton({ appId }: { appId: string }) {
  const def = getApp(appId)
  const openApp = useOsStore((s) => s.openApp)
  const toggleMinimize = useOsStore((s) => s.toggleMinimize)
  const windowForApp = useOsStore((s) => s.windows.find((w) => w.app === appId))
  const focusedId = useOsStore((s) => s.focusedWindowId)

  if (!def) return null

  const isOpen = !!windowForApp
  const isFocused = isOpen && windowForApp.id === focusedId
  const isMinimized = isOpen && windowForApp.minimized

  const indicator = !isOpen
    ? null
    : isFocused
      ? 'app-indicator app-indicator-active glow'
      : isMinimized
        ? 'app-indicator app-indicator-minimized'
        : 'app-indicator app-indicator-inactive'

  const handleClick = () => {
    if (isOpen && isFocused) {
      toggleMinimize(windowForApp.id)
    } else {
      openApp(appId, def.title)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={def.title}
      className={`relative w-10 h-10 flex items-center justify-center rounded hover:bg-white/10 transition-all ${
        isFocused ? 'bg-white/10 shadow-inner' : ''
      }`}
    >
      <div className="w-7 h-7 rounded overflow-hidden flex items-center justify-center">
        <img src={def.icon} alt="" className="w-full h-full object-contain" />
      </div>
      {indicator && (
        <div
          className={`absolute bottom-1 left-1/2 -translate-x-1/2 ${indicator}`}
        />
      )}
    </button>
  )
}

export function Taskbar() {
  const pinned = useOsStore((s) => s.pinnedApps)
  const openAppIds = useOsStore((s) =>
    Array.from(new Set([...s.pinnedApps, ...s.windows.map((w) => w.app)])),
  )
  const startMenuOpen = useOsStore((s) => s.startMenuOpen)
  const quickSettingsOpen = useOsStore((s) => s.quickSettingsOpen)
  const toggleStartMenu = useOsStore((s) => s.toggleStartMenu)
  const toggleQuickSettings = useOsStore((s) => s.toggleQuickSettings)
  const toggleWidgets = useOsStore((s) => s.toggleWidgets)
  const minimizeAll = useOsStore((s) => s.minimizeAll)
  const weather = useOsStore((s) => s.weather)
  const clock = useOsStore((s) => s.clock)
  const settingsWifi = useOsStore((s) => s.settings.wifi)
  void pinned // referenced via openAppIds

  return (
    <div
      className="absolute left-0 right-0 bottom-0 taskbar-glass flex items-center justify-between px-2 border-t border-white/20 z-[9999]"
      style={{ height: TASKBAR_HEIGHT }}
    >
      {/* Left — weather widget toggle */}
      <button
        type="button"
        onClick={toggleWidgets}
        className="w-48 flex items-center px-2 py-1.5 rounded hover:bg-white/10 transition-colors"
        title="Widgets"
      >
        <span className="text-xl mr-2">{weather.icon}</span>
        <div className="flex flex-col leading-tight text-left">
          <span className="text-[11px] text-black dark:text-white font-semibold">
            {weather.temp}°C
          </span>
          <span className="text-[9px] text-black dark:text-white opacity-60 truncate">
            {weather.condition}
          </span>
        </div>
      </button>

      {/* Center — start + pinned + open */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => {
            playSound('click')
            toggleStartMenu()
          }}
          className={`w-10 h-10 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${
            startMenuOpen ? 'bg-white/10' : ''
          }`}
          title="Start"
        >
          <img
            src="/assets/img/startmenu.webp"
            alt="Start"
            className="w-6 h-6 transition-transform active:scale-90"
          />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        {openAppIds.map((id) => (
          <AppButton key={id} appId={id} />
        ))}
      </div>

      {/* Right — tray + clock */}
      <div className="flex items-center space-x-1 px-2 text-black dark:text-white">
        <button
          type="button"
          onClick={() => {
            playSound('click')
            toggleQuickSettings()
          }}
          className={`tray-group hover:bg-white/10 ${
            quickSettingsOpen ? 'bg-white/20' : ''
          }`}
          title="Quick settings"
        >
          <img
            src="/assets/img/wifi.webp"
            alt=""
            className={`w-4 h-4 dark:invert transition-opacity ${
              settingsWifi ? 'opacity-80' : 'grayscale opacity-30'
            }`}
          />
          <VolumeIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleWidgets}
          className="px-2 py-1 rounded hover:bg-white/10 text-xs text-right leading-tight transition-colors"
          title="Date & time"
        >
          <div>{clock.time}</div>
          <div className="text-[10px] opacity-70">{clock.date}</div>
        </button>
        <button
          type="button"
          onClick={minimizeAll}
          aria-label="Show desktop"
          className="w-[2px] hover:bg-white/20 h-8 ml-1 transition-colors"
        />
      </div>
    </div>
  )
}
