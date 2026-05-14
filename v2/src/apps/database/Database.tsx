import { useEffect, useMemo, useState } from 'react'

interface Project {
  id: number
  title: string
  description: string
  tags: string[]
  url: string
  thumbnail: string
  location?: string
  country_code?: string
}

interface Column {
  name: string
  type: string
}

const COLUMNS: Column[] = [
  { name: 'id', type: 'int' },
  { name: 'title', type: 'nvarchar(120)' },
  { name: 'description', type: 'nvarchar(MAX)' },
  { name: 'location', type: 'nvarchar(60)' },
  { name: 'country_code', type: 'nvarchar(8)' },
  { name: 'stack', type: 'nvarchar(MAX)' },
  { name: 'url', type: 'nvarchar(MAX)' },
]

const DEFAULT_QUERY =
  'SELECT id, title, location, country_code, stack\nFROM dbo.Projects\nORDER BY id ASC;'

export default function Database() {
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [rows, setRows] = useState<Project[] | null>(null)
  const [executedAt, setExecutedAt] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/data/portfolio.json')
      .then((r) => r.json() as Promise<{ projects: Project[] }>)
      .then((d) => {
        if (cancelled) return
        setProjects(d.projects)
        setRows(d.projects)
        setExecutedAt(new Date().toLocaleTimeString())
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load /data/portfolio.json')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const execute = () => {
    setError(null)
    const q = query.trim().toLowerCase()

    if (!q.startsWith('select')) {
      setError('Only SELECT statements are supported in this mock.')
      setRows(null)
      return
    }

    // Very small SQL "engine": supports ORDER BY title/location, WHERE
    // country_code = 'xx', and LIMIT.
    let result = [...projects]

    const whereMatch = q.match(/where\s+country_code\s*=\s*'([^']+)'/i)
    if (whereMatch) {
      const code = whereMatch[1].toLowerCase()
      result = result.filter((p) => p.country_code?.toLowerCase() === code)
    }

    const orderMatch = q.match(/order\s+by\s+(\w+)\s*(asc|desc)?/i)
    if (orderMatch) {
      const field = orderMatch[1] as keyof Project
      const dir = (orderMatch[2] ?? 'asc').toLowerCase()
      result = [...result].sort((a, b) => {
        const av = `${a[field] ?? ''}`
        const bv = `${b[field] ?? ''}`
        return dir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv)
      })
    }

    const limitMatch = q.match(/limit\s+(\d+)/i)
    if (limitMatch) {
      result = result.slice(0, Number(limitMatch[1]))
    }

    setRows(result)
    setExecutedAt(new Date().toLocaleTimeString())
  }

  const rowCount = rows?.length ?? 0
  const stackOf = useMemo(() => (p: Project) => p.tags.join(', '), [])

  return (
    <div className="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none">
      {/* Title strip */}
      <div className="h-8 bg-[#cc2927] text-white flex items-center px-3 shrink-0 text-xs font-semibold">
        <img src="/assets/img/mssql.webp" alt="" className="w-4 h-4 mr-2" />
        SQL Server Management Studio — Portfolio.dbo.Projects
      </div>

      <div className="h-9 border-b border-black/10 dark:border-white/10 flex items-center px-3 shrink-0 space-x-2 text-xs">
        <button
          type="button"
          onClick={execute}
          className="px-3 py-1 bg-[#cc2927] text-white rounded font-medium hover:opacity-90"
        >
          ▶ Execute
        </button>
        <button
          type="button"
          onClick={() => setQuery(DEFAULT_QUERY)}
          className="px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          ↺ Reset
        </button>
        <span className="opacity-60 ml-auto">F5 to execute · Mock engine: SELECT / WHERE / ORDER BY / LIMIT</span>
      </div>

      <div className="flex-grow flex min-h-0">
        {/* Object explorer */}
        <div className="w-56 border-r border-black/10 dark:border-white/10 bg-white dark:bg-[#252526] overflow-y-auto shrink-0">
          <div className="p-2 text-[10px] uppercase tracking-wider opacity-60">
            Object Explorer
          </div>
          <div className="px-2 text-xs space-y-1">
            <div>📂 Databases</div>
            <div className="pl-4">📁 Portfolio</div>
            <div className="pl-8">📁 Tables</div>
            <div className="pl-12 bg-blue-100 dark:bg-blue-900/30 px-1 rounded">
              📋 dbo.Projects
            </div>
            <div className="pl-12">📋 dbo.ClientWins</div>
            <div className="pl-12">📋 dbo.Skills</div>
            <div className="pl-8 mt-2">📁 Views</div>
            <div className="pl-8">📁 Stored Procedures</div>
          </div>
          <div className="p-2 mt-4 text-[10px] uppercase tracking-wider opacity-60">
            Columns
          </div>
          <div className="px-2 text-[11px] space-y-0.5">
            {COLUMNS.map((c) => (
              <div key={c.name} className="flex justify-between">
                <span>{c.name}</span>
                <span className="opacity-60">{c.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Query + results */}
        <div className="flex-grow flex flex-col min-w-0">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
                e.preventDefault()
                execute()
              }
            }}
            spellCheck={false}
            className="h-1/3 font-mono text-xs p-3 bg-white dark:bg-[#1e1e1e] border-b border-black/10 dark:border-white/10 outline-none resize-none"
          />

          <div className="flex-grow flex flex-col min-h-0">
            <div className="h-7 bg-black/5 dark:bg-white/5 flex items-center px-3 text-[11px] shrink-0 justify-between">
              <span>Results</span>
              <span className="opacity-60">
                {error ? '' : `${rowCount} row${rowCount === 1 ? '' : 's'} · ${executedAt}`}
              </span>
            </div>
            {error ? (
              <div className="p-4 text-red-500 text-xs">⚠ {error}</div>
            ) : rows && rows.length > 0 ? (
              <div className="flex-grow overflow-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-black/5 dark:bg-white/5 sticky top-0">
                    <tr>
                      {['id', 'title', 'location', 'country_code', 'stack'].map((h) => (
                        <th key={h} className="text-left p-2 border-b border-black/10 dark:border-white/10 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-black/5 dark:border-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <td className="p-2">{p.id}</td>
                        <td className="p-2">{p.title}</td>
                        <td className="p-2">{p.location ?? '—'}</td>
                        <td className="p-2">{p.country_code ?? '—'}</td>
                        <td className="p-2 max-w-[300px] truncate" title={stackOf(p)}>
                          {stackOf(p)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center opacity-50 text-xs">
                No rows. Press Execute or hit Ctrl+Enter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
