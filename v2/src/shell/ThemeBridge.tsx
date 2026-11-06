import { useEffect } from 'react'
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    document.body.style.filter = displayFilter({ brightness, nightLight, accessibility })
  }, [brightness, nightLight, accessibility])

  return null
}
