import { useEffect, useMemo, useRef, useState } from 'react'
import { useOsStore } from '../store/osStore'
import { startPinnedApps } from '../apps/manifest'
import { getApp, groupAppsByLetter, listApps } from '../apps/registry'
import { searchOs, type SearchResult } from '../../../assets/js/windowing/shell-core.js'
import { relativeTime } from '../../../assets/js/windowing/shell-ui.js'
import { findEntry, joinPath } from '../../../assets/js/windowing/file-ops.js'
import type { FsEntry } from '../data/filesystem'
import { showFileMenu } from './menus'
import { openEntry } from './openEntry'

type View = 'pinned' | 'allApps'
type Result = SearchResult<FsEntry>

// 1:1 port of partials/start-menu.php — 540x600 panel above the taskbar with
// search, Pinned grid (6 cols), All Apps A-Z view, Recommended row, and a
// profile bar at the bottom.

export function StartMenu() {
  const open = useOsStore((s) => s.startMenuOpen)
  // Mounted only while open, so that each opening starts afresh.
  return open ? <StartPanel /> : null
}

function StartPanel() {
  const close = useOsStore((s) => s.closeAllPopups)
  const openAppStore = useOsStore((s) => s.openApp)
  const logout = useOsStore((s) => s.logout)

  const [view, setView] = useState<View>('pinned')
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Click-away
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current || containerRef.current.contains(e.target as Node)) return
      // Ignore clicks on the taskbar's start/search/quick-settings buttons -
      // they own their own toggle logic and racing against this mousedown
      // would close the menu before their onClick can flip it.
      const t = e.target as Element | null
      if (t?.closest?.('[data-popup-toggle]')) return
      close()
    }
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onDown)
    }
  }, [close])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const pinned = useMemo(
    () => startPinnedApps.map(getApp).filter((a): a is NonNullable<typeof a> => !!a),
    [],
  )

  const grouped = useMemo(() => groupAppsByLetter(), [])
  const files = useOsStore((s) => s.fileSystem)
  const startPins = useOsStore((s) => s.startPins)
  const pinnedFiles = useMemo(
    () => startPins.map((full) => findEntry(files, full)).filter((found) => found !== null),
    [startPins, files],
  )

  const searchResults = useMemo(
    () => (query ? searchOs(query, listApps(), files) : []),
    [query, files],
  )

  const launch = (id: string) => {
    const def = getApp(id)
    openAppStore(
      id,
      def?.title,
      def ? { size: { w: def.defaultSize.w, h: def.defaultSize.h } } : undefined,
    )
  }

  const openResult = (result: Result) => {
    if (result.fullPath) openEntry(result as FsEntry, result.fullPath)
    else launch((result as { app: string }).app)
    setQuery('')
    close()
  }

  // 540x600 panel on desktop; the .start-menu-mobile rule in globals.css
  // overrides this with width:100vw / height:calc(100% - 3rem) below 1024px
  // so the menu always fits the visible viewport (matches v1's behaviour).
  return (
    <div
      ref={containerRef}
      data-start-menu=""
      role="dialog"
      aria-label="Start"
      className="absolute glass rounded-xl flex flex-col overflow-hidden win-shadow animate-start-menu z-10000 start-menu-mobile"
      style={{
        bottom: 'calc(var(--os-taskbar-height) + 8px)',
        left: '50%',
        translate: '-50%', // The opening animation sets transform.
        width: 540,
        maxWidth: '100vw',
        height: 600,
        maxHeight: 'calc(100dvh - var(--os-taskbar-height) - 8px)',
      }}
    >
      {/* Search */}
      <div className="p-8 pb-4 shrink-0">
        <div className="relative group">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
            placeholder="Search for apps, settings, and documents"
            className="w-full bg-white dark:bg-black/20 border-b-2 border-win-blue px-10 py-2 rounded-md outline-hidden text-sm transition-all focus:bg-white dark:focus:bg-[#1c1c1c]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults[0]) openResult(searchResults[0])
            }}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-win-blue"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Body */}
      {query ? (
        <SearchView results={searchResults} onLaunch={openResult} onClose={close} />
      ) : view === 'pinned' ? (
        <PinnedView
          pinned={pinned}
          pinnedFiles={pinnedFiles}
          onOpenFile={(entry, path) => {
            openEntry(entry, path)
            close()
          }}
          onLaunch={launch}
          onRecommended={(app, title, extra) => openAppStore(app, title, { extra })}
          onAllApps={() => setView('allApps')}
        />
      ) : (
        <AllAppsView grouped={grouped} onLaunch={launch} onBack={() => setView('pinned')} />
      )}

      {/* Profile bar */}
      <div className="h-16 bg-black/5 dark:bg-black/20 flex items-center justify-between px-8 border-t border-white/10 shrink-0">
        <div className="flex items-center space-x-3 group cursor-pointer p-1 rounded-sm hover:bg-white/10">
          <img
            src="/assets/img/profile.webp"
            alt=""
            className="w-8 h-8 rounded-full border border-white/20 object-cover"
          />
          <span className="text-xs font-medium dark:text-white">DeVanté Johnson-Rose</span>
        </div>
        <button
          type="button"
          onClick={() => {
            logout()
            close()
          }}
          aria-label="Sign out"
          title="Sign out"
          className="p-2 rounded-sm hover:bg-white/10 group"
        >
          <svg
            className="w-5 h-5 dark:text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function SearchView({
  results,
  onLaunch,
}: {
  results: Result[]
  onLaunch: (result: Result) => void
  onClose: () => void
}) {
  return (
    <div className="grow overflow-y-auto px-8">
      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">
        Top results
      </h3>
      <div className="space-y-1">
        {results.length === 0 ? (
          <div className="text-xs opacity-50 py-4">No matches.</div>
        ) : (
          results.map((result) => (
            <button
              key={result.fullPath + result.name}
              type="button"
              data-search-result={result.name}
              data-search-app={result.type === 'app' ? result.app : undefined}
              onClick={() => onLaunch(result)}
              className="w-full flex items-center p-2 rounded-sm hover:bg-win-blue hover:text-white text-left group transition-colors"
            >
              <div className="w-8 h-8 rounded-sm bg-black/5 dark:bg-white/5 group-hover:bg-white/20 flex items-center justify-center mr-3">
                {result.icon?.includes('.') ? (
                  <img src={result.icon} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  <span className="text-lg">{result.icon || '📄'}</span>
                )}
              </div>
              <div className="min-w-0 grow text-black dark:text-white group-hover:text-white">
                <div className="text-xs font-medium truncate">{result.name}</div>
                <div className="text-xs opacity-60 truncate capitalize">{result.type}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function PinnedView({
  pinned,
  pinnedFiles,
  onOpenFile,
  onLaunch,
  onRecommended,
  onAllApps,
}: {
  pinned: ReturnType<typeof getApp>[]
  pinnedFiles: { entry: FsEntry; path: string }[]
  onOpenFile: (entry: FsEntry, path: string) => void
  onLaunch: (id: string) => void
  onRecommended: (app: string, title: string, extra: Record<string, unknown>) => void
  onAllApps: () => void
}) {
  const recent = useOsStore((s) => s.recent)
  // Read so that the times move on while Start stays open.
  useOsStore((s) => s.clock.time)
  return (
    <div className="grow overflow-y-auto px-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold dark:text-white">Pinned</h2>
        <button
          type="button"
          onClick={onAllApps}
          className="text-xs bg-white/20 dark:bg-white/5 px-2 py-1 rounded-sm hover:bg-white/30 dark:hover:bg-white/10 dark:text-gray-300 transition-colors"
        >
          All apps &gt;
        </button>
      </div>
      <div className="grid gap-y-6 gap-x-4 grid-cols-4 sm:grid-cols-6">
        {pinned.map((a) =>
          a ? (
            <button
              key={a.id}
              type="button"
              data-pinned-app={a.id}
              title={a.title}
              onClick={() => onLaunch(a.id)}
              className="flex flex-col items-center group cursor-pointer transition-all active:scale-95 w-full min-w-0"
            >
              <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-white/5 dark:bg-white/5 group-hover:bg-white/10 shrink-0 overflow-hidden transition-transform group-hover:scale-110">
                <img src={a.icon} alt="" className="w-7 h-7 object-contain" />
              </div>
              <span className="text-xs mt-2 dark:text-white text-center truncate w-full px-0.5">
                {a.title}
              </span>
            </button>
          ) : null,
        )}
        {pinnedFiles.map(({ entry, path }) => (
          <button
            key={joinPath(path, entry.name)}
            type="button"
            data-pinned-file={joinPath(path, entry.name)}
            title={entry.name}
            onClick={() => onOpenFile(entry, path)}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              showFileMenu(entry, path, e)
            }}
            className="flex flex-col items-center group cursor-pointer transition-all active:scale-95 w-full min-w-0"
          >
            <div className="w-10 h-10 rounded-sm flex items-center justify-center text-2xl group-hover:scale-110 transition-transform bg-white/5 dark:bg-white/5 group-hover:bg-white/10 shrink-0 overflow-hidden">
              {entry.icon?.includes('.') ? (
                <img src={entry.icon} alt="" className="w-7 h-7 object-contain" />
              ) : (
                <span>{entry.icon || '📄'}</span>
              )}
            </div>
            <span className="text-xs mt-2 dark:text-white text-center truncate w-full px-0.5">
              {entry.name}
            </span>
          </button>
        ))}
      </div>

      {/* Recommended: what the visitor opened, and when. See recentKey in shell-ui.js. */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold dark:text-white mb-4">Recommended</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            data-recommended="cv"
            onClick={() => onRecommended('pdfreader', CV_TITLE, { pdfUrl: '/data/cv.pdf' })}
            className="w-full flex items-center p-2 rounded-sm hover:bg-white/20 dark:hover:bg-white/10 text-left transition-colors"
          >
            <div className="w-8 h-8 rounded-sm bg-white flex items-center justify-center mr-3 overflow-hidden shrink-0">
              <img src="/assets/img/pdf.webp" alt="" className="w-6 h-6 object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium dark:text-white truncate">{CV_TITLE}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{recentLabel(recent.cv)}</div>
            </div>
          </button>
          <button
            type="button"
            data-recommended="projects"
            onClick={() => onRecommended('explorer', 'Projects', { initialPath: PROJECTS })}
            className="w-full flex items-center p-2 rounded-sm hover:bg-white/20 dark:hover:bg-white/10 text-left transition-colors"
          >
            <div className="w-8 h-8 rounded-sm bg-yellow-100 flex items-center justify-center mr-3 overflow-hidden shrink-0">
              <img src="/assets/img/win11/folder.webp" alt="" className="w-6 h-6 object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium dark:text-white truncate">Projects</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{recentLabel(recent.projects)}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

const CV_TITLE = 'CV - DeVanté Johnson-Rose.pdf'
const PROJECTS = 'C:\\Users\\DeVante\\Projects'

/** When a Recommended item was last opened, as v1's recentLabel puts it. */
const recentLabel = (time: number | undefined) => relativeTime(time ?? null, new Date()) ?? 'Recently added'

function AllAppsView({
  grouped,
  onLaunch,
  onBack,
}: {
  grouped: ReturnType<typeof groupAppsByLetter>
  onLaunch: (id: string) => void
  onBack: () => void
}) {
  return (
    <div className="grow overflow-y-auto px-8">
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-white/10 backdrop-blur-md py-2 z-10">
        <h2 className="text-sm font-semibold dark:text-white">All apps</h2>
        <button
          type="button"
          onClick={onBack}
          className="text-xs bg-white/20 dark:bg-white/5 px-2 py-1 rounded-sm hover:bg-white/30 dark:hover:bg-white/10 dark:text-gray-300 transition-colors"
        >
          &lt; Back
        </button>
      </div>
      <div className="space-y-6 pb-4">
        {grouped.map((group) => (
          <div key={group.letter} className="space-y-1">
            <div className="text-xs font-bold text-win-blue ml-4 mb-2">{group.letter}</div>
            <div className="space-y-0.5">
              {group.apps.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  data-all-app={a.id}
                  onClick={() => onLaunch(a.id)}
                  className="w-full flex items-center p-2 rounded-sm hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-sm flex items-center justify-center mr-3 overflow-hidden shrink-0 transition-transform group-hover:scale-110">
                    <img src={a.icon} alt="" className="w-6 h-6 object-contain" />
                  </div>
                  <span className="text-xs font-medium dark:text-white">{a.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
