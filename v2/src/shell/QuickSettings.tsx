import { useEffect, useRef } from 'react'
import { useOsStore } from '../store/osStore'
import { VolumeIcon } from './VolumeIcon'
import type { QuickToggle } from '../../../assets/js/windowing/shell-ui.js'

// 1:1 port of partials/quick-settings.php: 360px panel above the tray
// with 6 toggles (3-col grid), Brightness + Volume sliders, and a
// bottom-info row. What each toggle changes is shared with v1
// (quickTogglePatch), and ThemeBridge puts the display ones on screen.

interface ToggleDef {
  id: QuickToggle
  label: string
  activeLabel: string
  icon: string
  activeIcon?: string
  noHighlight?: boolean
}

const TOGGLES: ToggleDef[] = [
  { id: 'wifi', label: 'Wi-Fi', activeLabel: 'Connected', icon: '/assets/img/wifi.webp', noHighlight: true },
  { id: 'bluetooth', label: 'Bluetooth', activeLabel: 'Connected', icon: '/assets/img/bluetooth.webp', activeIcon: '/assets/img/bluetooth.webp', noHighlight: true },
  { id: 'airplane', label: 'Flight mode', activeLabel: 'On', icon: '/assets/img/win11/airplane.svg' },
  { id: 'batterySaver', label: 'Energy saver', activeLabel: 'On', icon: '/assets/img/win11/power.svg' },
  { id: 'nightLight', label: 'Night light', activeLabel: 'On', icon: '/assets/img/win11/nightlight.svg' },
  { id: 'accessibility', label: 'Accessibility', activeLabel: 'On', icon: '/assets/img/win11/accessibility.svg' },
]

export function QuickSettings() {
  const open = useOsStore((s) => s.quickSettingsOpen)
  const close = useOsStore((s) => s.closeAllPopups)
  const settings = useOsStore((s) => s.settings)
  const battery = useOsStore((s) => s.battery)
  const updateSetting = useOsStore((s) => s.updateSetting)
  const toggleQuickSetting = useOsStore((s) => s.toggleQuickSetting)
  const openApp = useOsStore((s) => s.openApp)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return
      // The tray-group button toggles this popup itself; let its onClick run.
      const t = e.target as Element | null
      if (t?.closest?.('[data-popup-toggle]')) return
      close()
    }
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, close])

  if (!open) return null

  const brightnessProgress = ((settings.brightness - 30) / 70) * 100

  return (
    <div
      ref={ref}
      data-quick-settings=""
      role="dialog"
      aria-label="Quick settings"
      className="fixed right-2 w-[360px] max-w-[calc(100%-1rem)] glass rounded-xl flex flex-col overflow-hidden shadow-2xl p-4 space-y-6 z-10000 animate-window-open"
      style={{ bottom: 'calc(var(--os-taskbar-height) + 8px)' }}
    >
      {/* Quick Toggles: 3 cols, 6 cells */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-1">
        {TOGGLES.map((t) => {
          const active = settings[t.id]
          const isHighlightActive = active && !t.noHighlight
          return (
            <div key={t.id} className="quick-settings-btn">
              <button
                type="button"
                data-quick-toggle={t.id}
                onClick={() => toggleQuickSetting(t.id)}
                aria-label={t.label}
                aria-pressed={active}
                className={`quick-settings-toggle ${isHighlightActive ? 'active' : ''} ${
                  t.noHighlight ? 'no-highlight' : ''
                }`}
              >
                <img
                  src={active && t.activeIcon ? t.activeIcon : t.icon}
                  alt=""
                  className={`w-5 h-5 dark:invert ${
                    isHighlightActive ? 'brightness-0 invert' : 'opacity-80'
                  }`}
                />
              </button>
              <span className="text-xs text-center dark:text-white mt-1 truncate w-full px-1">
                {active ? t.activeLabel : t.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Sliders */}
      <div className="space-y-6 px-1">
        {/* Brightness */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <img
              src="/assets/img/win11/brightness.svg"
              alt=""
              className="w-4 h-4 opacity-70 dark:invert"
            />
            <span className="text-xs opacity-70 dark:text-white uppercase font-bold tracking-wider">
              Brightness
            </span>
          </div>
          <input
            type="range"
            aria-label="Brightness"
            min={30}
            max={100}
            value={settings.brightness}
            onChange={(e) => updateSetting('brightness', Number(e.target.value))}
            className="win-slider w-full"
            style={
              {
                ['--range-progress' as string]: `${brightnessProgress}%`,
              } as React.CSSProperties
            }
          />
        </div>
        {/* Volume */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <VolumeIcon className="w-4 h-4 opacity-70" />
            <span className="text-xs opacity-70 dark:text-white uppercase font-bold tracking-wider">
              Volume
            </span>
          </div>
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={100}
            value={settings.volume}
            onChange={(e) => updateSetting('volume', Number(e.target.value))}
            className="win-slider w-full"
            style={
              {
                ['--range-progress' as string]: `${settings.volume}%`,
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      {/* Bottom info: battery + personalise/all-settings shortcuts */}
      <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between px-1">
        <div data-quick-battery="" className="flex items-center space-x-2 text-xs dark:text-white font-medium">
          <img
            src={`/assets/img/win11/${battery.charging ? 'energy' : 'battery'}.svg`}
            alt=""
            className="w-4 h-4 opacity-70 dark:invert"
          />
          <span className="opacity-80">{battery.level}% {settings.batterySaver ? '(Saver On)' : ''}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => {
              openApp('settings', 'Settings', { extra: { currentTab: 'personalisation' } })
              close()
            }}
            title="Personalise"
            aria-label="Personalise"
            className="p-2 rounded-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <img src="/assets/img/win11/edit.svg" alt="" className="w-4 h-4 opacity-70 dark:invert" />
          </button>
          <button
            type="button"
            onClick={() => {
              openApp('settings')
              close()
            }}
            title="All settings"
            aria-label="All settings"
            className="p-2 rounded-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <img src="/assets/img/win11/settings.svg" alt="" className="w-4 h-4 opacity-70 dark:invert" />
          </button>
        </div>
      </div>
    </div>
  )
}
