import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOsStore } from '../../store/osStore'
import { useWindowExtras } from '../../windowing/WindowContext'
import type { FsEntry } from '../../data/filesystem'
import {
  RECYCLE_BIN,
  deleteEntry,
  emptyBin,
  entryDate,
  entryIcon,
  entryProperties,
  entrySize,
  entryType,
  explorerSidebar,
  fileMenuHandlers,
  folderMenuHandlers,
  folderMenuOverrides,
  folderPath,
  formatDate,
  formatSize,
  parentPath,
  searchFolder,
  sortEntries,
  type SidebarEntry,
} from '../../../../assets/js/windowing/file-ops.js'
import { fileOs } from '../../shell/fileOs'
import { showFileMenu, showMenu } from '../../shell/menus'
import { openEntry } from '../../shell/openEntry'
import { RenameInput } from '../../shell/RenameInput'

// 1:1 port of partials/apps/explorer.php: toolbar (back/forward/up,
// breadcrumb + editable path, search), 52 px sidebar with pinned + This PC
// groups (drag-to-Recycle-Bin support), grid OR details file pane, optional
// details panel, right-click context menu, in-place rename, keyboard
// shortcuts, sortable columns, and per-path selection memory.

const HOME = 'C:\\Users\\DeVante'
const IMG = '/assets/img/'

type ViewMode = 'grid' | 'details'
type SortKey = 'name' | 'type' | 'date' | 'size'
type SortDir = 'asc' | 'desc'

// ---- Component -----------------------------------------------------------

export default function Explorer() {
  const { initialPath, selectName } = useWindowExtras<{ initialPath?: string; selectName?: string }>()
  const [history, setHistory] = useState<string[]>([initialPath ?? HOME])
  const [step, setStep] = useState(0)
  // Per-path selection memory so navigating away + back restores the highlight.
  const [selectedByPath, setSelectedByPath] = useState<Record<string, string | null>>(
    selectName ? { [initialPath ?? HOME]: selectName } : {},
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [addressActive, setAddressActive] = useState(false)
  const [manualPath, setManualPath] = useState(initialPath ?? HOME)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [detailsOpen, setDetailsOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const fileGridRef = useRef<HTMLDivElement>(null)

  const fileSystem = useOsStore((s) => s.fileSystem)
  const favourites = useOsStore((s) => s.favourites)
  const clipboard = useOsStore((s) => s.fileClipboard)
  const renaming = useOsStore((s) => s.renaming)
  const changeFiles = useOsStore((s) => s.changeFiles)
  const beginRename = useOsStore((s) => s.beginRename)
  const cancelRename = useOsStore((s) => s.cancelRename)
  const showProperties = useOsStore((s) => s.showProperties)
  const closeContextMenu = useOsStore((s) => s.closeContextMenu)
  const focusedAppId = useOsStore((s) => s.focusedWindowId)
  const focusedAppName = useOsStore((s) =>
    s.windows.find((w) => w.id === s.focusedWindowId)?.app,
  )

  const currentPath = history[step]
  const isRecycle = currentPath === RECYCLE_BIN
  const selected = selectedByPath[currentPath] ?? null

  // A search result can come from below this folder, so it says where it is.
  const pathOf = useCallback((file: FsEntry) => file.location ?? currentPath, [currentPath])

  const sortedFiles = useMemo(() => {
    const list = searchQuery ? searchFolder(fileSystem, currentPath, searchQuery) : (fileSystem[currentPath] ?? [])
    return sortEntries(list, sortKey, sortDir)
  }, [fileSystem, currentPath, searchQuery, sortKey, sortDir])

  const selectedFile = useMemo(
    () => sortedFiles.find((f) => f.name === selected) ?? null,
    [sortedFiles, selected],
  )

  const sidebar = useMemo(() => explorerSidebar(fileSystem, favourites, IMG), [fileSystem, favourites])

  const setSelected = useCallback(
    (name: string | null) => {
      setSelectedByPath((prev) => ({ ...prev, [currentPath]: name }))
    },
    [currentPath],
  )

  const navigate = useCallback(
    (path: string) => {
      const target = path
      if (!fileSystem[target]) return
      setHistory((h) => [...h.slice(0, step + 1), target])
      setStep((s) => s + 1)
      setSearchQuery('')
      setAddressActive(false)
      setManualPath(target)
      cancelRename()
      closeContextMenu()
    },
    [step, fileSystem, cancelRename, closeContextMenu],
  )

  const goBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1)
      cancelRename()
      closeContextMenu()
    }
  }, [step, cancelRename, closeContextMenu])

  const goForward = useCallback(() => {
    if (step < history.length - 1) {
      setStep((s) => s + 1)
      cancelRename()
      closeContextMenu()
    }
  }, [step, history.length, cancelRename, closeContextMenu])

  const goUp = useCallback(() => {
    if (currentPath === 'C:\\' || isRecycle) return
    navigate(parentPath(currentPath))
  }, [currentPath, isRecycle, navigate])

  const submitPath = () => {
    const target = manualPath.trim()
    if (fileSystem[target]) navigate(target)
    setAddressActive(false)
  }

  const openItem = useCallback(
    (file: FsEntry) => {
      const path = pathOf(file)
      if (isRecycle) showProperties(file, path)
      else if (file.type === 'folder') navigate(folderPath(file, path))
      else openEntry(file, path)
    },
    [isRecycle, navigate, pathOf, showProperties],
  )

  // ---- Drag-to-Recycle ----
  const onDragStart = (file: FsEntry) => (e: React.DragEvent) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ item: file, fromPath: pathOf(file) }),
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  const onRecycleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const raw = e.dataTransfer.getData('application/json')
      if (!raw) return
      const parsed = JSON.parse(raw) as { item: FsEntry; fromPath: string }
      changeFiles((fs) => deleteEntry(fs, parsed.fromPath, parsed.item.name))
    } catch {
      /* noop */
    }
  }

  // The Recycle Bin, in the sidebar or the phone's place chips, takes a dropped file.
  const recycleDropProps = (isRecycle: boolean) => ({
    onDragOver: (e: React.DragEvent<HTMLElement>) => {
      if (!isRecycle) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      e.currentTarget.classList.add('bg-blue-100', 'dark:bg-blue-900/40')
    },
    onDragLeave: (e: React.DragEvent<HTMLElement>) => {
      if (isRecycle) e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/40')
    },
    onDrop: (e: React.DragEvent<HTMLElement>) => {
      if (!isRecycle) return
      e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/40')
      onRecycleDrop(e)
    },
  })

  const openHere = useMemo(
    () => ({ openEntry: (entry: FsEntry) => openItem(entry) }),
    [openItem],
  )

  // ---- Right-click context menu ----
  const showFileContextMenu = (file: FsEntry, clientX: number, clientY: number) => {
    setSelected(file.name)
    showFileMenu(file, pathOf(file), { clientX, clientY }, openHere)
  }

  const showPaneContextMenu = (clientX: number, clientY: number) => {
    const os = fileOs(openHere)
    showMenu(
      'explorerPane',
      { clientX, clientY },
      {
        view: () => setViewMode(viewMode === 'grid' ? 'details' : 'grid'),
        details: () => setDetailsOpen(!detailsOpen),
        sortName: () => setSortKey('name'),
        sortType: () => setSortKey('type'),
        sortDate: () => setSortKey('date'),
        sortSize: () => setSortKey('size'),
        ...folderMenuHandlers(os, currentPath),
      },
      {
        ...folderMenuOverrides(os),
        view: { label: viewMode === 'grid' ? 'View as details' : 'View as grid' },
        details: { label: detailsOpen ? 'Hide details pane' : 'Show details pane' },
        // The Recycle Bin only takes what is deleted into it.
        ...(isRecycle && {
          paste: { hidden: true },
          pasteShortcut: { hidden: true },
          newFolder: { hidden: true },
          newTextFile: { hidden: true },
        }),
      },
    )
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
      if (renaming && e.key !== 'Escape') return
      const os = fileOs(openHere)
      const actions = selectedFile && fileMenuHandlers(os, selectedFile, pathOf(selectedFile))
      const command = e.ctrlKey || e.metaKey ? e.key.toLowerCase() : ''

      if (command === 'c' || command === 'x') {
        if (actions && !isRecycle) {
          e.preventDefault()
          if (command === 'c') actions.copy()
          else actions.cut()
        }
      } else if (command === 'v') {
        if (!isRecycle && clipboard) {
          e.preventDefault()
          folderMenuHandlers(os, currentPath).paste()
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        goBack()
      } else if (e.key === 'Delete') {
        if (actions) {
          e.preventDefault()
          if (isRecycle) actions.deleteForever()
          else actions.delete()
          setSelected(null)
        }
      } else if (e.key === 'Enter') {
        if (selectedFile) {
          e.preventDefault()
          openItem(selectedFile)
        }
      } else if (e.key === 'F2') {
        if (selectedFile && !isRecycle) {
          e.preventDefault()
          beginRename(pathOf(selectedFile), selectedFile.name)
        }
      } else if (e.key === 'Escape') {
        if (renaming) {
          e.preventDefault()
          cancelRename()
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
    isExplorerFocused, renaming, selectedFile, isRecycle, addressActive, currentPath, clipboard,
    goBack, openItem, beginRename, cancelRename, openHere, pathOf, setSelected,
  ])

  useEffect(() => {
    if (addressActive) inputRef.current?.focus()
  }, [addressActive])

  const openSidebarItem = (item: SidebarEntry<FsEntry>) => {
    if (!item.entry) {
      if (item.path) navigate(item.path)
    } else if (item.entry.type === 'folder') {
      navigate(folderPath(item.entry, item.path as string))
    } else {
      openEntry(item.entry, item.path as string)
    }
  }

  const cutName = clipboard?.mode === 'cut' && clipboard.fromPath === currentPath ? clipboard.name : null
  const renamingName = renaming?.path === currentPath ? renaming.name : null

  const breadcrumbParts = currentPath.split('\\').filter((p) => p !== '')

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-2 space-x-3 bg-white dark:bg-[#2b2b2b] shrink-0">
        <div className="flex items-center space-x-1 pr-2 border-r border-gray-200 dark:border-gray-700">
          <button type="button" onClick={goBack} disabled={step <= 0} className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30" aria-label="Back" title="Back (Backspace)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button type="button" onClick={goForward} disabled={step >= history.length - 1} className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30" aria-label="Forward" title="Forward">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button type="button" onClick={goUp} className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Up" title="Up">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          </button>
        </div>

        {/* Address bar */}
        <div
          className="grow flex items-center bg-gray-100 dark:bg-black/20 rounded-md px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 shadow-inner overflow-hidden relative cursor-text min-h-[32px]"
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
              className="bg-transparent border-none outline-hidden w-full text-xs font-mono"
            />
          )}
        </div>

        {/* Search */}
        <div className="w-32 sm:w-56 bg-gray-100 dark:bg-black/20 rounded-md px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 flex items-center relative">
          <svg className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search" className="bg-transparent border-none outline-hidden w-full truncate pr-6" />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full" aria-label="Clear search">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="hidden md:flex items-center space-x-0.5 border-l border-gray-200 dark:border-gray-700 pl-3">
          <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} title="Grid view" className={`p-1.5 rounded-sm ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/40 text-win-blue' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" /></svg>
          </button>
          <button type="button" onClick={() => setViewMode('details')} aria-pressed={viewMode === 'details'} title="Details view" className={`p-1.5 rounded-sm ${viewMode === 'details' ? 'bg-blue-100 dark:bg-blue-900/40 text-win-blue' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h2v2H3V5zm4 0h14v2H7V5zM3 11h2v2H3v-2zm4 0h14v2H7v-2zM3 17h2v2H3v-2zm4 0h14v2H7v-2z" /></svg>
          </button>
          <button type="button" onClick={() => setDetailsOpen((v) => !v)} aria-pressed={detailsOpen} title="Details pane" className={`p-1.5 rounded-sm ml-1 ${detailsOpen ? 'bg-blue-100 dark:bg-blue-900/40 text-win-blue' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>

        {/* Empty Recycle Bin */}
        {isRecycle && (
          <button type="button" onClick={() => changeFiles(emptyBin)} disabled={sortedFiles.length === 0} className="px-3 py-1.5 rounded-sm text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed" title="Empty Recycle Bin">
            <img src={`${IMG}win11/delete.webp`} alt="" className="w-3.5 h-3.5 inline-block mr-1 align-[-2px] brightness-0 invert" />
            Empty
          </button>
        )}
      </div>

      {/* Main */}
      <div className="flex grow overflow-hidden bg-white dark:bg-[#1c1c1c]">
        {/* Sidebar */}
        <div className="w-52 border-r border-gray-200 dark:border-gray-800 p-2 space-y-0.5 text-xs shrink-0 overflow-y-auto hidden lg:block">
          {sidebar.map((item, i) => {
            if (item.type === 'header') {
              return <div key={`h-${i}`} className="px-3 py-2 font-bold opacity-50 uppercase tracking-tighter text-[10px]">{item.label}</div>
            }
            const isRecycleEntry = item.id === 'recycle'
            const active = !item.favourite && currentPath === item.path
            return (
              <button
                key={item.id ?? item.label} type="button"
                data-sidebar-item={item.label}
                onClick={() => openSidebarItem(item)}
                {...recycleDropProps(isRecycleEntry)}
                className={`w-full text-left py-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center group transition-colors ${active ? 'bg-blue-100/50 dark:bg-blue-900/20 text-win-blue font-semibold' : ''} ${item.indent ? 'pl-8' : 'px-3'}`}
              >
                <span className="mr-3 text-base group-hover:scale-110 transition-transform flex items-center justify-center w-5 h-5 shrink-0">
                  <img src={entryIcon({ name: item.label, type: 'folder', icon: item.icon }, IMG)} alt="" className="w-full h-full object-contain" />
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* File pane */}
        <div
          ref={fileGridRef}
          className="grow overflow-y-auto bg-white dark:bg-[#1c1c1c]"
          data-explorer-pane=""
          onContextMenu={(e) => {
            if ((e.target as Element).closest('[data-explorer-file], input')) return
            e.preventDefault()
            e.stopPropagation()
            showPaneContextMenu(e.clientX, e.clientY)
          }}
          onClick={(e) => {
            // Click on empty space deselects.
            if (e.target === e.currentTarget) setSelected(null)
          }}
        >
          {/* Mobile pills */}
          <div className="m-4 mb-2 flex overflow-x-auto pb-2 space-x-2 lg:hidden">
            {sidebar
              .filter((i) => i.type !== 'header')
              .map((i) => (
                <button key={i.id ?? i.label} type="button" onClick={() => openSidebarItem(i)}
                  data-place-pill={i.label}
                  data-touch-drop={i.id === 'recycle' ? '' : undefined}
                  {...recycleDropProps(i.id === 'recycle')}
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
              renamingName={renamingName}
              cutName={cutName}
              onSelect={(name) => setSelected(name)}
              onOpen={openItem}
              onContextMenu={(file, x, y) => showFileContextMenu(file, x, y)}
              onDragStart={onDragStart}
              onRestore={(file) => fileMenuHandlers(fileOs(), file, pathOf(file)).restore()}
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
              renamingName={renamingName}
              cutName={cutName}
              onSelect={(name) => setSelected(name)}
              onOpen={openItem}
              onContextMenu={(file, x, y) => showFileContextMenu(file, x, y)}
            />
          )}
        </div>

        {/* Details pane */}
        {detailsOpen && (
          <DetailsPanel
            file={selectedFile}
            rows={selectedFile ? entryProperties(fileSystem, selectedFile, pathOf(selectedFile)) : []}
            onClose={() => setDetailsOpen(false)}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="h-6 border-t border-gray-200 dark:border-gray-800 bg-win-bg dark:bg-[#2b2b2b] flex items-center px-4 justify-between text-[10px] opacity-60 shrink-0">
        <div>{sortedFiles.length} items</div>
        <div className="flex items-center space-x-4">
          {focusedAppId !== null && isExplorerFocused && (
            <div className="hidden md:flex items-center space-x-3 opacity-80">
              <span>Sort: {sortKey} {sortDir === 'asc' ? '↑' : '↓'}</span>
            </div>
          )}
          {selectedFile && (
            <div className="flex items-center space-x-1">
              <img src={entryIcon(selectedFile, IMG)} alt="" className="w-3.5 h-3.5 object-contain" />
              <span>1 item selected · {formatSize(entrySize(selectedFile))}</span>
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

interface FileViewProps {
  files: FsEntry[]
  selected: string | null
  isRecycle: boolean
  renamingName: string | null
  cutName: string | null
  onSelect: (name: string) => void
  onOpen: (file: FsEntry) => void
  onContextMenu: (file: FsEntry, x: number, y: number) => void
}

interface GridViewProps extends FileViewProps {
  onDragStart: (file: FsEntry) => (e: React.DragEvent) => void
  onRestore: (file: FsEntry) => void
}

function GridView({
  files, selected, isRecycle, renamingName, cutName,
  onSelect, onOpen, onContextMenu, onDragStart, onRestore,
}: GridViewProps) {
  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(100px,1fr))] p-4">
      {files.map((file) => {
        const isSelected = selected === file.name
        const isRenaming = renamingName === file.name
        return (
          <div
            key={file.location ? file.location + file.name : file.name}
            onClick={() => onSelect(file.name)}
            onDoubleClick={() => onOpen(file)}
            data-explorer-file={file.name}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(file, e.clientX, e.clientY) }}
            draggable={!isRenaming}
            onDragStart={onDragStart(file)}
            title={file.name}
            className={`flex flex-col items-center p-2 rounded-sm border border-transparent hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer group transition-all w-[100px] ${isSelected ? 'bg-blue-100/50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 shadow-xs' : ''} ${cutName === file.name ? 'file-cut' : ''}`}
          >
            <div className="w-12 h-12 mb-2 flex items-center justify-center relative overflow-hidden rounded-sm shadow-xs group-hover:scale-105 transition-transform shrink-0">
              {file.type === 'image' ? (
                <img src={file.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <img src={entryIcon(file, IMG)} alt="" className="w-10 h-10 object-contain" />
              )}
            </div>
            {isRenaming ? (
              <RenameInput
                name={file.name}
                className="text-[11px] text-center w-full px-1 font-medium leading-tight bg-white dark:bg-[#1c1c1c] border border-win-blue rounded-sm outline-hidden"
              />
            ) : (
              <div className="text-[11px] text-center w-full px-0.5 font-medium leading-tight overflow-hidden">{file.name}</div>
            )}
            {file.location && <div className="text-[9px] text-gray-400 truncate w-full px-0.5 mt-0.5">{file.location}</div>}
            {isRecycle && !isRenaming && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onRestore(file) }} className="mt-2 px-3 py-1 bg-win-blue text-white text-[10px] font-semibold rounded-sm shadow-sm hover:bg-blue-600 transition-colors" title={`Restore ${file.name}`}>
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

interface DetailsViewProps extends FileViewProps {
  sortKey: SortKey
  sortDir: SortDir
  toggleSort: (k: SortKey) => void
}

function DetailsView({
  files, selected, isRecycle, sortKey, sortDir, toggleSort, renamingName, cutName,
  onSelect, onOpen, onContextMenu,
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
          const isRenaming = renamingName === file.name
          return (
            <tr
              key={file.location ? file.location + file.name : file.name}
              onClick={() => onSelect(file.name)}
              onDoubleClick={() => onOpen(file)}
              data-explorer-file={file.name}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(file, e.clientX, e.clientY) }}
              className={`cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 ${isSelected ? 'bg-blue-100/50 dark:bg-blue-900/30' : ''} ${cutName === file.name ? 'file-cut' : ''}`}
            >
              <td className="pl-4 py-1.5 flex items-center space-x-2">
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  {file.type === 'image' ? (
                    <img src={file.url} alt="" className="w-5 h-5 object-cover rounded-sm" />
                  ) : (
                    <img src={entryIcon(file, IMG)} alt="" className="w-5 h-5 object-contain" />
                  )}
                </span>
                {isRenaming ? (
                  <RenameInput
                    name={file.name}
                    className="text-[12px] px-1 bg-white dark:bg-[#1c1c1c] border border-win-blue rounded-sm outline-hidden w-full"
                  />
                ) : (
                  <span className="truncate">{file.name}</span>
                )}
                {isRecycle && !isRenaming && (
                  <span className="ml-2 text-[10px] opacity-60">(deleted)</span>
                )}
              </td>
              <td className="py-1.5 opacity-70">{formatDate(entryDate(file))}</td>
              <td className="py-1.5 opacity-70">{entryType(file)}</td>
              <td className="py-1.5 opacity-70 text-right pr-4">{formatSize(entrySize(file))}</td>
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
  rows: [string, string][]
  onClose: () => void
}

function DetailsPanel({ file, rows, onClose }: DetailsPanelProps) {
  return (
    <aside className="w-72 border-l border-gray-200 dark:border-gray-800 bg-[#fafafa] dark:bg-[#252526] shrink-0 flex-col hidden xl:flex" data-details-pane="">
      <div className="h-9 px-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <span className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">Details</span>
        <button type="button" onClick={onClose} className="opacity-50 hover:opacity-100 text-sm" aria-label="Close details">×</button>
      </div>
      {!file ? (
        <div className="grow flex items-center justify-center text-xs opacity-50 px-4 text-center">
          Select a file to see its properties.
        </div>
      ) : (
        <div className="grow overflow-y-auto p-4 space-y-4">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 flex items-center justify-center rounded-sm shadow-xs">
              {file.type === 'image' ? (
                <img src={file.url} alt="" className="w-full h-full object-cover rounded-sm" />
              ) : (
                <img src={entryIcon(file, IMG)} alt="" className="w-16 h-16 object-contain" />
              )}
            </div>
            <div className="mt-3 text-center font-semibold text-sm break-all">{file.name}</div>
          </div>
          <dl className="text-[11px] space-y-1">
            {rows.map(([label, value]) => <Row key={label} label={label} value={value} />)}
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
      <dd className="wrap-break-word">{value}</dd>
    </div>
  )
}
