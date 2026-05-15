import { useEffect, useState } from 'react'

// 1:1 port of partials/apps/database.php — SSMS chrome with toolbar, object
// explorer tree, contenteditable SQL editor, Results/Messages tabs, and the
// win-blue status bar. Calls /api/database_query.php like v1 does.

type Table = 'projects' | 'experience' | 'certifications' | 'email_logs'

type Row = Record<string, string | number | null>

interface QueryResult {
  columns?: string[]
  data?: Row[]
  count?: number
  error?: string
}

const TABLE_LABELS: Record<Table, string> = {
  projects: 'dbo.Projects',
  experience: 'dbo.Experience',
  certifications: 'dbo.Certifications',
  email_logs: 'dbo.EmailLogs',
}

export default function Database() {
  const [activeTable, setActiveTable] = useState<Table>('projects')
  const [columns, setColumns] = useState<string[]>([])
  const [tableData, setTableData] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultsTab, setResultsTab] = useState<'results' | 'messages'>('results')

  const query = `SELECT * FROM [Portfolio_DB].[dbo].[${activeTable}]`

  const executeQuery = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/database_query.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const body = (await res.json()) as QueryResult
      if (body.error) {
        setError(body.error)
        setTableData([])
        setColumns([])
      } else {
        setColumns(body.columns ?? [])
        setTableData(body.data ?? [])
      }
    } catch (e) {
      setError(`Network error: ${(e as Error).message}`)
      setTableData([])
      setColumns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    executeQuery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTable])

  return (
    <div className="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {/* SSMS toolbar */}
      <div className="h-9 bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 flex items-center px-2 space-x-1 shrink-0">
        <button type="button" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1">
          <span className="text-[10px] font-semibold">New Query</span>
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
        <button
          type="button"
          onClick={executeQuery}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1 text-green-600"
        >
          <span className="text-[10px] font-bold">▶ Execute</span>
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
        <div className="flex items-center space-x-2 px-2">
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5">
            <img src="/assets/img/mssql.webp" alt="" className="w-3 h-3 object-contain" />
            <span className="text-[10px]">DeVante-Workstation</span>
          </div>
        </div>
      </div>

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
                  {(Object.keys(TABLE_LABELS) as Table[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTable(t)}
                      className="w-full text-left flex items-center space-x-1 cursor-pointer hover:text-win-blue"
                    >
                      <span className="text-blue-500">📊</span>
                      <span className={activeTable === t ? 'font-bold underline' : ''}>
                        {TABLE_LABELS[t]}
                      </span>
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
          {/* SQL editor (read-only display matching v1's syntax highlight) */}
          <div className="h-1/3 border-b border-gray-300 dark:border-gray-800 flex flex-col shrink-0">
            <div className="h-6 bg-gray-100 dark:bg-[#2d2d2d] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center text-[10px] space-x-2">
              <span className="font-bold border-b-2 border-win-blue pb-0.5">SQLQuery1.sql</span>
            </div>
            <div className="flex-grow p-4 font-mono text-[13px] overflow-auto">
              <span className="text-blue-600 dark:text-blue-400 font-bold">SELECT</span> *{' '}
              <span className="text-blue-600 dark:text-blue-400 font-bold">FROM</span>{' '}
              <span className="text-green-600 dark:text-green-400">
                [Portfolio_DB].[dbo].[{activeTable}]
              </span>
            </div>
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
                  ) : (
                    <>
                      ({tableData.length} row{tableData.length === 1 ? '' : 's'} affected)
                    </>
                  )}
                </div>
              )}

              {!error && resultsTab === 'results' && (
                <table className="w-full text-left text-[11px] border-collapse min-w-max">
                  <thead className="bg-gray-100 dark:bg-[#252526] sticky top-0 z-10">
                    <tr>
                      <th className="p-1 w-8 border border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-[#333]" />
                      {columns.map((col) => (
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
                    {tableData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-win-blue/10">
                        <td className="p-1 text-center bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-gray-700 opacity-60">
                          {idx + 1}
                        </td>
                        {columns.map((col) => (
                          <td
                            key={col}
                            className={`p-1 px-3 border border-gray-300 dark:border-gray-700 truncate max-w-[250px] ${
                              row[col] === null ? 'italic text-gray-400' : ''
                            }`}
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
          <span className="pl-4">{tableData.length} rows</span>
          <span className="pl-4">00:00:00</span>
        </div>
      </div>
    </div>
  )
}
