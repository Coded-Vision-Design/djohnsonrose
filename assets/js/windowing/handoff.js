// The build switch. The tray's build chip swaps v1 for v2 or back, and the
// screen must not change: the same windows in the same places, the same theme
// and wallpaper, no boot screen and no lock screen. Both builds live on one
// origin, so the build being left writes this hand-off to session storage just
// before it navigates, and the build arriving reads it once, clears it, and
// starts from it. Everything is checked on the way in, as a hand-off can be
// stale, from another version, or not ours at all.

import { MIN_HEIGHT, MIN_WIDTH, clampFloating, fractionToRect, getLayout, rectOf } from './windowing.js'

export const HANDOFF_KEY = 'os.handoff'
export const HANDOFF_VERSION = 1
/** How long a hand-off lasts, from writing it to the next page starting to load. */
export const HANDOFF_TTL_MS = 5000
/** Clocks on one machine agree, so a hand-off from the future is not ours. */
const FUTURE_SKEW_MS = 1000

/**
 * What each app opens with that both builds understand, in v2's names. Apps
 * not listed open as they would from a fresh launch.
 */
export const HANDOFF_EXTRAS = {
  edge: ['initialUrl'],
  explorer: ['initialPath', 'selectName'],
  notepad: ['content', 'filePath'],
  flstudio: ['content', 'filePath'],
  photos: ['imageName', 'folderPath', 'imageUrl'],
  pdfreader: ['pdfUrl'],
  video: ['videoUrl'],
  settings: ['currentTab'],
}

/** v1 keeps an app's extras on the window itself, and calls a file's text fileContent. */
export const V1_EXTRA_NAMES = { content: 'fileContent' }

/** Extras that are addresses, and the extras long enough to hold a file. */
const ADDRESSES = new Set(['initialUrl', 'pdfUrl', 'videoUrl', 'imageUrl'])
const LONG_TEXT = new Set(['content'])
const MAX_TEXT = 2048
const MAX_CONTENT = 200_000
const MAX_TITLE = 300
const MAX_WALLPAPER = 2_000_000
const MAX_ICONS = 500

const STATES = ['floating', 'snapped', 'maximized', 'minimized']
const RESUME_STATES = ['floating', 'snapped', 'maximized']
const ICON_SIZES = ['small', 'medium', 'large']
const SWITCHES = ['sound', 'wifi', 'bluetooth', 'airplane', 'batterySaver', 'nightLight', 'accessibility']

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/**
 * An address an app or the wallpaper may load: a path on this site, or a web,
 * portfolio or picture address. Nothing that could run code.
 */
function safeAddress(value, { pictures = false } = {}) {
  if (typeof value !== 'string' || value.trim() === '') return false
  const scheme = /^\s*([a-z][a-z0-9+.-]*):/i.exec(value)?.[1]?.toLowerCase()
  if (!scheme) return true
  if (['http', 'https', 'portfolio'].includes(scheme)) return true
  return pictures && /^\s*data:image\//i.test(value)
}

function cleanRect(value) {
  if (!isObject(value)) return null
  const { x, y, width, height } = value
  if (![x, y, width, height].every(isNumber) || width <= 0 || height <= 0) return null
  return { x, y, width, height }
}

function cleanSnap(value) {
  if (!isObject(value) || !isObject(value.frac)) return null
  const zone = getLayout(value.layout)?.zones.find((z) => z.id === value.zone)
  if (!zone) return null
  const { x, y, w, h } = value.frac
  if (![x, y, w, h].every(isNumber)) return null
  const fits = x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1.001 && y + h <= 1.001
  return fits ? { layout: value.layout, zone: value.zone, frac: { x, y, w, h } } : null
}

/** Picks the extras an app understands from a build's window or extras. */
export function pickExtras(app, source, names = {}) {
  const out = {}
  if (!isObject(source)) return out
  for (const key of HANDOFF_EXTRAS[app] ?? []) {
    const value = source[names[key] ?? key]
    if (value !== undefined && value !== null) out[key] = value
  }
  return out
}

/** Gives the shared extras this build's own names. */
export function renameExtras(extras, names = {}) {
  return Object.fromEntries(Object.entries(extras ?? {}).map(([key, value]) => [names[key] ?? key, value]))
}

/** Only the extras an app understands, as text of a sensible length. */
function cleanExtras(app, extras) {
  const out = {}
  for (const [key, value] of Object.entries(pickExtras(app, extras))) {
    if (typeof value !== 'string') continue
    if (value.length > (LONG_TEXT.has(key) ? MAX_CONTENT : MAX_TEXT)) continue
    if (ADDRESSES.has(key) && !safeAddress(value, { pictures: key === 'imageUrl' })) continue
    out[key] = value
  }
  return out
}

const zoneFits = (frac, desktop) => frac.w * desktop.width >= MIN_WIDTH && frac.h * desktop.height >= MIN_HEIGHT

/**
 * One window, fitted to this desktop as reflowPatch in windowing.js would fit
 * it, or null when it cannot be shown at all.
 */
function cleanWindow(value, apps, desktop) {
  if (!isObject(value) || !apps.includes(value.app) || typeof value.title !== 'string') return null
  const rect = cleanRect(value)
  if (!rect || !isNumber(value.z) || !STATES.includes(value.state)) return null

  let snap = cleanSnap(value.snap)
  const floating = cleanRect(value.floating)
  let state = value.state
  let resumeState = null
  if (state === 'minimized') resumeState = RESUME_STATES.includes(value.resumeState) ? value.resumeState : 'floating'
  const placement = () => resumeState ?? state

  // A snap this build does not know, or one too small for this screen, floats
  // where the window last floated.
  if (placement() === 'snapped' && !(snap && zoneFits(snap.frac, desktop))) {
    snap = null
    if (resumeState) resumeState = 'floating'
    else state = 'floating'
  }

  let geometry
  if (placement() === 'maximized') geometry = { x: 0, y: 0, width: desktop.width, height: desktop.height }
  else if (placement() === 'snapped') geometry = fractionToRect(snap.frac, desktop)
  else geometry = clampFloating(value.state === 'floating' ? rect : (floating ?? rect), desktop)

  return {
    app: value.app,
    title: value.title.slice(0, MAX_TITLE),
    ...rectOf(geometry),
    z: value.z,
    state,
    resumeState,
    floating: state === 'floating' || !floating ? null : clampFloating(floating, desktop),
    snap: state === 'floating' ? null : snap,
    extras: cleanExtras(value.app, value.extras),
  }
}

/** A slider's value, which v1's sliders keep as text. */
const level = (value, min, max) => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return isNumber(number) ? clamp(number, min, max) : null
}

function cleanSettings(value) {
  const out = {
    theme: value.theme === 'light' || value.theme === 'dark' ? value.theme : null,
    themeChosen: typeof value.themeChosen === 'boolean' ? value.themeChosen : null,
    volume: level(value.volume, 0, 100),
    brightness: level(value.brightness, 30, 100),
    wallpaper:
      typeof value.wallpaper === 'string' && value.wallpaper.length <= MAX_WALLPAPER && safeAddress(value.wallpaper, { pictures: true })
        ? value.wallpaper
        : null,
  }
  for (const key of SWITCHES) out[key] = typeof value[key] === 'boolean' ? value[key] : null
  return out
}

/** The weather the taskbar shows, once it has arrived, or null. */
function cleanWeather(value) {
  if (!isObject(value) || !isNumber(value.temp)) return null
  const text = (key, max) => typeof value[key] === 'string' && value[key].length <= max
  if (!text('condition', 60) || !text('icon', 16) || !text('city', 60)) return null
  return { temp: value.temp, condition: value.condition, icon: value.icon, city: value.city }
}

function cleanDesktop(value, apps) {
  const source = isObject(value) ? value : {}
  const positions = {}
  if (isObject(source.iconPositions)) {
    for (const [name, at] of Object.entries(source.iconPositions).slice(0, MAX_ICONS)) {
      if (name.length <= MAX_TEXT && isObject(at) && isNumber(at.x) && isNumber(at.y)) positions[name] = { x: at.x, y: at.y }
    }
  }
  return {
    pinnedApps: Array.isArray(source.pinnedApps) ? [...new Set(source.pinnedApps.filter((id) => apps.includes(id)))] : null,
    iconSize: ICON_SIZES.includes(source.iconSize) ? source.iconSize : null,
    iconsVisible: typeof source.iconsVisible === 'boolean' ? source.iconsVisible : null,
    iconPositions: positions,
    zoom: isNumber(source.zoom) ? clamp(source.zoom, 0.7, 1.3) : null,
  }
}

/**
 * Describes the desktop being left. Windows keep the order they opened in,
 * which the taskbar shows, and their stacking order, and only the extras both
 * builds understand. A visitor who is signed out takes no windows with them.
 */
export function createHandoff(state, now) {
  const windows = state.signedIn ? (state.windows ?? []) : []
  const focused = windows.findIndex((w) => w.id === state.focusedId && w.state !== 'minimized')
  return {
    version: HANDOFF_VERSION,
    at: now,
    from: state.from,
    signedIn: !!state.signedIn,
    windows: windows.map((w) => ({
      app: w.app,
      title: w.title,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      z: w.z,
      state: w.state,
      resumeState: w.resumeState ?? null,
      floating: w.floating ?? null,
      snap: w.snap ? { layout: w.snap.layout, zone: w.snap.zone, frac: w.snap.frac } : null,
      extras: pickExtras(w.app, w.extras),
    })),
    focused: focused === -1 ? null : focused,
    settings: cleanSettings(state.settings ?? {}),
    desktop: state.desktop ?? {},
    consent: state.consent ?? null,
    weather: cleanWeather(state.weather),
  }
}

/**
 * Checks a hand-off and fits it to this build and this screen. Returns null
 * for anything stale, from another version, or malformed. `now` is this
 * build's clock and `loadingFor` how long this page has been loading, so that
 * a slow connection does not throw away a hand-off that was fresh when the
 * page was asked for. Settings that make no sense come back as null, for the
 * build to keep its own.
 */
export function readHandoff(text, { now, loadingFor = 0, apps, desktop }) {
  let value
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (!isObject(value) || value.version !== HANDOFF_VERSION || !isNumber(value.at)) return null
  if (value.at > now + FUTURE_SKEW_MS || now - loadingFor - value.at > HANDOFF_TTL_MS) return null
  if (!Array.isArray(value.windows) || !isObject(value.settings) || typeof value.signedIn !== 'boolean') return null

  const signedIn = value.signedIn
  const kept = []
  const seen = new Set()
  let focused = null
  if (signedIn) {
    value.windows.forEach((raw, index) => {
      const win = cleanWindow(raw, apps, desktop)
      if (!win || seen.has(win.app)) return
      seen.add(win.app)
      if (index === value.focused && win.state !== 'minimized') focused = kept.length
      kept.push(win)
    })
  }

  return {
    version: HANDOFF_VERSION,
    at: value.at,
    from: value.from === 'v1' || value.from === 'v2' ? value.from : null,
    signedIn,
    windows: kept,
    focused,
    settings: cleanSettings(value.settings),
    desktop: cleanDesktop(value.desktop, apps),
    consent: typeof value.consent === 'boolean' ? value.consent : null,
    weather: cleanWeather(value.weather),
  }
}

/** Saves a hand-off for the next page. False when storage is blocked or full. */
export function writeHandoff(storage, handoff) {
  try {
    storage.setItem(HANDOFF_KEY, JSON.stringify(handoff))
    return true
  } catch {
    return false
  }
}

/** Reads the hand-off once and clears it, whether or not it can be used. */
export function takeHandoff(storage, options) {
  let text = null
  try {
    text = storage.getItem(HANDOFF_KEY)
    storage.removeItem(HANDOFF_KEY)
  } catch {
    return null
  }
  return text === null ? null : readHandoff(text, options)
}

/**
 * The windows to open on arrival, in the same order, stacked in the same order
 * from firstZ up, each with this build's next id. They are marked as restored,
 * so that they appear at once rather than play the opening animation.
 */
export function restoredWindows(handoff, nextId, firstZ = 100) {
  const stack = handoff.windows.map((win, index) => index).sort((a, b) => handoff.windows[a].z - handoff.windows[b].z)
  const windows = handoff.windows.map((win, index) => ({
    ...win,
    id: nextId(),
    z: firstZ + stack.indexOf(index),
    restored: true,
  }))
  const focusedId = handoff.focused === null ? null : (windows[handoff.focused]?.id ?? null)
  return { windows, focusedId, nextWindowZ: firstZ + windows.length }
}

/**
 * A plain left click on the build chip switches in place. Any other click, such
 * as one that opens a new tab, is left to the browser, which follows the link.
 */
export function isPlainClick(event) {
  return !!event && !event.defaultPrevented && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
}

// Apps that change what they show after opening, such as Explorer moving to
// another folder, say so here, so that the switch carries what is on screen
// rather than what the window opened with.
const liveReaders = new Map()

/** An open app shares what it shows now. Returns a function that stops it. */
export function shareLiveExtras(windowId, read) {
  const key = String(windowId)
  liveReaders.set(key, read)
  return () => {
    if (liveReaders.get(key) === read) liveReaders.delete(key)
  }
}

/** What an open app shows now, in the shared names, or nothing. */
export function liveExtras(windowId) {
  try {
    const extras = liveReaders.get(String(windowId))?.()
    return isObject(extras) ? extras : {}
  } catch {
    return {}
  }
}
