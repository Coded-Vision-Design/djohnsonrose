import { useEffect, useRef } from 'react'
import { useOsStore } from '../store/osStore'
import { useNewsOnDemand } from '../lib/useNews'
import { useWidgetFeeds } from './widgetFeeds'
import { fullDate, testimonialByline, timeAgo } from '../../../assets/js/windowing/widgets.js'

// 1:1 port of partials/widgets.php: 400px panel docked to the left side
// with a large weather card + 4-day mock forecast, testimonials, a news feed
// and this site's recent changes. A failed forecast, news or changes fetch
// says so, as in v1, rather than spinning.
export function Widgets() {
  const open = useOsStore((s) => s.widgetsOpen)
  const close = useOsStore((s) => s.closeAllPopups)
  const clock = useOsStore((s) => s.clock)
  const weather = useOsStore((s) => s.weather)
  const news = useOsStore((s) => s.news)
  const newsStatus = useOsStore((s) => s.newsStatus)
  const ref = useRef<HTMLDivElement>(null)
  const refreshFeeds = useWidgetFeeds((s) => s.refresh)

  useNewsOnDemand()

  useEffect(() => {
    if (open) refreshFeeds()
  }, [open, refreshFeeds])

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

        <Testimonials />

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

        <RecentChanges />
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

// Testimonials, one at a time. Hidden until data/testimonials.json has some
// (see lib/testimonials.php). The same as v1's partials/widgets.php.
function Testimonials() {
  const testimonials = useWidgetFeeds((s) => s.testimonials)
  const index = useWidgetFeeds((s) => s.testimonialIndex)
  const step = useWidgetFeeds((s) => s.stepTestimonial)
  const testimonial = testimonials[index]
  if (!testimonial) return null
  const byline = testimonialByline(testimonial)

  return (
    <section
      data-testimonials=""
      aria-labelledby="widgets-testimonials-title"
      className="glass p-5 rounded-2xl flex flex-col gap-3 shadow-xs border-white/10"
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h3
          id="widgets-testimonials-title"
          className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider"
        >
          Testimonials
        </h3>
        {testimonials.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <span data-testimonial-position="" className="text-xs text-gray-600 dark:text-gray-300 tabular-nums mr-1">
              {`${index + 1} of ${testimonials.length}`}
            </span>
            <button type="button" className="os-widget-step" aria-label="Previous testimonial" onClick={() => step(-1)}>
              <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
                <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="os-widget-step" aria-label="Next testimonial" onClick={() => step(1)}>
              <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
                <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <figure data-testimonial="" aria-live="polite" className="flex flex-col gap-2">
        <blockquote className="os-testimonial-quote text-sm leading-relaxed">{testimonial.quote}</blockquote>
        <figcaption className="text-xs">
          {testimonial.link ? (
            <a
              href={testimonial.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-win-blue dark:text-[#60cdff] hover:underline"
            >
              {testimonial.name}
            </a>
          ) : (
            <span className="font-bold">{testimonial.name}</span>
          )}
          {byline && <span className="block text-gray-600 dark:text-gray-300">{byline}</span>}
        </figcaption>
      </figure>
    </section>
  )
}

// Recent changes to this site, from api/activity.php: each commit's first
// line, short SHA and date, and nothing naming the account behind it. The
// same as v1's partials/widgets.php.
function RecentChanges() {
  const activity = useWidgetFeeds((s) => s.activity)
  const status = useWidgetFeeds((s) => s.activityStatus)
  const now = useWidgetFeeds((s) => s.now)

  return (
    <section data-activity="" aria-labelledby="widgets-activity-title" className="flex flex-col gap-3">
      <h3
        id="widgets-activity-title"
        className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider ml-1"
      >
        Recent changes to this site
      </h3>
      {status === 'ready' ? (
        <ol className="glass rounded-xl shadow-xs border-white/10 divide-y divide-black/5 dark:divide-white/10">
          {activity.map((change) => (
            <li key={change.sha} data-activity-item="" className="px-4 py-3 flex flex-col gap-1 min-w-0">
              <span className="os-activity-message text-xs font-bold leading-tight text-black dark:text-white">
                {change.message}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                <code className="font-mono">{change.sha}</code>
                <span aria-hidden="true">·</span>
                <time dateTime={change.date} title={fullDate(change.date)}>
                  {timeAgo(change.date, now)}
                </time>
              </span>
            </li>
          ))}
        </ol>
      ) : status === 'error' ? (
        <p data-activity-failed="" className="text-xs text-gray-600 dark:text-gray-300 ml-1">
          Recent changes cannot be shown right now.
        </p>
      ) : (
        <p role="status" className="text-xs text-gray-600 dark:text-gray-300 ml-1">
          Loading recent changes...
        </p>
      )}
    </section>
  )
}
