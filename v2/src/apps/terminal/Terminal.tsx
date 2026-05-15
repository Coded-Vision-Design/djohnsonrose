import { useEffect, useRef, useState } from 'react'
import { useOsStore } from '../../store/osStore'
import { runCommand } from './commands'
import { track } from '../../lib/telemetry'

// 1:1 port of partials/apps/terminal.php — PowerShell-styled header,
// green prompt + cmd, blue-tinted output, click-anywhere-to-focus input.

interface Entry {
  id: number
  cmd: string
  path: string
  res: string
}

const INITIAL_CWD = 'C:\\Users\\DeVante'

export default function Terminal() {
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [cwd, setCwd] = useState(INITIAL_CWD)

  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(1)

  const focusedApp = useOsStore((s) =>
    s.windows.find((w) => w.id === s.focusedWindowId)?.app,
  )
  const focusedId = useOsStore((s) => s.focusedWindowId)
  const closeWindow = useOsStore((s) => s.closeWindow)
  const isFocused = focusedApp === 'terminal'

  useEffect(() => {
    if (isFocused) inputRef.current?.focus()
  }, [isFocused])

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight })
  }, [entries])

  const execute = () => {
    const raw = input
    const trimmed = input.trim()
    setInput('')
    setHistoryIdx(-1)

    if (!trimmed) {
      setEntries((e) => [...e, { id: idRef.current++, cmd: raw, path: cwd, res: '' }])
      return
    }
    setHistory((h) => [...h.slice(-49), trimmed])
    // Parity with v1's Terminal.executeCommand → sendTelemetry('Terminal
    // Command', …). Lets admin emails show what visitors are typing.
    track('Terminal Command', { command: trimmed, path: cwd })
    const result = runCommand(trimmed, { cwd, store: useOsStore.getState() })
    if (result.clear) {
      setEntries([])
      return
    }
    if (result.exit) {
      if (focusedId) closeWindow(focusedId)
      return
    }
    if (result.cwd) setCwd(result.cwd)
    setEntries((e) => [
      ...e,
      { id: idRef.current++, cmd: raw, path: cwd, res: result.res ?? '' },
    ])
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      execute()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const next = Math.min(historyIdx + 1, history.length - 1)
        setHistoryIdx(next)
        setInput(history[history.length - 1 - next])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx > 0) {
        const next = historyIdx - 1
        setHistoryIdx(next)
        setInput(history[history.length - 1 - next])
      } else {
        setHistoryIdx(-1)
        setInput('')
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#0c0c0c] text-[#cccccc] font-mono text-xs overflow-hidden">
      {/* Header — Windows Terminal style */}
      <div className="h-9 bg-[#2b2b2b] flex items-center px-3 space-x-4 border-b border-white/5">
        <div className="flex items-center space-x-2 border-b-2 border-win-blue h-full px-2">
          <span className="text-lg">🪟</span>
          <span className="text-[11px] font-medium">PowerShell</span>
          <button
            type="button"
            onClick={() => focusedId && closeWindow(focusedId)}
            className="hover:bg-white/10 rounded p-0.5"
            aria-label="Close tab"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          className="hover:bg-white/10 rounded p-1 text-gray-400"
          aria-label="New tab"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-grow overflow-y-auto p-4 cursor-text"
      >
        <div className="mb-4 text-gray-400">
          Windows PowerShell
          <br />
          Copyright (C) Microsoft Corporation. All rights reserved.
          <br />
          <br />
          Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows
        </div>

        {entries.map((e) => (
          <div key={e.id} className="mb-3">
            <div className="flex items-center">
              <span className="text-green-400 mr-2">PS {e.path}&gt;</span>
              <span>{e.cmd}</span>
            </div>
            {e.res && (
              <div className="mt-1 whitespace-pre-wrap text-blue-100/80 leading-relaxed">
                {e.res}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center group">
          <span className="text-green-400 mr-2 shrink-0">PS {cwd}&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="bg-transparent border-none outline-none flex-grow text-[#cccccc] font-mono"
            aria-label="Terminal input"
          />
        </div>
      </div>
    </div>
  )
}
