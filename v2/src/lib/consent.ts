import { useSyncExternalStore } from 'react'

// The visitor's cookie choice: true, false, or null until they answer. One
// source for the banner, Settings and telemetry, so that none of them can show
// a stale answer. v1 keeps the same choice in its store (store.js).

const KEY = 'react.cookie.consent'

type Consent = boolean | null

const listeners = new Set<() => void>()
// Storage can be blocked, which throws. The choice then lasts for this visit.
let remembered: Consent = null

export function readConsent(): Consent {
  try {
    const value = localStorage.getItem(KEY)
    if (value !== null) return value === 'true'
  } catch {
    // Fall back to what this visit was told.
  }
  return remembered
}

export function setConsent(value: boolean): void {
  remembered = value
  try {
    localStorage.setItem(KEY, String(value))
  } catch {
    // Kept in memory for this visit.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, readConsent)
}

/** Forgets the in-memory choice, so that each test starts afresh. */
export function resetConsentForTests(): void {
  remembered = null
}
