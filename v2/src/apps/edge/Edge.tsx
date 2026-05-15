import { useEffect, useState } from 'react'
import { useWindowExtras } from '../../windowing/WindowContext'

interface PortfolioItem {
  id: number
  title: string
  description: string
  tags: string[]
  url: string
  thumbnail: string
  location?: string
  country_code?: string
  featured?: boolean
}

interface Tab {
  id: number
  title: string
  url: string
}

const HOME_URL = 'portfolio://projects'

let tabIdCounter = 1
const nextTabId = () => tabIdCounter++

const newTab = (url = HOME_URL): Tab => ({
  id: nextTabId(),
  title: url === HOME_URL ? 'Featured Projects' : url,
  url,
})

export default function Edge() {
  const extras = useWindowExtras<{ initialUrl?: string }>()
  const [tabs, setTabs] = useState<Tab[]>(() => [
    newTab(extras.initialUrl ?? HOME_URL),
  ])
  const [activeId, setActiveId] = useState<number>(tabs[0].id)
  const [projects, setProjects] = useState<PortfolioItem[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/data/portfolio.json')
      .then((r) => r.json() as Promise<{ projects: PortfolioItem[] }>)
      .then((d) => {
        if (!cancelled) setProjects(d.projects)
      })
      .catch(() => {
        /* leave empty */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]

  const addTab = () => {
    const t = newTab()
    setTabs((prev) => [...prev, t])
    setActiveId(t.id)
  }

  const closeTab = (id: number) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (next.length === 0) {
        // Always keep at least one tab — opening a fresh home one.
        const home = newTab()
        setActiveId(home.id)
        return [home]
      }
      if (id === activeId) setActiveId(next[next.length - 1].id)
      return next
    })
  }

  const updateActiveUrl = (url: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === active.id ? { ...t, url, title: url === HOME_URL ? 'Featured Projects' : url } : t,
      ),
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white">
      {/* Tab strip */}
      <div className="bg-gray-100 dark:bg-[#2b2b2b] pt-1.5 pb-2 space-y-1.5 shrink-0 border-b dark:border-white/5">
        <div className="flex items-center space-x-1 px-3 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveId(tab.id)}
              className={`flex items-center px-3 py-1.5 rounded-t-lg cursor-default min-w-[120px] max-w-[200px] shrink-0 group relative ${
                activeId === tab.id
                  ? 'bg-white dark:bg-[#1c1c1c] shadow-[0_-1px_0_rgba(0,0,0,0.08)] z-10'
                  : 'hover:bg-gray-200 dark:hover:bg-white/5 opacity-80'
              }`}
            >
              <span className="truncate mr-2 text-[13px]">{tab.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                className="ml-auto hover:bg-gray-300 dark:hover:bg-white/10 rounded p-0.5"
                aria-label="Close tab"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTab}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/5 shrink-0 ml-1"
            aria-label="New tab"
          >
            +
          </button>
        </div>

        {/* Address bar */}
        <div className="flex items-center space-x-1 px-3 mt-[2px]">
          <button
            type="button"
            onClick={() => updateActiveUrl(HOME_URL)}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-white/5 opacity-70"
            title="Home"
          >
            ⌂
          </button>
          <button
            type="button"
            onClick={() => {
              setTabs((prev) => [...prev])
            }}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-white/5 opacity-70"
            title="Refresh"
          >
            ⟳
          </button>
          <div className="flex-grow bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-full px-4 py-1 flex items-center min-w-0 h-8 focus-within:ring-2 ring-win-blue/20">
            <input
              type="text"
              value={active.url}
              onChange={(e) => updateActiveUrl(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-xs"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow relative overflow-auto bg-gray-50 dark:bg-[#1c1c1c]">
        {active.url === HOME_URL ? (
          <div className="max-w-5xl mx-auto p-8">
            <h1 className="font-bold mb-8 text-3xl">Featured Projects</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(() => {
                // Mirror VS Code's "★ Featured" set so the two apps stay in
                // sync. If no projects are flagged (e.g. local dataset),
                // fall through to the full list so the page never blanks.
                const featured = projects.filter((p) => p.featured)
                return featured.length > 0 ? featured : projects
              })().map((p) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-white/5 group"
                >
                  <div className="h-48 bg-gray-200 dark:bg-gray-800 relative">
                    <img
                      src={`/${p.thumbnail}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => window.open(p.url, '_blank', 'noopener')}
                        className="bg-win-blue text-white px-6 py-2 rounded-full font-medium"
                      >
                        Visit site →
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold">{p.title}</h3>
                      {p.country_code && (
                        <div className="flex items-center space-x-2 px-2 py-1 bg-win-blue/10 text-win-blue rounded-full border border-win-blue/20">
                          <img
                            src={`https://flagcdn.com/w20/${p.country_code.split('-')[0]}.png`}
                            alt=""
                            className="w-4 h-auto rounded-sm"
                          />
                          <span className="text-[10px] font-bold">{p.location ?? 'UK'}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {p.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-[10px] text-gray-500 uppercase tracking-wider"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="col-span-2 text-center opacity-50 py-12">
                  Loading projects…
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-10">
            <img src="/assets/img/chrome.webp" alt="" className="w-16 h-16 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Chrome Browser</h2>
            <p className="text-gray-500 max-w-md">
              This is a simulated browser. External links open in a real new tab. Use the
              address bar to return to{' '}
              <code className="text-win-blue">portfolio://projects</code>.
            </p>
            <button
              type="button"
              onClick={() => updateActiveUrl(HOME_URL)}
              className="mt-6 text-win-blue hover:underline"
            >
              ← Back to projects
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
