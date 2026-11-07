import { useLayoutEffect } from 'react'
import { useOsStore } from '../store/osStore'
import { displayFilter } from '../../../assets/js/windowing/shell-ui.js'

// Reflects settings.theme onto the <html> element so Tailwind's `dark:` variant
// works, and Quick Settings' brightness, night light and accessibility onto
// <body>, as v1 does in partials/shell.php. Lives at the App root so it runs
// regardless of route.
export function ThemeBridge() {
  const theme = useOsStore((s) => s.settings.theme)
  const brightness = useOsStore((s) => s.settings.brightness)
  const nightLight = useOsStore((s) => s.settings.nightLight)
  const accessibility = useOsStore((s) => s.settings.accessibility)

  // Before the first paint, so that a dark desktop arriving from v1 by the build
  // switch never shows a light frame first.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useLayoutEffect(() => {
    document.body.style.filter = displayFilter({ brightness, nightLight, accessibility })
  }, [brightness, nightLight, accessibility])

  return null
}
