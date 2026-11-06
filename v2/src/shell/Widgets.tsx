import { useEffect, useRef } from 'react'
import { useOsStore } from '../store/osStore'
import { useNewsOnDemand } from '../lib/useNews'

// 1:1 port of partials/widgets.php: 400px panel docked to the left side
// with a large weather card + 4-day mock forecast + news feed. A failed
// forecast or news fetch says so, as in v1, rather than spinning.
export function Widgets() {
  const open = useOsStore((s) => s.widgetsOpen)
  const close = useOsStore((s) => s.closeAllPopups)
  const clock = useOsStore((s) => s.clock)
  const weather = useOsStore((s) => s.weather)
  const news = useOsStore((s) => s.news)
  const newsStatus = useOsStore((s) => s.newsStatus)
  const ref = useRef<HTMLDivElement>(null)

  useNewsOnDemand()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return
      // The weather widget button toggles this popup itself; let its onClick run.
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

  return (
    <div
      ref={ref}
      data-widgets=""
      role="dialog"
      aria-label="Widgets"
      className="fixed inset-y-4 left-4 w-[400px] max-w-[calc(100%-2rem)] bg-win-bg/80 dark:bg-[#1c1c1c]/90 backdrop-blur-3xl rounded-2xl shadow-2xl z-15000 flex flex-col overflow-hidden border border-white/20 dark:border-white/10 text-black dark:text-white animate-window-open"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="text-2xl">{clock.time}</span>
          <span className="text-xs font-semibold opacity-70 uppercase tracking-widest truncate">
            {clock.date}
          </span>
        </div>
        <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
          <img src="/assets/img/profile.webp" alt="" className="w-6 h-6 rounded-full object-cover" />
        </span>
      </div>

      {/* Grid */}
      <div className="grow overflow-y-auto px-6 pb-6 space-y-4">
        {/* Weather card */}
        <div className="glass p-6 rounded-2xl flex flex-col space-y-4 shadow-xs border-white/10">
          {weather.status === 'error' ? (
            <div data-weather-failed="" className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">Weather unavailable</div>
                <div className="text-xs opacity-70 mt-1">The forecast could not be loaded. It will try again later.</div>
              </div>
              <span className="text-5xl" aria-hidden="true">
                ☁️
              </span>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-bold opacity-70">{weather.city}</div>
                  <div className="text-4xl font-light">{weather.temp}°C</div>
                </div>
                <span className="text-5xl" aria-hidden="true">
                  {weather.icon}
                </span>
              </div>
              <div className="text-sm font-medium">{weather.condition}</div>
              {typeof weather.temp === 'number' && (
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                  {(['Mon', 'Tue', 'Wed', 'Thu'] as const).map((day, i) => (
                    <div key={day} className="flex flex-col items-center">
                      <span className="text-xs opacity-70">{day}</span>
                      <span className="text-lg" aria-hidden="true">
                        🌤️
                      </span>
                      <span className="text-xs font-bold">{(weather.temp as number) - (i + 1)}°</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* News */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider ml-1">
            Top stories
          </h3>
          {news.length > 0 ? (
            news.map((item) => (
              <a
                key={item.id ?? item.title}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="glass p-4 rounded-xl block hover:bg-white/40 dark:hover:bg-white/10 transition-all group shadow-xs border-white/10 no-underline"
              >
                <div className="flex flex-col space-y-1">
                  <h4 className="text-xs font-bold leading-tight group-hover:text-win-blue transition-colors text-black dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-xs opacity-70 line-clamp-2 text-gray-700 dark:text-gray-300">
                    {item.description}
                  </p>
                  {item.pubDate && (
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                      {item.pubDate.split(' ').slice(0, 4).join(' ')}
                    </span>
                  )}
                </div>
              </a>
            ))
          ) : newsStatus === 'error' ? (
            <div data-news-failed="" className="p-6 text-center">
              <div className="text-sm font-bold">Headlines unavailable</div>
              <div className="text-xs opacity-70 mt-1">Close Widgets and open them again to retry.</div>
            </div>
          ) : (
            <div role="status" className="p-8 flex flex-col items-center justify-center space-y-3 opacity-70">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-win-blue" />
              <span className="text-xs font-bold uppercase tracking-widest">Fetching headlines...</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-black/5 dark:bg-black/20 flex items-center justify-center shrink-0 border-t border-white/10">
        <button
          type="button"
          className="text-xs font-bold text-win-blue dark:text-[#60cdff] hover:underline uppercase tracking-widest"
        >
          Customise widgets
        </button>
      </div>
    </div>
  )
}
