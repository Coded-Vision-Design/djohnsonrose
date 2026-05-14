import { useMemo, useState } from 'react'
import { useOsStore } from '../../store/osStore'
import { useWindowExtras } from '../../windowing/WindowContext'
import {
  filesystem,
  listAt,
  parentPath,
  joinPath,
  searchFiles,
  QUICK_ACCESS,
  type FsEntry,
} from '../../data/filesystem'

const HOME = 'C:\\Users\\DeVante'
const RECYCLE_BIN_PATH = 'C:\\Recycle Bin'

export default function Explorer() {
  const { initialPath } = useWindowExtras<{ initialPath?: string }>()
  const [history, setHistory] = useState<string[]>([initialPath ?? HOME])
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editingAddress, setEditingAddress] = useState(false)
  const [addressInput, setAddressInput] = useState('')

  const openApp = useOsStore((s) => s.openApp)
  const recycleBin = useOsStore((s) => s.recycleBin)
  const hiddenDesktop = useOsStore((s) => s.hiddenDesktop)
  const restoreFromRecycle = useOsStore((s) => s.restoreFromRecycle)
  const emptyRecycleBin = useOsStore((s) => s.emptyRecycleBin)

  const cwd = history[step]
  const isRecycleBin = cwd === RECYCLE_BIN_PATH

  // Recycled items are stored separately — surface them when navigating to
  // C:\Recycle Bin. Otherwise list from the static catalogue, filtering out
  // anything that has been recycled.
  const entries = useMemo(() => {
    if (isRecycleBin) {
      return recycleBin.map((r) => r.payload as unknown as FsEntry)
    }
    const raw = listAt(cwd)
    if (cwd === 'C:\\Users\\DeVante\\Desktop') {
      return raw.filter((e) => !hiddenDesktop.includes(e.name))
    }
    return raw
  }, [cwd, isRecycleBin, recycleBin, hiddenDesktop])

  const visible = useMemo(() => {
    if (!query) return entries
    return entries.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
  }, [entries, query])

  const searchResults = useMemo(
    () => (query.length >= 2 && entries.length === 0 ? searchFiles(query, 20) : []),
    [query, entries.length],
  )

  const navigateTo = (path: string) => {
    // The recycle bin is a virtual path — let it through even though it isn't
    // in the static filesystem map.
    if (path !== RECYCLE_BIN_PATH && !filesystem[path]) return
    setHistory((h) => [...h.slice(0, step + 1), path])
    setStep((s) => s + 1)
    setSelected(null)
    setQuery('')
    setEditingAddress(false)
  }

  const back = () => {
    if (step > 0) {
      setStep(step - 1)
      setSelected(null)
    }
  }
  const forward = () => {
    if (step < history.length - 1) {
      setStep(step + 1)
      setSelected(null)
    }
  }
  const up = () => {
    const parent = parentPath(cwd)
    if (parent !== cwd) navigateTo(parent)
  }

  const openEntry = (entry: FsEntry) => {
    if (entry.type === 'folder') {
      navigateTo(joinPath(cwd, entry))
      return
    }
    if (entry.type === 'app') {
      openApp(entry.app, entry.name, { extra: entry.extraData })
      return
    }
    if (entry.type === 'image') {
      openApp('photos', entry.name, { extra: { imageUrl: entry.url } })
      return
    }
    if (entry.type === 'video') {
      openApp('video', entry.name, { extra: { videoUrl: entry.url } })
      return
    }
    // Plain text-style files open in notepad with their content.
    if (entry.type === 'file') {
      openApp('notepad', entry.name, { extra: { content: entry.content ?? '' } })
    }
  }

  const breadcrumbs = useMemo(() => {
    const parts = cwd.split('\\').filter(Boolean)
    const crumbs: { label: string; path: string }[] = []
    let acc = ''
    for (const part of parts) {
      acc = acc ? `${acc}\\${part}` : `${part}\\`
      crumbs.push({ label: part, path: acc.endsWith('\\') ? acc : `${acc}\\` })
    }
    // Normalise: root is 'C:\'
    if (crumbs.length > 0) crumbs[0].path = 'C:\\'
    return crumbs
  }, [cwd])

  const submitAddress = () => {
    const target = addressInput.trim().replace(/\//g, '\\')
    const normalised = target.endsWith('\\') ? target : target + '\\'
    if (filesystem[target]) navigateTo(target)
    else if (filesystem[normalised]) navigateTo(normalised)
    setEditingAddress(false)
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white">
      {/* Header */}
      <div className="h-12 border-b border-black/5 dark:border-white/5 flex items-center px-3 space-x-2 shrink-0">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          aria-label="Back"
          className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
        >
          ←
        </button>
        <button
          type="button"
          onClick={forward}
          disabled={step >= history.length - 1}
          aria-label="Forward"
          className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
        >
          →
        </button>
        <button
          type="button"
          onClick={up}
          aria-label="Up"
          className="w-7 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          ↑
        </button>

        {/* Address bar */}
        <div
          className="flex-grow bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-3 py-1 h-8 flex items-center overflow-x-auto"
          onDoubleClick={() => {
            setAddressInput(cwd)
            setEditingAddress(true)
          }}
        >
          {editingAddress ? (
            <input
              autoFocus
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitAddress()
                else if (e.key === 'Escape') setEditingAddress(false)
              }}
              onBlur={submitAddress}
              className="bg-transparent outline-none w-full text-xs"
            />
          ) : (
            <div className="flex items-center text-xs space-x-1 whitespace-nowrap">
              {breadcrumbs.map((c, i) => (
                <span key={c.path} className="flex items-center">
                  {i > 0 && <span className="opacity-40 mx-1">›</span>}
                  <button
                    type="button"
                    onClick={() => navigateTo(c.path)}
                    className="hover:underline"
                  >
                    {c.label}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-48 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-3 py-1 h-8 text-xs outline-none focus:border-win-blue"
        />

        {isRecycleBin && (
          <button
            type="button"
            onClick={emptyRecycleBin}
            disabled={recycleBin.length === 0}
            className="ml-2 px-3 py-1 h-8 rounded text-xs bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🗑 Empty
          </button>
        )}
      </div>

      <div className="flex-grow flex min-h-0">
        {/* Sidebar */}
        <div className="w-52 border-r border-black/5 dark:border-white/5 p-2 overflow-y-auto shrink-0">
          <div className="text-[10px] font-bold uppercase text-gray-500 px-2 mb-1 tracking-wider">
            Quick access
          </div>
          {QUICK_ACCESS.map((q) => (
            <button
              key={q.path}
              type="button"
              onClick={() => navigateTo(q.path)}
              className={`w-full text-left flex items-center px-2 py-1 rounded text-xs hover:bg-black/5 dark:hover:bg-white/10 ${
                cwd === q.path ? 'bg-black/5 dark:bg-white/10 font-medium' : ''
              }`}
            >
              <span className="mr-2">{q.icon}</span>
              {q.label}
            </button>
          ))}
        </div>

        {/* File list */}
        <div className="flex-grow overflow-y-auto">
          {searchResults.length > 0 ? (
            <SearchResultsView
              results={searchResults}
              onOpenFolder={navigateTo}
              onOpen={openEntry}
            />
          ) : visible.length === 0 ? (
            <div className="h-full flex items-center justify-center opacity-40 text-xs">
              {query
                ? `No matches in this folder. Try elsewhere or clear the search.`
                : isRecycleBin
                  ? 'Recycle bin is empty.'
                  : 'This folder is empty.'}
            </div>
          ) : (
            <div className="p-3 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              {visible.map((entry) => (
                <FileTile
                  key={entry.name}
                  entry={entry}
                  selected={selected === entry.name}
                  onSelect={() => setSelected(entry.name)}
                  onActivate={() =>
                    isRecycleBin ? restoreFromRecycle(entry.name) : openEntry(entry)
                  }
                  isRecycleBin={isRecycleBin}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-between px-3 text-[10px] opacity-70 shrink-0">
        <span>{entries.length} items</span>
        {selected && <span>{selected} selected</span>}
      </div>
    </div>
  )
}

function FileTile({
  entry,
  selected,
  onSelect,
  onActivate,
  isRecycleBin,
}: {
  entry: FsEntry
  selected: boolean
  onSelect: () => void
  onActivate: () => void
  isRecycleBin?: boolean
}) {
  const renderIcon = () =>
    entry.icon.includes('.') || entry.icon.startsWith('/') ? (
      <img src={entry.icon} alt="" className="w-8 h-8 object-contain" />
    ) : (
      <span className="text-2xl">{entry.icon}</span>
    )

  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={onActivate}
      className={`flex flex-col items-center p-2 rounded text-center group ${
        selected
          ? 'bg-win-blue/15 ring-1 ring-win-blue/40'
          : 'hover:bg-black/5 dark:hover:bg-white/5'
      }`}
      title={isRecycleBin ? `Double-click to restore: ${entry.name}` : entry.name}
    >
      <div className="w-10 h-10 flex items-center justify-center mb-1 relative">
        {renderIcon()}
        {isRecycleBin && (
          <span className="absolute -bottom-1 -right-1 text-[10px]" title="Recycled">
            🗑
          </span>
        )}
      </div>
      <span className="text-[11px] truncate w-full">{entry.name}</span>
    </button>
  )
}

function SearchResultsView({
  results,
  onOpenFolder,
  onOpen,
}: {
  results: { path: string; entry: FsEntry }[]
  onOpenFolder: (p: string) => void
  onOpen: (e: FsEntry) => void
}) {
  return (
    <div className="p-3">
      <div className="text-[10px] uppercase opacity-60 mb-2">Found in this PC</div>
      <div className="space-y-1">
        {results.map(({ path, entry }) => (
          <button
            key={`${path}::${entry.name}`}
            type="button"
            onClick={() => {
              if (entry.type === 'folder') onOpenFolder(path)
              else onOpen(entry)
            }}
            className="w-full text-left flex items-center px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            <div className="w-6 h-6 mr-3 flex items-center justify-center">
              {entry.icon.includes('.') || entry.icon.startsWith('/') ? (
                <img src={entry.icon} alt="" className="w-5 h-5 object-contain" />
              ) : (
                <span>{entry.icon}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs truncate">{entry.name}</div>
              <div className="text-[10px] opacity-50 truncate">{path}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
