// Centralised telemetry: a single `track()` function POSTs to /api/log.php
// (same endpoint as v1). Calls are no-ops until the user accepts the cookie
// banner, mirroring v1's behaviour.

const SESSION_KEY = 'react.os.sessionID'

function getDeviceInfo() {
  const ua = navigator.userAgent
  let os = 'Unknown'
  if (ua.includes('Win')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('like Mac')) os = 'iOS'
  return {
    os,
    browser: navigator.appName + ' ' + navigator.appVersion,
    resolution: `${window.screen.width}x${window.screen.height}`,
    deviceTime: new Date().toString(),
    userAgent: ua,
  }
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    // Prefer randomUUID where available; fall back to crypto.getRandomValues
    // (cryptographically secure) rather than Math.random. Same shape either
    // way — a hex string we feed back to /api/log.php for session grouping.
    id = crypto.randomUUID?.() ?? randomHex(16)
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function consentGranted(): boolean {
  return localStorage.getItem('react.cookie.consent') === 'true'
}

/**
 * Fire-and-forget telemetry. No await, no thrown errors — failures log to
 * console only. Honors the cookie consent flag.
 */
export function track(action: string, details: Record<string, unknown> = {}): void {
  if (!consentGranted()) return
  fetch('/api/log.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      details: { ...details, sessionID: getSessionId(), source: 'react' },
      deviceInfo: getDeviceInfo(),
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
