import { useMemo, useState } from 'react'
import { useOsStore, type EventLog } from '../../store/osStore'

type Filter = 'All' | EventLog['level']

const levelEmoji: Record<EventLog['level'], string> = {
  Information: 'ℹ️',
  Warning: '⚠️',
  Error: '❌',
}

const levelClass: Record<EventLog['level'], string> = {
  Information: 'text-blue-500',
  Warning: 'text-yellow-500',
  Error: 'text-red-500',
}

export default function EventViewer() {
  const logs = useOsStore((s) => s.eventLogs)
  const [filter, setFilter] = useState<Filter>('All')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const visible = useMemo(() => {
    if (filter === 'All') return logs
    return logs.filter((l) => l.level === filter)
  }, [logs, filter])

  const selected = visible.find((l) => l.id === selectedId) ?? null

  return (
    <div className="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden">
      {/* Header */}
      <div className="h-9 bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 flex items-center px-4 shrink-0 justify-between">
        <div className="flex items-center space-x-2 min-w-0 mr-2">
          <img src="/assets/img/eventviewer.webp" alt="" className="w-4 h-4 object-contain shrink-0" />
          <span className="text-xs font-semibold truncate">Event Viewer (Local)</span>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className="bg-transparent border border-gray-300 dark:border-gray-700 rounded text-[10px] px-2 py-0.5 outline-none"
        >
          <option value="All">All Events</option>
          <option value="Information">Information</option>
          <option value="Warning">Warning</option>
          <option value="Error">Error</option>
        </select>
      </div>

      <div className="flex-grow flex min-h-0">
        {/* Sidebar (desktop only) */}
        <div className="w-56 bg-white dark:bg-[#252526] border-r border-gray-300 dark:border-gray-800 flex flex-col shrink-0 hidden lg:flex">
          <div className="p-3 text-[11px] font-bold opacity-60 border-b border-gray-200 dark:border-gray-800">
            Console Tree
          </div>
          <div className="flex-grow overflow-y-auto py-2">
            <div className="px-4 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-win-blue font-medium flex items-center">
              <span className="mr-2">📂</span> Windows Logs
            </div>
            <div className="pl-8 space-y-1 mt-1">
              {['Application', 'Security', 'Setup', 'System'].map((label) => (
                <div
                  key={label}
                  className="text-xs hover:bg-black/5 dark:hover:bg-white/5 py-1 px-2 rounded cursor-pointer"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-grow flex flex-col min-w-0">
          <div className="flex-grow flex flex-col min-h-0 bg-white dark:bg-[#1e1e1e]">
            <div className="grid grid-cols-12 bg-gray-100 dark:bg-[#2d2d2d] py-1.5 px-4 text-[11px] font-bold border-b border-gray-300 dark:border-gray-800 shrink-0">
              <div className="col-span-2">Level</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-6">Description</div>
            </div>
            <div className="flex-grow overflow-y-auto">
              {visible.length === 0 ? (
                <div className="h-full flex items-center justify-center opacity-50 text-xs">
                  No events to display. Open a few apps and they'll show up here.
                </div>
              ) : (
                visible.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedId(log.id)}
                    className={`w-full text-left grid grid-cols-12 py-1 px-4 text-[11px] border-b border-gray-100 dark:border-white/5 transition-colors ${
                      selectedId === log.id
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="col-span-2 flex items-center">
                      <span className={`mr-2 ${levelClass[log.level]}`}>
                        {levelEmoji[log.level]}
                      </span>
                      <span>{log.level}</span>
                    </div>
                    <div className="col-span-2 text-gray-500 truncate">{log.time}</div>
                    <div className="col-span-2 truncate">{log.source}</div>
                    <div className="col-span-6 truncate">{log.description}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="h-48 bg-gray-50 dark:bg-[#252526] border-t border-gray-300 dark:border-gray-800 p-4 overflow-y-auto shrink-0">
            {selected ? (
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">
                  General details
                </div>
                <div className="text-xs leading-relaxed">{selected.description}</div>
                <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-500 mt-4">
                  <div>
                    <span className="font-bold uppercase block">Log name</span>
                    <span>{selected.source === 'Security' ? 'Security' : 'System'}</span>
                  </div>
                  <div>
                    <span className="font-bold uppercase block">Source</span>
                    <span>{selected.source}</span>
                  </div>
                  <div>
                    <span className="font-bold uppercase block">Logged</span>
                    <span>
                      {selected.date} {selected.time}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold uppercase block">Computer</span>
                    <span>DeVante-Workstation</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs opacity-40">
                Select an event to view its details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
