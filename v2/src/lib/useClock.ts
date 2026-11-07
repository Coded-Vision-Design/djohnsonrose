import { useEffect } from 'react'
import { clockDate, clockTime } from '../../../assets/js/windowing/shell-core.js'
import { useOsStore } from '../store/osStore'

// Drives the taskbar clock. Updates every second.
export function useClock() {
  const setClock = useOsStore((s) => s.setClock)

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock({ time: clockTime(d), date: clockDate(d) })
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [setClock])
}
