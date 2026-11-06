// The parts of the shell around the windows that both builds share: the visitor
// details sent with telemetry, Start's times, the theme, the display toggles,
// the shell's keys, the desktop icon grid and the boot wait. Plain data in and
// out where possible, so that neither framework can drift from the other.

/** The visitor's system. Phones come first, as their agents also name Mac OS X or Linux. */
export function detectOs(userAgent, touchPoints = 0) {
  const ua = userAgent || ''
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  // iPadOS asks for the desktop site as a Mac, but no Mac has a touch screen.
  if (/Macintosh|Mac OS X/.test(ua)) return touchPoints > 1 ? 'iOS' : 'macOS'
  if (/CrOS/.test(ua)) return 'ChromeOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown'
}

// Browsers built on Chrome also say Chrome, so they are looked for first.
const BROWSERS = [
  ['Edge', /Edg(?:e|A|iOS)?\/(\d+)/],
  ['Opera', /OPR\/(\d+)/],
  ['Samsung Internet', /SamsungBrowser\/(\d+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/(\d+)/],
  ['Chrome', /(?:Chrome|CriOS)\/(\d+)/],
  ['Safari', /Version\/(\d+)[^ ]* (?:Mobile\/\S+ )?Safari\//],
]

/** The browser and its major version, such as "Chrome 131". */
export function browserName(userAgent) {
  const ua = userAgent || ''
  for (const [name, pattern] of BROWSERS) {
    const match = ua.match(pattern)
    if (match) return `${name} ${match[1]}`
  }
  return 'Other'
}

/** What the telemetry call says about the visitor's device. */
export function deviceInfo({ userAgent, screen, touchPoints = 0, now = new Date() }) {
  return {
    os: detectOs(userAgent, touchPoints),
    browser: browserName(userAgent),
    resolution: `${screen.width}x${screen.height}`,
    deviceTime: now.toString(),
    userAgent,
  }
}

const DAY_MS = 86_400_000
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

/**
 * When something happened, as Start's Recommended list puts it: "17m ago",
 * "2h ago", "Yesterday", a weekday, then a date. Null when there is no time.
 */
export function relativeTime(then, now = new Date()) {
  if (then === null || then === undefined) return null
  const time = then instanceof Date ? then.getTime() : Number(then)
  if (!Number.isFinite(time)) return null

  const diff = now.getTime() - time
  if (diff < 60_000) return 'Just now'
  const date = new Date(time)
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS)
  if (diff < 3_600_000 && days === 0) return `${Math.floor(diff / 60_000)}m ago`
  if (days === 0) return `${Math.floor(diff / 3_600_000)}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return date.toLocaleDateString('en-GB', { weekday: 'long' })
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** A theme the visitor chose wins. Otherwise a first visit follows the system. */
export function initialTheme(saved, prefersDark) {
  if (saved === 'light' || saved === 'dark') return saved
  return prefersDark ? 'dark' : 'light'
}

/** The CSS filter for Quick Settings' brightness, night light and accessibility. */
export function displayFilter({ brightness, nightLight, accessibility }) {
  const parts = []
  const level = Number(brightness)
  if (Number.isFinite(level) && level < 100) parts.push(`brightness(${level}%)`)
  if (nightLight) parts.push('sepia(40%) saturate(120%)')
  if (accessibility) parts.push('contrast(120%) brightness(110%)')
  return parts.length ? parts.join(' ') : 'none'
}

const QUICK_TOGGLES = ['wifi', 'bluetooth', 'airplane', 'batterySaver', 'nightLight', 'accessibility']

/** What one Quick Settings toggle changes, including the settings tied to it. */
export function quickTogglePatch(settings, id) {
  if (!QUICK_TOGGLES.includes(id)) return {}
  const on = !settings[id]
  const patch = { [id]: on }
  if (id === 'airplane') {
    patch.wifi = !on
    patch.bluetooth = !on
  } else if (id === 'batterySaver') {
    patch.brightness = on ? Math.min(Number(settings.brightness), 50) : 100
  } else if ((id === 'wifi' || id === 'bluetooth') && on) {
    patch.airplane = false
  }
  return patch
}

/** A number read back from storage. Zero is a real value, so only nothing falls back. */
export function storedNumber(raw, fallback) {
  if (raw === null || raw === undefined || raw === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

/**
 * The shell's own keys: Ctrl+Shift+Esc for Task Manager, Win+S for search and
 * Esc to close Start, Quick Settings and Widgets. Ctrl+S belongs to the app.
 */
export function shellKeyFromEvent(event) {
  const key = event.key
  const { ctrlKey, shiftKey, altKey, metaKey } = event
  if (key === 'Escape' && ctrlKey && shiftKey && !altKey && !metaKey) return 'taskManager'
  if (key?.toLowerCase() === 's' && metaKey && !ctrlKey && !altKey && !shiftKey) return 'search'
  if (key === 'Escape' && !ctrlKey && !shiftKey && !altKey && !metaKey) return 'dismiss'
  return null
}

export const ICON_CELL = 110
export const ICON_MARGIN = 16

/**
 * Places the desktop icons in columns from the top left, as Windows does. Icons
 * the visitor moved keep their place, pulled back inside a desktop that has
 * shrunk, such as after a phone is turned.
 */
export function layoutDesktopIcons(names, stored, area) {
  const maxX = Math.max(0, area.width - ICON_CELL)
  const maxY = Math.max(0, area.height - ICON_CELL)
  const rows = Math.max(1, Math.floor((area.height - ICON_MARGIN * 2) / ICON_CELL))
  const fit = (value, max) => Math.min(Math.max(value, 0), max)
  const slotPosition = (col, row) => ({
    x: ICON_MARGIN + col * ICON_CELL,
    y: fit(ICON_MARGIN + row * ICON_CELL, maxY),
  })

  const positions = {}
  const taken = new Set()
  for (const name of names) {
    const pos = stored[name]
    if (!pos) continue
    positions[name] = { x: fit(pos.x, maxX), y: fit(pos.y, maxY) }
    const col = Math.max(0, Math.round((positions[name].x - ICON_MARGIN) / ICON_CELL))
    const row = Math.max(0, Math.round((positions[name].y - ICON_MARGIN) / ICON_CELL))
    taken.add(`${col},${row}`)
  }

  let cursor = 0
  for (const name of names) {
    if (positions[name]) continue
    for (;;) {
      const col = Math.floor(cursor / rows)
      const row = cursor % rows
      cursor++
      if (taken.has(`${col},${row}`)) continue
      taken.add(`${col},${row}`)
      positions[name] = slotPosition(col, row)
      break
    }
  }
  return positions
}

/** How long boot and sign-in may show: never a flash, and never stuck. */
export const BOOT_MIN_MS = 800
export const SIGN_IN_MIN_MS = 1000
export const READY_MAX_MS = 4000

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

/**
 * Resolves once every image has loaded or failed, but no sooner than minMs and
 * no later than maxMs. Boot and sign-in wait on this rather than a fixed time.
 */
export function whenAssetsReady(urls, { minMs = 0, maxMs = READY_MAX_MS, load = loadImage } = {}) {
  const started = Date.now()
  const loads = Promise.all(
    urls.filter(Boolean).map((url) => Promise.resolve().then(() => load(url)).catch(() => undefined)),
  )
  return Promise.race([loads, wait(maxMs)]).then(() => {
    const rest = minMs - (Date.now() - started)
    return rest > 0 ? wait(rest) : undefined
  })
}

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Plays a window's close or minimise animation on a copy of it, so that the
 * real window can go at once, whichever way it was closed. The copy is hidden
 * from screen readers and has no ids. Nothing happens with reduced motion.
 */
export function animateWindowOut(element, kind) {
  if (!element?.parentNode || reducedMotion()) return null
  const ghost = element.cloneNode(true)
  for (const el of [ghost, ...ghost.querySelectorAll('[id]')]) el.removeAttribute('id')
  ghost.removeAttribute('role')
  ghost.removeAttribute('aria-label')
  ghost.removeAttribute('tabindex')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.inert = true
  ghost.classList.remove('os-window', 'animate-window-open')
  ghost.classList.add('os-window-ghost')
  Object.assign(ghost.style, {
    left: `${element.offsetLeft}px`,
    top: `${element.offsetTop}px`,
    width: `${element.offsetWidth}px`,
    height: `${element.offsetHeight}px`,
  })
  ghost.dataset.leaving = kind
  const remove = () => ghost.remove()
  ghost.addEventListener('animationend', remove, { once: true })
  setTimeout(remove, 400)
  element.parentNode.appendChild(ghost)
  return ghost
}

/**
 * After a window closes, focus goes to the window now on top, or else back to
 * the closed app's taskbar button, or to Start when it had none.
 */
export function focusAfterClose(nextWindowId, app) {
  const button = [...document.querySelectorAll('[data-taskbar-app]')].find(
    (el) => el.getAttribute('data-taskbar-app') === app,
  )
  const target =
    (nextWindowId !== null && nextWindowId !== undefined && document.getElementById(`win-${nextWindowId}`)) ||
    button ||
    document.querySelector('[data-start-button]')
  target?.focus({ preventScroll: true })
}

/**
 * Publishes a bottom bar's height as --os-banner-inset, which phone windows
 * keep clear of, so that the bar never covers the app. Returns a stop function.
 */
export function reserveBottomSpace(element, root = document.documentElement) {
  const publish = () => root.style.setProperty('--os-banner-inset', `${element.offsetHeight}px`)
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
  observer?.observe(element)
  publish()
  return () => {
    observer?.disconnect()
    root.style.setProperty('--os-banner-inset', '0px')
  }
}
