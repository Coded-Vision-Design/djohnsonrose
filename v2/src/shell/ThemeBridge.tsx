import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'

// Reflects settings.theme onto the <html> element so Tailwind's `dark:` variant
// works. Lives at the App root so it runs regardless of route.
export function ThemeBridge() {
  const theme = useOsStore((s) => s.settings.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return null
}
