import { useState } from 'react'
import { useOsStore, type Settings as SettingsShape } from '../../store/osStore'

const WALLPAPERS = [
  { id: 'Bloom', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop' },
  { id: 'Flow', url: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?q=80&w=1974&auto=format&fit=crop' },
  { id: 'Glow', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1974&auto=format&fit=crop' },
  { id: 'Sunrise', url: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=1970&auto=format&fit=crop' },
  { id: 'Urban', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1920&auto=format&fit=crop' },
  { id: 'Nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1920&auto=format&fit=crop' },
] as const

type Tab = 'system' | 'personalisation' | 'about'

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'system', label: 'System', icon: '🖥️' },
  { id: 'personalisation', label: 'Personalisation', icon: '🎨' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
]

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`w-12 h-6 rounded-full relative transition-colors ${on ? 'bg-win-blue' : 'bg-gray-400'}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          on ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const settings = useOsStore((s) => s.settings)
  const updateSetting = useOsStore((s) => s.updateSetting)
  const [tab, setTab] = useState<Tab>('system')
  const [preview, setPreview] = useState<string | null>(null)

  const currentWallpaper = preview ?? settings.wallpaper

  const toggle = <K extends keyof SettingsShape>(key: K) => {
    updateSetting(key, !settings[key] as SettingsShape[K])
  }

  return (
    <div className="h-full flex text-black dark:text-white bg-[#f3f3f3] dark:bg-[#202020]">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-300 dark:border-gray-700 p-4 space-y-2">
        <div className="flex items-center space-x-3 p-3 mb-6">
          <img
            src="/assets/img/profile.png"
            alt=""
            className="w-12 h-12 rounded-full object-cover border border-white/20"
          />
          <div>
            <div className="font-semibold text-sm">DeVanté Johnson-Rose</div>
            <div className="text-[10px] text-gray-500">Local Account</div>
          </div>
        </div>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex items-center transition-all border border-transparent ${
              tab === item.id ? 'bg-white dark:bg-white/10 shadow-sm' : ''
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto p-10">
        <h1 className="text-3xl font-semibold mb-8">
          {NAV.find((n) => n.id === tab)?.label}
        </h1>

        {tab === 'system' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-6 rounded-lg border border-gray-200 dark:border-white/10">
                <div className="text-xs font-bold uppercase text-gray-400 mb-2">Status</div>
                <div className="text-xl font-bold text-win-blue">Senior Developer</div>
                <div className="text-xs text-gray-500 mt-1">
                  Scalable Architectures & Cloud Ops
                </div>
              </div>
              <div className="glass p-6 rounded-lg border border-gray-200 dark:border-white/10">
                <div className="text-xs font-bold uppercase text-gray-400 mb-2">Scope</div>
                <div className="text-xl font-bold text-win-blue">Enterprise</div>
                <div className="text-xs text-gray-500 mt-1">High-availability infrastructure</div>
              </div>
            </div>

            <div className="glass p-6 rounded-lg flex items-center justify-between border border-gray-200 dark:border-white/10">
              <div className="flex items-center">
                <span className="text-2xl mr-4">🔊</span>
                <div>
                  <div className="font-medium">System sounds</div>
                  <div className="text-xs text-gray-500">UI sound effects</div>
                </div>
              </div>
              <Toggle on={settings.sound} onClick={() => toggle('sound')} />
            </div>

            <div className="glass p-6 rounded-lg flex items-center justify-between border border-gray-200 dark:border-white/10">
              <div className="flex items-center">
                <span className="text-2xl mr-4">🌙</span>
                <div>
                  <div className="font-medium">Dark mode</div>
                  <div className="text-xs text-gray-500">Switch between light and dark themes</div>
                </div>
              </div>
              <Toggle
                on={settings.theme === 'dark'}
                onClick={() =>
                  updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
                }
              />
            </div>

            <div className="glass p-6 rounded-lg flex items-center justify-between border border-gray-200 dark:border-white/10">
              <div className="flex items-center">
                <span className="text-2xl mr-4">🌃</span>
                <div>
                  <div className="font-medium">Night light</div>
                  <div className="text-xs text-gray-500">Warmer colours after dark</div>
                </div>
              </div>
              <Toggle on={settings.nightLight} onClick={() => toggle('nightLight')} />
            </div>
          </div>
        )}

        {tab === 'personalisation' && (
          <div className="space-y-6">
            <div className="glass p-6 rounded-lg border border-gray-200 dark:border-white/10 flex items-center space-x-8">
              <div className="w-64 aspect-video rounded-lg overflow-hidden border-4 border-white/20 shadow-2xl relative shrink-0">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                  style={{ backgroundImage: `url(${currentWallpaper})` }}
                />
                <div className="absolute bottom-0 inset-x-0 h-2 bg-white/20 backdrop-blur-md" />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-semibold mb-1">Background</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Pick a wallpaper to preview, then save.
                </p>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (preview) {
                        updateSetting('wallpaper', preview)
                        setPreview(null)
                      }
                    }}
                    disabled={!preview || preview === settings.wallpaper}
                    className="bg-win-blue text-white px-6 py-1.5 rounded text-xs font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Save changes
                  </button>
                  {preview && preview !== settings.wallpaper && (
                    <button
                      type="button"
                      onClick={() => setPreview(null)}
                      className="text-xs hover:underline opacity-60"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {WALLPAPERS.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => setPreview(wp.url)}
                  className={`relative rounded-md overflow-hidden aspect-square border-2 transition-all hover:scale-105 ${
                    currentWallpaper === wp.url
                      ? 'border-win-blue ring-2 ring-win-blue/20 shadow-lg'
                      : 'border-transparent hover:border-gray-400'
                  }`}
                  title={wp.id}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${wp.url})`, backgroundColor: '#333' }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-6">
            <div className="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src="/assets/img/profile.png"
                  alt=""
                  className="w-20 h-20 rounded-full border-4 border-win-blue/20 object-cover"
                />
                <div>
                  <h2 className="text-2xl font-bold">DeVanté Johnson-Rose</h2>
                  <p className="text-sm text-win-blue font-medium">
                    Senior Developer & 3rd Line Engineer
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed opacity-80">
                Full-stack developer and systems engineer specialising in scalable web
                architectures, enterprise infrastructure, and developer tooling. Currently
                porting this portfolio from PHP/Alpine to React in public — see the source
                on GitHub.
              </p>
            </div>

            <div className="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
              <div className="font-bold text-lg mb-4 text-win-blue">Home lab</div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <Spec label="Device" value="DEVANTE-HOMELAB" />
                <Spec label="Processor" value="AMD Ryzen 7 9800X3D" />
                <Spec label="Memory" value="128 GB DDR5 6000 MHz" />
                <Spec label="Graphics" value="NVIDIA RTX 5070 Ti" />
                <Spec label="Storage" value="4 TB NVMe Gen 5" />
                <Spec label="OS" value="Windows 11 Pro / WSL2 / Docker" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase text-gray-500">{label}</div>
      <div className="text-sm dark:text-white font-medium">{value}</div>
    </div>
  )
}
