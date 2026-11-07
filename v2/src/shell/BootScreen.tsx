import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'
import { BOOT_MIN_MS, whenAssetsReady } from '../../../assets/js/windowing/shell-ui.js'

// The same boot screen as v1's (partials/shell.php): the Windows logo above
// the loading dots. It lasts until the lock screen's pictures are ready, with
// a short minimum so that it does not flash, rather than a fixed time.
export function BootScreen() {
  const finishBoot = useOsStore((s) => s.finishBoot)

  useEffect(() => {
    let cancelled = false
    const wallpaper = useOsStore.getState().settings.wallpaper
    void whenAssetsReady([wallpaper, '/assets/img/profile.webp'], { minMs: BOOT_MIN_MS }).then(() => {
      if (!cancelled) finishBoot()
    })
    return () => {
      cancelled = true
    }
  }, [finishBoot])

  return (
    <div
      data-boot-screen=""
      role="status"
      aria-label="Starting up"
      className="h-dvh w-dvw bg-black text-white flex flex-col items-center justify-center"
    >
      <div className="mb-24 scale-150">
        <img src="/assets/img/startmenu.webp" alt="" className="w-16 h-16" />
      </div>
      <div className="win-loader">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  )
}
