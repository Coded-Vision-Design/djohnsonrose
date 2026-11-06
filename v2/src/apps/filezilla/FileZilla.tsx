import { useEffect, useRef, useState } from 'react'
import devtools from '../../../../data/devtools.json'
import { quickconnectLog, transferSize, type LogLine } from '../../../../assets/js/windowing/devtools.js'

// The same FileZilla as v1's partials/apps/filezilla.php. The site details and
// both listings come from data/devtools.json, and the connection log from
// assets/js/windowing/devtools.js, both shared with v1.

const site = devtools.filezilla

interface Listed {
  name: string
  type: string
  size: number
  kind?: string
  permissions?: string
}

const INPUT = 'bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[10px] rounded-sm outline-hidden'

function fileIcon(file: Listed) {
  return file.type === 'dir' ? '/assets/img/win11/folder.webp' : '/assets/img/notepad++.webp'
}

export default function FileZilla() {
  const [host, setHost] = useState(site.host)
  const [user, setUser] = useState(site.user)
  const [pass, setPass] = useState('')
  const [port, setPort] = useState(String(site.port))
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [logs, setLogs] = useState<LogLine[]>([{ type: 'status', text: 'Status: Disconnected from server' }])
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearInterval(timer.current), [])

  const connect = () => {
    if (!host || connecting) return
    setConnecting(true)
    const steps = quickconnectLog(host, user, port, site.remotePath)
    timer.current = window.setInterval(() => {
      const next = steps.shift()
      if (next) setLogs((prev) => [...prev, next])
      if (steps.length) return
      window.clearInterval(timer.current)
      setConnecting(false)
      setConnected(true)
    }, 250)
  }

  const disconnect = () => {
    setConnected(false)
    setLogs((prev) => [...prev, { type: 'status', text: 'Status: Disconnected from server' }])
  }

  return (
    <div
      className="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden"
      data-filezilla
    >
      {/* Toolbar */}
      <div className="min-h-10 bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 flex items-center px-2 py-1 gap-2 shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-700 pr-2 shrink-0">
          <button type="button" aria-label="Site Manager" title="Site Manager" className="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5">
            <img src="/assets/img/win11/folder_open.webp" alt="" className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Settings" title="Settings" className="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5">
            <img src="/assets/img/win11/settings.webp" alt="" className="w-4 h-4" />
          </button>
        </div>
        <label className="flex flex-col shrink-0">
          <span className="text-[9px] opacity-60">Host:</span>
          <input type="text" value={host} onChange={(e) => setHost(e.target.value)} className={`${INPUT} w-32`} />
        </label>
        <label className="flex flex-col shrink-0">
          <span className="text-[9px] opacity-60">Username:</span>
          <input type="text" value={user} onChange={(e) => setUser(e.target.value)} className={`${INPUT} w-24`} />
        </label>
        <label className="flex flex-col shrink-0">
          <span className="text-[9px] opacity-60">Password:</span>
          <input type="password" value={pass} autoComplete="off" onChange={(e) => setPass(e.target.value)} className={`${INPUT} w-24`} />
        </label>
        <label className="flex flex-col shrink-0">
          <span className="text-[9px] opacity-60">Port:</span>
          <input type="text" value={port} inputMode="numeric" onChange={(e) => setPort(e.target.value)} className={`${INPUT} w-12`} />
        </label>
        <button
          type="button"
          onClick={connected ? disconnect : connect}
          disabled={connecting}
          className="mt-3 px-4 py-1 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 border border-gray-400 dark:border-gray-600 rounded-sm text-[10px] transition-all flex items-center shrink-0"
        >
          {connecting ? 'Connecting...' : connected ? 'Disconnect' : 'Quickconnect'}
        </button>
      </div>

      {/* Message log */}
      <div
        className="h-28 bg-white dark:bg-black/40 border-b border-gray-300 dark:border-gray-800 p-2 overflow-y-auto font-mono text-[10px] space-y-0.5 shrink-0"
        aria-live="polite"
      >
        {logs.map((log, index) => (
          <div
            key={index}
            className={
              log.type === 'status' && log.text.includes('successful')
                ? 'text-green-600 dark:text-green-400'
                : log.type === 'command'
                  ? 'text-blue-600 dark:text-blue-400'
                  : log.type === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : ''
            }
          >
            {log.text}
          </div>
        ))}
      </div>

      {/* Twin panes */}
      <div className="grow flex flex-col sm:flex-row min-h-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 border-b sm:border-b-0 sm:border-r border-gray-300 dark:border-gray-800">
          <div className="h-6 bg-gray-100 dark:bg-[#252526] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center min-w-0">
            <span className="text-[10px] font-semibold truncate">
              Local site: <span className="font-normal opacity-70">{site.localPath}</span>
            </span>
          </div>
          <div className="grow bg-white dark:bg-[#1e1e1e] overflow-y-auto">
            <div className="grid grid-cols-12 py-1 px-4 text-[10px] font-bold border-b border-gray-100 dark:border-white/5 opacity-60">
              <div className="col-span-6">Filename</div>
              <div className="col-span-3">Filesize</div>
              <div className="col-span-3">Filetype</div>
            </div>
            <div className="text-[10px] divide-y divide-gray-100 dark:divide-white/5">
              {(site.local as Listed[]).map((file) => (
                <div key={file.name} className="grid grid-cols-12 py-1 px-4 hover:bg-win-blue hover:text-white cursor-default">
                  <div className="col-span-6 flex items-center min-w-0">
                    <img src={fileIcon(file)} alt="" className="w-3.5 h-3.5 mr-2 shrink-0" />
                    <span className="truncate" data-local-file>
                      {file.name}
                    </span>
                  </div>
                  <div className="col-span-3">{transferSize(file)}</div>
                  <div className="col-span-3 truncate">{file.kind}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="h-6 bg-gray-100 dark:bg-[#252526] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center min-w-0">
            <span className="text-[10px] font-semibold truncate">
              Remote site: <span className="font-normal opacity-70">{connected ? site.remotePath : ''}</span>
            </span>
          </div>
          <div className="grow bg-white dark:bg-[#1e1e1e] overflow-y-auto relative">
            {connected ? (
              <div>
                <div className="grid grid-cols-12 py-1 px-4 text-[10px] font-bold border-b border-gray-100 dark:border-white/5 opacity-60">
                  <div className="col-span-6">Filename</div>
                  <div className="col-span-3">Filesize</div>
                  <div className="col-span-3">Permissions</div>
                </div>
                <div className="text-[10px] divide-y divide-gray-100 dark:divide-white/5">
                  {(site.remote as Listed[]).map((file) => (
                    <div key={file.name} className="grid grid-cols-12 py-1 px-4 hover:bg-win-blue hover:text-white cursor-default">
                      <div className="col-span-6 flex items-center min-w-0">
                        <img src={fileIcon(file)} alt="" className="w-3.5 h-3.5 mr-2 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <div className="col-span-3">{transferSize(file)}</div>
                      <div className="col-span-3 font-mono">{file.permissions}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs opacity-60">Not connected to any server</div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 border-t border-gray-300 dark:border-gray-800 bg-[#f0f0f0] dark:bg-[#2b2b2b] flex items-center px-4 justify-between text-[9px] shrink-0 gap-4 min-w-0">
        <div className="opacity-70">{connected ? 'Connected' : 'Ready'}</div>
        <div className="flex items-center space-x-4 min-w-0 opacity-70">
          <span className="truncate">Server: sftp://{user}@{host}</span>
          <span className="shrink-0">Queue: 0 files</span>
        </div>
      </div>
    </div>
  )
}
