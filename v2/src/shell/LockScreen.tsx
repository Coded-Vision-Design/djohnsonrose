import { useState } from 'react'
import { useOsStore } from '../store/osStore'
import { playSound } from '../lib/sounds'

export function LockScreen() {
  const login = useOsStore((s) => s.login)
  const wallpaper = useOsStore((s) => s.settings.wallpaper)
  const [signingIn, setSigningIn] = useState(false)

  const handleSignIn = () => {
    setSigningIn(true)
    playSound('startup')
    window.setTimeout(login, 1200)
  }

  return (
    <div
      className="h-screen w-screen bg-cover bg-center flex flex-col items-center justify-center text-white"
      style={{ backgroundImage: `url(${wallpaper})` }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <img
          src="/assets/img/profile.png"
          alt="DeVanté Johnson-Rose"
          className="w-24 h-24 rounded-full object-cover border-2 border-white/30 shadow-lg"
        />
        <div className="text-xl font-medium">DeVanté Johnson-Rose</div>
        {signingIn ? (
          <>
            <div className="win-loader mt-2">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <div className="text-sm opacity-80">Signing in...</div>
          </>
        ) : (
          <button
            type="button"
            onClick={handleSignIn}
            className="mt-4 px-8 py-2 rounded bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition"
          >
            Sign in
          </button>
        )}
      </div>
    </div>
  )
}
