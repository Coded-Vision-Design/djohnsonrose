import { useEffect } from 'react'
import { useOsStore } from '../store/osStore'
import { shellKeyFromEvent } from '../../../assets/js/windowing/shell-ui.js'

// Which button opened each panel, so that Esc can hand focus back to it.
const OPENERS: [string, string][] = [
  ['[data-start-menu]', '[data-start-button]'],
  ['[data-quick-settings]', '[data-tray-item="status"]'],
  ['[data-widgets]', '[data-widgets-toggle]'],
]

/**
 * The shell's own keys, as in v1's handleGlobalKeys: Ctrl+Shift+Esc opens Task
 * Manager, Win+S opens search, and Esc closes Start, Quick Settings and Widgets.
 * Ctrl+S is left to the app.
 */
export function useShellKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = shellKeyFromEvent(event)
      const store = useOsStore.getState()
      if (key === 'taskManager') {
        event.preventDefault()
        store.openApp('taskmanager')
      } else if (key === 'search') {
        event.preventDefault()
        if (!store.startMenuOpen) store.toggleStartMenu()
        window.setTimeout(() => document.querySelector<HTMLInputElement>('[data-start-menu] input[type="text"]')?.focus())
      } else if (key === 'dismiss' && (store.startMenuOpen || store.quickSettingsOpen || store.widgetsOpen)) {
        const active = document.activeElement
        const opener = OPENERS.find(([panel]) => active?.closest(panel))?.[1]
        store.closeAllPopups()
        if (opener) document.querySelector<HTMLElement>(opener)?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
