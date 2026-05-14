import { useEffect, useState } from 'react'

interface Container {
  id: string
  name: string
  image: string
  status: 'Running' | 'Stopped' | 'Exited'
  ports: string
  cpu: number
  memory: string
}

const SEED: Container[] = [
  {
    id: 'a4f1b9',
    name: 'portfolio-php',
    image: 'php:8.2-apache',
    status: 'Running',
    ports: '8765:80',
    cpu: 2.4,
    memory: '64 MiB',
  },
  {
    id: 'b7c2e1',
    name: 'portfolio-react',
    image: 'node:22-alpine',
    status: 'Running',
    ports: '5173:5173',
    cpu: 8.7,
    memory: '180 MiB',
  },
  {
    id: 'd0e3a8',
    name: 'mysql-portfolio',
    image: 'mysql:8.0',
    status: 'Running',
    ports: '3306:3306',
    cpu: 0.6,
    memory: '420 MiB',
  },
  {
    id: 'e4f5d2',
    name: 'redis-cache',
    image: 'redis:7-alpine',
    status: 'Running',
    ports: '6379:6379',
    cpu: 0.1,
    memory: '24 MiB',
  },
  {
    id: 'f1g6h3',
    name: 'nginx-proxy',
    image: 'nginx:1.27-alpine',
    status: 'Stopped',
    ports: '—',
    cpu: 0,
    memory: '0 MiB',
  },
  {
    id: '9c0a4b',
    name: 'postgres-staging',
    image: 'postgres:16',
    status: 'Exited',
    ports: '—',
    cpu: 0,
    memory: '0 MiB',
  },
]

export default function Docker() {
  const [containers, setContainers] = useState<Container[]>(SEED)

  // Wobble CPU on running containers so it feels alive.
  useEffect(() => {
    const id = window.setInterval(() => {
      setContainers((prev) =>
        prev.map((c) =>
          c.status === 'Running'
            ? { ...c, cpu: +Math.max(0.1, c.cpu + (Math.random() - 0.5) * 1.6).toFixed(1) }
            : c,
        ),
      )
    }, 2000)
    return () => window.clearInterval(id)
  }, [])

  const toggle = (id: string) => {
    setContainers((prev) =>
      prev.map((c) =>
        c.id === id
          ? c.status === 'Running'
            ? { ...c, status: 'Stopped', cpu: 0, memory: '0 MiB' }
            : { ...c, status: 'Running', cpu: 1.2, memory: '64 MiB' }
          : c,
      ),
    )
  }

  const remove = (id: string) => {
    setContainers((prev) => prev.filter((c) => c.id !== id))
  }

  const runningCount = containers.filter((c) => c.status === 'Running').length

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none">
      {/* Title strip */}
      <div className="h-9 bg-[#0db7ed] text-white flex items-center px-4 shrink-0">
        <img src="/assets/img/docker.webp" alt="" className="w-5 h-5 mr-2" />
        <span className="font-semibold text-sm">Docker Desktop</span>
        <span className="ml-auto text-xs opacity-90">
          v4.32 · {runningCount} running
        </span>
      </div>

      <div className="flex-grow flex min-h-0">
        {/* Side nav */}
        <div className="w-48 border-r border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#252526] shrink-0 p-2 space-y-1 text-xs">
          {[
            ['Containers', '🟢'],
            ['Images', '🗃'],
            ['Volumes', '💾'],
            ['Builds', '🔨'],
            ['Dev Environments', '🧪'],
            ['Extensions', '🧩'],
          ].map(([label, icon], i) => (
            <div
              key={label}
              className={`flex items-center px-2 py-1.5 rounded cursor-default ${
                i === 0 ? 'bg-[#0db7ed]/15 text-[#0db7ed] font-medium' : 'opacity-70'
              }`}
            >
              <span className="mr-2">{icon}</span>
              {label}
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-grow flex flex-col min-w-0">
          <div className="h-10 border-b border-black/10 dark:border-white/10 flex items-center px-4 shrink-0">
            <h2 className="text-sm font-semibold">Containers</h2>
            <span className="ml-3 text-[11px] opacity-60">
              {containers.length} total
            </span>
          </div>

          <div className="grid grid-cols-12 bg-black/5 dark:bg-white/5 py-2 px-4 text-[11px] font-bold text-gray-500 shrink-0">
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Image</div>
            <div className="col-span-1 text-right">CPU</div>
            <div className="col-span-2 text-right">Memory</div>
            <div className="col-span-1 text-right">Ports</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          <div className="flex-grow overflow-y-auto">
            {containers.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-12 py-2 px-4 text-xs border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 group items-center"
              >
                <div className="col-span-3 flex items-center min-w-0">
                  <span className="mr-2 shrink-0">
                    {c.status === 'Running' ? '🟢' : c.status === 'Stopped' ? '⏸' : '🔴'}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-[10px] opacity-50 truncate font-mono">{c.id}</div>
                  </div>
                </div>
                <div className="col-span-3 truncate font-mono opacity-70">{c.image}</div>
                <div className="col-span-1 text-right tabular-nums">{c.cpu}%</div>
                <div className="col-span-2 text-right opacity-70">{c.memory}</div>
                <div className="col-span-1 text-right opacity-70 text-[10px]">{c.ports}</div>
                <div className="col-span-2 text-right flex items-center justify-end space-x-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      c.status === 'Running'
                        ? 'text-emerald-500'
                        : c.status === 'Exited'
                          ? 'text-red-500'
                          : 'opacity-60'
                    }`}
                  >
                    {c.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    title={c.status === 'Running' ? 'Stop' : 'Start'}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    {c.status === 'Running' ? '⏸' : '▶'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    title="Remove"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
            {containers.length === 0 && (
              <div className="h-32 flex items-center justify-center opacity-50 text-xs">
                No containers. Mock fleet emptied.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="h-7 border-t border-black/10 dark:border-white/10 flex items-center px-4 shrink-0 justify-between text-[10px] opacity-60">
            <span>Docker Engine v27.0 · WSL 2 backend</span>
            <span>RAM 8.0 GiB · Disk 64 GiB</span>
          </div>
        </div>
      </div>
    </div>
  )
}
