import { useEffect, useMemo, useState } from 'react'

interface Project {
  id: number
  title: string
  description: string
  tags: string[]
  url: string
  thumbnail: string
  location?: string
}

interface Tab {
  fileName: string
  content: string
}

// Build a faux source file per portfolio project — gives the editor something
// to render that's both branded and informative.
const makeTab = (p: Project): Tab => ({
  fileName: `${p.title.replace(/\s+/g, '-').toLowerCase()}.md`,
  content: [
    `# ${p.title}`,
    '',
    `> ${p.description}`,
    '',
    `**Stack:** ${p.tags.join(', ')}`,
    `**Location:** ${p.location ?? 'UK'}`,
    `**Live URL:** ${p.url}`,
    '',
    '---',
    '',
    `// preview asset`,
    `// ${p.thumbnail}`,
    '',
  ].join('\n'),
})

export default function VSCode() {
  const [projects, setProjects] = useState<Project[]>([])
  const [openIds, setOpenIds] = useState<number[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/data/portfolio.json')
      .then((r) => r.json() as Promise<{ projects: Project[] }>)
      .then((d) => {
        if (cancelled) return
        setProjects(d.projects)
        if (d.projects[0]) {
          setOpenIds([d.projects[0].id])
          setActiveId(d.projects[0].id)
        }
      })
      .catch(() => {
        /* fallthrough */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const tabs = useMemo(
    () =>
      openIds
        .map((id) => projects.find((p) => p.id === id))
        .filter((p): p is Project => !!p)
        .map((p) => ({ ...p, tab: makeTab(p) })),
    [openIds, projects],
  )

  const active = tabs.find((t) => t.id === activeId)

  const open = (p: Project) => {
    if (!openIds.includes(p.id)) setOpenIds([...openIds, p.id])
    setActiveId(p.id)
  }

  const close = (id: number) => {
    const next = openIds.filter((x) => x !== id)
    setOpenIds(next)
    if (id === activeId) setActiveId(next[next.length - 1] ?? null)
  }

  const lineNumbers = (text: string) => text.split('\n').map((_, i) => i + 1)

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs">
      {/* Title bar */}
      <div className="h-8 bg-[#3c3c3c] flex items-center px-3 shrink-0 border-b border-black/40">
        <img src="/assets/img/vscode.webp" alt="" className="w-4 h-4 mr-2" />
        <span className="text-[11px]">Portfolio — Visual Studio Code</span>
      </div>

      {/* Menu bar */}
      <div className="h-7 bg-[#252526] border-b border-black/40 flex items-center px-3 space-x-4 shrink-0 text-[11px]">
        {['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Help'].map((m) => (
          <span key={m} className="opacity-70 cursor-default">
            {m}
          </span>
        ))}
      </div>

      <div className="flex-grow flex min-h-0">
        {/* Activity bar */}
        <div className="w-12 bg-[#333333] border-r border-black/40 flex flex-col items-center py-2 space-y-3 shrink-0">
          <button className="text-xl opacity-90 hover:opacity-100" title="Explorer">
            🗂
          </button>
          <button className="text-xl opacity-60 hover:opacity-100" title="Search">
            🔍
          </button>
          <button className="text-xl opacity-60 hover:opacity-100" title="Source control">
            ⎇
          </button>
          <button className="text-xl opacity-60 hover:opacity-100" title="Extensions">
            🧩
          </button>
        </div>

        {/* Side panel */}
        <div className="w-56 bg-[#252526] border-r border-black/40 overflow-y-auto shrink-0">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider opacity-60">
            Projects
          </div>
          {projects.length === 0 ? (
            <div className="px-3 text-[11px] opacity-50">Loading…</div>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => open(p)}
                className={`w-full text-left px-3 py-1 text-[11px] flex items-center hover:bg-white/5 ${
                  activeId === p.id ? 'bg-[#37373d] text-white' : ''
                }`}
                title={p.description}
              >
                <span className="mr-2">📄</span>
                <span className="truncate">{p.title}</span>
              </button>
            ))
          )}
        </div>

        {/* Editor area */}
        <div className="flex-grow flex flex-col min-w-0">
          {/* Tab strip */}
          <div className="h-8 bg-[#252526] border-b border-black/40 flex items-stretch overflow-x-auto shrink-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={`flex items-center px-3 text-[11px] border-r border-black/40 group ${
                  activeId === t.id ? 'bg-[#1e1e1e] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="mr-2">📄</span>
                <span className="truncate max-w-[160px]">{t.tab.fileName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    close(t.id)
                  }}
                  className="ml-2 px-1 hover:bg-white/10 rounded"
                  aria-label="Close"
                >
                  ✕
                </button>
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-grow overflow-auto bg-[#1e1e1e]">
            {active ? (
              <div className="flex">
                <div className="select-none text-right pr-3 pl-3 py-3 text-[#858585] bg-[#1e1e1e] sticky left-0">
                  {lineNumbers(active.tab.content).map((n) => (
                    <div key={n} className="leading-5">
                      {n}
                    </div>
                  ))}
                </div>
                <pre className="py-3 pr-3 whitespace-pre-wrap leading-5">
                  {active.tab.content}
                </pre>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-2">
                <img src="/assets/img/vscode.webp" alt="" className="w-16 h-16" />
                <div className="text-sm">No file is open</div>
                <div className="text-xs opacity-70">
                  Pick a project from the sidebar to preview its README.
                </div>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="h-5 bg-[#007acc] text-white text-[10px] flex items-center px-3 justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <span>⎇ main</span>
              <span>0 errors</span>
              <span>0 warnings</span>
            </div>
            <div className="flex items-center space-x-3">
              <span>UTF-8</span>
              <span>LF</span>
              <span>Markdown</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
