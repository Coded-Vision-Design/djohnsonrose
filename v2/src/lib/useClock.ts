import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'

const formatTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

const formatDate = (d: Date) =>
  d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })

// Drives the taskbar clock. Updates every second.
export function useClock() {
  const setClock = useOsStore((s) => s.setClock)

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock({ time: formatTime(d), date: formatDate(d) })
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [setClock])
}
