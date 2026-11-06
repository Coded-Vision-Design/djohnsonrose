import { useEffect } from 'react'
import { useOsStore, type NewsItem } from '../store/osStore'

interface NewsApiResponse {
  news?: NewsItem[]
}

// Fetches news lazily, only when the widgets panel is opened, mirroring v1's
// shell.js `toggleWidgets`. A failure is shown in Widgets, and the next
// opening tries again.
export function useNewsOnDemand() {
  const widgetsOpen = useOsStore((s) => s.widgetsOpen)
  const hasNews = useOsStore((s) => s.news.length > 0)
  const setNews = useOsStore((s) => s.setNews)
  const setNewsStatus = useOsStore((s) => s.setNewsStatus)

  useEffect(() => {
    if (!widgetsOpen || hasNews) return
    let cancelled = false
    setNewsStatus('loading')
    fetch(`/api/news.php?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: NewsApiResponse) => {
        if (cancelled) return
        const news = Array.isArray(data.news) ? data.news : []
        setNews(news)
        setNewsStatus(news.length ? 'ready' : 'error')
      })
      .catch(() => {
        if (!cancelled) setNewsStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [widgetsOpen, hasNews, setNews, setNewsStatus])
}
