import { useEffect } from 'react'
import { useOsStore, type NewsItem } from '../store/osStore'

interface NewsApiResponse {
  news?: NewsItem[]
}

// Fetches news lazily — only when the widgets panel is opened for the first
// time, mirroring the v1 behavior in shell.js `toggleWidgets`.
export function useNewsOnDemand() {
  const widgetsOpen = useOsStore((s) => s.widgetsOpen)
  const hasNews = useOsStore((s) => s.news.length > 0)
  const setNews = useOsStore((s) => s.setNews)

  useEffect(() => {
    if (!widgetsOpen || hasNews) return
    let cancelled = false
    fetch(`/api/news.php?t=${Date.now()}`)
      .then((r) => r.json())
      .then((data: NewsApiResponse) => {
        if (cancelled) return
        if (data.news) setNews(data.news)
      })
      .catch(() => {
        /* swallow — UI shows a loading state */
      })
    return () => {
      cancelled = true
    }
  }, [widgetsOpen, hasNews, setNews])
}
