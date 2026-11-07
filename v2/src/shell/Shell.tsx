import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'
import { BootScreen } from './BootScreen'
import { LockScreen } from './LockScreen'
import { Desktop } from './Desktop'
import { getApp } from '../apps/registry'
import { findEntry, sharedPath } from '../../../assets/js/windowing/file-ops.js'
import {
  addressedApp,
  followAddress,
  readAddress,
  showAddressed,
} from '../../../assets/js/windowing/address.js'
import { appManifest, getManifestEntry } from '../apps/manifest'
import { openEntry } from './openEntry'

const BASE = import.meta.env.BASE_URL
const APP_IDS = Object.keys(appManifest)

export function Shell() {
  const isBooting = useOsStore((s) => s.isBooting)
  const loggedIn = useOsStore((s) => s.loggedIn)
  const openApp = useOsStore((s) => s.openApp)
  const finishBoot = useOsStore((s) => s.finishBoot)

  // If already logged in (persisted), skip boot screen entirely - matches v1.
  useEffect(() => {
    if (loggedIn && isBooting) finishBoot()
  }, [loggedIn, isBooting, finishBoot])

  // A shared link: open that file once we land on the desktop.
  useEffect(() => {
    const shared = sharedPath(window.location.hash)
    if (!loggedIn || !shared) return
    window.history.replaceState(null, '', window.location.pathname)
    const found = findEntry(useOsStore.getState().fileSystem, shared)
    if (found) openEntry(found.entry, found.path)
  }, [loggedIn])

  // Deep link: open the app the address names once we land on the desktop,
  // after signing in too. Signing out leaves the desktop's address, so signing
  // in again opens nothing.
  useEffect(() => {
    const initialApp = loggedIn ? readAddress(BASE, window.location.pathname, APP_IDS)?.app : null
    if (initialApp) {
      const def = getApp(initialApp)
      const t = window.setTimeout(
        () =>
          openApp(
            initialApp,
            def?.title,
            def ? { size: { w: def.defaultSize.w, h: def.defaultSize.h } } : undefined,
          ),
        100,
      )
      return () => window.clearTimeout(t)
    }
  }, [loggedIn, openApp])

  // The address follows the window in front, and Back and Forward bring
  // windows back, as v1's shell.js does. See address.js.
  useEffect(() => {
    const follower = followAddress({
      base: BASE,
      appIds: APP_IDS,
      titleOf: (app) => getManifestEntry(app)?.title,
      show: (app) => {
        const store = useOsStore.getState()
        if (store.loggedIn) showAddressed(store, app)
      },
    })
    const update = (s: ReturnType<typeof useOsStore.getState>) =>
      follower.update({ app: addressedApp(s.windows, s.focusedWindowId), opens: s.windowsOpened })
    update(useOsStore.getState())
    const unsubscribe = useOsStore.subscribe(update)
    return () => {
      unsubscribe()
      follower.stop()
    }
  }, [])

  if (isBooting) return <BootScreen />
  // The skip link in App.tsx lands here, as on v1's <main> in partials/shell.php.
  return (
    <main id="main-content" tabIndex={-1} className="outline-hidden">
      {loggedIn ? <Desktop /> : <LockScreen />}
    </main>
  )
}
