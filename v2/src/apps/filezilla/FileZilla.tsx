import { useState } from 'react'

interface RemoteFile {
  name: string
  size: number
  type: 'file' | 'dir'
  modified: string
}

const LOCAL: RemoteFile[] = [
  { name: 'index.php', size: 580, type: 'file', modified: '2026-05-14 19:37' },
  { name: 'router.php', size: 573, type: 'file', modified: '2026-05-14 19:37' },
  { name: '.htaccess', size: 569, type: 'file', modified: '2026-05-14 19:37' },
  { name: 'v2/', size: 0, type: 'dir', modified: '2026-05-14 20:09' },
  { name: 'assets/', size: 0, type: 'dir', modified: '2026-05-14 19:37' },
  { name: 'partials/', size: 0, type: 'dir', modified: '2026-05-14 19:37' },
  { name: 'data/', size: 0, type: 'dir', modified: '2026-05-14 19:37' },
]

const REMOTE: RemoteFile[] = [
  { name: 'index.php', size: 540, type: 'file', modified: '2026-05-12 09:01' },
  { name: 'router.php', size: 573, type: 'file', modified: '2026-05-12 09:01' },
  { name: 'public_html/', size: 0, type: 'dir', modified: '2026-05-12 09:01' },
  { name: 'logs/', size: 0, type: 'dir', modified: '2026-05-14 20:00' },
]

const fmtSize = (n: number) =>
  n === 0 ? '<DIR>' : n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`

export default function FileZilla() {
  const [host, setHost] = useState('johnson-rose.co.uk')
  const [user, setUser] = useState('devante')
  const [connected, setConnected] = useState(false)

  return (
    <div className="h-full flex flex-col bg-[#f0f0f0] text-black text-xs select-none">
      <div className="h-6 bg-[#003366] text-white flex items-center px-2 shrink-0 text-[11px]">
        <img src="/assets/img/filezilla.webp" alt="" className="w-3 h-3 mr-2" />
        FileZilla — sftp://{user}@{host}
      </div>

      {/* Quick connect */}
      <div className="flex items-center px-2 py-1 space-x-2 border-b border-gray-300 shrink-0">
        <label>Host:</label>
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="bg-white border border-gray-400 px-1 py-0.5 w-40"
        />
        <label>Username:</label>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="bg-white border border-gray-400 px-1 py-0.5 w-28"
        />
        <label>Port:</label>
        <input
          defaultValue={22}
          className="bg-white border border-gray-400 px-1 py-0.5 w-14"
        />
        <button
          type="button"
          onClick={() => setConnected((c) => !c)}
          className="px-3 py-0.5 bg-[#003366] text-white rounded ml-2"
        >
          {connected ? 'Disconnect' : 'Quickconnect →'}
        </button>
      </div>

      {/* Log */}
      <div className="h-24 bg-white border-b border-gray-300 p-2 overflow-y-auto font-mono text-[10px] shrink-0">
        <div className="text-green-700">Status: Resolving address of {host}</div>
        <div className="text-green-700">Status: Connecting to 217.23.10.5:22…</div>
        {connected ? (
          <>
            <div className="text-green-700">Status: Connected to {host}</div>
            <div>Command: pwd</div>
            <div className="opacity-70">Response: /home/{user}</div>
            <div>Status: Directory listing of "/home/{user}" successful</div>
          </>
        ) : (
          <div className="opacity-60">Status: Idle. Click Quickconnect to begin.</div>
        )}
      </div>

      {/* Twin panes */}
      <div className="flex-grow flex min-h-0">
        <Pane label={`Local: /Applications/XAMPP/htdocs/djohnsonrose/`} files={LOCAL} />
        <Pane
          label={connected ? `Remote: /home/${user}/` : 'Remote: not connected'}
          files={connected ? REMOTE : []}
        />
      </div>

      <div className="h-5 bg-gray-200 border-t border-gray-300 text-[10px] flex items-center px-3 shrink-0 justify-between">
        <span>{connected ? '0 files queued' : 'Not connected'}</span>
        <span>2026 FileZilla mock</span>
      </div>
    </div>
  )
}

function Pane({ label, files }: { label: string; files: RemoteFile[] }) {
  return (
    <div className="flex-1 flex flex-col min-w-0 border-r border-gray-300 last:border-r-0">
      <div className="bg-gray-200 px-2 py-1 text-[10px] truncate border-b border-gray-300 shrink-0">
        {label}
      </div>
      <div className="grid grid-cols-12 bg-[#dde6ed] text-[10px] font-bold px-2 py-0.5 shrink-0">
        <div className="col-span-7">Filename</div>
        <div className="col-span-2 text-right">Size</div>
        <div className="col-span-3">Last modified</div>
      </div>
      <div className="flex-grow overflow-y-auto bg-white">
        {files.length === 0 ? (
          <div className="p-3 text-[11px] opacity-40">—</div>
        ) : (
          files.map((f) => (
            <div
              key={f.name}
              className="grid grid-cols-12 px-2 py-0.5 hover:bg-[#316ac5] hover:text-white text-[11px]"
            >
              <div className="col-span-7 truncate">
                {f.type === 'dir' ? '📁' : '📄'} {f.name}
              </div>
              <div className="col-span-2 text-right opacity-80">{fmtSize(f.size)}</div>
              <div className="col-span-3 opacity-60">{f.modified}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
