import type { MouseEvent } from 'react'
import { useOsStore } from '../store/osStore'
import { appManifest } from '../apps/manifest'
import { adoptConsent } from '../lib/consent'
import { isPlainClick, takeHandoff } from '../../../assets/js/windowing/handoff.js'

// The build switch, v2's side. The tray's chip and the Desktop's build shortcut
// call the store's switchBuild, which leaves a hand-off for v1. Arriving from
// v1, main.tsx calls arriveFromOtherBuild before the first render, so the
// screen v1 left is the first thing drawn. See assets/js/windowing/handoff.js,
// and v1's side in store.js and shell.js.

/** Takes the hand-off v1 left, if there is a fresh one. Returns whether there was. */
export function arriveFromOtherBuild(storage?: Storage): boolean {
  let session: Storage
  try {
    session = storage ?? sessionStorage
  } catch {
    return false
  }
  const handoff = takeHandoff(session, {
    now: Date.now(),
    loadingFor: performance.now(),
    apps: Object.keys(appManifest),
    desktop: useOsStore.getState().desktop,
  })
  if (!handoff) return false
  adoptConsent(handoff.consent)
  useOsStore.getState().adoptHandoff(handoff)
  return true
}

/** The build chip. A plain click switches in place; any other opens the link as usual. */
export function followBuildLink(event: MouseEvent<HTMLAnchorElement>, name: string) {
  if (!isPlainClick(event)) return
  event.preventDefault()
  useOsStore.getState().switchBuild(event.currentTarget.getAttribute('href') ?? '/', name)
}
