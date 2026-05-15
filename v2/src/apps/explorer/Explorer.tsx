import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOsStore } from '../../store/osStore'
import { useWindowExtras } from '../../windowing/WindowContext'
import {
  filesystem,
  listAt,
  type FsEntry,
} from '../../data/filesystem'

// 1:1 port of partials/apps/explorer.php — toolbar (back/forward/up,
// breadcrumb + editable path, search), 52 px sidebar with pinned + This PC
// groups (drag-to-Recycle-Bin support), grid OR details file pane, optional
// details panel, right-click context menu, in-place rename, keyboard
// shortcuts, sortable columns, and per-path selection memory.

const HOME = 'C:\\Users\\DeVante'
const RECYCLE = 'C:\\Recycle Bin'

type ViewMode = 'grid' | 'details'
type SortKey = 'name' | 'type' | 'date' | 'size'
type SortDir = 'asc' | 'desc'

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
  { id: 'desktop', label: 'Desktop', icon: '/assets/img/win11/desktop.png', path: 'C:\\Users\\DeVante\\Desktop', type: 'item' },
  { id: 'documents', label: 'Documents', icon: '/assets/img/win11/documents.png', path: 'C:\\Users\\DeVante\\Documents', type: 'item' },
  { id: 'downloads', label: 'Downloads', icon: '/assets/img/win11/downloads.png', path: 'C:\\Users\\DeVante\\Downloads', type: 'item' },
  { id: 'pictures', label: 'Pictures', icon: '/assets/img/win11/pictures.png', path: 'C:\\Users\\DeVante\\Pictures', type: 'item' },
  { id: 'projects', label: 'Projects', icon: '/assets/img/win11/folder.png', path: 'C:\\Users\\DeVante\\Projects', type: 'item' },
  {
    id: 'recycle',
    label: 'Recycle Bin',
    icon: recycleCount > 0 ? '/assets/img/recyclebinfull.webp' : '/assets/img/recyclebinempty.webp',
    path: RECYCLE,
    type: 'item',
  },
  { type: 'header', label: 'This PC' },
  { id: 'pc', label: "DeVanté's PC", icon: '/assets/img/thispc.webp', path: 'C:\\', type: 'item' },
  { id: 'cdrive', label: 'C: Drive', icon: '/assets/img/win11/drive_c.png', path: 'C:\\', indent: true, type: 'item' },
]

// ---- Helpers (pure) ------------------------------------------------------

function typeLabel(file: FsEntry): string {
  if (file.type === 'folder') return 'File folder'
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'PDF Document'
  if (lower.endsWith('.txt')) return 'Text Document'
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'Microsoft Word Document'
  if (lower.endsWith('.xlsx')) return 'Microsoft Excel Worksheet'
  if (lower.endsWith('.pptx')) return 'Microsoft PowerPoint Presentation'
  if (lower.endsWith('.psd')) return 'Adobe Photoshop Image'
  if (lower.endsWith('.mp4') || lower.endsWith('.webm')) return 'Video file'
  if (lower.endsWith('.mp3') || lower.endsWith('.wav')) return 'Audio file'
  if (lower.endsWith('.webp') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'Image'
  if (file.type === 'app') return 'Application'
  if (file.type === 'image') return 'Image'
  if (file.type === 'video') return 'Video file'
  return 'File'
}

// Deterministic fake date / size so sorting is stable and the pane feels
// real. Hashes the filename so the values don't shift between sessions.
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function fakeDate(file: FsEntry): Date {
  const seed = hashString(file.name)
  // Last ~24 months
  const now = Date.now()
  const offset = (seed % (730 * 24 * 60 * 60 * 1000))
  return new Date(now - offset)
}

function fakeSize(file: FsEntry): number {
  if (file.type === 'folder') return 0
  const seed = hashString(file.name)
  return (seed % 4_900_000) + 4_096 // 4 KB – 5 MB-ish
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---- Component -----------------------------------------------------------

export default function Explorer() {
  const { initialPath } = useWindowExtras<{ initialPath?: string }>()
  const [history, setHistory] = useState<string[]>([initialPath ?? HOME])
  const [step, setStep] = useState(0)
  // Per-path selection memory so navigating away + back restores the highlight.
  const [selectedByPath, setSelectedByPath] = useState<Record<string, string | null>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [addressActive, setAddressActive] = useState(false)
  const [manualPath, setManualPath] = useState(initialPath ?? HOME)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const fileGridRef = useRef<HTMLDivElement>(null)

  const openApp = useOsStore((s) => s.openApp)
  const recycleBin = useOsStore((s) => s.recycleBin)
  const hiddenDesktop = useOsStore((s) => s.hiddenDesktop)
  const restoredSeeds = useOsStore((s) => s.restoredSeeds)
  const recoveredItems = useOsStore((s) => s.recoveredItems)
  const renames = useOsStore((s) => s.renames)
  const restoreFromRecycle = useOsStore((s) => s.restoreFromRecycle)
  const recycleItem = useOsStore((s) => s.recycleItem)
  const emptyRecycleBin = useOsStore((s) => s.emptyRecycleBin)
  const renameFile = useOsStore((s) => s.renameFile)
  const openContextMenu = useOsStore((s) => s.openContextMenu)
  const closeContextMenu = useOsStore((s) => s.closeContextMenu)
  const focusedAppId = useOsStore((s) => s.focusedWindowId)
  const focusedAppName = useOsStore((s) =>
    s.windows.find((w) => w.id === s.focusedWindowId)?.app,
  )

  const currentPath = history[step]
  const isRecycle = currentPath === RECYCLE
  const selected = selectedByPath[currentPath] ?? null

  const effectiveName = useCallback(
    (file: FsEntry) => renames[`${currentPath}::${file.name}`] ?? file.name,
    [renames, currentPath],
  )

  // Files at the current path: real entries, or recycled items if in the bin.
  const allFiles = useMemo<(FsEntry & { __originPath?: string })[]>(() => {
    if (isRecycle) {
      const seeded = (listAt(RECYCLE) as FsEntry[]).filter(
        (e) => !restoredSeeds.includes(e.name),
      )
      const dynamic = recycleBin.map(
        (r) => ({ ...(r.payload as unknown as FsEntry), __originPath: r.fromPath }),
      )
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

  // Sort + search.
  const sortedFiles = useMemo(() => {
    const list = searchQuery
      ? allFiles.filter((f) => effectiveName(f).toLowerCase().includes(searchQuery.toLowerCase()))
      : [...allFiles]
    list.sort((a, b) => {
      // Folders always above files within the same direction.
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (b.type === 'folder' && a.type !== 'folder') return 1
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = effectiveName(a).localeCompare(effectiveName(b), 'en', { sensitivity: 'base' })
          break
        case 'type':
          cmp = typeLabel(a).localeCompare(typeLabel(b))
          break
        case 'date':
          cmp = fakeDate(a).getTime() - fakeDate(b).getTime()
          break
        case 'size':
          cmp = fakeSize(a) - fakeSize(b)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [allFiles, searchQuery, sortKey, sortDir, effectiveName])

  const selectedFile = useMemo(
    () => sortedFiles.find((f) => f.name === selected) ?? null,
    [sortedFiles, selected],
  )

  // Sidebar icon swaps between full/empty based on total bin contents.
  const binCount = useMemo(() => {
    const seeded = (listAt(RECYCLE) as FsEntry[]).filter(
      (e) => !restoredSeeds.includes(e.name),
    ).length
    return seeded + recycleBin.length
  }, [recycleBin.length, restoredSeeds])
  const sidebar = useMemo(() => buildSidebar(binCount), [binCount])

  const setSelected = useCallback(
    (name: string | null) => {
      setSelectedByPath((prev) => ({ ...prev, [currentPath]: name }))
    },
    [currentPath],
  )

  const navigate = useCallback(
    (path: string) => {
      const target = path
      if (target !== RECYCLE && !filesystem[target]) return
      setHistory((h) => [...h.slice(0, step + 1), target])
      setStep((s) => s + 1)
      setSearchQuery('')
      setAddressActive(false)
      setManualPath(target)
      setRenaming(null)
      closeContextMenu()
    },
    [step, closeContextMenu],
  )

  const goBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1)
      setRenaming(null)
      closeContextMenu()
    }
  }, [step, closeContextMenu])

  const goForward = useCallback(() => {
    if (step < history.length - 1) {
      setStep((s) => s + 1)
      setRenaming(null)
      closeContextMenu()
    }
  }, [step, history.length, closeContextMenu])

  const goUp = useCallback(() => {
    if (currentPath === 'C:\\' || currentPath === RECYCLE) return
    const parts = currentPath.split('\\').filter(Boolean)
    if (parts.length <= 1) {
      navigate('C:\\')
      return
    }
    const parent = parts.slice(0, -1).join('\\')
    navigate(parent === 'C:' ? 'C:\\' : parent)
  }, [currentPath, navigate])

  const submitPath = () => {
    const target = manualPath.trim()
    if (target === RECYCLE || filesystem[target]) navigate(target)
    setAddressActive(false)
  }

  const openItem = useCallback(
    (file: FsEntry) => {
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
    },
    [currentPath, navigate, openApp],
  )

  const recycleSelected = useCallback(() => {
    if (!selectedFile || isRecycle) return
    recycleItem(selectedFile.name, currentPath, { ...selectedFile })
    setSelected(null)
  }, [selectedFile, isRecycle, recycleItem, currentPath, setSelected])

  const beginRename = useCallback((file: FsEntry) => {
    setRenaming(file.name)
    setRenameValue(effectiveName(file))
  }, [effectiveName])

  const commitRename = useCallback(() => {
    if (renaming) {
      renameFile(currentPath, renaming, renameValue)
    }
    setRenaming(null)
    setRenameValue('')
  }, [renaming, renameValue, renameFile, currentPath])

  // ---- Drag-to-Recycle ----
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
      /* noop */
    }
  }

  // ---- Right-click context menu ----
  const showFileContextMenu = (file: FsEntry, x: number, y: number) => {
    setSelected(file.name)
    const items = [
      { label: 'Open', icon: '↗️', action: () => openItem(file) },
      { separator: true } as const,
      ...(isRecycle
        ? [{ label: 'Restore', icon: '↺', action: () => restoreFromRecycle(file.name) }]
        : [
            { label: 'Rename', icon: '✎', action: () => beginRename(file) },
            { label: 'Delete', icon: '🗑', action: () => recycleItem(file.name, currentPath, { ...file }) },
          ]),
      { separator: true } as const,
      { label: 'Properties', icon: 'ℹ️', action: () => setDetailsOpen(true) },
    ]
    openContextMenu(x, y, items, 'modern')
  }

  const showPaneContextMenu = (x: number, y: number) => {
    openContextMenu(x, y, [
      { label: viewMode === 'grid' ? 'View · Details' : 'View · Grid', icon: '⊞', action: () => setViewMode((v) => (v === 'grid' ? 'details' : 'grid')) },
      { label: detailsOpen ? 'Hide details pane' : 'Show details pane', icon: 'ℹ️', action: () => setDetailsOpen((v) => !v) },
      { separator: true },
      { label: `Sort by · ${sortKey}`, icon: '↕', disabled: true },
      { label: 'Name',          action: () => setSortKey('name') },
      { label: 'Type',          action: () => setSortKey('type') },
      { label: 'Date modified', action: () => setSortKey('date') },
      { label: 'Size',          action: () => setSortKey('size') },
    ], 'modern')
  }

  // ---- Keyboard shortcuts ----
  // Only fire when this Explorer is the focused window, and never when an
  // input/textarea inside the window is the active element.
  const isExplorerFocused = focusedAppName === 'explorer'
  useEffect(() => {
    if (!isExplorerFocused) return
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        // Allow Esc to bubble through to clear rename / address bar; otherwise stay out of the way.
        if (e.key !== 'Escape') return
      }
      if (e.key === 'Backspace') {
        if (renaming) return
        e.preventDefault()
        goBack()
      } else if (e.key === 'Delete') {
        if (renaming) return
        e.preventDefault()
        recycleSelected()
      } else if (e.key === 'Enter') {
        if (renaming) return
        if (selectedFile) {
          e.preventDefault()
          openItem(selectedFile)
        }
      } else if (e.key === 'F2') {
        if (selectedFile && !isRecycle) {
          e.preventDefault()
          beginRename(selectedFile)
        }
      } else if (e.key === 'Escape') {
        if (renaming) {
          e.preventDefault()
          setRenaming(null)
          setRenameValue('')
        } else if (addressActive) {
          e.preventDefault()
          setAddressActive(false)
          setManualPath(currentPath)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    isExplorerFocused, renaming, selectedFile, isRecycle, addressActive, currentPath,
    goBack, recycleSelected, openItem, beginRename,
  ])

  useEffect(() => {
    if (addressActive) inputRef.current?.focus()
  }, [addressActive])

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [renaming])

  const breadcrumbParts = currentPath.split('\\').filter((p) => p !== '')

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-2 space-x-3 bg-white dark:bg-[#2b2b2b] shrink-0">
        <div className="flex items-center space-x-1 pr-2 border-r border-gray-200 dark:border-gray-700">
          <button type="button" onClick={goBack} disabled={step <= 0} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30" aria-label="Back" title="Back (Backspace)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button type="button" onClick={goForward} disabled={step >= history.length - 1} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30" aria-label="Forward" title="Forward">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button type="button" onClick={goUp} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Up" title="Up">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          </button>
        </div>

        {/* Address bar */}
        <div
          className="flex-grow flex items-center bg-gray-100 dark:bg-black/20 rounded-md px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 shadow-inner overflow-hidden relative cursor-text min-h-[32px]"
          onClick={() => { if (!addressActive) setAddressActive(true) }}
        >
          {!addressActive ? (
            <div className="flex items-center space-x-1 truncate w-full h-full">
              <img src="/assets/img/explorer.webp" alt="" className="w-4 h-4 object-contain mr-1 hidden sm:inline opacity-80" />
              <span className="mx-1 opacity-40 hidden sm:inline">&gt;</span>
              {breadcrumbParts.map((part, idx) => {
                const stop = breadcrumbParts.slice(0, idx + 1).join('\\') + (idx === 0 ? '\\' : '')
                return (
                  <div key={`${part}-${idx}`} className="flex items-center">
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(stop) }} className="hover:underline cursor-pointer truncate max-w-[60px] sm:max-w-[200px]">{part}</button>
                    {idx < breadcrumbParts.length - 1 && <span className="mx-1 opacity-40">&gt;</span>}
                  </div>
                )
              })}
            </div>
          ) : (
            <input
              ref={inputRef} type="text" value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitPath()
                if (e.key === 'Escape') { setAddressActive(false); setManualPath(currentPath) }
              }}
              onBlur={() => { setAddressActive(false); setManualPath(currentPath) }}
              className="bg-transparent border-none outline-none w-full text-xs font-mono"
            />
          )}
        </div>

        {/* Search */}
        <div className="w-32 sm:w-56 bg-gray-100 dark:bg-black/20 rounded-md px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 flex items-center relative">
          <svg className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search" className="bg-transparent border-none outline-none w-full truncate pr-6" />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full" aria-label="Clear search">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="hidden md:flex items-center space-x-0.5 border-l border-gray-200 dark:border-gray-700 pl-3">
          <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} title="Grid view" className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/40 text-win-blue' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" /></svg>
          </button>
          <button type="button" onClick={() => setViewMode('details')} aria-pressed={viewMode === 'details'} title="Details view" className={`p-1.5 rounded ${viewMode === 'details' ? 'bg-blue-100 dark:bg-blue-900/40 text-win-blue' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h2v2H3V5zm4 0h14v2H7V5zM3 11h2v2H3v-2zm4 0h14v2H7v-2zM3 17h2v2H3v-2zm4 0h14v2H7v-2z" /></svg>
          </button>
          <button type="button" onClick={() => setDetailsOpen((v) => !v)} aria-pressed={detailsOpen} title="Details pane" className={`p-1.5 rounded ml-1 ${detailsOpen ? 'bg-blue-100 dark:bg-blue-900/40 text-win-blue' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>

        {/* Empty Recycle Bin */}
        {isRecycle && (
          <button type="button" onClick={emptyRecycleBin} disabled={sortedFiles.length === 0} className="px-3 py-1.5 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed" title="Empty Recycle Bin">
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
              return <div key={`h-${i}`} className="px-3 py-2 font-bold opacity-50 uppercase tracking-tighter text-[10px]">{item.label}</div>
            }
            const isRecycleEntry = item.id === 'recycle'
            const active = currentPath === item.path
            return (
              <button
                key={item.id ?? item.label} type="button"
                onClick={() => item.path && navigate(item.path)}
                onDragOver={(e) => { if (!isRecycleEntry) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('bg-blue-100', 'dark:bg-blue-900/40') }}
                onDragLeave={(e) => { if (!isRecycleEntry) return; e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/40') }}
                onDrop={(e) => { if (!isRecycleEntry) return; e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/40'); onRecycleDrop(e) }}
                className={`w-full text-left py-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center group transition-colors ${active ? 'bg-blue-100/50 dark:bg-blue-900/20 text-win-blue font-semibold' : ''} ${item.indent ? 'pl-8' : 'px-3'}`}
              >
                <span className="mr-3 text-base group-hover:scale-110 transition-transform flex items-center justify-center w-5 h-5 shrink-0">
                  {item.icon ? <img src={item.icon} alt="" className="w-full h-full object-contain" /> : '📁'}
                </span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* File pane */}
        <div
          ref={fileGridRef}
          className="flex-grow overflow-y-auto bg-white dark:bg-[#1c1c1c]"
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault()
              showPaneContextMenu(e.clientX, e.clientY)
            }
          }}
          onClick={(e) => {
            // Click on empty space deselects.
            if (e.target === e.currentTarget) setSelected(null)
          }}
        >
          {/* Mobile pills */}
          <div className="m-4 mb-2 flex overflow-x-auto pb-2 space-x-2 lg:hidden">
            {sidebar
              .filter((i): i is SidebarItem & { path: string; icon: string; label: string } =>
                Boolean(i.type !== 'header' && i.path),
              )
              .map((i) => (
                <button key={i.id ?? i.label} type="button" onClick={() => navigate(i.path)}
                  className={`px-4 py-1.5 rounded-full text-[10px] whitespace-nowrap transition-all border border-transparent flex items-center space-x-2 ${currentPath === i.path ? 'bg-win-blue text-white shadow-md' : 'bg-gray-100 dark:bg-white/5'}`}>
                  {i.icon && <img src={i.icon} alt="" className="w-3 h-3 object-contain" />}
                  <span>{i.label}</span>
                </button>
              ))}
          </div>

          {sortedFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 p-8">
              <img src="/assets/img/explorer.webp" alt="" className="w-20 h-20 object-contain mb-4 grayscale opacity-50" />
              <div className="text-sm font-medium">{isRecycle ? 'Recycle bin is empty.' : 'This folder is empty.'}</div>
            </div>
          ) : viewMode === 'grid' ? (
            <GridView
              files={sortedFiles}
              selected={selected}
              isRecycle={isRecycle}
              renaming={renaming}
              renameValue={renameValue}
              renameInputRef={renameInputRef}
              setRenameValue={setRenameValue}
              commitRename={commitRename}
              cancelRename={() => { setRenaming(null); setRenameValue('') }}
              onSelect={(name) => setSelected(name)}
              onOpen={(file) => (isRecycle ? restoreFromRecycle(file.name) : openItem(file))}
              onContextMenu={(file, x, y) => showFileContextMenu(file, x, y)}
              onDragStart={onDragStart}
              onRestore={(name) => restoreFromRecycle(name)}
              effectiveName={effectiveName}
            />
          ) : (
            <DetailsView
              files={sortedFiles}
              selected={selected}
              isRecycle={isRecycle}
              sortKey={sortKey}
              sortDir={sortDir}
              toggleSort={(k) => {
                if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                else { setSortKey(k); setSortDir('asc') }
              }}
              renaming={renaming}
              renameValue={renameValue}
              renameInputRef={renameInputRef}
              setRenameValue={setRenameValue}
              commitRename={commitRename}
              cancelRename={() => { setRenaming(null); setRenameValue('') }}
              onSelect={(name) => setSelected(name)}
              onOpen={(file) => (isRecycle ? restoreFromRecycle(file.name) : openItem(file))}
              onContextMenu={(file, x, y) => showFileContextMenu(file, x, y)}
              effectiveName={effectiveName}
            />
          )}
        </div>

        {/* Details pane */}
        {detailsOpen && (
          <DetailsPanel
            file={selectedFile}
            currentPath={currentPath}
            effectiveName={effectiveName}
            onClose={() => setDetailsOpen(false)}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="h-6 border-t border-gray-200 dark:border-gray-800 bg-[#f3f3f3] dark:bg-[#2b2b2b] flex items-center px-4 justify-between text-[10px] opacity-60 shrink-0">
        <div>{sortedFiles.length} items</div>
        <div className="flex items-center space-x-4">
          {focusedAppId !== null && isExplorerFocused && (
            <div className="hidden md:flex items-center space-x-3 opacity-80">
              <span>Sort: {sortKey} {sortDir === 'asc' ? '↑' : '↓'}</span>
            </div>
          )}
          {selectedFile && (
            <div className="flex items-center space-x-1">
              <span>📁</span>
              <span>1 item selected · {formatSize(fakeSize(selectedFile))}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// GridView (the original tile grid, extracted)
// ============================================================================

interface GridViewProps {
  files: FsEntry[]
  selected: string | null
  isRecycle: boolean
  renaming: string | null
  renameValue: string
  renameInputRef: React.RefObject<HTMLInputElement | null>
  setRenameValue: (v: string) => void
  commitRename: () => void
  cancelRename: () => void
  onSelect: (name: string) => void
  onOpen: (file: FsEntry) => void
  onContextMenu: (file: FsEntry, x: number, y: number) => void
  onDragStart: (file: FsEntry) => (e: React.DragEvent) => void
  onRestore: (name: string) => void
  effectiveName: (file: FsEntry) => string
}

function GridView({
  files, selected, isRecycle, renaming, renameValue, renameInputRef,
  setRenameValue, commitRename, cancelRename,
  onSelect, onOpen, onContextMenu, onDragStart, onRestore, effectiveName,
}: GridViewProps) {
  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(100px,1fr))] p-4">
      {files.map((file) => {
        const isSelected = selected === file.name
        const isRenaming = renaming === file.name
        return (
          <div
            key={file.name}
            onClick={() => onSelect(file.name)}
            onDoubleClick={() => onOpen(file)}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(file, e.clientX, e.clientY) }}
            draggable={!isRenaming}
            onDragStart={onDragStart(file)}
            title={effectiveName(file)}
            className={`flex flex-col items-center p-2 rounded border border-transparent hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer group transition-all w-[100px] ${isSelected ? 'bg-blue-100/50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 shadow-sm' : ''}`}
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
            {isRenaming ? (
              <input
                ref={renameInputRef} type="text"
                value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') cancelRename() }}
                onBlur={commitRename}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-center w-full px-1 font-medium leading-tight bg-white dark:bg-[#1c1c1c] border border-win-blue rounded outline-none"
              />
            ) : (
              <div className="text-[11px] text-center w-full px-0.5 font-medium leading-tight overflow-hidden">{effectiveName(file)}</div>
            )}
            {isRecycle && !isRenaming && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onRestore(file.name) }} className="mt-2 px-3 py-1 bg-win-blue text-white text-[10px] font-semibold rounded shadow hover:bg-blue-600 transition-colors" title={`Restore ${file.name}`}>
                ↺ Restore
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// DetailsView (sortable table)
// ============================================================================

interface DetailsViewProps {
  files: FsEntry[]
  selected: string | null
  isRecycle: boolean
  sortKey: SortKey
  sortDir: SortDir
  toggleSort: (k: SortKey) => void
  renaming: string | null
  renameValue: string
  renameInputRef: React.RefObject<HTMLInputElement | null>
  setRenameValue: (v: string) => void
  commitRename: () => void
  cancelRename: () => void
  onSelect: (name: string) => void
  onOpen: (file: FsEntry) => void
  onContextMenu: (file: FsEntry, x: number, y: number) => void
  effectiveName: (file: FsEntry) => string
}

function DetailsView({
  files, selected, isRecycle, sortKey, sortDir, toggleSort,
  renaming, renameValue, renameInputRef, setRenameValue, commitRename, cancelRename,
  onSelect, onOpen, onContextMenu, effectiveName,
}: DetailsViewProps) {
  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')
  return (
    <table className="w-full text-[12px] border-collapse">
      <thead className="bg-gray-100 dark:bg-[#252526] sticky top-0 z-10 text-left">
        <tr>
          <Th onClick={() => toggleSort('name')} className="pl-4 w-[50%]">Name{arrow('name')}</Th>
          <Th onClick={() => toggleSort('date')}>Date modified{arrow('date')}</Th>
          <Th onClick={() => toggleSort('type')}>Type{arrow('type')}</Th>
          <Th onClick={() => toggleSort('size')} className="text-right pr-4">Size{arrow('size')}</Th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => {
          const isSelected = selected === file.name
          const isRenaming = renaming === file.name
          return (
            <tr
              key={file.name}
              onClick={() => onSelect(file.name)}
              onDoubleClick={() => onOpen(file)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(file, e.clientX, e.clientY) }}
              className={`cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 ${isSelected ? 'bg-blue-100/50 dark:bg-blue-900/30' : ''}`}
            >
              <td className="pl-4 py-1.5 flex items-center space-x-2">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  {file.type === 'image' ? (
                    <img src={file.url} alt="" className="w-5 h-5 object-cover rounded" />
                  ) : file.icon && (file.icon.includes('.') || file.icon.startsWith('/')) ? (
                    <img src={file.icon} alt="" className="w-5 h-5 object-contain" />
                  ) : (
                    <span className="text-sm">{file.icon || '📁'}</span>
                  )}
                </span>
                {isRenaming ? (
                  <input
                    ref={renameInputRef} type="text"
                    value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') cancelRename() }}
                    onBlur={commitRename}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[12px] px-1 bg-white dark:bg-[#1c1c1c] border border-win-blue rounded outline-none w-full"
                  />
                ) : (
                  <span className="truncate">{effectiveName(file)}</span>
                )}
                {isRecycle && !isRenaming && (
                  <span className="ml-2 text-[10px] opacity-60">(deleted)</span>
                )}
              </td>
              <td className="py-1.5 opacity-70">{formatDate(fakeDate(file))}</td>
              <td className="py-1.5 opacity-70">{typeLabel(file)}</td>
              <td className="py-1.5 opacity-70 text-right pr-4">{file.type === 'folder' ? '' : formatSize(fakeSize(file))}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Th({ children, onClick, className = '' }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <th onClick={onClick} className={`py-1.5 text-[11px] font-medium opacity-60 hover:opacity-100 cursor-pointer border-b border-gray-200 dark:border-gray-800 ${className}`}>
      {children}
    </th>
  )
}

// ============================================================================
// DetailsPanel (right-side properties view)
// ============================================================================

interface DetailsPanelProps {
  file: FsEntry | null
  currentPath: string
  effectiveName: (file: FsEntry) => string
  onClose: () => void
}

function DetailsPanel({ file, currentPath, effectiveName, onClose }: DetailsPanelProps) {
  return (
    <aside className="w-72 border-l border-gray-200 dark:border-gray-800 bg-[#fafafa] dark:bg-[#252526] shrink-0 flex flex-col hidden xl:flex">
      <div className="h-9 px-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <span className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">Details</span>
        <button type="button" onClick={onClose} className="opacity-50 hover:opacity-100 text-sm" aria-label="Close details">×</button>
      </div>
      {!file ? (
        <div className="flex-grow flex items-center justify-center text-xs opacity-50 px-4 text-center">
          Select a file to see its properties.
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 flex items-center justify-center rounded shadow-sm">
              {file.type === 'image' ? (
                <img src={file.url} alt="" className="w-full h-full object-cover rounded" />
              ) : file.icon && (file.icon.includes('.') || file.icon.startsWith('/')) ? (
                <img src={file.icon} alt="" className="w-16 h-16 object-contain" />
              ) : (
                <div className="text-5xl">{file.icon || '📁'}</div>
              )}
            </div>
            <div className="mt-3 text-center font-semibold text-sm break-all">{effectiveName(file)}</div>
            <div className="text-[11px] opacity-60">{typeLabel(file)}</div>
          </div>
          <dl className="text-[11px] space-y-1">
            <Row label="Location" value={currentPath} />
            <Row label="Type" value={typeLabel(file)} />
            <Row label="Size" value={file.type === 'folder' ? 'Folder' : formatSize(fakeSize(file))} />
            <Row label="Date modified" value={formatDate(fakeDate(file))} />
            {file.type === 'app' && <Row label="Opens with" value={file.app} />}
            {file.type === 'image' && 'url' in file && <Row label="URL" value={file.url} />}
            {file.type === 'video' && 'url' in file && <Row label="Source" value={file.url} />}
          </dl>
        </div>
      )}
    </aside>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-2">
      <dt className="opacity-50">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  )
}
