import { useEffect, useMemo, useState } from 'react'

interface Project {
  id: number
  title: string
  description: string
  tags: string[]
  url: string
  location?: string
  country_code?: string
}

// Lightweight Excel mock — loads portfolio.json into a spreadsheet grid.
// Cells aren't editable in this port; that's a v1 limitation too.
export default function Excel() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeCell, setActiveCell] = useState<string>('A1')

  useEffect(() => {
    let cancelled = false
    fetch('/data/portfolio.json')
      .then((r) => r.json() as Promise<{ projects: Project[] }>)
      .then((d) => {
        if (!cancelled) setProjects(d.projects)
      })
      .catch(() => {
        /* leave empty */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const columns = useMemo(
    () => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const,
    [],
  )
  const headers = ['ID', 'Title', 'Location', 'Country', 'Stack', 'URL']

  return (
    <div className="h-full flex flex-col bg-[#f3f3f3] dark:bg-[#1c1c1c] text-black dark:text-white">
      <div className="h-8 bg-[#107c41] flex items-center px-3 shrink-0">
        <img src="/assets/img/excel.webp" alt="" className="w-4 h-4 mr-2" />
        <span className="text-white text-xs font-medium">portfolio.xlsx — Excel</span>
      </div>

      <div className="bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 shrink-0">
        <div className="flex items-center space-x-6 px-4 py-1 text-[11px] border-b border-gray-100 dark:border-gray-800">
          <span className="text-[#107c41] border-b-2 border-[#107c41] pb-0.5 font-bold">
            Home
          </span>
          {['Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View'].map((t) => (
            <span key={t} className="opacity-60 cursor-default">
              {t}
            </span>
          ))}
        </div>
        <div className="px-3 py-1 flex items-center space-x-2 text-xs">
          <div className="w-16 px-2 py-1 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded">
            {activeCell}
          </div>
          <span className="opacity-50">𝑓𝑥</span>
          <input
            type="text"
            readOnly
            className="flex-grow bg-transparent border border-gray-300 dark:border-white/10 rounded px-2 py-1"
          />
        </div>
      </div>

      <div className="flex-grow overflow-auto">
        <table className="text-[11px] border-collapse min-w-full">
          <thead>
            <tr>
              <th className="w-10 sticky left-0 bg-[#f3f3f3] dark:bg-[#1c1c1c] border-r border-b border-gray-300 dark:border-gray-700" />
              {columns.map((c, i) => (
                <th
                  key={c}
                  className="min-w-[140px] px-2 py-1 bg-[#f3f3f3] dark:bg-[#1c1c1c] border border-gray-300 dark:border-gray-700 font-normal text-gray-600 dark:text-gray-400"
                >
                  <div className="flex items-center justify-between">
                    <span>{c}</span>
                    {headers[i] && (
                      <span className="text-[10px] text-[#107c41]">{headers[i]}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(20, projects.length + 5) }).map((_, rowIdx) => {
              const p = projects[rowIdx]
              const r = rowIdx + 1
              return (
                <tr key={r}>
                  <td className="w-10 sticky left-0 bg-[#f3f3f3] dark:bg-[#1c1c1c] border-r border-b border-gray-300 dark:border-gray-700 text-center text-gray-500">
                    {r}
                  </td>
                  {columns.map((c, ci) => {
                    const cell = `${c}${r}`
                    let value = ''
                    if (p) {
                      const vals = [
                        String(p.id),
                        p.title,
                        p.location ?? '',
                        p.country_code ?? '',
                        p.tags.join(', '),
                        p.url,
                      ]
                      value = vals[ci] ?? ''
                    }
                    return (
                      <td
                        key={cell}
                        onClick={() => setActiveCell(cell)}
                        className={`min-w-[140px] px-2 py-1 border-r border-b border-gray-200 dark:border-gray-800 cursor-cell truncate ${
                          activeCell === cell
                            ? 'ring-2 ring-[#107c41] ring-inset bg-[#107c41]/5'
                            : ''
                        }`}
                        title={value}
                      >
                        {value}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="h-6 bg-[#107c41] text-white text-[10px] flex items-center px-3 shrink-0 justify-between">
        <span>Sheet1</span>
        <div className="flex items-center space-x-4">
          <span>Count: {projects.length}</span>
          <span>Ready</span>
        </div>
      </div>
    </div>
  )
}
