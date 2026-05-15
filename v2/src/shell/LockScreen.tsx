import { useEffect, useState } from 'react'
import { useOsStore } from '../store/osStore'
import { playSound } from '../lib/sounds'

const formatLockTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

const formatLockDate = (d: Date) =>
  d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

// Mirrors partials/login.php: profile + name + Sign In button on top of the
// current wallpaper, with a large clock in the bottom-right corner. The 3000ms
// sign-in animation matches v1's shell.js login() exactly.
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
      className="h-dvh w-dvw relative flex flex-col items-center justify-center text-white bg-cover bg-center"
      style={{ backgroundImage: `url(${wallpaper})` }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col items-center space-y-6">
        <div className="w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl">
          <img
            src="/assets/img/profile.webp"
            alt="DeVanté Johnson-Rose"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-3xl font-semibold drop-shadow-lg">DeVanté Johnson-Rose</h1>

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
              className="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded text-lg font-medium transition-all win-shadow"
            >
              Sign In
            </button>
            <p className="text-center text-sm text-white/70">Welcome back, DeVante.</p>
          </div>
        )}
      </div>

      {/* Bottom-right clock — v1's parallel detail */}
      <div className="absolute bottom-6 right-6 sm:bottom-12 sm:right-12 text-right z-10">
        <div className="text-4xl sm:text-6xl font-light mb-2 drop-shadow-lg">
          {formatLockTime(now)}
        </div>
        <div className="text-lg sm:text-xl drop-shadow-md">{formatLockDate(now)}</div>
      </div>
    </div>
  )
}
