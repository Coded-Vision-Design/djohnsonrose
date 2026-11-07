import { useEffect, useMemo, useRef, useState } from 'react'
import { useOsStore } from '../store/osStore'
import { getApp } from '../apps/registry'
import {
  activateWindow,
  focusWindowElement,
  isSwitchRelease,
  recentWindows,
  stepIndex,
  switcherKeyFromEvent,
  switcherStart,
} from '../../../assets/js/windowing/switcher.js'

// The Alt+Q switcher, the same as v1's partials/window-switcher.php. Hold Alt
// and press Q (or Tab, when the browser passes it on) to step through the
// windows, most recently used first, Shift+Q to step back, and let go of Alt to
// switch. Esc cancels. The order and keys come from assets/js/windowing/switcher.js.

function switchTo(id: number) {
  const store = useOsStore.getState()
  store.closeAllPopups()
  if (store.taskSwitcherOpen) store.toggleTaskSwitcher()
  if (activateWindow(store, id)) focusWindowElement(id)
}

const switchable = () => recentWindows(useOsStore.getState().windows)

export function WindowSwitcher() {
  const windows = useOsStore((s) => s.windows)
  const cards = useMemo(() => recentWindows(windows), [windows])
  // The selected card while Alt is held, and -1 the rest of the time. The ref
  // is what the key handlers read; the state is what is drawn.
  const current = useRef(-1)
  const [selected, setSelected] = useState(-1)

  useEffect(() => {
    const show = (index: number) => {
      current.current = index
      setSelected(index)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (current.current !== -1 && event.key === 'Escape') {
        event.preventDefault()
        show(-1)
        return
      }
      const key = switcherKeyFromEvent(event)
      if (key !== 'next' && key !== 'previous') return
      event.preventDefault()
      const list = switchable()
      if (current.current !== -1) {
        show(stepIndex(current.current, list.length, key === 'next' ? 1 : -1))
        return
      }
      if (list.length === 0) return
      const store = useOsStore.getState()
      if (store.taskSwitcherOpen) store.toggleTaskSwitcher()
      show(switcherStart(list, store.focusedWindowId, key === 'previous'))
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (current.current === -1 || !isSwitchRelease(event)) return
      event.preventDefault()
      const list = switchable()
      const win = list[Math.min(current.current, list.length - 1)]
      show(-1)
      if (win) switchTo(win.id)
    }
    // The system took Alt+Tab, or the page lost focus: the key-up never comes.
    const onBlur = () => show(-1)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const choose = (id: number) => {
    current.current = -1
    setSelected(-1)
    switchTo(id)
  }

  // A window can close while the strip is up, which shortens the list.
  const shown = Math.min(selected, cards.length - 1)
  const switching = selected !== -1 && cards.length > 0

  return (
    <>
      {switching && (
        <div className="os-switcher">
          <div className="os-switcher-panel" role="group" aria-label="Switch windows">
            {cards.map((win, index) => {
              const icon = getApp(win.app)?.icon
              return (
                <button
                  key={win.id}
                  type="button"
                  className="os-switcher-card"
                  aria-current={index === shown ? 'true' : 'false'}
                  onClick={() => choose(win.id)}
                >
                  <span className="os-switch-label">
                    <img src={icon} alt="" />
                    <span>{win.title}</span>
                  </span>
                  <span className="os-switch-thumb">
                    <img src={icon} alt="" />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <p className="os-switcher-status" role="status">
        {switching ? cards[shown]?.title : ''}
      </p>
    </>
  )
}
