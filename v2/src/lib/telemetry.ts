// Centralised telemetry: a single `track()` function POSTs to /api/log.php
// (same endpoint as v1). Calls are no-ops until the visitor accepts the cookie
// banner, and stop again if they withdraw it in Settings, as in v1.

import { readConsent } from './consent'
import { deviceInfo } from '../../../assets/js/windowing/shell-ui.js'

const SESSION_KEY = 'react.os.sessionID'

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Session storage can be blocked, which throws. The id then lasts for this page.
let pageSessionId: string | null = null

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      // Prefer randomUUID where available; fall back to crypto.getRandomValues
      // (cryptographically secure) rather than Math.random. Same shape either
      // way, a hex string we feed back to /api/log.php for session grouping.
      id = crypto.randomUUID?.() ?? randomHex(16)
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    pageSessionId ??= crypto.randomUUID?.() ?? randomHex(16)
    return pageSessionId
  }
}

/**
 * Fire-and-forget telemetry. No await, no thrown errors, as failures log to
 * the console only. Honours the cookie consent choice.
 */
export function track(action: string, details: Record<string, unknown> = {}): void {
  if (readConsent() !== true) return
  fetch('/api/log.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      details: { ...details, sessionID: getSessionId(), source: 'react' },
      // The same as v1's: see deviceInfo in shell-ui.js.
      deviceInfo: deviceInfo({
        userAgent: navigator.userAgent,
        screen: window.screen,
        touchPoints: navigator.maxTouchPoints,
      }),
    }),
    // keepalive lets the call survive a navigation/unload.
    keepalive: true,
  }).catch((e) => console.warn('Telemetry failed:', e))
}

/**
 * Lightweight key-based dedupe: only fire the action once per session id.
 * Useful for "first login", "first start menu open" etc.
 */
const fired = new Set<string>()
export function trackOnce(action: string, details?: Record<string, unknown>): void {
  if (fired.has(action)) return
  fired.add(action)
  track(action, details)
}
