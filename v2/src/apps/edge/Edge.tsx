import { useEffect, useState } from 'react'
import { useWindowExtras } from '../../windowing/WindowContext'
import {
  HOME_URL,
  featuredProjects,
  isExternal,
  navigateTab,
  newTab,
  projectTags,
  tabBack,
  tabForward,
  type BrowserTab,
} from '../../../../assets/js/windowing/browser.js'

// Chrome. What an address means and each tab's history are shared with v1 in
// assets/js/windowing/browser.js; the projects come from data/portfolio.json.

interface PortfolioItem {
  id: number
  title: string
  description: string
  tags?: string[]
  url: string
  thumbnail: string
  location?: string
  country_code?: string
  featured?: boolean
}

let tabIdCounter = 1
const nextTabId = () => tabIdCounter++

const ICON_BUTTON = 'p-2 rounded-sm hover:bg-gray-200 dark:hover:bg-white/5 opacity-70'
const HISTORY_BUTTON = `${ICON_BUTTON} disabled:opacity-30 disabled:hover:bg-transparent`

export default function Edge() {
  const extras = useWindowExtras<{ initialUrl?: string }>()
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [newTab(nextTabId(), extras.initialUrl ?? HOME_URL)])
  const [activeId, setActiveId] = useState<number>(tabs[0].id)
  // What is typed in the address bar. Only Enter loads it.
  const [draft, setDraft] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [projects, setProjects] = useState<PortfolioItem[] | null>(null)

  // A Visit Site file's real tab is opened by openApp, inside the visitor's
  // click, before this window loads. See siteToVisit in browser.js.
  useEffect(() => {
    let cancelled = false
    fetch('/data/portfolio.json')
      .then((r) => r.json() as Promise<{ projects?: PortfolioItem[] }>)
      .then((d) => {
        if (!cancelled) setProjects(featuredProjects(d.projects))
      })
      .catch(() => {
        if (!cancelled) setProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]
  const address = draft ?? active.url

  const updateActive = (change: (tab: BrowserTab) => BrowserTab) => {
    setTabs((prev) => prev.map((t) => (t.id === active.id ? change(t) : t)))
    setDraft(null)
  }

  const selectTab = (id: number) => {
    setActiveId(id)
    setDraft(null)
  }

  const addTab = () => {
    const t = newTab(nextTabId())
    setTabs((prev) => [...prev, t])
    selectTab(t.id)
  }

  const closeTab = (id: number) => {
    const rest = tabs.filter((t) => t.id !== id)
    if (rest.length === 0) {
      // Always keep at least one tab, opening a fresh home one.
      const home = newTab(nextTabId())
      setTabs([home])
      selectTab(home.id)
      return
    }
    setTabs(rest)
    if (id === activeId) selectTab(rest[rest.length - 1].id)
  }

  const go = (text: string) => updateActive((tab) => navigateTab(tab, text))

  const refresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 400)
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white" data-chrome>
      {/* Browser header */}
      <div className="bg-gray-100 dark:bg-[#2b2b2b] pt-1.5 pb-2 space-y-1.5 shrink-0 border-b dark:border-white/5">
        {/* Tabs */}
        <div className="flex items-center space-x-1 px-3 overflow-x-auto scrollbar-none" role="tablist" aria-label="Tabs">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              role="tab"
              aria-selected={activeId === tab.id}
              className={`flex items-center px-3 py-1.5 rounded-t-lg cursor-default min-w-[120px] max-w-[200px] transition-all shrink-0 group relative ${
                activeId === tab.id
                  ? 'bg-white dark:bg-[#1c1c1c] shadow-[0_-1px_0_rgba(0,0,0,0.08)] z-10'
                  : 'hover:bg-gray-200 dark:hover:bg-white/5 opacity-80'
              }`}
            >
              <span className="truncate mr-2 text-[13px] font-normal">{tab.title}</span>
              <button
                type="button"
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                className="ml-auto hover:bg-gray-300 dark:hover:bg-white/10 rounded-sm p-0.5"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            aria-label="New tab"
            onClick={addTab}
            className="p-1.5 rounded-sm hover:bg-gray-200 dark:hover:bg-white/5 shrink-0 ml-1"
          >
            <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Address bar row */}
        <div className="flex items-center space-x-1 sm:space-x-2 px-3 mt-[2px]">
          <div className="flex items-center space-x-0.5 shrink-0">
            <button
              type="button"
              aria-label="Go back"
              title="Go back"
              onClick={() => updateActive(tabBack)}
              disabled={active.back.length === 0}
              className={HISTORY_BUTTON}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Go forward"
              title="Go forward"
              onClick={() => updateActive(tabForward)}
              disabled={active.forward.length === 0}
              className={`${HISTORY_BUTTON} hidden sm:block`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Reload"
              title="Reload"
              onClick={refresh}
              className={`${ICON_BUTTON} ${refreshing ? 'animate-spin' : ''}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button type="button" aria-label="Home" title="Home" onClick={() => go(HOME_URL)} className={ICON_BUTTON}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />
              </svg>
            </button>
          </div>
          <div className="grow bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-full px-4 py-1 flex items-center shadow-xs min-w-0 h-8 focus-within:ring-2 ring-win-blue/20">
            <svg className="w-3 h-3 text-green-500 mr-2 shrink-0 opacity-80" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
            </svg>
            <input
              type="text"
              aria-label="Address bar"
              enterKeyHint="go"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              value={address}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  go(address)
                } else if (e.key === 'Escape') {
                  setDraft(null)
                }
              }}
              className="bg-transparent border-none outline-hidden w-full text-xs truncate font-normal"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grow relative overflow-auto bg-gray-50 dark:bg-[#1c1c1c]">
        {active.url === HOME_URL ? (
          <div className="max-w-5xl mx-auto p-4 sm:p-8">
            <h1 className="font-bold mb-4 sm:mb-8 text-2xl sm:text-3xl">Featured Projects</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              {(projects ?? []).map((p) => (
                <article
                  key={p.id ?? p.title}
                  className="bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-white/5 group"
                >
                  <div className="h-48 bg-gray-200 dark:bg-gray-800 relative">
                    <img
                      src={`/${p.thumbnail}`}
                      alt={`Screenshot of ${p.title}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex items-center justify-center">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Visit ${p.title}`}
                        className="bg-win-blue text-white px-6 py-2 rounded-full font-medium flex items-center space-x-2 hover:bg-blue-600"
                      >
                        <img src="/assets/img/chrome.webp" alt="" className="w-4 h-4" />
                        <span>Visit Site</span>
                      </a>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="text-xl font-bold" data-project-title>
                        {p.title}
                      </h3>
                      {p.country_code && (
                        <div
                          className={`flex items-center space-x-2 px-2 py-1 rounded-full border shrink-0 ${
                            p.country_code.includes('gb')
                              ? 'bg-win-blue/10 text-win-blue border-win-blue/20'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10'
                          }`}
                        >
                          <img
                            src={`https://flagcdn.com/w20/${p.country_code.toLowerCase()}.png`}
                            alt=""
                            className="w-4 h-auto rounded-xs shadow-xs"
                          />
                          <span className="text-[10px] font-bold">{p.location ?? 'UK'}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{p.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {projectTags(p).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded-sm text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
              {projects === null && (
                <div className="md:col-span-2 text-center opacity-50 py-12">Loading projects...</div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-10">
            <img src="/assets/img/chrome.webp" alt="" className="w-16 h-16 mb-4" />
            <h2 className="text-2xl font-bold mb-2 break-all">{active.title}</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              This Chrome is part of the portfolio, so other sites open in a real browser tab.
            </p>
            {isExternal(active.url) && (
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 bg-win-blue text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600"
              >
                Open {active.title} in a new tab
              </a>
            )}
            <button type="button" onClick={() => go(HOME_URL)} className="mt-4 text-win-blue hover:underline">
              Back to projects
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
