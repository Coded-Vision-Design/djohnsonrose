import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'

export function BootScreen() {
  const finishBoot = useOsStore((s) => s.finishBoot)

  useEffect(() => {
    const t = window.setTimeout(finishBoot, 3000)
    return () => window.clearTimeout(t)
  }, [finishBoot])

  return (
    <div className="h-screen w-screen bg-black text-white flex items-center justify-center">
      <div className="win-loader-container">
        <div className="text-3xl mb-8 font-light tracking-wide">Portfolio OS</div>
        <div className="win-loader">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      </div>
    </div>
  )
}
