import { useMemo, useState } from 'react'
import devtools from '../../../../data/devtools.json'
import {
  containerAction,
  filterContainers,
  inspectContainer,
  type DockerContainer,
} from '../../../../assets/js/windowing/devtools.js'

// The same Docker Desktop as v1's partials/apps/docker.php. The lists come from
// data/devtools.json, and start, stop and restart from
// assets/js/windowing/devtools.js, both shared with v1.

type ViewKey = 'containers' | 'images' | 'volumes'

const { engine, images, volumes } = devtools.docker
const SEED = devtools.docker.containers as DockerContainer[]

const VIEWS: [ViewKey, string, string][] = [
  ['containers', 'Containers', 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2'],
  ['images', 'Images', 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14'],
  ['volumes', 'Volumes', 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4'],
]

const wideScreen = () => window.matchMedia('(min-width: 768px)').matches

const TH = 'py-2.5 px-4 font-medium text-[#8b949e]'
const ROW = 'border-b border-[#21262d] hover:bg-[#161b22]/80'

export default function Docker() {
  const [activeView, setActiveView] = useState<ViewKey>('containers')
  // The sidebar folds away on phones, where it would crush the table.
  const [navOpen, setNavOpen] = useState(wideScreen)
  const [containers, setContainers] = useState<DockerContainer[]>(SEED)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [containerDetailTab, setContainerDetailTab] = useState<'logs' | 'inspect'>('logs')
  const [lastCommand, setLastCommand] = useState('')
  const [cliOutput, setCliOutput] = useState<{ text: string; type: 'info' | 'error' }[]>([])

  const filteredContainers = useMemo(() => filterContainers(containers, searchQuery), [containers, searchQuery])
  const selectedContainer = containers.find((c) => c.id === selectedId) ?? null

  const showView = (view: ViewKey) => {
    setActiveView(view)
    if (!wideScreen()) setNavOpen(false)
  }

  const act = (c: DockerContainer, action: 'start' | 'stop' | 'restart') => {
    const result = containerAction(containers, c.id, action)
    setContainers(result.containers)
    setLastCommand(result.command)
    setCliOutput(
      result.error
        ? [{ text: result.error, type: 'error' }]
        : result.output.map((text) => ({ text, type: 'info' as const })),
    )
  }

  return (
    <div
      className="h-full flex flex-col bg-[#0d1117] text-[#e6edf3] select-none overflow-hidden"
      style={{ fontFamily: 'Segoe UI, sans-serif' }}
      data-docker
    >
      {/* Title bar */}
      <div className="h-9 bg-[#161b22] border-b border-[#30363d] flex items-center px-3 shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setNavOpen((open) => !open)}
          aria-expanded={navOpen}
          aria-label="Navigation"
          className="md:hidden p-1 -ml-1 rounded-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <img src="/assets/img/docker.webp" alt="" className="w-5 h-5 object-contain" />
          <span className="text-[13px] font-semibold text-[#e6edf3] truncate">Docker Desktop</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[11px] text-[#8b949e] shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Engine running
          </span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        {/* Sidebar: beside the content on wide screens, over it on phones */}
        {navOpen && (
          <aside className="w-52 max-w-[85%] bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0 absolute md:static inset-y-0 left-0 z-30 shadow-xl md:shadow-none">
            <nav className="p-2 space-y-0.5" aria-label="Docker">
              {VIEWS.map(([key, label, path]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => showView(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-[13px] transition-colors ${
                    activeView === key
                      ? 'bg-[#21262d] text-[#58a6ff]'
                      : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
                  </svg>
                  <span>{label}</span>
                </button>
              ))}
            </nav>
            <div className="mt-auto p-2 border-t border-[#30363d]">
              <div className="text-[10px] text-[#8b949e] px-2">{engine}</div>
            </div>
          </aside>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {activeView === 'containers' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-[15px] font-semibold text-[#e6edf3]">Containers</h1>
                <div className="relative w-full sm:w-56">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search containers..."
                    aria-label="Search containers"
                    className="bg-[#21262d] border border-[#30363d] rounded-md pl-8 pr-3 py-1.5 text-[12px] text-[#e6edf3] placeholder-[#8b949e] w-full focus:outline-hidden focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff]"
                  />
                  <svg className="w-4 h-4 text-[#8b949e] absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[12px] border-collapse min-w-max">
                  <thead className="bg-[#161b22] sticky top-0 z-10 border-b border-[#30363d]">
                    <tr>
                      <th className={TH}>Name</th>
                      <th className={TH}>Image</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>Ports</th>
                      <th className={TH}>Created</th>
                      <th className={`${TH} w-32`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContainers.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`${ROW} transition-colors cursor-default ${selectedId === c.id ? 'bg-[#21262d]/50' : ''}`}
                      >
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'running' ? 'bg-green-500' : 'bg-[#8b949e]'}`} />
                            <span className="font-medium text-[#e6edf3]" data-container-name>
                              {c.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#8b949e] font-mono mt-0.5">{c.id}</div>
                        </td>
                        <td className="py-2 px-4 text-[#8b949e]">{c.image}</td>
                        <td className="py-2 px-4">
                          <span className={`inline-flex items-center gap-1 ${c.status === 'running' ? 'text-green-400' : 'text-[#8b949e]'}`}>
                            {c.statusLabel}
                          </span>
                        </td>
                        <td className="py-2 px-4 font-mono text-[11px] text-[#8b949e]">{c.ports || '-'}</td>
                        <td className="py-2 px-4 text-[#8b949e]">{c.created}</td>
                        <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {c.status === 'running' ? (
                              <button
                                type="button"
                                onClick={() => act(c, 'stop')}
                                className="px-2 py-1 rounded-sm text-[10px] font-medium bg-[#21262d] hover:bg-red-500/20 text-red-400 border border-[#30363d] hover:border-red-500/50 transition-colors"
                              >
                                Stop
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => act(c, 'start')}
                                className="px-2 py-1 rounded-sm text-[10px] font-medium bg-[#21262d] hover:bg-green-500/20 text-green-400 border border-[#30363d] hover:border-green-500/50 transition-colors"
                              >
                                Start
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => act(c, 'restart')}
                              disabled={c.status !== 'running'}
                              className="px-2 py-1 rounded-sm text-[10px] font-medium bg-[#21262d] hover:bg-[#58a6ff]/20 text-[#58a6ff] border border-[#30363d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

              {selectedContainer && (
                <div className="border-t border-[#30363d] bg-[#0d1117] shrink-0">
                  <div className="flex items-center justify-between px-4 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-[#e6edf3]">{selectedContainer.name}</span>
                      {(['logs', 'inspect'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setContainerDetailTab(tab)}
                          className={`text-[10px] pb-0.5 ${
                            containerDetailTab === tab ? 'text-[#58a6ff] border-b border-[#58a6ff]' : 'text-[#8b949e] hover:text-[#e6edf3]'
                          }`}
                        >
                          {tab === 'logs' ? 'Logs' : 'Inspect'}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setSelectedId(null)} className="text-[#8b949e] hover:text-[#e6edf3] text-[10px]">
                      Close
                    </button>
                  </div>
                  <div className="p-3 font-mono text-[11px] min-h-[60px] max-h-28 overflow-y-auto text-[#8b949e]">
                    {containerDetailTab === 'logs' ? (
                      <div className="space-y-0.5">
                        {selectedContainer.logs.map((line, index) => (
                          <div key={index}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-[10px]">{inspectContainer(selectedContainer)}</pre>
                    )}
                  </div>
                </div>
              )}

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
                        <span className="text-green-400">$</span> <span>{lastCommand}</span>
                      </div>
                      {cliOutput.map((line, index) => (
                        <div key={index} className={line.type === 'error' ? 'text-red-400' : 'text-[#8b949e]'}>
                          {line.text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#8b949e]">Run Start or Stop on a container to see the equivalent docker command.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === 'images' && (
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <h1 className="text-[15px] font-semibold text-[#e6edf3] mb-3">Images</h1>
              <div className="overflow-auto">
                <table className="w-full text-left text-[12px] border-collapse min-w-max">
                  <thead className="bg-[#161b22] border-b border-[#30363d]">
                    <tr>
                      <th className={TH}>Image</th>
                      <th className={TH}>Tag</th>
                      <th className={TH}>Image ID</th>
                      <th className={TH}>Created</th>
                      <th className={TH}>Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {images.map((image) => (
                      <tr key={image.id} className={ROW}>
                        <td className="py-2 px-4 text-[#e6edf3]">{image.name}</td>
                        <td className="py-2 px-4 text-[#8b949e]">{image.tag}</td>
                        <td className="py-2 px-4 font-mono text-[#8b949e]">{image.id}</td>
                        <td className="py-2 px-4 text-[#8b949e]">{image.created}</td>
                        <td className="py-2 px-4 text-[#8b949e]">{image.size}</td>
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
                <table className="w-full text-left text-[12px] border-collapse min-w-max">
                  <thead className="bg-[#161b22] border-b border-[#30363d]">
                    <tr>
                      <th className={TH}>Name</th>
                      <th className={TH}>Driver</th>
                      <th className={TH}>Mountpoint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volumes.map((volume) => (
                      <tr key={volume.name} className={ROW}>
                        <td className="py-2 px-4 text-[#e6edf3]">{volume.name}</td>
                        <td className="py-2 px-4 text-[#8b949e]">{volume.driver}</td>
                        <td className="py-2 px-4 font-mono text-[#8b949e] text-[10px]">{volume.mountpoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
