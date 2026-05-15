import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'

// Keeps isMobile/isTablet/isWideDesktop in the store synced with the viewport
// width. v1's shell.js handled this inside its Alpine init resize listener.
export function useBreakpoint() {
  const setBreakpoint = useOsStore((s) => s.setBreakpoint)
  useEffect(() => {
    const update = () => setBreakpoint(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [setBreakpoint])
}
