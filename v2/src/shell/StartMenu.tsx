import { useEffect, useMemo, useRef, useState } from 'react'
import { useOsStore, TASKBAR_HEIGHT } from '../store/osStore'
import { getApp, groupAppsByLetter, searchApps } from '../apps/registry'

type View = 'pinned' | 'allApps'

// 1:1 port of partials/start-menu.php — 540x600 panel above the taskbar with
// search, Pinned grid (6 cols), All Apps A-Z view, Recommended row, and a
// profile bar at the bottom.

// v1's hard-coded pinned order — kept identical so the grid matches exactly.
const PINNED_IDS = [
  'edge',
  'vscode',
  'word',
  'excel',
  'powerpoint',
  'outlook',
  'photoshop',
  'flstudio',
  'docker',
  'explorer',
  'notepad',
  'putty',
  'filezilla',
  'terminal',
  'database',
  'settings',
  'taskmanager',
  'eventviewer',
  'admin',
] as const

export function StartMenu() {
  const open = useOsStore((s) => s.startMenuOpen)
  const close = useOsStore((s) => s.closeAllPopups)
  const openAppStore = useOsStore((s) => s.openApp)
  const logout = useOsStore((s) => s.logout)

  const [view, setView] = useState<View>('pinned')
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Click-away
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
        setView('pinned')
        setQuery('')
      }
    }
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, close])

  useEffect(() => {
    if (open) {
      setView('pinned')
      setQuery('')
      inputRef.current?.focus()
    }
  }, [open])

  const pinned = useMemo(
    () => PINNED_IDS.map(getApp).filter((a): a is NonNullable<typeof a> => !!a),
    [],
  )

  const grouped = useMemo(() => groupAppsByLetter(), [])
  const searchResults = query ? searchApps(query) : []

  if (!open) return null

  const launch = (id: string) => {
    const def = getApp(id)
    openAppStore(
      id,
      def?.title,
      def ? { size: { w: def.defaultSize.w, h: def.defaultSize.h } } : undefined,
    )
  }

  // 540x600 panel on desktop; the .start-menu-mobile rule in globals.css
  // overrides this with width:100vw / height:calc(100% - 3rem) below 1024px
  // so the menu always fits the visible viewport (matches v1's behaviour).
  return (
    <div
      ref={containerRef}
      className="absolute glass rounded-xl flex flex-col overflow-hidden win-shadow animate-start-menu z-[10000] start-menu-mobile"
      style={{
        bottom: TASKBAR_HEIGHT + 8,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 540,
        maxWidth: '100vw',
        height: 600,
        maxHeight: `calc(100dvh - ${TASKBAR_HEIGHT + 8}px)`,
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
            placeholder="Search for apps, settings, and documents"
            className="w-full bg-white dark:bg-black/20 border-b-2 border-win-blue px-10 py-2 rounded-md outline-none text-sm transition-all focus:bg-white dark:focus:bg-[#1c1c1c]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults[0]) launch(searchResults[0].id)
            }}
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-win-blue"
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
        <SearchView results={searchResults} onLaunch={launch} onClose={close} />
      ) : view === 'pinned' ? (
        <PinnedView
          pinned={pinned}
          onLaunch={launch}
          onAllApps={() => setView('allApps')}
        />
      ) : (
        <AllAppsView grouped={grouped} onLaunch={launch} onBack={() => setView('pinned')} />
      )}

      {/* Profile bar */}
      <div className="h-16 bg-black/5 dark:bg-black/20 flex items-center justify-between px-8 border-t border-white/10 shrink-0">
        <div className="flex items-center space-x-3 group cursor-pointer p-1 rounded hover:bg-white/10">
          <img
            src="/assets/img/profile.png"
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
          className="p-2 rounded hover:bg-white/10 group"
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
  results: ReturnType<typeof searchApps>
  onLaunch: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="flex-grow overflow-y-auto px-8">
      <h3 className="text-[11px] font-bold text-gray-500 uppercase mb-3 tracking-wider">
        Top results
      </h3>
      <div className="space-y-1">
        {results.length === 0 ? (
          <div className="text-xs opacity-50 py-4">No matches.</div>
        ) : (
          results.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onLaunch(a.id)}
              className="w-full flex items-center p-2 rounded hover:bg-win-blue hover:text-white text-left transition-colors group"
            >
              <div className="w-8 h-8 rounded bg-black/5 dark:bg-white/5 group-hover:bg-white/20 flex items-center justify-center mr-3">
                <img src={a.icon} alt="" className="w-5 h-5 object-contain" />
              </div>
              <div className="min-w-0 flex-grow text-black dark:text-white group-hover:text-white">
                <div className="text-xs font-medium truncate">{a.title}</div>
                <div className="text-[10px] opacity-60 truncate">App</div>
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
  onLaunch,
  onAllApps,
}: {
  pinned: ReturnType<typeof getApp>[]
  onLaunch: (id: string) => void
  onAllApps: () => void
}) {
  return (
    <div className="flex-grow overflow-y-auto px-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold dark:text-white">Pinned</h2>
        <button
          type="button"
          onClick={onAllApps}
          className="text-xs bg-white/20 dark:bg-white/5 px-2 py-1 rounded hover:bg-white/30 dark:hover:bg-white/10 dark:text-gray-300 transition-colors"
        >
          All apps &gt;
        </button>
      </div>
      <div className="grid gap-y-6 gap-x-4 grid-cols-6">
        {pinned.map((a) =>
          a ? (
            <button
              key={a.id}
              type="button"
              title={a.title}
              onClick={() => onLaunch(a.id)}
              className="flex flex-col items-center group cursor-pointer transition-all active:scale-95 w-full min-w-0"
            >
              <div className="w-10 h-10 rounded flex items-center justify-center bg-white/5 dark:bg-white/5 group-hover:bg-white/10 shrink-0 overflow-hidden transition-transform group-hover:scale-110">
                <img src={a.icon} alt="" className="w-7 h-7 object-contain" />
              </div>
              <span className="text-[11px] mt-2 dark:text-white text-center truncate w-full px-0.5">
                {a.title}
              </span>
            </button>
          ) : null,
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold dark:text-white mb-4">Recommended</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onLaunch('pdfreader')}
            className="flex items-center p-2 rounded hover:bg-white/20 dark:hover:bg-white/10 text-left transition-colors"
          >
            <div className="w-8 h-8 rounded bg-white flex items-center justify-center mr-3 overflow-hidden">
              <img src="/assets/img/pdf.webp" alt="" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="text-[11px] font-medium dark:text-white">
                CV - DeVanté Johnson-Rose.pdf
              </div>
              <div className="text-[10px] text-gray-500">2h ago</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onLaunch('explorer')}
            className="flex items-center p-2 rounded hover:bg-white/20 dark:hover:bg-white/10 text-left transition-colors"
          >
            <div className="w-8 h-8 rounded bg-yellow-100 flex items-center justify-center mr-3 overflow-hidden">
              <img src="/assets/img/win11/folder.png" alt="" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="text-[11px] font-medium dark:text-white">Projects</div>
              <div className="text-[10px] text-gray-500">Yesterday</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

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
    <div className="flex-grow overflow-y-auto px-8">
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-white/10 backdrop-blur-md py-2 z-10">
        <h2 className="text-sm font-semibold dark:text-white">All apps</h2>
        <button
          type="button"
          onClick={onBack}
          className="text-xs bg-white/20 dark:bg-white/5 px-2 py-1 rounded hover:bg-white/30 dark:hover:bg-white/10 dark:text-gray-300 transition-colors"
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
                  onClick={() => onLaunch(a.id)}
                  className="w-full flex items-center p-2 rounded hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded flex items-center justify-center mr-3 overflow-hidden shrink-0 transition-transform group-hover:scale-110">
                    <img src={a.icon} alt="" className="w-6 h-6 object-contain" />
                  </div>
                  <span className="text-[11px] font-medium dark:text-white">{a.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
