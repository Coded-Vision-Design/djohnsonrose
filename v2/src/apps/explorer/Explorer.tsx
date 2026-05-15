import { useEffect, useMemo, useRef, useState } from 'react'
import { useOsStore } from '../../store/osStore'
import { useWindowExtras } from '../../windowing/WindowContext'
import {
  filesystem,
  listAt,
  type FsEntry,
} from '../../data/filesystem'

// 1:1 port of partials/apps/explorer.php — toolbar (back/forward/up,
// breadcrumb + editable path, search), 52 px sidebar with pinned + This PC
// groups (drag-to-Recycle-Bin support), grid-tile file pane, status bar.

const HOME = 'C:\\Users\\DeVante'
const RECYCLE = 'C:\\Recycle Bin'

interface SidebarItem {
  id?: string
  type?: 'header' | 'item'
  label: string
  icon?: string
  path?: string
  indent?: boolean
}

const buildSidebar = (recycleCount: number): SidebarItem[] => [
  { type: 'header', label: 'Pinned' },
  { id: 'home', label: 'Home', icon: '/assets/img/thispc.webp', path: HOME, type: 'item' },
  {
    id: 'desktop',
    label: 'Desktop',
    icon: '/assets/img/win11/desktop.png',
    path: 'C:\\Users\\DeVante\\Desktop',
    type: 'item',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: '/assets/img/win11/documents.png',
    path: 'C:\\Users\\DeVante\\Documents',
    type: 'item',
  },
  {
    id: 'downloads',
    label: 'Downloads',
    icon: '/assets/img/win11/downloads.png',
    path: 'C:\\Users\\DeVante\\Downloads',
    type: 'item',
  },
  {
    id: 'pictures',
    label: 'Pictures',
    icon: '/assets/img/win11/pictures.png',
    path: 'C:\\Users\\DeVante\\Pictures',
    type: 'item',
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: '/assets/img/win11/folder.png',
    path: 'C:\\Users\\DeVante\\Projects',
    type: 'item',
  },
  {
    id: 'recycle',
    label: 'Recycle Bin',
    icon:
      recycleCount > 0
        ? '/assets/img/recyclebinfull.webp'
        : '/assets/img/recyclebinempty.webp',
    path: RECYCLE,
    type: 'item',
  },
  { type: 'header', label: 'This PC' },
  { id: 'pc', label: "DeVanté's PC", icon: '/assets/img/thispc.webp', path: 'C:\\', type: 'item' },
  {
    id: 'cdrive',
    label: 'C: Drive',
    icon: '/assets/img/win11/drive_c.png',
    path: 'C:\\',
    indent: true,
    type: 'item',
  },
]

export default function Explorer() {
  const { initialPath } = useWindowExtras<{ initialPath?: string }>()
  const [history, setHistory] = useState<string[]>([initialPath ?? HOME])
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [addressActive, setAddressActive] = useState(false)
  const [manualPath, setManualPath] = useState(initialPath ?? HOME)
  const inputRef = useRef<HTMLInputElement>(null)

  const openApp = useOsStore((s) => s.openApp)
  const recycleBin = useOsStore((s) => s.recycleBin)
  const hiddenDesktop = useOsStore((s) => s.hiddenDesktop)
  const restoredSeeds = useOsStore((s) => s.restoredSeeds)
  const recoveredItems = useOsStore((s) => s.recoveredItems)
  const restoreFromRecycle = useOsStore((s) => s.restoreFromRecycle)
  const recycleItem = useOsStore((s) => s.recycleItem)
  const emptyRecycleBin = useOsStore((s) => s.emptyRecycleBin)

  const currentPath = history[step]
  const isRecycle = currentPath === RECYCLE

  // Files at the current path: real entries, or recycled items if in the bin.
  // The bin merges its static seed (Easter Egg video) with whatever's been
  // recycled at runtime, minus any items the user has already restored.
  const allFiles = useMemo<(FsEntry & { __originPath?: string })[]>(() => {
    if (isRecycle) {
      const seeded = (listAt(RECYCLE) as FsEntry[]).filter(
        (e) => !restoredSeeds.includes(e.name),
      )
      const dynamic = recycleBin.map(
        (r) => ({ ...(r.payload as unknown as FsEntry), __originPath: r.fromPath }),
      )
      // De-dup by name in case a seeded entry's name later gets recycled.
      const merged: (FsEntry & { __originPath?: string })[] = []
      const seen = new Set<string>()
      for (const e of [...seeded, ...dynamic]) {
        if (seen.has(e.name)) continue
        seen.add(e.name)
        merged.push(e)
      }
      return merged
    }
    const raw = listAt(currentPath)
    const recoveredHere = recoveredItems
      .filter((r) => r.path === currentPath)
      .map((r) => r.item as unknown as FsEntry)
      .filter((e) => !raw.some((s) => s.name === e.name))
    if (currentPath === 'C:\\Users\\DeVante\\Desktop') {
      const visible = raw.filter((e) => !hiddenDesktop.includes(e.name))
      return [...visible, ...recoveredHere]
    }
    return [...raw, ...recoveredHere]
  }, [currentPath, isRecycle, recycleBin, hiddenDesktop, restoredSeeds, recoveredItems])

  // Sidebar icon swaps between full/empty based on total bin contents.
  const binCount = useMemo(() => {
    const seeded = (listAt(RECYCLE) as FsEntry[]).filter(
      (e) => !restoredSeeds.includes(e.name),
    ).length
    return seeded + recycleBin.length
  }, [recycleBin.length, restoredSeeds])
  const sidebar = useMemo(() => buildSidebar(binCount), [binCount])

  const currentFiles = useMemo(() => {
    if (!searchQuery) return allFiles
    const q = searchQuery.toLowerCase()
    return allFiles.filter((f) => f.name.toLowerCase().includes(q))
  }, [allFiles, searchQuery])

  const navigate = (path: string) => {
    const target = path.endsWith('\\') || path === 'C:\\' ? path : path
    if (target !== RECYCLE && !filesystem[target]) return
    setHistory((h) => [...h.slice(0, step + 1), target])
    setStep((s) => s + 1)
    setSelected(null)
    setSearchQuery('')
    setAddressActive(false)
    setManualPath(target)
  }

  const goBack = () => {
    if (step > 0) {
      setStep((s) => s - 1)
      setSelected(null)
    }
  }
  const goForward = () => {
    if (step < history.length - 1) {
      setStep((s) => s + 1)
      setSelected(null)
    }
  }
  const goUp = () => {
    if (currentPath === 'C:\\' || currentPath === RECYCLE) return
    const parts = currentPath.split('\\').filter(Boolean)
    if (parts.length <= 1) {
      navigate('C:\\')
      return
    }
    const parent = parts.slice(0, -1).join('\\')
    navigate(parent === 'C:' ? 'C:\\' : parent)
  }

  const submitPath = () => {
    const target = manualPath.trim()
    if (target === RECYCLE || filesystem[target]) navigate(target)
    setAddressActive(false)
  }

  const openItem = (file: FsEntry) => {
    if (file.type === 'folder') {
      const target = 'path' in file && file.path ? file.path : `${currentPath}\\${file.name}`
      navigate(target.replace(/\\+$/, '') || 'C:\\')
    } else if (file.type === 'app') {
      openApp(file.app, file.name, { extra: file.extraData })
    } else if (file.type === 'image') {
      openApp('photos', file.name, { extra: { imageUrl: file.url } })
    } else if (file.type === 'video') {
      openApp('video', file.name, { extra: { videoUrl: file.url } })
    } else if (file.type === 'file') {
      openApp('notepad', file.name, { extra: { content: file.content ?? '' } })
    }
  }

  // Drag-to-Recycle from the file pane onto the sidebar Recycle Bin.
  const dragRef = useRef<{ file: FsEntry } | null>(null)
  const onDragStart = (file: FsEntry) => (e: React.DragEvent) => {
    dragRef.current = { file }
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ item: file, fromPath: currentPath }),
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  const onRecycleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const raw = e.dataTransfer.getData('application/json')
      if (!raw) return
      const parsed = JSON.parse(raw) as { item: FsEntry; fromPath: string }
      recycleItem(parsed.item.name, parsed.fromPath, { ...parsed.item })
    } catch {
      // noop
    }
  }

  const breadcrumbParts = currentPath.split('\\').filter((p) => p !== '')

  useEffect(() => {
    if (addressActive) inputRef.current?.focus()
  }, [addressActive])

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-2 space-x-4 bg-white dark:bg-[#2b2b2b] shrink-0">
        <div className="flex items-center space-x-1 pr-2 border-r border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={goBack}
            disabled={step <= 0}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"
            aria-label="Back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={step >= history.length - 1}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"
            aria-label="Forward"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goUp}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5"
            aria-label="Up"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>

        {/* Address bar */}
        <div
          className="flex-grow flex items-center bg-gray-100 dark:bg-black/20 rounded-md px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 shadow-inner overflow-hidden relative cursor-text min-h-[32px]"
          onClick={() => {
            if (!addressActive) setAddressActive(true)
          }}
        >
          {!addressActive ? (
            <div className="flex items-center space-x-1 truncate w-full h-full">
              <img
                src="/assets/img/explorer.webp"
                alt=""
                className="w-4 h-4 object-contain mr-1 hidden sm:inline opacity-80"
              />
              <span className="mx-1 opacity-40 hidden sm:inline">&gt;</span>
              {breadcrumbParts.map((part, idx) => {
                const stop = breadcrumbParts.slice(0, idx + 1).join('\\') + (idx === 0 ? '\\' : '')
                return (
                  <div key={`${part}-${idx}`} className="flex items-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(stop)
                      }}
                      className="hover:underline cursor-pointer truncate max-w-[60px] sm:max-w-[200px]"
                    >
                      {part}
                    </button>
                    {idx < breadcrumbParts.length - 1 && (
                      <span className="mx-1 opacity-40">&gt;</span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitPath()
                if (e.key === 'Escape') {
                  setAddressActive(false)
                  setManualPath(currentPath)
                }
              }}
              onBlur={() => {
                setAddressActive(false)
                setManualPath(currentPath)
              }}
              className="bg-transparent border-none outline-none w-full text-xs font-mono"
            />
          )}
        </div>

        {/* Search */}
        <div className="w-32 sm:w-64 bg-gray-100 dark:bg-black/20 rounded-md px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 flex items-center relative">
          <svg
            className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0"
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
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="bg-transparent border-none outline-none w-full truncate pr-6"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full"
              aria-label="Clear search"
            >
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Empty Recycle Bin — only visible when looking at the bin */}
        {isRecycle && (
          <button
            type="button"
            onClick={emptyRecycleBin}
            disabled={currentFiles.length === 0}
            className="px-3 py-1.5 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Empty Recycle Bin"
          >
            🗑 Empty
          </button>
        )}
      </div>

      {/* Main */}
      <div className="flex flex-grow overflow-hidden bg-white dark:bg-[#1c1c1c]">
        {/* Sidebar */}
        <div className="w-52 border-r border-gray-200 dark:border-gray-800 p-2 space-y-0.5 text-xs shrink-0 overflow-y-auto hidden lg:block">
          {sidebar.map((item, i) => {
            if (item.type === 'header') {
              return (
                <div
                  key={`h-${i}`}
                  className="px-3 py-2 font-bold opacity-50 uppercase tracking-tighter text-[10px]"
                >
                  {item.label}
                </div>
              )
            }
            const isRecycleEntry = item.id === 'recycle'
            const active = currentPath === item.path
            return (
              <button
                key={item.id ?? item.label}
                type="button"
                onClick={() => item.path && navigate(item.path)}
                onDragOver={(e) => {
                  if (!isRecycleEntry) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  e.currentTarget.classList.add('bg-blue-100', 'dark:bg-blue-900/40')
                }}
                onDragLeave={(e) => {
                  if (!isRecycleEntry) return
                  e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/40')
                }}
                onDrop={(e) => {
                  if (!isRecycleEntry) return
                  e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/40')
                  onRecycleDrop(e)
                }}
                className={`w-full text-left py-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center group transition-colors ${
                  active ? 'bg-blue-100/50 dark:bg-blue-900/20 text-win-blue font-semibold' : ''
                } ${item.indent ? 'pl-8' : 'px-3'}`}
              >
                <span className="mr-3 text-base group-hover:scale-110 transition-transform flex items-center justify-center w-5 h-5 shrink-0">
                  {item.icon ? (
                    <img src={item.icon} alt="" className="w-full h-full object-contain" />
                  ) : (
                    '📁'
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* File pane */}
        <div className="flex-grow p-4 overflow-y-auto bg-white dark:bg-[#1c1c1c]">
          {/* Mobile pills */}
          <div className="mb-6 flex overflow-x-auto pb-2 space-x-2 lg:hidden">
            {sidebar
              .filter((i): i is SidebarItem & { path: string; icon: string; label: string } =>
                Boolean(i.type !== 'header' && i.path),
              )
              .map((i) => (
                <button
                  key={i.id ?? i.label}
                  type="button"
                  onClick={() => navigate(i.path)}
                  className={`px-4 py-1.5 rounded-full text-[10px] whitespace-nowrap transition-all border border-transparent flex items-center space-x-2 ${
                    currentPath === i.path
                      ? 'bg-win-blue text-white shadow-md'
                      : 'bg-gray-100 dark:bg-white/5'
                  }`}
                >
                  {i.icon && <img src={i.icon} alt="" className="w-3 h-3 object-contain" />}
                  <span>{i.label}</span>
                </button>
              ))}
          </div>

          {currentFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <img
                src="/assets/img/explorer.webp"
                alt=""
                className="w-20 h-20 object-contain mb-4 grayscale opacity-50"
              />
              <div className="text-sm font-medium">
                {isRecycle ? 'Recycle bin is empty.' : 'This folder is empty.'}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(100px,1fr))]">
              {currentFiles.map((file) => {
                const isSelected = selected === file.name
                return (
                  <div
                    key={file.name}
                    onClick={() => setSelected(file.name)}
                    onDoubleClick={() =>
                      isRecycle ? restoreFromRecycle(file.name) : openItem(file)
                    }
                    draggable
                    onDragStart={onDragStart(file)}
                    title={file.name}
                    className={`flex flex-col items-center p-2 rounded border border-transparent hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer group transition-all w-[100px] ${
                      isSelected
                        ? 'bg-blue-100/50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 shadow-sm'
                        : ''
                    }`}
                  >
                    <div className="w-12 h-12 mb-2 flex items-center justify-center relative overflow-hidden rounded shadow-sm group-hover:scale-105 transition-transform shrink-0">
                      {file.type === 'image' ? (
                        <img src={file.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : file.icon && (file.icon.includes('.') || file.icon.startsWith('/')) ? (
                        <img src={file.icon} alt="" className="w-10 h-10 object-contain" />
                      ) : (
                        <div className="text-4xl drop-shadow-sm">{file.icon || '📁'}</div>
                      )}
                    </div>
                    <div className="text-[11px] text-center w-full px-0.5 font-medium leading-tight overflow-hidden">
                      {file.name}
                    </div>
                    {isRecycle && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          restoreFromRecycle(file.name)
                        }}
                        className="mt-2 px-3 py-1 bg-win-blue text-white text-[10px] font-semibold rounded shadow hover:bg-blue-600 transition-colors"
                        title={`Restore ${file.name}`}
                      >
                        ↺ Restore
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 border-t border-gray-200 dark:border-gray-800 bg-[#f3f3f3] dark:bg-[#2b2b2b] flex items-center px-4 justify-between text-[10px] opacity-60 shrink-0">
        <div>{currentFiles.length} items</div>
        <div className="flex items-center space-x-4">
          {selected && (
            <div className="flex items-center space-x-1">
              <span>📁</span>
              <span>1 item selected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
