import { useEffect, useRef } from 'react'
import { setConsent, useConsent } from '../lib/consent'
import { reserveBottomSpace } from '../../../assets/js/windowing/shell-ui.js'

// Mirrors v1's cookie notification (partials/shell.php): shown after sign-in
// until the visitor accepts or declines. Acceptance enables telemetry (see
// lib/telemetry). On a phone it is a slim bar that windows keep clear of.
export function CookieBanner() {
  const consent = useConsent()
  const ref = useRef<HTMLDivElement>(null)
  const open = consent === null

  useEffect(() => {
    if (!open || !ref.current) return
    return reserveBottomSpace(ref.current)
  }, [open])

  if (!open) return null

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Cookie consent"
      data-cookie-banner=""
      className="os-consent glass dark:bg-[#1c1c1c]/90 border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden text-black dark:text-white animate-window-open"
    >
      <div className="os-consent-body p-4 flex flex-col gap-3">
        <div className="os-consent-title font-semibold text-sm">Cookies &amp; telemetry</div>
        <p className="text-xs leading-relaxed">
          If you accept, the site records which apps you open and a shortened IP address, and may load Google
          Analytics. Records are kept for 90 days. Decline and none of this happens. You can change your mind at
          any time in Settings.{' '}
          <a href="/privacy" target="_blank" rel="noopener" className="underline text-win-blue dark:text-[#60cdff]">
            Privacy notice
          </a>
        </p>
        <div className="os-consent-actions flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setConsent(false)}
            className="px-4 rounded-sm text-xs hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => setConsent(true)}
            className="px-4 rounded-sm bg-win-blue text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
