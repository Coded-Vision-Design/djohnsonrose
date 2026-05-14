import { useEffect, useState } from 'react'
import { useOsStore, type WinWindow } from '../../store/osStore'
import { getApp } from '../registry'

interface Stats {
  cpu: number
  ram: number
  network: number
}

const wobble = (prev: number, min: number, max: number, step: number) => {
  const delta = (Math.random() - 0.5) * step
  return Math.max(min, Math.min(max, prev + delta))
}

const formatUptime = (ms: number) => {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Pseudo-RAM allocation per app — same vibe as v1, just deterministic.
const ramFor = (w: WinWindow) =>
  Math.round(120 + ((w.id * 31) % 380))

const cpuFor = (isFocused: boolean) =>
  isFocused ? Math.round(2 + Math.random() * 6) : Math.round(0.5 + Math.random() * 2)

export default function TaskManager() {
  const windows = useOsStore((s) => s.windows)
  const focusedId = useOsStore((s) => s.focusedWindowId)
  const closeWindow = useOsStore((s) => s.closeWindow)
  const [stats, setStats] = useState<Stats>({ cpu: 12, ram: 4320, network: 2 })
  const [uptime, setUptime] = useState(0)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => {
      setStats((s) => ({
        cpu: Math.round(wobble(s.cpu, 4, 85, 6)),
        ram: Math.round(wobble(s.ram, 3200, 12_800, 200)),
        network: Math.max(0, +wobble(s.network, 0, 12, 1).toFixed(1)),
      }))
      setUptime(Date.now() - startedAt)
    }, 1500)
    return () => window.clearInterval(id)
  }, [startedAt])

  const ramGb = (stats.ram / 1024).toFixed(1)

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-black/10 dark:border-white/10 flex items-center px-4 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-win-blue rounded flex items-center justify-center text-white text-xs">
            📊
          </div>
          <h1 className="text-sm font-semibold">Task Manager</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 border-b border-black/10 dark:border-white/10 shrink-0">
        <div className="p-4 border-r border-black/10 dark:border-white/10">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
            CPU usage
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-light">{stats.cpu}%</span>
            <div className="flex-grow h-1.5 bg-black/5 dark:bg-white/5 rounded-full mb-2 overflow-hidden">
              <div
                className="h-full bg-win-blue transition-all duration-700"
                style={{ width: `${stats.cpu}%` }}
              />
            </div>
          </div>
        </div>
        <div className="p-4 border-r border-black/10 dark:border-white/10">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
            Memory
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-light">{ramGb} GB</span>
            <div className="flex-grow h-1.5 bg-black/5 dark:bg-white/5 rounded-full mb-2 overflow-hidden">
              <div
                className="h-full bg-win-blue transition-all duration-700"
                style={{ width: `${(stats.ram / 16_384) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="p-4 border-r border-black/10 dark:border-white/10">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
            Network
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-2xl font-light">{stats.network} Mbps</span>
            <div className="flex-grow h-1.5 bg-black/5 dark:bg-white/5 rounded-full mb-2 overflow-hidden">
              <div
                className="h-full bg-win-blue transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.network / 10) * 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
            Uptime
          </div>
          <div className="text-2xl font-light">{formatUptime(uptime)}</div>
        </div>
      </div>

      {/* Process header */}
      <div className="grid grid-cols-12 bg-black/5 dark:bg-white/5 py-2 px-4 text-[11px] font-bold text-gray-500 shrink-0">
        <div className="col-span-5">Name</div>
        <div className="col-span-2 text-right">Status</div>
        <div className="col-span-1 text-right">CPU</div>
        <div className="col-span-2 text-right">Memory</div>
        <div className="col-span-2 text-right">Network</div>
      </div>

      {/* Processes */}
      <div className="flex-grow overflow-y-auto">
        {windows.length === 0 ? (
          <div className="px-4 py-6 text-xs opacity-50">
            No user processes. Open an app from the start menu.
          </div>
        ) : (
          windows.map((w) => {
            const def = getApp(w.app)
            const focused = w.id === focusedId
            return (
              <div
                key={w.id}
                className="grid grid-cols-12 py-1.5 px-4 text-xs hover:bg-win-blue/10 border-b border-black/5 dark:border-white/5 group transition-colors items-center"
              >
                <div className="col-span-5 flex items-center text-black dark:text-white min-w-0">
                  {def && <img src={def.icon} alt="" className="w-4 h-4 mr-2 shrink-0" />}
                  <span className="truncate font-medium">{w.title}</span>
                  <button
                    type="button"
                    onClick={() => closeWindow(w.id)}
                    className="ml-2 hidden group-hover:inline-block text-[10px] text-red-500 hover:text-white hover:bg-red-500 font-bold px-1.5 py-0.5 border border-red-500/20 rounded"
                  >
                    End task
                  </button>
                </div>
                <div className="col-span-2 text-right opacity-60">
                  {w.minimized ? 'Suspended' : 'Running'}
                </div>
                <div className="col-span-1 text-right opacity-80">{cpuFor(focused)}%</div>
                <div className="col-span-2 text-right opacity-80">{ramFor(w)} MB</div>
                <div className="col-span-2 text-right opacity-80 text-win-blue">
                  {focused ? `${stats.network} Mbps` : '0 Mbps'}
                </div>
              </div>
            )
          })
        )}

        {/* Fake system processes (cosmetic) */}
        <div className="grid grid-cols-12 py-1.5 px-4 text-xs opacity-40 italic border-b border-black/5 dark:border-white/5">
          <div className="col-span-5">System Idle Process</div>
          <div className="col-span-2 text-right">Running</div>
          <div className="col-span-1 text-right">{100 - stats.cpu}%</div>
          <div className="col-span-2 text-right">0 MB</div>
          <div className="col-span-2 text-right">0 Mbps</div>
        </div>
        <div className="grid grid-cols-12 py-1.5 px-4 text-xs opacity-60 border-b border-black/5 dark:border-white/5">
          <div className="col-span-5">Desktop Window Manager</div>
          <div className="col-span-2 text-right">Running</div>
          <div className="col-span-1 text-right">1.2%</div>
          <div className="col-span-2 text-right">42.5 MB</div>
          <div className="col-span-2 text-right">0.1 Mbps</div>
        </div>
      </div>

      <div className="h-8 border-t border-black/10 dark:border-white/10 flex items-center px-4 shrink-0 justify-between">
        <span className="text-[10px] text-gray-500">Processes: {windows.length + 42}</span>
        <button type="button" className="text-[10px] text-win-blue hover:underline">
          Fewer details
        </button>
      </div>
    </div>
  )
}
