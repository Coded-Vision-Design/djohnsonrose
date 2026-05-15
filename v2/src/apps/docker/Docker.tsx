import { useEffect, useMemo, useState } from 'react'

// 1:1 port of partials/apps/docker.php — Docker Desktop chrome with the
// dark grey title bar, sidebar (Containers/Images/Volumes), Containers
// table with status dots + Start/Stop/Restart per-row buttons, optional
// detail panel (Logs/Inspect) and a "Last command" CLI panel.

type ViewKey = 'containers' | 'images' | 'volumes'

interface Container {
  id: string
  name: string
  image: string
  status: 'running' | 'stopped' | 'exited'
  statusLabel: string
  ports: string
  created: string
  logs: string[]
}

const SEED: Container[] = [
  {
    id: 'a4f1b9c7d8e2',
    name: 'portfolio-php',
    image: 'php:8.2-apache',
    status: 'running',
    statusLabel: 'Up 2 hours',
    ports: '8765:80',
    created: '2 hours ago',
    logs: [
      '[Mon May 14 22:00:01] Apache/2.4 starting',
      '[Mon May 14 22:00:01] PHP 8.2.4 loaded',
      '[Mon May 14 22:00:02] Listening on 0.0.0.0:80',
    ],
  },
  {
    id: 'b7c2e1d3f0a4',
    name: 'portfolio-react',
    image: 'node:22-alpine',
    status: 'running',
    statusLabel: 'Up 1 hour',
    ports: '5173:5173',
    created: '1 hour ago',
    logs: [
      'vite v8.0.13 ready in 130ms',
      '➜  Local:   http://localhost:5173/v2/',
      '➜  Network: use --host to expose',
    ],
  },
  {
    id: 'd0e3a8c1b5f7',
    name: 'mysql-portfolio',
    image: 'mysql:8.0',
    status: 'running',
    statusLabel: 'Up 5 hours',
    ports: '3306:3306',
    created: '5 hours ago',
    logs: ['[InnoDB] Buffer pool(s) load completed', 'ready for connections.'],
  },
  {
    id: 'e4f5d2a9b1c8',
    name: 'redis-cache',
    image: 'redis:7-alpine',
    status: 'running',
    statusLabel: 'Up 5 hours',
    ports: '6379:6379',
    created: '5 hours ago',
    logs: ['Ready to accept connections tcp'],
  },
  {
    id: 'f1g6h3i2j7k4',
    name: 'nginx-proxy',
    image: 'nginx:1.27-alpine',
    status: 'stopped',
    statusLabel: 'Exited (0)',
    ports: '',
    created: '3 days ago',
    logs: ['nginx exiting with code 0'],
  },
  {
    id: '9c0a4b7e2d6f',
    name: 'postgres-staging',
    image: 'postgres:16',
    status: 'exited',
    statusLabel: 'Exited (1)',
    ports: '',
    created: '1 week ago',
    logs: ['could not open file "/var/lib/postgresql/data": Permission denied'],
  },
]

export default function Docker() {
  const [activeView, setActiveView] = useState<ViewKey>('containers')
  const [containers, setContainers] = useState<Container[]>(SEED)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [containerDetailTab, setContainerDetailTab] = useState<'logs' | 'inspect'>('logs')
  const [lastCommand, setLastCommand] = useState('')
  const [cliOutput, setCliOutput] = useState<{ text: string; type: 'info' | 'error' }[]>([])

  const filteredContainers = useMemo(
    () =>
      containers.filter((c) => {
        const q = searchQuery.toLowerCase()
        return (
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.image.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        )
      }),
    [containers, searchQuery],
  )

  const selectedContainer = useMemo(
    () => containers.find((c) => c.id === selectedId) ?? null,
    [containers, selectedId],
  )

  const containerInspect = useMemo(() => {
    if (!selectedContainer) return ''
    return JSON.stringify(
      {
        Id: selectedContainer.id,
        Name: `/${selectedContainer.name}`,
        Image: selectedContainer.image,
        State: { Status: selectedContainer.status, Running: selectedContainer.status === 'running' },
        NetworkSettings: { Ports: selectedContainer.ports },
        Created: selectedContainer.created,
      },
      null,
      2,
    )
  }, [selectedContainer])

  // Tick exited containers' "created" labels every 30 s — just so it feels live.
  useEffect(() => {
    const id = window.setInterval(() => {
      // no-op; placeholder for future per-tick updates
    }, 30000)
    return () => window.clearInterval(id)
  }, [])

  const runCli = (cmd: string, results: { text: string; type: 'info' | 'error' }[]) => {
    setLastCommand(cmd)
    setCliOutput(results)
  }

  const startContainer = (c: Container) => {
    setContainers((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, status: 'running', statusLabel: 'Up 1 second' } : x,
      ),
    )
    runCli(`docker start ${c.name}`, [{ text: c.name, type: 'info' }])
  }
  const stopContainer = (c: Container) => {
    setContainers((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, status: 'stopped', statusLabel: 'Exited (0)' } : x,
      ),
    )
    runCli(`docker stop ${c.name}`, [{ text: c.name, type: 'info' }])
  }
  const restartContainer = (c: Container) => {
    runCli(`docker restart ${c.name}`, [{ text: c.name, type: 'info' }])
  }

  return (
    <div
      className="h-full flex flex-col bg-[#0d1117] text-[#e6edf3] select-none overflow-hidden"
      style={{ fontFamily: 'Segoe UI, sans-serif' }}
    >
      {/* Title bar */}
      <div className="h-9 bg-[#161b22] border-b border-[#30363d] flex items-center px-3 shrink-0">
        <div className="flex items-center gap-2">
          <img src="/assets/img/docker.webp" alt="" className="w-5 h-5 object-contain" />
          <span className="text-[13px] font-semibold text-[#e6edf3]">Docker Desktop</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Engine running
          </span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-52 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0">
          <nav className="p-2 space-y-0.5">
            {(
              [
                ['containers', 'Containers', 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2'],
                ['images', 'Images', 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14'],
                ['volumes', 'Volumes', 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4'],
              ] as const
            ).map(([key, label, path]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-[13px] transition-colors ${
                  activeView === key
                    ? 'bg-[#21262d] text-[#58a6ff]'
                    : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
                </svg>
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto p-2 border-t border-[#30363d]">
            <div className="text-[10px] text-[#8b949e] px-2">Docker Engine 24.0.x</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {activeView === 'containers' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between gap-4">
                <h1 className="text-[15px] font-semibold text-[#e6edf3]">Containers</h1>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search containers..."
                    className="bg-[#21262d] border border-[#30363d] rounded-md pl-8 pr-3 py-1.5 text-[12px] text-[#e6edf3] placeholder-[#8b949e] w-56 focus:outline-none focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff]"
                  />
                  <svg className="w-4 h-4 text-[#8b949e] absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead className="bg-[#161b22] sticky top-0 z-10 border-b border-[#30363d]">
                    <tr>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e] w-8">
                        <input
                          type="checkbox"
                          className="rounded border-[#30363d] bg-[#21262d] text-[#58a6ff] focus:ring-[#58a6ff]"
                        />
                      </th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Name</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Image</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Status</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Ports</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Created</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e] w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContainers.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`border-b border-[#21262d] hover:bg-[#161b22]/80 transition-colors cursor-default ${
                          selectedId === c.id ? 'bg-[#21262d]/50' : ''
                        }`}
                      >
                        <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="rounded border-[#30363d] bg-[#21262d] text-[#58a6ff] focus:ring-[#58a6ff]" />
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                c.status === 'running' ? 'bg-green-500' : 'bg-[#8b949e]'
                              }`}
                            />
                            <span className="font-medium text-[#e6edf3]">{c.name}</span>
                          </div>
                          <div className="text-[10px] text-[#8b949e] font-mono mt-0.5">{c.id}</div>
                        </td>
                        <td className="py-2 px-4 text-[#8b949e]">{c.image}</td>
                        <td className="py-2 px-4">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              c.status === 'running' ? 'text-green-400' : 'text-[#8b949e]'
                            }`}
                          >
                            {c.statusLabel}
                          </span>
                        </td>
                        <td className="py-2 px-4 font-mono text-[11px] text-[#8b949e]">
                          {c.ports || '-'}
                        </td>
                        <td className="py-2 px-4 text-[#8b949e]">{c.created}</td>
                        <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {c.status === 'running' ? (
                              <button
                                type="button"
                                onClick={() => stopContainer(c)}
                                className="px-2 py-1 rounded text-[10px] font-medium bg-[#21262d] hover:bg-red-500/20 text-red-400 border border-[#30363d] hover:border-red-500/50 transition-colors"
                              >
                                Stop
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startContainer(c)}
                                className="px-2 py-1 rounded text-[10px] font-medium bg-[#21262d] hover:bg-green-500/20 text-green-400 border border-[#30363d] hover:border-green-500/50 transition-colors"
                              >
                                Start
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => restartContainer(c)}
                              disabled={c.status !== 'running'}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-[#21262d] hover:bg-[#58a6ff]/20 text-[#58a6ff] border border-[#30363d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Restart
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Container detail */}
              {selectedContainer && (
                <div className="border-t border-[#30363d] bg-[#0d1117] shrink-0">
                  <div className="flex items-center justify-between px-4 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-[#e6edf3]">{selectedContainer.name}</span>
                      <button
                        type="button"
                        onClick={() => setContainerDetailTab('logs')}
                        className={`text-[10px] pb-0.5 ${
                          containerDetailTab === 'logs'
                            ? 'text-[#58a6ff] border-b border-[#58a6ff]'
                            : 'text-[#8b949e] hover:text-[#e6edf3]'
                        }`}
                      >
                        Logs
                      </button>
                      <button
                        type="button"
                        onClick={() => setContainerDetailTab('inspect')}
                        className={`text-[10px] pb-0.5 ${
                          containerDetailTab === 'inspect'
                            ? 'text-[#58a6ff] border-b border-[#58a6ff]'
                            : 'text-[#8b949e] hover:text-[#e6edf3]'
                        }`}
                      >
                        Inspect
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="text-[#8b949e] hover:text-[#e6edf3] text-[10px]"
                    >
                      Close
                    </button>
                  </div>
                  <div className="p-3 font-mono text-[11px] min-h-[60px] max-h-28 overflow-y-auto text-[#8b949e]">
                    {containerDetailTab === 'logs' ? (
                      <div className="space-y-0.5">
                        {selectedContainer.logs.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-[10px]">{containerInspect}</pre>
                    )}
                  </div>
                </div>
              )}

              {/* CLI output */}
              <div className="border-t border-[#30363d] bg-[#0d1117] shrink-0">
                <div className="flex items-center justify-between px-4 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                  <span className="text-[11px] font-medium text-[#8b949e]">Last command</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCliOutput([])
                      setLastCommand('')
                    }}
                    className="text-[10px] text-[#8b949e] hover:text-[#e6edf3]"
                  >
                    Clear
                  </button>
                </div>
                <div className="p-3 font-mono text-[11px] text-[#8b949e] min-h-[72px] max-h-32 overflow-y-auto">
                  {lastCommand ? (
                    <div className="space-y-1">
                      <div className="text-[#e6edf3]">
                        <span className="text-green-400">$</span> {lastCommand}
                      </div>
                      {cliOutput.map((line) => (
                        <div
                          key={line.text}
                          className={line.type === 'error' ? 'text-red-400' : 'text-[#8b949e]'}
                        >
                          {line.text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#8b949e]">
                      Run Start or Stop on a container to see the equivalent docker command.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === 'images' && (
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <h1 className="text-[15px] font-semibold text-[#e6edf3] mb-3">Images</h1>
              <div className="overflow-auto">
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead className="bg-[#161b22] border-b border-[#30363d]">
                    <tr>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Image</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Tag</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Image ID</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Created</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['node', '20-alpine', 'a1b2c3d4e5f6', '2 weeks ago', '178 MB'],
                      ['nextcloud', 'apache', 'b2c3d4e5f6a7', '1 week ago', '1.2 GB'],
                      ['postgres', '16-alpine', 'c3d4e5f6a7b8', '3 weeks ago', '238 MB'],
                    ].map(([img, tag, id, created, size]) => (
                      <tr key={id} className="border-b border-[#21262d] hover:bg-[#161b22]/80">
                        <td className="py-2 px-4 text-[#e6edf3]">{img}</td>
                        <td className="py-2 px-4 text-[#8b949e]">{tag}</td>
                        <td className="py-2 px-4 font-mono text-[#8b949e]">{id}</td>
                        <td className="py-2 px-4 text-[#8b949e]">{created}</td>
                        <td className="py-2 px-4 text-[#8b949e]">{size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'volumes' && (
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <h1 className="text-[15px] font-semibold text-[#e6edf3] mb-3">Volumes</h1>
              <div className="overflow-auto">
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead className="bg-[#161b22] border-b border-[#30363d]">
                    <tr>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Name</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Driver</th>
                      <th className="py-2.5 px-4 font-medium text-[#8b949e]">Mountpoint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['nextcloud_data', 'local', '/var/lib/docker/volumes/nextcloud_data/_data'],
                      ['postgres_data', 'local', '/var/lib/docker/volumes/postgres_data/_data'],
                    ].map(([name, driver, mp]) => (
                      <tr key={name} className="border-b border-[#21262d] hover:bg-[#161b22]/80">
                        <td className="py-2 px-4 text-[#e6edf3]">{name}</td>
                        <td className="py-2 px-4 text-[#8b949e]">{driver}</td>
                        <td className="py-2 px-4 font-mono text-[#8b949e] text-[10px]">{mp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
