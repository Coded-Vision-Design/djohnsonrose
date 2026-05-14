import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'
import { BootScreen } from './BootScreen'
import { LockScreen } from './LockScreen'
import { Desktop } from './Desktop'

interface ShellProps {
  // If passed, opens this app once boot+login complete (for /app/:name routes).
  initialApp?: string
}

export function Shell({ initialApp }: ShellProps) {
  const isBooting = useOsStore((s) => s.isBooting)
  const loggedIn = useOsStore((s) => s.loggedIn)
  const openApp = useOsStore((s) => s.openApp)
  const finishBoot = useOsStore((s) => s.finishBoot)

  // If already logged in (persisted), skip boot screen entirely — matches v1.
  useEffect(() => {
    if (loggedIn && isBooting) finishBoot()
  }, [loggedIn, isBooting, finishBoot])

  // Deep link: open the requested app once we land on the desktop.
  useEffect(() => {
    if (loggedIn && initialApp) {
      const t = window.setTimeout(() => openApp(initialApp), 100)
      return () => window.clearTimeout(t)
    }
  }, [loggedIn, initialApp, openApp])

  if (isBooting) return <BootScreen />
  if (!loggedIn) return <LockScreen />
  return <Desktop />
}
