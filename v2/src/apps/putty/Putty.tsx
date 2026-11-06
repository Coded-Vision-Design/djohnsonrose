import { useEffect, useRef, useState } from 'react'
import {
  PUTTY_CATEGORIES,
  PUTTY_CONNECTION_TYPES,
  PUTTY_SESSIONS,
  puttyBanner,
  puttyPrompt,
  puttyReply,
  type PuttySession,
} from '../../../../assets/js/windowing/office.js'
import { useOsStore } from '../../store/osStore'
import { useCurrentWindow } from '../../windowing/WindowContext'

// PuTTY's configuration dialog, in the classic look the real one still has,
// and the session it opens. Its sessions and the server's replies live in
// assets/js/windowing/office.js, which v1 shares, and it is styled by
// assets/css/office.css.

export default function Putty() {
  const win = useCurrentWindow()
  const [host, setHost] = useState('')
  const [port, setPort] = useState(22)
  const [connection, setConnection] = useState('SSH')
  const [selected, setSelected] = useState('Default Settings')
  const [session, setSession] = useState<{ host: string; port: number } | null>(null)
  const [lines, setLines] = useState<string[]>([])
  const [command, setCommand] = useState('')
  const commandRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session) return
    commandRef.current?.focus()
    const terminal = terminalRef.current
    if (terminal) terminal.scrollTop = terminal.scrollHeight
  }, [session, lines])

  const pick = (saved: PuttySession | undefined) => {
    if (!saved) return
    setSelected(saved.name)
    setHost(saved.host)
  }

  const open = () => {
    const target = host.trim()
    if (!target) return
    setSession({ host: target, port })
    setLines(puttyBanner({ host: target, port }))
    setCommand('')
  }

  const submit = () => {
    if (!session) return
    const reply = puttyReply(command, { host: session.host })
    const echoed = [...lines, `${puttyPrompt(session.host)} ${command}`]
    setLines(reply.clear ? [] : [...echoed, ...reply.lines])
    setCommand('')
    if (reply.exit) setSession(null)
  }

  return (
    <div className="putty-app" data-office-app="putty">
      <div className="putty-titlebar" data-putty-titlebar="">
        <img src="/assets/img/putty.webp" alt="" />
        <span>{session ? `${session.host} - PuTTY` : 'PuTTY Configuration'}</span>
      </div>

      {session ? (
        <div className="putty-terminal" data-putty-terminal="" ref={terminalRef} onClick={() => commandRef.current?.focus()}>
          <pre className="putty-output">{lines.join('\n')}</pre>
          <form
            className="putty-prompt"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <span>{puttyPrompt(session.host)}</span>
            <input
              ref={commandRef}
              aria-label="Command"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
            />
          </form>
        </div>
      ) : (
        <div className="putty-body">
          <div className="putty-tree">
            <div className="putty-tree-label" id="putty-category">
              Category:
            </div>
            <ul role="tree" aria-labelledby="putty-category">
              {PUTTY_CATEGORIES.map((group) => (
                <li key={group.name} className="putty-tree-group">
                  <div
                    role="treeitem"
                    className="putty-tree-parent"
                    data-putty-category={group.name}
                    aria-selected={group.name === 'Session'}
                  >
                    {group.name}
                  </div>
                  <ul role="group">
                    {group.children.map((child) => (
                      <li key={child} role="treeitem" className="putty-tree-child" data-putty-category={child} aria-selected="false">
                        {child}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          <div className="putty-panel" data-putty-panel="">
            <div className="putty-heading">Basic options for your PuTTY session</div>

            <div className="putty-section">
              <div className="putty-subheading">Specify the destination you want to connect to</div>
              <div className="putty-row">
                <label className="putty-host-label" htmlFor="putty-host">
                  Host Name (or IP address)
                </label>
                <input
                  id="putty-host"
                  className="putty-input putty-host"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && open()}
                />
                <label htmlFor="putty-port">Port</label>
                <input
                  id="putty-port"
                  className="putty-input putty-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(event) => setPort(Number(event.target.value))}
                />
              </div>
              <div className="putty-row" role="radiogroup" aria-label="Connection type">
                <span>Connection type:</span>
                {PUTTY_CONNECTION_TYPES.map((type) => (
                  <label key={type} className="putty-radio">
                    <input
                      type="radio"
                      name="putty-connection"
                      value={type}
                      checked={type === connection}
                      onChange={() => setConnection(type)}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="putty-section">
              <div className="putty-subheading" id="putty-saved">
                Load, save or delete a stored session
              </div>
              <div className="putty-sessions">
                <div className="putty-list" role="listbox" aria-labelledby="putty-saved">
                  {PUTTY_SESSIONS.map((saved) => (
                    <button
                      key={saved.name}
                      type="button"
                      role="option"
                      className="putty-option"
                      aria-selected={saved.name === selected}
                      onClick={() => pick(saved)}
                      onDoubleClick={() => {
                        pick(saved)
                        if (saved.host) {
                          setSession({ host: saved.host, port })
                          setLines(puttyBanner({ host: saved.host, port }))
                        }
                      }}
                    >
                      {saved.name}
                    </button>
                  ))}
                </div>
                <div className="putty-side-buttons">
                  <button type="button" className="putty-button" onClick={() => pick(PUTTY_SESSIONS.find((saved) => saved.name === selected))}>
                    Load
                  </button>
                  <button type="button" className="putty-button">
                    Save
                  </button>
                  <button type="button" className="putty-button">
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="putty-actions">
              <button type="button" className="putty-button putty-button-default" disabled={!host.trim()} onClick={open}>
                Open
              </button>
              <button type="button" className="putty-button" onClick={() => useOsStore.getState().closeWindow(win.id)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
