import { useEffect, useState } from 'react'

const CONSENT_KEY = 'react.cookie.consent'

// Mirrors v1's cookie notification: shown once after login until the user
// either accepts or declines. Acceptance enables telemetry (see lib/telemetry).
export function CookieBanner() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(CONSENT_KEY) === null) {
      setOpen(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'true')
    setOpen(false)
  }
  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'false')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-16 right-4 z-[20000] w-[360px] glass rounded-xl p-4 win-shadow text-xs animate-window-open"
    >
      <div className="font-semibold mb-2">Cookies &amp; telemetry</div>
      <p className="opacity-80 leading-relaxed mb-3">
        This portfolio uses a tiny telemetry call to <code className="opacity-90">/api/log.php</code> so I can see
        which apps visitors actually open. No personal data, no third-party
        scripts. Decline and the call won&apos;t fire &mdash; you can change your mind
        any time in Settings.
      </p>
      <div className="flex items-center justify-end space-x-2">
        <button
          type="button"
          onClick={decline}
          className="px-3 py-1 rounded text-[11px] hover:bg-black/5 dark:hover:bg-white/10"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={accept}
          className="px-4 py-1 rounded bg-win-blue text-white text-[11px] font-medium hover:opacity-90"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
