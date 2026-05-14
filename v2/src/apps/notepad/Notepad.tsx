import { useMemo, useRef, useState } from 'react'
import { useOsStore } from '../../store/osStore'
import { useWindowExtras } from '../../windowing/WindowContext'

// Notepad: a focused textarea + menu bar + status line. When opened from
// Explorer via a text file the file's `content` is passed through window
// extras so we seed the editor with it.
export default function Notepad() {
  const extras = useWindowExtras<{ content?: string }>()
  const [content, setContent] = useState(extras.content ?? '')
  const [showFileMenu, setShowFileMenu] = useState(false)
  const closeWindow = useOsStore((s) => s.closeWindow)
  const focusedId = useOsStore((s) => s.focusedWindowId)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { line, column } = useMemo(() => {
    if (!textareaRef.current) return { line: 1, column: 1 }
    const sel = textareaRef.current.selectionStart
    const before = content.slice(0, sel)
    const lines = before.split('\n')
    return { line: lines.length, column: lines[lines.length - 1].length + 1 }
  }, [content])

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white">
      {/* Menu */}
      <div className="h-8 flex items-center px-2 space-x-1 text-[11px] border-b border-black/5 dark:border-white/5 shrink-0 relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFileMenu((v) => !v)}
            onBlur={() => window.setTimeout(() => setShowFileMenu(false), 100)}
            className={`hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1 rounded transition-colors ${
              showFileMenu ? 'bg-black/5 dark:bg-white/5' : ''
            }`}
          >
            File
          </button>
          {showFileMenu && (
            <div className="absolute top-full left-0 w-48 bg-white dark:bg-[#2b2b2b] border border-black/10 dark:border-white/10 shadow-xl py-1 z-50 rounded-sm">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setContent('')
                  setShowFileMenu(false)
                }}
                className="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white flex justify-between"
              >
                <span>New</span>
                <span className="opacity-50 text-[9px]">Ctrl+N</span>
              </button>
              <button
                type="button"
                disabled
                className="w-full text-left px-4 py-1.5 opacity-50 cursor-not-allowed flex justify-between"
                title="Available once the file explorer lands"
              >
                <span>Open...</span>
                <span className="opacity-50 text-[9px]">Ctrl+O</span>
              </button>
              <button
                type="button"
                disabled
                className="w-full text-left px-4 py-1.5 opacity-50 cursor-not-allowed flex justify-between"
              >
                <span>Save As...</span>
                <span className="opacity-50 text-[9px]">Ctrl+S</span>
              </button>
              <div className="my-1 border-t border-black/5 dark:border-white/5" />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => focusedId && closeWindow(focusedId)}
                className="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white"
              >
                Exit
              </button>
            </div>
          )}
        </div>
        {['Edit', 'Format', 'View'].map((m) => (
          <span
            key={m}
            className="px-3 py-1 rounded opacity-50 cursor-default"
            title="Phase 2 stub"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        placeholder="Type to start..."
        className="flex-grow p-4 bg-transparent outline-none resize-none font-mono text-sm leading-relaxed"
      />

      {/* Status bar */}
      <div className="h-6 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-between px-4 text-[10px] shrink-0 opacity-70">
        <span>
          Ln {line}, Col {column}
        </span>
        <div className="flex items-center space-x-6">
          <span>{content.length} chars</span>
          <span>Windows (CRLF)</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  )
}
