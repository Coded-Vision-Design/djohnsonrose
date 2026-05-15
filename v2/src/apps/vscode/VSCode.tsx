import { useEffect, useRef, useState } from 'react'

interface Project {
  id: number
  title: string
  description: string
  tags: string[]
  url: string
  thumbnail: string
  location?: string
}

// 1:1 port of partials/apps/vscode.php — VS Code chrome with activity bar,
// projects sidebar, tabbed editor (filename + Terminal), breadcrumb,
// project hero with Build + Visit Website buttons, terminal sub-view,
// win-blue status bar.
export default function VSCode() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeFile, setActiveFile] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'editor' | 'terminal'>('editor')
  const [explorerOpen, setExplorerOpen] = useState(true)
  const [isBuilding, setIsBuilding] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<
    { type: 'command' | 'info' | 'success' | 'error'; text: string }[]
  >([])

  useEffect(() => {
    let cancelled = false
    fetch('/data/portfolio.json')
      .then((r) => r.json() as Promise<{ projects: Project[] }>)
      .then((d) => {
        if (cancelled) return
        setProjects(d.projects)
        if (d.projects[0]) setActiveFile(d.projects[0].title)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const active = projects.find((p) => p.title === activeFile)

  // Build animation lives on a single interval that we always clean up — the
  // old impl could leak across re-renders (and across switching projects mid-
  // build), which is what was causing the "Build" button to white-screen the
  // window after a second click.
  const buildTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (buildTimerRef.current != null) {
        window.clearInterval(buildTimerRef.current)
        buildTimerRef.current = null
      }
    }
  }, [])

  const runBuild = () => {
    if (isBuilding) return
    if (buildTimerRef.current != null) {
      window.clearInterval(buildTimerRef.current)
      buildTimerRef.current = null
    }
    setIsBuilding(true)
    setActiveTab('terminal')
    const lines = [
      { type: 'command' as const, text: '> npm run build' },
      { type: 'info' as const, text: 'vite v8.0.13 building for production...' },
      { type: 'info' as const, text: '✓ 248 modules transformed.' },
      { type: 'info' as const, text: 'rendering chunks (1/1)...' },
      { type: 'success' as const, text: '✓ built in 1.84s' },
      { type: 'success' as const, text: `→ Deployed ${active?.title ?? 'project'} to staging` },
    ]
    let i = 0
    setTerminalOutput([])
    buildTimerRef.current = window.setInterval(() => {
      if (i >= lines.length) {
        if (buildTimerRef.current != null) {
          window.clearInterval(buildTimerRef.current)
          buildTimerRef.current = null
        }
        setIsBuilding(false)
        return
      }
      setTerminalOutput((prev) => [...prev, lines[i]])
      i++
    }, 350)
  }

  return (
    <div className="h-full flex bg-[#1e1e1e] text-[#cccccc] overflow-hidden select-none" style={{ fontFamily: 'sans-serif' }}>
      {/* Activity bar */}
      <div className="w-12 flex flex-col items-center py-4 space-y-4 bg-[#333333] shrink-0">
        <div className="p-2 text-white opacity-100 border-l-2 border-white" title="Explorer">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8L19.2 7.5 12 11.1 4.8 7.5 12 4.8zm-7.2 5.1l6.2 3.1v6.2l-6.2-3.1v-6.2zm8.2 9.3v-6.2l6.2-3.1v6.2l-6.2 3.1z" />
          </svg>
        </div>
        <div className="p-2 opacity-50 hover:opacity-100 cursor-pointer" title="Search">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </div>
        <div className="p-2 opacity-50 hover:opacity-100 cursor-pointer" title="Source control">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
          </svg>
        </div>
        <div className="mt-auto p-2 opacity-50 hover:opacity-100 cursor-pointer" title="Accounts">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <div className="p-2 opacity-50 hover:opacity-100 cursor-pointer" title="Settings">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.34 8.88c-.11.2-.06.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </div>
      </div>

      {/* Sidebar (hidden on small) */}
      <div className="w-60 bg-[#252526] shrink-0 flex-col hidden md:flex">
        <div className="h-9 px-4 flex items-center justify-between text-[11px] uppercase tracking-wider font-bold opacity-70">
          <span>Explorer</span>
        </div>
        <div className="flex-grow overflow-y-auto">
          <div className="px-1 py-1">
            <button
              type="button"
              onClick={() => setExplorerOpen((v) => !v)}
              className="w-full flex items-center px-2 py-1 text-xs font-bold uppercase opacity-80"
            >
              <svg
                className={`w-4 h-4 mr-1 transition-transform ${explorerOpen ? 'rotate-90' : ''}`}
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
              Projects
            </button>
            {explorerOpen && (
              <div className="ml-4 space-y-0.5">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveFile(p.title)}
                    className={`w-full text-left flex items-center px-2 py-1 text-xs hover:bg-[#37373d] ${
                      activeFile === p.title ? 'bg-[#37373d]' : ''
                    }`}
                  >
                    <span className="mr-2 text-yellow-500">📂</span>
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main editor */}
      <div className="flex-grow flex flex-col min-w-0 bg-[#1e1e1e]">
        {/* Tabs */}
        <div className="h-9 bg-[#252526] flex items-center overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`h-full px-4 flex items-center text-xs cursor-pointer min-w-[120px] transition-all ${
              activeTab === 'editor' ? 'bg-[#1e1e1e] border-t border-win-blue' : 'opacity-50'
            }`}
          >
            <span className="mr-2 text-yellow-500">📂</span>
            <span className="truncate">{activeFile || 'No file'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`h-full px-4 flex items-center text-xs cursor-pointer min-w-[120px] transition-all ${
              activeTab === 'terminal' ? 'bg-[#1e1e1e] border-t border-win-blue' : 'opacity-50'
            }`}
          >
            <span className="mr-2 text-gray-400">⌨️</span>
            <span>Terminal</span>
          </button>
        </div>

        {/* Breadcrumbs */}
        <div className="h-6 px-4 flex items-center text-[11px] opacity-60 bg-[#1e1e1e] shrink-0">
          Projects <span className="mx-1">&gt;</span> <span>{activeFile}</span>
        </div>

        <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'editor' && (
            <div className="flex-grow overflow-auto bg-[#1e1e1e] p-4">
              <div className="flex h-full">
                {/* Line numbers */}
                <div className="w-10 shrink-0 text-right pr-4 text-[#858585] font-mono text-xs leading-6 select-none border-r border-[#333333]">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* Project hero */}
                <div className="flex-grow font-mono text-xs leading-6 h-full px-4">
                  {active && (
                    <div className="flex flex-col h-full animate-window-open">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-2">{active.title}</h2>
                          <p className="text-gray-400 text-sm max-w-2xl">{active.description}</p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={runBuild}
                            disabled={isBuilding}
                            className="bg-[#333333] hover:bg-[#444444] text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center text-sm border border-white/10 disabled:opacity-60"
                          >
                            <span className={`mr-2 ${isBuilding ? 'animate-spin inline-block' : ''}`}>🔨</span>
                            <span>{isBuilding ? 'Building...' : 'Build'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(active.url, '_blank', 'noopener')}
                            className="bg-win-blue hover:bg-blue-600 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center text-sm"
                          >
                            <span>Visit Website</span>
                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="flex-grow relative group overflow-hidden rounded-xl border border-white/10 bg-black/20">
                        <img
                          src={`/${active.thumbnail}`}
                          alt={active.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex flex-wrap gap-2">
                            {active.tags.map((t) => (
                              <span
                                key={t}
                                className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] uppercase tracking-wider"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="flex-grow bg-[#1e1e1e] border-t border-[#333333] flex flex-col">
              <div className="h-9 flex items-center px-4 justify-between border-b border-[#333333] shrink-0">
                <div className="flex space-x-4 text-[11px] uppercase font-bold tracking-wider opacity-70">
                  <span className="text-white border-b border-white">Terminal</span>
                  <span>Output</span>
                  <span>Debug Console</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-[10px] bg-white/10 px-2 py-0.5 rounded">powershell</div>
                  <button
                    type="button"
                    onClick={() => setTerminalOutput([])}
                    className="text-gray-400 hover:text-white p-1"
                    aria-label="Clear"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="flex-grow p-4 font-mono text-[12px] overflow-y-auto">
                {terminalOutput.map((line, i) => (
                  <div key={i} className="mb-1">
                    <span
                      className={
                        line.type === 'command'
                          ? 'text-win-blue'
                          : line.type === 'info'
                            ? 'text-gray-400'
                            : line.type === 'success'
                              ? 'text-green-500'
                              : 'text-red-500'
                      }
                    >
                      {line.text}
                    </span>
                  </div>
                ))}
                {isBuilding && <div className="animate-pulse text-win-blue">_</div>}
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="h-6 bg-win-blue text-white flex items-center px-3 justify-between text-[11px] shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center px-1">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-10h2v8h-2V7z" />
              </svg>
              0
            </div>
            <div className="flex items-center px-1">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
              0
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="px-1">Spaces: 4</div>
            <div className="px-1">UTF-8</div>
            <div className="px-1">HTML</div>
            <div className="px-1">Prettier</div>
          </div>
        </div>
      </div>
    </div>
  )
}
