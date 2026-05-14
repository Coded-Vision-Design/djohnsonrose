import { useEffect, useRef } from 'react'
import { useOsStore } from '../store/osStore'
import { useNewsOnDemand } from '../lib/useNews'

export function Widgets() {
  const open = useOsStore((s) => s.widgetsOpen)
  const close = useOsStore((s) => s.closeAllPopups)
  const clock = useOsStore((s) => s.clock)
  const weather = useOsStore((s) => s.weather)
  const news = useOsStore((s) => s.news)
  const ref = useRef<HTMLDivElement>(null)

  // Lazy news fetch on first open.
  useNewsOnDemand()

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

  const tempNum = typeof weather.temp === 'number' ? weather.temp : 0

  return (
    <div
      ref={ref}
      className="fixed inset-y-4 left-4 w-[400px] bg-[#f3f3f3]/80 dark:bg-[#1c1c1c]/90 backdrop-blur-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/20 dark:border-white/10 z-[15000]"
    >
      <div className="p-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{clock.time}</span>
          <span className="text-xs font-semibold opacity-60 uppercase tracking-widest">
            {clock.date}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold">
          DJ
        </div>
      </div>

      <div className="flex-grow overflow-y-auto px-6 pb-6 space-y-4">
        {/* Weather card */}
        <div className="glass p-6 rounded-2xl flex flex-col space-y-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-bold opacity-60">{weather.city}</div>
              <div className="text-4xl font-light">{weather.temp}°C</div>
            </div>
            <span className="text-5xl">{weather.icon}</span>
          </div>
          <div className="text-sm font-medium">{weather.condition}</div>
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-black/5 dark:border-white/5">
            {(['Mon', 'Tue', 'Wed', 'Thu'] as const).map((day, i) => (
              <div key={day} className="flex flex-col items-center">
                <span className="text-[10px] opacity-60">{day}</span>
                <span className="text-lg">🌤️</span>
                <span className="text-[10px] font-bold">{tempNum - (i + 1)}°</span>
              </div>
            ))}
          </div>
        </div>

        {/* News */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
            Top stories
          </h3>
          {news.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-3 opacity-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-win-blue" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Fetching headlines...
              </span>
            </div>
          ) : (
            news.map((item) => (
              <a
                key={item.id ?? item.title}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="glass p-4 rounded-xl block hover:bg-white/40 dark:hover:bg-white/10 transition-all group shadow-sm no-underline"
              >
                <div className="flex flex-col space-y-1">
                  <h4 className="text-xs font-bold leading-tight group-hover:text-win-blue text-black dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-[10px] opacity-60 line-clamp-2 text-gray-700 dark:text-gray-300">
                    {item.description}
                  </p>
                  {item.pubDate && (
                    <span className="text-[9px] font-semibold text-gray-400 mt-1">
                      {item.pubDate.split(' ').slice(0, 4).join(' ')}
                    </span>
                  )}
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
