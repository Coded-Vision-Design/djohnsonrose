import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EXAMPLES, execute, parse, ParseError, type Row } from './sql'

// SSMS-styled SQL viewer over the CV. The server-side endpoint
// (api/cv_data.php) only ever returns whole tables — every WHERE / ORDER BY /
// LIMIT is parsed and applied in the browser via ./sql.ts, so no user-typed
// SQL ever reaches MySQL. This keeps the UX interactive while leaving zero
// injection surface.

type Table = 'experience' | 'projects' | 'certifications' | 'education' | 'skills' | 'achievements' | 'interests'

const TABLES: { id: Table; label: string }[] = [
  { id: 'experience',     label: 'dbo.Experience' },
  { id: 'projects',       label: 'dbo.Projects' },
  { id: 'certifications', label: 'dbo.Certifications' },
  { id: 'education',      label: 'dbo.Education' },
  { id: 'skills',         label: 'dbo.Skills' },
  { id: 'achievements',   label: 'dbo.Achievements' },
  { id: 'interests',      label: 'dbo.Interests' },
]

const COLUMNS_BY_TABLE: Record<Table, string[]> = {
  experience:     ['id', 'role', 'company', 'period', 'location', 'highlights'],
  projects:       ['id', 'title', 'description', 'tags', 'url', 'location', 'country'],
  certifications: ['id', 'name', 'issuer', 'year'],
  education:      ['id', 'title', 'issuer'],
  skills:         ['id', 'category', 'name'],
  achievements:   ['id', 'title', 'result', 'category', 'date'],
  interests:      ['id', 'name'],
}

interface Cache {
  loadedAt: number
  rows: Row[]
}

export default function Database() {
  const [activeTable, setActiveTable] = useState<Table>('experience')
  const [query, setQuery] = useState<string>('SELECT * FROM [Portfolio_DB].[dbo].[experience]')
  const [executed, setExecuted] = useState<{ rows: Row[]; columns: string[]; elapsed: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultsTab, setResultsTab] = useState<'results' | 'messages'>('results')
  const [helpOpen, setHelpOpen] = useState(false)
  const cacheRef = useRef<Partial<Record<Table, Cache>>>({})

  const loadTable = useCallback(async (table: Table): Promise<Row[]> => {
    const hit = cacheRef.current[table]
    if (hit && Date.now() - hit.loadedAt < 60_000) return hit.rows
    const r = await fetch(`/api/cv_data.php?table=${table}`)
    if (!r.ok) throw new Error(`Failed to fetch table '${table}' (${r.status})`)
    const body = (await r.json()) as { data?: Row[]; error?: string }
    if (body.error) throw new Error(body.error)
    cacheRef.current[table] = { loadedAt: Date.now(), rows: body.data ?? [] }
    return body.data ?? []
  }, [])

  const runQuery = useCallback(async () => {
    setLoading(true)
    setError(null)
    const started = performance.now()
    try {
      const ast = parse(query)
      if (!TABLES.some((t) => t.id === ast.table)) {
        throw new ParseError(
          `Unknown table '${ast.table}'. Known tables: ${TABLES.map((t) => t.id).join(', ')}.`,
        )
      }
      const rows = await loadTable(ast.table as Table)
      const out = execute(ast, rows)
      const columns = ast.columns.includes('*')
        ? COLUMNS_BY_TABLE[ast.table as Table]
        : ast.columns
      setExecuted({ rows: out, columns, elapsed: performance.now() - started })
      setActiveTable(ast.table as Table)
    } catch (e) {
      setExecuted(null)
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [query, loadTable])

  // Run the default query on mount + whenever the user picks a table from the
  // tree (this also overwrites the editor so the visible SQL matches state).
  useEffect(() => {
    runQuery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickTable = (t: Table) => {
    const next = `SELECT * FROM [Portfolio_DB].[dbo].[${t}]`
    setQuery(next)
    // Defer to next tick so query state has updated before runQuery reads it.
    setTimeout(() => {
      setActiveTable(t)
      runQueryWith(next)
    }, 0)
  }

  const runQueryWith = useCallback(
    async (sql: string) => {
      setLoading(true)
      setError(null)
      const started = performance.now()
      try {
        const ast = parse(sql)
        if (!TABLES.some((t) => t.id === ast.table)) {
          throw new ParseError(`Unknown table '${ast.table}'.`)
        }
        const rows = await loadTable(ast.table as Table)
        const out = execute(ast, rows)
        const columns = ast.columns.includes('*')
          ? COLUMNS_BY_TABLE[ast.table as Table]
          : ast.columns
        setExecuted({ rows: out, columns, elapsed: performance.now() - started })
      } catch (e) {
        setExecuted(null)
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [loadTable],
  )

  const rowCount = executed?.rows.length ?? 0
  const elapsedLabel = useMemo(() => {
    if (!executed) return '00:00:00'
    const ms = executed.elapsed
    if (ms < 1000) return `00:00:${(ms / 1000).toFixed(3).padStart(6, '0')}`
    return `00:00:${Math.floor(ms / 1000).toString().padStart(2, '0')}`
  }, [executed])

  return (
    <div
      className="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden"
      style={{ fontFamily: 'Segoe UI, sans-serif' }}
    >
      {/* SSMS toolbar */}
      <div className="h-9 bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 flex items-center px-2 space-x-1 shrink-0">
        <button type="button" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1">
          <span className="text-[10px] font-semibold">New Query</span>
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
        <button
          type="button"
          onClick={runQuery}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1 text-green-600"
        >
          <span className="text-[10px] font-bold">▶ Execute</span>
        </button>
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1"
        >
          <span className="text-[10px]">💡 Examples</span>
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
        <div className="flex items-center space-x-2 px-2">
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5">
            <img src="/assets/img/mssql.webp" alt="" className="w-3 h-3 object-contain" />
            <span className="text-[10px]">DeVante-Workstation · Portfolio_DB</span>
          </div>
        </div>
        <div className="ml-auto text-[10px] opacity-60 pr-2 hidden sm:block">
          Read-only · client-side SELECT engine
        </div>
      </div>

      {/* Examples drawer */}
      {helpOpen && (
        <div className="bg-gray-50 dark:bg-[#252526] border-b border-gray-300 dark:border-gray-800 px-3 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 text-[10px] shrink-0">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.sql}
              type="button"
              onClick={() => {
                setQuery(ex.sql)
                setHelpOpen(false)
                setTimeout(() => runQueryWith(ex.sql), 0)
              }}
              className="text-left p-2 rounded hover:bg-white dark:hover:bg-white/5 border border-gray-200 dark:border-gray-700"
              title={ex.sql}
            >
              <div className="font-semibold">{ex.label}</div>
              <div className="opacity-60 truncate font-mono">{ex.sql}</div>
            </button>
          ))}
        </div>
      )}

      {/* Workspace */}
      <div className="flex-grow flex min-h-0">
        {/* Object Explorer */}
        <div className="w-64 border-r border-gray-300 dark:border-gray-800 flex flex-col bg-[#f0f0f0] dark:bg-[#252526] shrink-0 overflow-hidden">
          <div className="p-2 bg-gray-200 dark:bg-[#333333] text-[11px] font-semibold border-b border-gray-300 dark:border-gray-800 flex items-center justify-between">
            <span>Object Explorer</span>
            <button type="button" className="opacity-60">✕</button>
          </div>
          <div className="flex-grow overflow-y-auto p-2 text-[11px]">
            <div className="flex items-center space-x-1 cursor-default">
              <span className="text-[10px] transform rotate-90 opacity-60">▶</span>
              <img src="/assets/img/mssql.webp" alt="" className="w-3.5 h-3.5 object-contain" />
              <span className="font-semibold">DeVante-DB (SQL Server 16.0)</span>
            </div>
            <div className="ml-4 mt-1 space-y-1">
              <div className="flex items-center space-x-1 cursor-pointer hover:text-win-blue">
                <span className="text-[10px] transform rotate-90 opacity-60">▶</span>
                <span className="text-yellow-600">📁</span>
                <span>Databases</span>
              </div>
              <div className="ml-4 space-y-1">
                <div className="flex items-center space-x-1 text-win-blue font-semibold">
                  <span className="text-[10px] transform rotate-90">▼</span>
                  <span className="text-yellow-600">🗄️</span>
                  <span>Portfolio_DB</span>
                </div>
                <div className="ml-4 space-y-1">
                  {TABLES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickTable(t.id)}
                      className="w-full text-left flex items-center space-x-1 cursor-pointer hover:text-win-blue"
                    >
                      <span className="text-blue-500">📊</span>
                      <span className={activeTable === t.id ? 'font-bold underline' : ''}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-1 cursor-default opacity-60">
                <span className="text-[10px] opacity-60">▶</span>
                <span className="text-yellow-600">📁</span>
                <span>Security</span>
              </div>
              <div className="flex items-center space-x-1 cursor-default opacity-60">
                <span className="text-[10px] opacity-60">▶</span>
                <span className="text-yellow-600">📁</span>
                <span>Server Objects</span>
              </div>
            </div>
          </div>
        </div>

        {/* Query + results */}
        <div className="flex-grow flex flex-col min-w-0 bg-white dark:bg-[#1e1e1e]">
          {/* SQL editor */}
          <div className="h-1/3 border-b border-gray-300 dark:border-gray-800 flex flex-col shrink-0">
            <div className="h-6 bg-gray-100 dark:bg-[#2d2d2d] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center text-[10px] space-x-2">
              <span className="font-bold border-b-2 border-win-blue pb-0.5">SQLQuery1.sql</span>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  runQuery()
                }
                if (e.key === 'F5') {
                  e.preventDefault()
                  runQuery()
                }
              }}
              className="flex-grow w-full p-4 font-mono text-[13px] outline-none resize-none bg-white dark:bg-[#1e1e1e] text-black dark:text-white"
              aria-label="SQL query editor"
            />
          </div>

          {/* Results */}
          <div className="flex-grow flex flex-col min-h-0">
            <div className="h-6 bg-gray-100 dark:bg-[#2d2d2d] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center text-[10px] space-x-4">
              <button
                type="button"
                onClick={() => setResultsTab('results')}
                className={resultsTab === 'results' ? 'font-bold border-b-2 border-win-blue pb-0.5' : 'opacity-60'}
              >
                Results
              </button>
              <button
                type="button"
                onClick={() => setResultsTab('messages')}
                className={resultsTab === 'messages' ? 'font-bold border-b-2 border-win-blue pb-0.5' : 'opacity-60'}
              >
                Messages
              </button>
            </div>

            <div className="flex-grow overflow-auto relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-win-blue" />
                </div>
              )}

              {error && resultsTab === 'results' && (
                <div className="p-4 text-red-500 font-mono text-xs">
                  <div className="font-bold mb-1">Msg 50000, Level 16, State 1</div>
                  <span>{error}</span>
                </div>
              )}

              {resultsTab === 'messages' && (
                <div className="p-4 font-mono text-xs">
                  {error ? (
                    <span className="text-red-500">{error}</span>
                  ) : executed ? (
                    <>({rowCount} row{rowCount === 1 ? '' : 's'} affected) · {executed.elapsed.toFixed(1)} ms</>
                  ) : (
                    'Awaiting query…'
                  )}
                </div>
              )}

              {!error && resultsTab === 'results' && executed && (
                <table className="w-full text-left text-[11px] border-collapse min-w-max">
                  <thead className="bg-gray-100 dark:bg-[#252526] sticky top-0 z-10">
                    <tr>
                      <th className="p-1 w-8 border border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-[#333]" />
                      {executed.columns.map((col) => (
                        <th
                          key={col}
                          className="p-1 px-3 border border-gray-300 dark:border-gray-700 font-normal"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {executed.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-win-blue/10">
                        <td className="p-1 text-center bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-gray-700 opacity-60">
                          {idx + 1}
                        </td>
                        {executed.columns.map((col) => (
                          <td
                            key={col}
                            className={`p-1 px-3 border border-gray-300 dark:border-gray-700 truncate max-w-[300px] ${
                              row[col] === null ? 'italic text-gray-400' : ''
                            }`}
                            title={row[col] != null ? String(row[col]) : 'NULL'}
                          >
                            {row[col] === null ? 'NULL' : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 bg-[#0078d4] flex items-center px-2 shrink-0 text-white text-[10px] justify-between">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <span
              className={`w-2 h-2 rounded-full border border-white ${
                error ? 'bg-red-400' : 'bg-green-400'
              }`}
            />
            <span>
              {error
                ? `Query failed.`
                : loading
                  ? 'Executing query...'
                  : 'Query executed successfully.'}
            </span>
          </span>
        </div>
        <div className="flex items-center space-x-4 divide-x divide-white/20">
          <span className="pl-4">DEVANTE-PC (16.0 RTM)</span>
          <span className="pl-4">sa (54)</span>
          <span className="pl-4">Portfolio_DB</span>
          <span className="pl-4">{rowCount} rows</span>
          <span className="pl-4">{elapsedLabel}</span>
        </div>
      </div>
    </div>
  )
}
