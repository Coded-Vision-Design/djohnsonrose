// Moving between windows, shared by both builds: Task View, which shows every
// open window as a card, and the Alt+Q switcher, which steps through them while
// Alt is held. The order, the selection maths and the keys live here, so that
// neither build can drift from the other. Browsers never see Alt+Tab or Win+Tab
// on Windows, as the system keeps them, so Alt+Q and Alt+Shift+T stand in.

/** The Task View keys, as the button's tooltip and aria-keyshortcuts give them. */
export const TASK_VIEW_KEYS = 'Alt+Shift+T'

/**
 * Open windows, most recently used first: the ones on screen by z, then the
 * minimised ones, as Windows sends a minimised window to the back.
 */
export function recentWindows(windows) {
  const list = Array.isArray(windows) ? windows : []
  const newest = (a, b) => b.z - a.z
  const shown = list.filter((w) => w.state !== 'minimized').sort(newest)
  const minimised = list.filter((w) => w.state === 'minimized').sort(newest)
  return [...shown, ...minimised]
}

/**
 * Where the Alt+Q switcher starts: on the window after the focused one, or on
 * the first when the desktop has focus. Backwards starts on the last. -1 when
 * there is nothing to switch to.
 */
export function switcherStart(list, focusedId, backwards = false) {
  if (list.length === 0) return -1
  if (backwards) return list.length - 1
  return list[0].id === focusedId ? 1 % list.length : 0
}

/** One step through a list of cards, wrapping round at both ends. */
export function stepIndex(index, count, step) {
  if (count <= 0) return -1
  const from = Math.min(Math.max(index, -1), count - 1)
  return (((from + step) % count) + count) % count
}

/** How many cards sit on Task View's first row, from each card's top edge. */
export function gridColumns(tops) {
  if (tops.length === 0) return 0
  return tops.filter((top) => Math.abs(top - tops[0]) < 1).length
}

/**
 * Where an arrow key moves focus in Task View's grid: left and right by one,
 * up and down by a row, Home and End to either end. It stops at the edges, as
 * Task View does. Null for any other key, or when there are no cards.
 */
export function gridIndex(index, key, count, columns) {
  if (count <= 0) return null
  const last = count - 1
  const cols = Math.max(1, columns)
  if (index < 0) return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key) ? 0 : null
  const row = (i) => Math.floor(i / cols)
  switch (key) {
    case 'ArrowLeft':
      return Math.max(0, index - 1)
    case 'ArrowRight':
      return Math.min(last, index + 1)
    case 'ArrowUp':
      return index - cols >= 0 ? index - cols : index
    case 'ArrowDown':
      if (index + cols <= last) return index + cols
      return row(index) < row(last) ? last : index
    case 'Home':
      return 0
    case 'End':
      return last
    default:
      return null
  }
}

/** Which window takes focus when a card closes: the next one, or the one before the last. */
export function neighbourAfterClose(list, id) {
  const at = list.findIndex((w) => w.id === id)
  if (at === -1) return null
  return (list[at + 1] ?? list[at - 1])?.id ?? null
}

const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

/**
 * Whether a key is a letter. On a Mac, Option turns letters into other
 * characters (Option+Q is œ), so the physical key counts too, except while
 * typing, where that character is what the visitor meant.
 */
function isLetter(event, letter) {
  const key = event.key ?? ''
  if (key.toLowerCase() === letter) return true
  if (/^[a-z]$/i.test(key) || event.code !== `Key${letter.toUpperCase()}`) return false
  return !event.target?.closest?.(EDITABLE)
}

/**
 * Reads a switching key from a keydown, or null: Alt+Q (and Alt+Tab, when a
 * browser passes it on) for the next window, with Shift for the one before,
 * and Alt+Shift+T (or Win+Tab) for Task View. Ctrl+Alt is AltGr on Windows,
 * which types characters, so it is left alone.
 */
export function switcherKeyFromEvent(event) {
  if (!event?.key) return null
  const { altKey, shiftKey, ctrlKey, metaKey } = event
  if (event.key === 'Tab' && metaKey && !altKey && !ctrlKey && !shiftKey) return 'taskView'
  if (!altKey || ctrlKey || metaKey) return null
  if (shiftKey && isLetter(event, 't')) return 'taskView'
  if (event.key === 'Tab' || isLetter(event, 'q')) return shiftKey ? 'previous' : 'next'
  return null
}

/** Letting go of Alt ends an Alt+Q switch on the window it reached. */
export function isSwitchRelease(event) {
  return event?.key === 'Alt'
}

/**
 * Brings a window to the front, restoring it when it is minimised. Takes
 * either build's store, as both name these the same. False when it has gone.
 */
export function activateWindow(store, id) {
  const win = store.windows.find((w) => w.id === id)
  if (!win) return false
  if (win.state === 'minimized') store.toggleMinimize(id)
  else store.focusWindow(id)
  return true
}

/** Moves keyboard focus into a window, once a restored one is on screen again. */
export function focusWindowElement(id) {
  setTimeout(() => document.getElementById(`win-${id}`)?.focus({ preventScroll: true }))
}

const shown = (el) => el.getClientRects().length > 0

/**
 * Gives focus back to what had it before Task View opened, or to the Task View
 * button on show when that has gone, such as a window closed from its card.
 */
export function restoreFocus(opener) {
  const back = opener?.isConnected && opener !== document.body ? opener : null
  const button = [...document.querySelectorAll('[data-task-view-toggle]')].find(shown)
  ;(back ?? button)?.focus({ preventScroll: true })
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps Tab inside a dialog: from the last control it goes to the first, and
 * Shift+Tab the other way. True when it moved focus itself.
 */
export function keepFocusInside(event, container) {
  if (event.key !== 'Tab' || !container) return false
  const controls = [...container.querySelectorAll(FOCUSABLE)].filter(shown)
  const first = controls[0]
  const last = controls[controls.length - 1]
  const active = document.activeElement
  let target = null
  if (!first) target = container
  else if (event.shiftKey && (active === first || active === container)) target = last
  else if (!event.shiftKey && (active === last || active === container)) target = first
  if (!target) return false
  event.preventDefault()
  target.focus()
  return true
}
