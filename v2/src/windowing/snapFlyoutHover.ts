import { useOsStore } from '../store/osStore'
import { canHoverLayouts } from '../../../assets/js/windowing/windowing.js'

const OPEN_DELAY = 300
const CLOSE_DELAY = 250

let openTimer: number | undefined
let closeTimer: number | undefined

/** Pointer over the maximise button: Snap Layouts opens after a short pause. */
export function hoverMaximize(windowId: number, button: HTMLElement) {
  window.clearTimeout(closeTimer)
  window.clearTimeout(openTimer)
  if (!canHoverLayouts(useOsStore.getState().windowMode)) return

  openTimer = window.setTimeout(() => {
    const { left, top, width, height } = button.getBoundingClientRect()
    useOsStore.getState().openSnapFlyout({
      windowId,
      anchor: { left, top, width, height },
      fromKeyboard: false,
    })
  }, OPEN_DELAY)
}

/** Pointer left the button or the flyout: close unless it comes back. */
export function leaveSnapFlyout() {
  window.clearTimeout(openTimer)
  window.clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => useOsStore.getState().closeSnapFlyout(), CLOSE_DELAY)
}

export function holdSnapFlyout() {
  window.clearTimeout(closeTimer)
}

export function cancelSnapFlyoutHover() {
  window.clearTimeout(openTimer)
}
