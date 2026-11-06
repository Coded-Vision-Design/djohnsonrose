import { Fragment, useEffect, useState } from 'react'
import { useOsStore } from '../store/osStore'
import { playSound } from '../lib/sounds'
import { cssUrl } from '../../../assets/js/windowing/shell-core.js'
import profile from '../../../data/profile.json'

const formatLockTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

const formatLockDate = (d: Date) =>
  d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

// Mirrors partials/login.php: profile, name and role in the middle, an account
// picker at the bottom left (the owner signs in, "Recruiter" opens /cv) and the
// clock at the bottom right, or at the top on phones. The role comes from
// data/profile.json, as on /cv. The 3000ms sign-in animation matches v1's
// shell.js login() exactly.
export function LockScreen() {
  const login = useOsStore((s) => s.login)
  const wallpaper = useOsStore((s) => s.settings.wallpaper)
  const [signingIn, setSigningIn] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const handleSignIn = () => {
    if (signingIn) return
    setSigningIn(true)
    playSound('startup')
    window.setTimeout(login, 3000)
  }

  return (
    <div
      className="h-dvh w-dvw relative flex flex-col gap-6 p-6 sm:p-12 overflow-y-auto text-white bg-cover bg-center"
      style={{ backgroundImage: cssUrl(wallpaper) }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl">
          <img
            src="/assets/img/profile.webp"
            alt={profile.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-semibold drop-shadow-lg">{profile.name}</h1>
          <p className="text-lg text-white/90 drop-shadow-md" data-lock-role>
            {profile.headline.split(' · ').map((part, i) => (
              <Fragment key={part}>
                {i > 0 && ' · '}
                <span className="whitespace-nowrap">{part}</span>
              </Fragment>
            ))}
          </p>
        </div>

        {signingIn ? (
          <div className="w-64 flex flex-col items-center space-y-3">
            <div className="win-loader">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <p className="text-center text-sm text-white/80">Signing in…</p>
          </div>
        ) : (
          <div className="w-64 space-y-4">
            <button
              type="button"
              onClick={handleSignIn}
              className="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-sm text-lg font-medium transition-all win-shadow"
            >
              Sign In
            </button>
            <p className="text-center text-sm text-white/70">Welcome back, DeVante.</p>
          </div>
        )}
      </div>

      {/* On phones the picker and clock join the column above, with the clock first. */}
      <div className="contents sm:flex sm:items-end sm:justify-between sm:gap-6">
        <nav aria-label="Accounts" className={`relative z-10 self-start sm:self-end ${signingIn ? 'invisible' : ''}`}>
          <ul className="flex flex-col gap-1">
            <li>
              <button
                type="button"
                onClick={handleSignIn}
                aria-current="true"
                className="flex items-center gap-3 w-full min-h-11 px-3 py-2 rounded-md text-left bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <img src="/assets/img/profile.webp" alt="" className="w-10 h-10 rounded-full object-cover" />
                <span className="text-base font-medium">{profile.name}</span>
              </button>
            </li>
            <li>
              <a
                href="/cv"
                className="flex items-center gap-3 w-full min-h-11 px-3 py-2 rounded-md hover:bg-white/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center" aria-hidden="true">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 9.5c4.1 0 7 2.1 7 4.6V18H3v-1.9c0-2.5 2.9-4.6 7-4.6Z" />
                  </svg>
                </span>
                <span className="flex flex-col text-left leading-tight">
                  <span className="text-base font-medium">Recruiter</span>
                  <span className="text-sm text-white/80">Open the CV, no sign-in</span>
                </span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="relative z-10 order-first sm:order-none text-center sm:text-right" data-lock-clock>
          <div className="text-4xl sm:text-6xl font-light mb-2 drop-shadow-lg">{formatLockTime(now)}</div>
          <div className="text-lg sm:text-xl drop-shadow-md">{formatLockDate(now)}</div>
        </div>
      </div>
    </div>
  )
}
