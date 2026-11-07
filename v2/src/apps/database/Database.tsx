import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SQL_EXAMPLES as EXAMPLES,
  SQL_TABLES as TABLES,
  latestQuery,
  runSql,
  sqlElapsedLabel,
  type Row,
  type SqlOutcome,
  type SqlTable as Table,
} from '../../../../assets/js/windowing/sql.js'

// SQL Server Management Studio over the CV. The server (api/cv_data.php) only
// ever returns whole tables; every WHERE, ORDER BY and LIMIT is parsed and
// applied in the browser by assets/js/windowing/sql.js, shared with v1, so no
// typed SQL reaches MySQL.

interface Cache {
  loadedAt: number
  rows: Row[]
}

const wideScreen = () => window.matchMedia('(min-width: 768px)').matches

export default function Database() {
  const [activeTable, setActiveTable] = useState<Table>('experience')
  const [query, setQuery] = useState<string>('SELECT * FROM [Portfolio_DB].[dbo].[experience]')
  const [executed, setExecuted] = useState<SqlOutcome['executed']>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resultsTab, setResultsTab] = useState<'results' | 'messages'>('results')
  const [helpOpen, setHelpOpen] = useState(false)
  // The Object Explorer folds away on phones, where it would crush the results.
  const [explorerOpen, setExplorerOpen] = useState(wideScreen)
  const cacheRef = useRef<Partial<Record<Table, Cache>>>({})
  const queriesRef = useRef(latestQuery())

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

  const show = useCallback((outcome: SqlOutcome) => {
    setExecuted(outcome.executed)
    setError(outcome.error)
    if (outcome.table) setActiveTable(outcome.table)
    setLoading(false)
  }, [])

  /** Runs a query. A slower, older query never replaces the newest one's results. */
  const execute = useCallback(
    (sql: string) => {
      const ticket = queriesRef.current.start()
      return runSql(sql, loadTable).then((outcome) => {
        if (queriesRef.current.isLatest(ticket)) show(outcome)
      })
    },
    [loadTable, show],
  )

  const runQueryWith = useCallback(
    (sql: string) => {
      setLoading(true)
      setError(null)
      return execute(sql)
    },
    [execute],
  )

  const runQuery = useCallback(() => runQueryWith(query), [runQueryWith, query])

  // Run the default query on mount.
  useEffect(() => {
    void execute('SELECT * FROM [Portfolio_DB].[dbo].[experience]')
  }, [execute])

  // Picking a table overwrites the editor, so that the visible SQL matches.
  const pickTable = (t: Table) => {
    const next = `SELECT * FROM [Portfolio_DB].[dbo].[${t}]`
    setQuery(next)
    if (!wideScreen()) setExplorerOpen(false)
    void runQueryWith(next)
  }

  const rowCount = executed?.rows.length ?? 0
  const elapsedLabel = sqlElapsedLabel(executed?.elapsed)

  return (
    <div
      className="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden"
      style={{ fontFamily: 'Segoe UI, sans-serif' }}
      data-ssms
    >
      {/* SSMS toolbar */}
      <div className="h-9 bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 flex items-center px-2 space-x-1 shrink-0 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setExplorerOpen((open) => !open)}
          aria-expanded={explorerOpen}
          aria-label="Object Explorer"
          title="Object Explorer"
          className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button type="button" className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1 shrink-0">
          <span className="text-[10px] font-semibold">New Query</span>
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
        <button
          type="button"
          onClick={runQuery}
          className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1 text-green-600"
        >
          <span className="text-[10px] font-bold">▶ Execute</span>
        </button>
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1"
        >
          <span className="text-[10px]">💡 Examples</span>
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
        <div className="flex items-center space-x-2 px-2">
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded-sm px-2 py-0.5">
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
              className="text-left p-2 rounded-sm hover:bg-white dark:hover:bg-white/5 border border-gray-200 dark:border-gray-700"
              title={ex.sql}
            >
              <div className="font-semibold">{ex.label}</div>
              <div className="opacity-60 truncate font-mono">{ex.sql}</div>
            </button>
          ))}
        </div>
      )}

      {/* Workspace */}
      <div className="grow flex min-h-0 relative">
        {/* Object Explorer: beside the query on wide screens, over it on phones */}
        <div
          className={`${explorerOpen ? 'flex' : 'hidden'} w-64 max-w-[85%] border-r border-gray-300 dark:border-gray-800 flex-col bg-[#f0f0f0] dark:bg-[#252526] shrink-0 overflow-hidden absolute md:static inset-y-0 left-0 z-30 shadow-xl md:shadow-none`}
        >
          <div className="p-2 bg-gray-200 dark:bg-[#333333] text-[11px] font-semibold border-b border-gray-300 dark:border-gray-800 flex items-center justify-between">
            <span>Object Explorer</span>
            <button
              type="button"
              className="opacity-60 hover:opacity-100 px-1"
              aria-label="Close Object Explorer"
              onClick={() => setExplorerOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="grow overflow-y-auto p-2 text-[11px]">
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
        <div className="grow flex flex-col min-w-0 bg-white dark:bg-[#1e1e1e]">
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
              className="grow w-full p-4 font-mono text-[13px] outline-hidden resize-none bg-white dark:bg-[#1e1e1e] text-black dark:text-white"
              aria-label="SQL query editor"
            />
          </div>

          {/* Results */}
          <div className="grow flex flex-col min-h-0">
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

            <div className="grow overflow-auto relative">
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
      <div className="h-6 bg-win-blue flex items-center px-2 shrink-0 text-white text-[10px] justify-between">
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
