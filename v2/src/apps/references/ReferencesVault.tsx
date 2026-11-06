import { useCallback, useEffect, useState } from 'react'
import {
  decryptReferences,
  forgetReferences,
  saveReferences,
  savedReferences,
  type Reference,
  type ReferencesEnvelope as Envelope,
} from '../../../../assets/js/windowing/references.js'

// Password-protected references vault, the same as v1's.
//
// On mount: fetches /data/references.enc.json. On submit, the shared
// assets/js/windowing/references.js derives the key from the password and
// decrypts the letters in the browser; a wrong password fails the GCM tag
// check, which is shown as "Incorrect password". The opened letters are kept
// for the session, and forgotten on Lock and when the visitor signs out.

export default function ReferencesVault() {
  const [envelope, setEnvelope] = useState<Envelope | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refs, setRefs] = useState<Reference[] | null>(() => savedReferences(sessionStorage))
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/data/references.enc.json', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error(`No vault file (${r.status})`)
        return r.json()
      })
      .then((envJson: Envelope) => {
        if (!cancelled) setEnvelope(envJson)
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const unlock = useCallback(async () => {
    if (!envelope || !password) return
    setBusy(true)
    setError(null)
    try {
      const { references, text } = await decryptReferences(envelope, password)
      setRefs(references)
      setSelected(0)
      saveReferences(sessionStorage, text)
      setPassword('')
    } catch {
      setError('Incorrect password.')
    } finally {
      setBusy(false)
    }
  }, [envelope, password])

  const lock = () => {
    forgetReferences(sessionStorage)
    setRefs(null)
    setSelected(0)
  }

  if (refs) {
    const current = refs[selected] ?? refs[0]
    return (
      <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white">
        <header className="h-9 bg-[#2b579a] text-white flex items-center justify-between px-3 text-[11px] shrink-0">
          <div className="flex items-center gap-2">
            <span aria-hidden>🔓</span>
            <span className="font-medium">References - Unlocked</span>
            <span className="opacity-70">· {refs.length} item{refs.length === 1 ? '' : 's'}</span>
          </div>
          <button
            type="button"
            onClick={lock}
            className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-sm text-[10px]"
          >
            Lock
          </button>
        </header>
        {!current ? (
          <p className="grow flex items-center justify-center p-6 text-sm opacity-70" data-references-empty>
            There are no references in the vault yet.
          </p>
        ) : (
        <div className="grow flex flex-col sm:flex-row min-h-0">
          <aside className="w-full sm:w-56 max-h-40 sm:max-h-none border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800 overflow-y-auto shrink-0">
            {refs.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={`w-full text-left px-3 py-2 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 ${
                  selected === i ? 'bg-[#e6f3fb] dark:bg-white/10' : ''
                }`}
              >
                <div className="text-[12px] font-semibold truncate">{r.from}</div>
                <div className="text-[10px] opacity-60 truncate">
                  {[r.role, r.company].filter(Boolean).join(' · ')}
                </div>
              </button>
            ))}
          </aside>
          <article className="grow overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-1">{current.from}</h2>
            <p className="text-[12px] opacity-70 mb-4">
              {[current.role, current.company].filter(Boolean).join(' · ')}
            </p>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{current.body}</pre>
          </article>
        </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-linear-to-br from-[#0a3d6b] via-[#1e4d8f] to-[#2b579a] text-white p-6 text-center">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-md rounded-2xl p-8 ring-1 ring-white/15 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-white/10 mx-auto flex items-center justify-center text-2xl mb-4">
          🔒
        </div>
        <h1 className="text-lg font-semibold mb-1">References - Encrypted</h1>
        <p className="text-[11px] opacity-80 mb-6 leading-relaxed">
          Reference letters are stored encrypted in the browser bundle and only
          decrypt locally once a recruiter enters the shared password. Nothing
          ever leaves this tab.
        </p>
        {loadError ? (
          <div className="text-[11px] text-red-200 bg-red-900/30 rounded-sm p-3">
            Vault file unavailable: {loadError}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              unlock()
            }}
            className="space-y-3"
          >
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm placeholder-white/40 focus:outline-hidden focus:border-white/60"
            />
            <button
              type="submit"
              disabled={!password || !envelope || busy}
              className="w-full bg-white text-[#0a3d6b] font-semibold text-sm rounded-lg py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {busy ? 'Decrypting…' : 'Unlock'}
            </button>
            {error && <p className="text-[11px] text-red-200">{error}</p>}
            {!envelope && !loadError && (
              <p className="text-[10px] opacity-50">Loading vault…</p>
            )}
          </form>
        )}
        <p className="text-[10px] opacity-50 mt-6">
          Don't have the password? Email{' '}
          <a href="mailto:devante@johnson-rose.co.uk" className="underline">
            devante@johnson-rose.co.uk
          </a>
          .
        </p>
      </div>
    </div>
  )
}
