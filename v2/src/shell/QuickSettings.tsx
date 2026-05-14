import { useEffect, useRef } from 'react'
import { useOsStore, TASKBAR_HEIGHT, type Settings } from '../store/osStore'
import { playSound } from '../lib/sounds'
import { VolumeIcon } from './VolumeIcon'

type ToggleKey = 'wifi' | 'bluetooth' | 'airplane' | 'batterySaver' | 'nightLight' | 'accessibility'

interface Toggle {
  id: ToggleKey
  label: string
  activeLabel: string
  icon: string
  noHighlight?: boolean
}

const TOGGLES: Toggle[] = [
  { id: 'wifi', label: 'Wi-Fi', activeLabel: 'Connected', icon: '/assets/img/wifi.webp', noHighlight: true },
  { id: 'bluetooth', label: 'Bluetooth', activeLabel: 'Connected', icon: '/assets/img/bluetooth.webp', noHighlight: true },
  { id: 'airplane', label: 'Flight mode', activeLabel: 'On', icon: '/assets/img/win11/airplane.svg' },
  { id: 'batterySaver', label: 'Energy saver', activeLabel: 'On', icon: '/assets/img/win11/power.svg' },
  { id: 'nightLight', label: 'Night light', activeLabel: 'On', icon: '/assets/img/win11/nightlight.svg' },
  { id: 'accessibility', label: 'Accessibility', activeLabel: 'On', icon: '/assets/img/win11/accessibility.svg' },
]

export function QuickSettings() {
  const open = useOsStore((s) => s.quickSettingsOpen)
  const close = useOsStore((s) => s.closeAllPopups)
  const settings = useOsStore((s) => s.settings)
  const updateSetting = useOsStore((s) => s.updateSetting)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, close])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="fixed right-2 w-[360px] glass rounded-xl flex flex-col overflow-hidden shadow-2xl p-4 space-y-6 z-[10000]"
      style={{ bottom: TASKBAR_HEIGHT + 8 }}
    >
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-1">
        {TOGGLES.map((t) => {
          const active = settings[t.id as keyof Settings] as boolean
          const isActiveHighlight = active && !t.noHighlight
          return (
            <div key={t.id} className="quick-settings-btn">
              <button
                type="button"
                onClick={() => {
                  updateSetting(t.id, !active)
                  playSound('click')
                }}
                className={`quick-settings-toggle ${isActiveHighlight ? 'active' : ''} ${
                  t.noHighlight ? 'no-highlight' : ''
                }`}
                aria-pressed={active}
              >
                <img
                  src={t.icon}
                  alt=""
                  className={`w-5 h-5 dark:invert ${
                    isActiveHighlight ? 'brightness-0 invert' : 'opacity-80'
                  }`}
                />
              </button>
              <span className="text-[11px] text-center dark:text-white mt-1 opacity-90 truncate w-full px-1">
                {active ? t.activeLabel : t.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="space-y-6 px-1">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <img
              src="/assets/img/win11/brightness.svg"
              alt=""
              className="w-4 h-4 opacity-70 dark:invert"
            />
            <span className="text-[10px] opacity-60 dark:text-white uppercase font-bold tracking-wider">
              Brightness
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={100}
            value={settings.brightness}
            onChange={(e) => updateSetting('brightness', Number(e.target.value))}
            className="win-slider w-full"
            style={
              {
                ['--range-progress' as string]: `${((settings.brightness - 30) / 70) * 100}%`,
              } as React.CSSProperties
            }
          />
        </div>

        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <VolumeIcon className="w-4 h-4 opacity-70" />
            <span className="text-[10px] opacity-60 dark:text-white uppercase font-bold tracking-wider">
              Volume
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.volume}
            onChange={(e) => {
              const v = Number(e.target.value)
              updateSetting('volume', v)
              if (v > 0) playSound('click')
            }}
            className="win-slider w-full"
            style={
              {
                ['--range-progress' as string]: `${settings.volume}%`,
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between px-1">
        <div className="flex items-center space-x-2 text-[11px] dark:text-white font-medium">
          <span className="opacity-80">Theme</span>
          <button
            type="button"
            onClick={() =>
              updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
            }
            className="px-2 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20"
          >
            {settings.theme === 'dark' ? '🌙 Dark' : '☀ Light'}
          </button>
        </div>
        <div className="flex items-center space-x-2 text-[11px]">
          <button
            type="button"
            onClick={() => updateSetting('sound', !settings.sound)}
            className="px-2 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 dark:text-white"
          >
            {settings.sound ? '🔊 Sound on' : '🔇 Sound off'}
          </button>
        </div>
      </div>
    </div>
  )
}
