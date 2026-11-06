import { useEffect, useMemo, useRef, useState } from 'react'
import { copyText, folderPath, writeTextFile } from '../../../../assets/js/windowing/file-ops.js'
import {
  NOTEPAD_MENUS,
  NOTEPAD_OPTIONS_KEY,
  findNext,
  lineColumn,
  notepadCommands,
  notepadShortcut,
  pushUndo,
  readNotepadOptions,
  replaceAll,
  replaceNext,
  selectedText,
  textParts,
  type EditorState,
  type NotepadEditor,
  type NotepadMenuItem,
} from '../../../../assets/js/windowing/text-ops.js'
import type { FsEntry } from '../../data/filesystem'
import { useOsStore } from '../../store/osStore'
import { useCurrentWindow, useWindowExtras } from '../../windowing/WindowContext'

const DOCUMENTS = 'C:\\Users\\DeVante\\Documents'
const TEXT_ICON = '/assets/img/notepad++.webp'
const NO_SELECTION = { start: 0, end: 0 }

type DialogKind = 'open' | 'save'

function savedOptions() {
  try {
    return readNotepadOptions(localStorage.getItem(NOTEPAD_OPTIONS_KEY))
  } catch {
    return readNotepadOptions(null)
  }
}

// The same markup as partials/apps/notepad.php: click the text to edit it, and
// the File menu reads and writes the file system through a Windows-style dialog.
export default function Notepad() {
  const win = useCurrentWindow()
  const extras = useWindowExtras<{ content?: string; filePath?: string }>()
  const closeWindow = useOsStore((s) => s.closeWindow)
  const setWindowTitle = useOsStore((s) => s.setWindowTitle)
  const changeFiles = useOsStore((s) => s.changeFiles)
  const fileSystem = useOsStore((s) => s.fileSystem)
  const showToast = useOsStore((s) => s.showToast)
  const focusedId = useOsStore((s) => s.focusedWindowId)

  const [content, setContent] = useState(extras.content ?? '')
  const [options, setOptions] = useState(savedOptions)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [selection, setSelection] = useState(NO_SELECTION)
  const [findMode, setFindMode] = useState<'find' | 'replace' | null>(null)
  const [findQuery, setFindQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [findMessage, setFindMessage] = useState('')
  const textBox = useRef<HTMLTextAreaElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const [currentFile, setCurrentFile] = useState(
    extras.filePath ? { name: win.title, path: extras.filePath } : null,
  )
  const [isEditing, setIsEditing] = useState(false)
  const [showFileMenu, setShowFileMenu] = useState(false)
  const [dialog, setDialog] = useState<DialogKind | null>(null)
  const [dialogPath, setDialogPath] = useState(DOCUMENTS)
  const [fileName, setFileName] = useState('document.txt')
  const [selected, setSelected] = useState<FsEntry | null>(null)
  const [typeFilter, setTypeFilter] = useState('txt')

  const hasSelection = selection.start !== selection.end
  const caret = lineColumn(content, selection.end)
  const parts = useMemo(
    () => textParts(content, findMode && selection.start !== selection.end ? selection : null),
    [content, findMode, selection],
  )
  const textClass = `${options.monospace ? 'font-mono' : 'font-sans'} ${
    options.wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-auto'
  }`
  const textStyle = { fontSize: `${(14 * options.zoom) / 100}px` }

  const currentSelection = () => {
    const box = textBox.current
    return box ? { start: box.selectionStart, end: box.selectionEnd } : selection
  }
  const trackSelection = () => setSelection(currentSelection())

  // Puts the caret back once the text box is on screen.
  const pendingCaret = useRef<typeof selection | null>(null)
  useEffect(() => {
    const box = textBox.current
    if (!box || !pendingCaret.current) return
    box.focus()
    box.setSelectionRange(pendingCaret.current.start, pendingCaret.current.end)
    pendingCaret.current = null
  })

  const startEditing = (at = selection) => {
    pendingCaret.current = at
    setSelection(at)
    setIsEditing(true)
  }

  const remember = () => setUndoStack((stack) => pushUndo(stack, content))

  // The shared commands in text-ops.js work through this.
  const editor: NotepadEditor = {
    read: () => ({ text: content, ...currentSelection() }),
    write: (state: EditorState, keep = true) => {
      if (keep && state.text !== content) remember()
      setContent(state.text)
      startEditing({ start: state.start, end: state.end })
    },
    popUndo: () => {
      const text = undoStack.at(-1) ?? null
      setUndoStack(undoStack.slice(0, -1))
      return text
    },
    copy: (text) => copyText(text),
    paste: () => navigator.clipboard.readText().catch(() => null),
    openFind: (mode) => openFind(mode),
    findNext: () => findAgain(),
    option: (name) => options[name],
    setOption: (name, value) => {
      const next = { ...options, [name]: value }
      setOptions(next)
      try {
        localStorage.setItem(NOTEPAD_OPTIONS_KEY, JSON.stringify(next))
      } catch {
        // Storage is blocked, so this choice lasts until the window closes.
      }
    },
    now: () => new Date(),
    toast: showToast,
  }

  const run = (id: string) => {
    setOpenMenu(null)
    notepadCommands(editor)[id]()
  }

  const isDisabled = ({ id }: NotepadMenuItem) => {
    if (id === 'undo') return undoStack.length === 0
    if (id === 'cut' || id === 'copy' || id === 'delete') return !hasSelection
    if (id === 'findNext') return !findQuery
    return false
  }

  const openFind = (mode: 'find' | 'replace') => {
    const selected = selectedText(editor.read())
    if (selected) setFindQuery(selected)
    setFindMode(mode)
    setFindMessage('')
    window.setTimeout(() => root.current?.querySelector<HTMLInputElement>('[data-find-input]')?.focus())
  }

  const closeFind = () => {
    setFindMode(null)
    setFindMessage('')
  }

  const showMatch = (state: { start: number; end: number }) => {
    setSelection({ start: state.start, end: state.end })
    setIsEditing(false)
    window.setTimeout(() => root.current?.querySelector('[data-notepad-mark]')?.scrollIntoView({ block: 'nearest' }))
  }

  const findAgain = () => {
    if (!findQuery) {
      openFind('find')
      return
    }
    const found = findNext(content, findQuery, selection.end, { matchCase })
    setFindMessage(found ? '' : `Cannot find "${findQuery}"`)
    if (found) showMatch(found)
  }

  const replaceOne = () => {
    const next = replaceNext({ text: content, ...selection }, findQuery, replaceQuery, { matchCase })
    if (next.text !== content) remember()
    setContent(next.text)
    showMatch(next)
  }

  const replaceEverything = () => {
    const { text, count } = replaceAll(content, findQuery, replaceQuery, { matchCase })
    if (count) remember()
    setContent(text)
    setSelection(NO_SELECTION)
    setFindMessage(`${count} replaced`)
  }

  const dialogFiles = useMemo(() => {
    const files = fileSystem[dialogPath] ?? []
    return typeFilter === 'txt' ? files.filter((f) => f.type === 'folder' || f.name.endsWith('.txt')) : files
  }, [fileSystem, dialogPath, typeFilter])

  const openDialog = (kind: DialogKind) => {
    setDialog(kind)
    setShowFileMenu(false)
    setSelected(null)
    setTypeFilter('txt')
    setDialogPath(currentFile?.path ?? DOCUMENTS)
    if (currentFile) setFileName(currentFile.name)
  }

  const saveTo = (path: string, name: string) => {
    const full = name.endsWith('.txt') ? name : `${name}.txt`
    changeFiles((fs) => writeTextFile(fs, path, full, content, TEXT_ICON))
    setCurrentFile({ name: full, path })
    setWindowTitle(win.id, full)
    setDialog(null)
    setShowFileMenu(false)
  }

  const save = () => {
    if (currentFile) saveTo(currentFile.path, currentFile.name)
    else openDialog('save')
  }

  const pick = (file: FsEntry) => {
    if (file.type === 'folder') {
      setDialogPath(folderPath(file, dialogPath))
      setSelected(null)
    } else {
      setSelected(file)
      setFileName(file.name)
    }
  }

  const confirm = () => {
    if (dialog === 'save') {
      saveTo(dialogPath, fileName)
    } else if (selected) {
      setContent('content' in selected ? (selected.content ?? '') : '')
      setUndoStack([])
      setSelection(NO_SELECTION)
      setCurrentFile({ name: selected.name, path: dialogPath })
      setWindowTitle(win.id, selected.name)
      setDialog(null)
    }
  }

  useEffect(() => {
    if (focusedId !== win.id) return
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const command = e.ctrlKey || e.metaKey
      if (command && key === 's') {
        e.preventDefault()
        save()
      } else if (command && key === 'o') {
        e.preventDefault()
        openDialog('open')
      } else {
        const id = notepadShortcut(e)
        const inFind = (e.target as Element).closest?.('[data-notepad-find]')
        if (!id || (inFind && id !== 'findNext')) return
        e.preventDefault()
        run(id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const menuRow = 'w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white flex justify-between'

  return (
    <div ref={root} className="relative h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none">
      <div className="h-8 flex items-center px-2 space-x-1 text-[11px] border-b border-black/5 dark:border-white/5 shrink-0 relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowFileMenu((open) => !open)
              setOpenMenu(null)
            }}
            className={`hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1 rounded-sm cursor-pointer transition-colors ${
              showFileMenu ? 'bg-black/5 dark:bg-white/5' : ''
            }`}
          >
            File
          </button>
          {showFileMenu && (
            <div className="absolute top-full left-0 w-48 bg-white dark:bg-[#2b2b2b] border border-black/10 dark:border-white/10 shadow-xl py-1 z-50 rounded-xs">
              <button
                type="button"
                className={menuRow}
                onClick={() => {
                  setContent('')
                  setCurrentFile(null)
                  setUndoStack([])
                  setSelection(NO_SELECTION)
                  setShowFileMenu(false)
                }}
              >
                <span>New</span>
              </button>
              <button type="button" className={menuRow} onClick={() => openDialog('open')}>
                <span>Open...</span>
                <span className="opacity-50 text-[9px]">Ctrl+O</span>
              </button>
              <button type="button" className={menuRow} onClick={save}>
                <span>Save</span>
                <span className="opacity-50 text-[9px]">Ctrl+S</span>
              </button>
              <button type="button" className={menuRow} onClick={() => openDialog('save')}>
                <span>Save As...</span>
              </button>
              <div className="my-1 border-t border-black/5 dark:border-white/5" />
              <button type="button" className={menuRow} onClick={() => closeWindow(win.id)}>
                Exit
              </button>
            </div>
          )}
        </div>
        {NOTEPAD_MENUS.map((menu) => (
          <div key={menu.id} className="relative">
            <button
              type="button"
              data-notepad-menu={menu.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpenMenu(openMenu === menu.id ? null : menu.id)
                setShowFileMenu(false)
              }}
              className={`hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1 rounded-sm cursor-pointer transition-colors ${
                openMenu === menu.id ? 'bg-black/5 dark:bg-white/5' : ''
              }`}
            >
              {menu.label}
            </button>
            {openMenu === menu.id && (
              <div className="absolute top-full left-0 w-56 bg-white dark:bg-[#2b2b2b] border border-black/10 dark:border-white/10 shadow-xl py-1 z-50 rounded-xs">
                {menu.items.map((item, index) =>
                  item.separator ? (
                    <div key={index} className="my-1 border-t border-black/5 dark:border-white/5" />
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      data-notepad-item={item.label}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => run(item.id as string)}
                      disabled={isDisabled(item)}
                      className="w-full text-left px-3 py-1.5 hover:bg-win-blue hover:text-white disabled:opacity-40 disabled:pointer-events-none flex justify-between"
                    >
                      <span className="flex">
                        <span className="w-4 shrink-0">{item.option && options[item.option] ? '✓' : ''}</span>
                        <span>{item.label}</span>
                      </span>
                      <span className="opacity-50 text-[9px]">{item.shortcut}</span>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {findMode && (
        <div data-notepad-find="" className="flex flex-wrap items-center gap-2 px-2 py-1.5 border-b border-black/5 dark:border-white/5 text-[11px] shrink-0">
          <input
            type="text"
            aria-label="Find"
            placeholder="Find"
            data-find-input=""
            value={findQuery}
            onChange={(e) => {
              setFindQuery(e.target.value)
              setSelection(NO_SELECTION)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                findAgain()
              }
              if (e.key === 'Escape') closeFind()
            }}
            className="w-36 bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 px-2 py-1 rounded-sm outline-hidden"
          />
          {findMode === 'replace' && (
            <input
              type="text"
              aria-label="Replace with"
              placeholder="Replace with"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  replaceOne()
                }
                if (e.key === 'Escape') closeFind()
              }}
              className="w-36 bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 px-2 py-1 rounded-sm outline-hidden"
            />
          )}
          <button type="button" onClick={findAgain} className="px-2 py-1 rounded-sm bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">
            Find Next
          </button>
          {findMode === 'replace' && (
            <div className="flex gap-2">
              <button type="button" onClick={replaceOne} className="px-2 py-1 rounded-sm bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">
                Replace
              </button>
              <button type="button" onClick={replaceEverything} className="px-2 py-1 rounded-sm bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">
                Replace All
              </button>
            </div>
          )}
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} /> Match case
          </label>
          <span role="status" className="opacity-70">{findMessage}</span>
          <button type="button" onClick={closeFind} aria-label="Close find" className="ml-auto px-2 py-1 rounded-sm hover:bg-black/5 dark:hover:bg-white/10">
            ×
          </button>
        </div>
      )}

      {dialog && (
        <div className="absolute inset-0 z-100 flex items-center justify-center p-8 bg-black/20 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-[#1c1c1c] border border-black/20 dark:border-white/10 shadow-2xl rounded-lg w-full max-w-2xl flex flex-col overflow-hidden win-shadow">
            <div className="h-9 flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5 shrink-0 bg-black/5">
              <span className="text-xs font-semibold">{dialog === 'open' ? 'Open' : 'Save As'}</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDialog(null)}
                className="p-1 hover:bg-red-500 hover:text-white rounded-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grow flex flex-col p-4 space-y-4">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  aria-label="This PC"
                  onClick={() => setDialogPath('C:\\')}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-sm"
                >
                  🏠
                </button>
                <div className="grow bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-1 text-[11px] rounded-sm flex items-center">
                  <span className="opacity-60">{dialogPath}</span>
                </div>
              </div>
              <div className="grow border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 rounded-md overflow-y-auto custom-scrollbar min-h-[200px]">
                <div className="p-1">
                  {dialogFiles.map((file) => {
                    const isSelected = selected?.name === file.name
                    return (
                      <div
                        key={file.name}
                        role="button"
                        tabIndex={0}
                        data-dialog-file={file.name}
                        onClick={() => pick(file)}
                        onDoubleClick={() => {
                          if (file.type !== 'folder') confirm()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') pick(file)
                        }}
                        className={`flex items-center px-3 py-2 rounded-sm cursor-pointer group transition-colors ${
                          isSelected ? 'bg-win-blue text-white' : 'hover:bg-win-blue hover:text-white'
                        }`}
                      >
                        <div className="w-6 h-6 flex items-center justify-center mr-3 shrink-0">
                          {file.icon?.includes('.') ? (
                            <img src={file.icon} alt="" className="w-4 h-4 object-contain" />
                          ) : (
                            <span className="text-sm">{file.type === 'folder' ? '📁' : '📄'}</span>
                          )}
                        </div>
                        <span className="text-[11px] truncate grow">{file.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center space-x-4 shrink-0">
                <div className="grow space-y-2">
                  <div className="flex items-center space-x-2">
                    <label htmlFor={`notepad-name-${win.id}`} className="text-[10px] opacity-60 w-16">
                      File name:
                    </label>
                    <input
                      id={`notepad-name-${win.id}`}
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="grow bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 px-3 py-1 text-[11px] rounded-sm outline-hidden"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label htmlFor={`notepad-type-${win.id}`} className="text-[10px] opacity-60 w-16">
                      Save as type:
                    </label>
                    <select
                      id={`notepad-type-${win.id}`}
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="grow bg-white dark:bg-[#2b2b2b] border border-black/10 dark:border-white/10 px-2 py-1 text-[11px] rounded-sm outline-hidden"
                    >
                      <option value="txt">Text Documents (*.txt)</option>
                      <option value="all">All Files (*.*)</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col space-y-2 pt-2">
                  <button
                    type="button"
                    data-dialog-confirm=""
                    onClick={confirm}
                    disabled={dialog === 'open' && !selected}
                    className="px-8 py-1.5 bg-win-blue text-white text-xs rounded-sm hover:brightness-110 transition-all shadow-md disabled:opacity-50 disabled:grayscale"
                  >
                    {dialog === 'open' ? 'Open' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog(null)}
                    className="px-8 py-1.5 bg-black/5 dark:bg-white/10 text-xs rounded-sm hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grow p-4 relative overflow-auto">
        {isEditing ? (
          <textarea
            ref={textBox}
            value={content}
            spellCheck={false}
            aria-label="Text"
            data-notepad-text=""
            onChange={(e) => {
              remember()
              setContent(e.target.value)
              trackSelection()
            }}
            onSelect={trackSelection}
            onKeyUp={trackSelection}
            onClick={trackSelection}
            onBlur={() => {
              trackSelection()
              setIsEditing(false)
            }}
            wrap={options.wordWrap ? 'soft' : 'off'}
            style={textStyle}
            className={`w-full h-full bg-transparent outline-hidden resize-none leading-relaxed ${options.monospace ? 'font-mono' : 'font-sans'}`}
          />
        ) : (
          <div
            data-notepad-view=""
            onClick={(e) => {
              if (!(e.target as Element).closest('a')) startEditing()
            }}
            style={textStyle}
            className={`w-full h-full leading-relaxed cursor-text min-h-[200px] ${textClass}`}
          >
            {!content && <span className="opacity-20">Click to start typing...</span>}
            {parts.map((part, index) => (
              <span key={index} data-notepad-mark={part.marked ? '' : undefined} className={part.marked ? 'bg-yellow-300 text-black' : undefined}>
                {part.link ? (
                  <a href={part.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                    {part.text}
                  </a>
                ) : (
                  part.text
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {options.statusBar && (
        <div data-notepad-status="" className="h-6 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-end px-4 text-[10px] space-x-6 shrink-0 opacity-60">
          <span>Ln {caret.line}, Col {caret.column}</span>
          <span>{options.zoom}%</span>
          <span>Windows (CRLF)</span>
          <span>UTF-8</span>
        </div>
      )}
    </div>
  )
}
