import { useEffect, useRef, useState } from 'react'
import { useOsStore } from '../../store/osStore'
import { runCommand } from './commands'

interface Entry {
  id: number
  cmd: string
  path: string
  res: string
}

const CWD = 'C:\\Users\\DeVante'

export default function Terminal() {
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<Entry[]>([
    {
      id: 0,
      cmd: '',
      path: '',
      res:
        'Microsoft Windows [Version 10.0.22631.3007]\n' +
        '(c) Microsoft Corporation. All rights reserved.\n\n' +
        'Type "help" for available commands.',
    },
  ])
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(1)

  const focusedId = useOsStore((s) => s.focusedWindowId)
  const focusedApp = useOsStore((s) =>
    s.windows.find((w) => w.id === s.focusedWindowId)?.app,
  )
  const isFocused = focusedApp === 'terminal'

  const closeWindow = useOsStore((s) => s.closeWindow)

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
      setEntries((e) => [...e, { id: idRef.current++, cmd: raw, path: CWD, res: '' }])
      return
    }

    setHistory((h) => [...h.slice(-49), trimmed])

    const result = runCommand(trimmed, { cwd: CWD, store: useOsStore.getState() })

    if (result.clear) {
      setEntries([])
      return
    }
    if (result.exit) {
      if (focusedId) closeWindow(focusedId)
      return
    }
    setEntries((e) => [
      ...e,
      { id: idRef.current++, cmd: raw, path: CWD, res: result.res ?? '' },
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
    <div
      className="h-full flex flex-col bg-[#0c0c0c] text-[#cccccc] font-mono text-xs cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={outputRef} className="flex-grow overflow-y-auto p-3 whitespace-pre-wrap leading-relaxed">
        {entries.map((e) => (
          <div key={e.id}>
            {e.cmd !== '' && (
              <div>
                <span className="text-[#cccccc]">{e.path}&gt; </span>
                <span>{e.cmd}</span>
              </div>
            )}
            {e.res && <div className="text-[#cccccc] whitespace-pre-wrap">{e.res}</div>}
          </div>
        ))}
        <div className="flex">
          <span className="text-[#cccccc]">{CWD}&gt;&nbsp;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="flex-grow bg-transparent outline-none caret-[#cccccc]"
            aria-label="Terminal input"
          />
        </div>
      </div>
    </div>
  )
}
