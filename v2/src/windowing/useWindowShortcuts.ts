import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'
import { shortcutFromEvent } from '../../../assets/js/windowing/windowing.js'

/** Window keyboard shortcuts. See shortcutFromEvent for what the browser allows. */
export function useWindowShortcuts() {
  useEffect(() => {
    let metaAlone = false

    const onKeyDown = (event: KeyboardEvent) => {
      metaAlone = event.key === 'Meta' || event.key === 'Super'
      const shortcut = shortcutFromEvent(event)
      if (!shortcut) return

      const store = useOsStore.getState()
      if (shortcut === 'layouts') {
        const id = store.focusedWindowId
        const button = document.querySelector(`#win-${id} .os-win-max`)
        if (id === null || !button || store.windowMode === 'phone') return
        event.preventDefault()
        const { left, top, width, height } = button.getBoundingClientRect()
        store.openSnapFlyout({ windowId: id, anchor: { left, top, width, height }, fromKeyboard: true })
        return
      }
      if (store.runShortcut(shortcut)) event.preventDefault()
    }

    // The Win key alone opens Start, on release so that Win+Left stays free.
    const onKeyUp = (event: KeyboardEvent) => {
      if ((event.key === 'Meta' || event.key === 'Super') && metaAlone) {
        useOsStore.getState().toggleStartMenu()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])
}
