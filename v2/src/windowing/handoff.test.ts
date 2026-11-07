import { describe, it, expect, beforeEach } from 'vitest'
import {
  HANDOFF_KEY,
  HANDOFF_TTL_MS,
  HANDOFF_VERSION,
  V1_EXTRA_NAMES,
  createHandoff,
  isPlainClick,
  liveExtras,
  pickExtras,
  readHandoff,
  renameExtras,
  restoredWindows,
  shareLiveExtras,
  takeHandoff,
  writeHandoff,
  type HandoffSource,
} from '../../../assets/js/windowing/handoff.js'
import { getLayout } from '../../../assets/js/windowing/windowing.js'

// The build switch: what one build leaves for the other when the visitor swaps
// stacks, and how the other reads it back. Shared by both builds, so that each
// carries and restores exactly the same things.

const NOW = 1_800_000_000_000
const APPS = ['explorer', 'notepad', 'calculator', 'settings', 'paint', 'edge']
const DESKTOP = { left: 0, top: 0, width: 1440, height: 852 }
const OPTIONS = { now: NOW, apps: APPS, desktop: DESKTOP }
const HALF_LEFT = getLayout('halves')!.zones.find((zone) => zone.id === 'left')!

const settings = {
  theme: 'dark' as const,
  themeChosen: true,
  sound: false,
  volume: 40,
  brightness: 80,
  wallpaper: '/assets/img/wallpaper-bloom.webp',
  wifi: true,
  bluetooth: false,
  airplane: false,
  batterySaver: true,
  nightLight: true,
  accessibility: false,
}

/** A desktop with a window of every kind, as either build would describe it. */
function source(overrides: Partial<HandoffSource> = {}): HandoffSource {
  return {
    from: 'v1',
    signedIn: true,
    windows: [
      {
        id: 11,
        app: 'notepad',
        title: 'achievements.txt',
        x: 300,
        y: 120,
        width: 640,
        height: 420,
        z: 104,
        state: 'floating',
        extras: { content: 'World #1', filePath: 'C:\\Users\\DeVante\\Desktop' },
      },
      {
        id: 12,
        app: 'settings',
        title: 'Settings',
        x: 0,
        y: 0,
        width: 1440,
        height: 852,
        z: 101,
        state: 'maximized',
        floating: { x: 270, y: 106, width: 900, height: 640 },
        extras: { currentTab: 'personalisation' },
      },
      {
        id: 13,
        app: 'calculator',
        title: 'Calculator',
        x: 560,
        y: 186,
        width: 320,
        height: 480,
        z: 102,
        state: 'minimized',
        resumeState: 'floating',
        floating: { x: 560, y: 186, width: 320, height: 480 },
        extras: {},
      },
      {
        id: 14,
        app: 'explorer',
        title: 'File Explorer',
        x: 0,
        y: 0,
        width: 720,
        height: 852,
        z: 103,
        state: 'snapped',
        floating: { x: 270, y: 126, width: 900, height: 600 },
        snap: { layout: 'halves', zone: 'left', frac: { x: 0, y: 0, w: 0.5, h: 1 } },
        extras: { initialPath: 'C:\\Users\\DeVante\\Documents', selectName: 'CV.pdf' },
      },
    ],
    focusedId: 11,
    settings,
    desktop: {
      pinnedApps: ['edge', 'explorer', 'calculator'],
      iconSize: 'large',
      iconsVisible: true,
      iconPositions: { 'Recycle Bin': { x: 900, y: 300 } },
      zoom: 1.2,
    },
    consent: false,
    ...overrides,
  }
}

const roundTrip = (state: HandoffSource, options: Partial<typeof OPTIONS> & { loadingFor?: number } = {}) =>
  readHandoff(JSON.stringify(createHandoff(state, NOW)), { ...OPTIONS, ...options })

describe('createHandoff and readHandoff', () => {
  it('carry every window, its place, state, stacking and focus, and the display settings', () => {
    const handoff = roundTrip(source())!
    expect(handoff.version).toBe(HANDOFF_VERSION)
    expect(handoff.from).toBe('v1')
    expect(handoff.signedIn).toBe(true)
    // In the order they opened, which the taskbar shows, each with its place in the stack.
    expect(handoff.windows.map((w) => [w.app, w.z])).toEqual([
      ['notepad', 104],
      ['settings', 101],
      ['calculator', 102],
      ['explorer', 103],
    ])
    expect(handoff.focused).toBe(0)

    const [notepad, settingsWin, calculator, explorer] = handoff.windows
    expect(notepad).toMatchObject({ title: 'achievements.txt', x: 300, y: 120, width: 640, height: 420, state: 'floating' })
    expect(notepad.extras).toEqual({ content: 'World #1', filePath: 'C:\\Users\\DeVante\\Desktop' })
    expect(settingsWin).toMatchObject({ state: 'maximized', x: 0, y: 0, width: 1440, height: 852 })
    expect(settingsWin.floating).toEqual({ x: 270, y: 106, width: 900, height: 640 })
    expect(settingsWin.extras).toEqual({ currentTab: 'personalisation' })
    expect(calculator).toMatchObject({ state: 'minimized', resumeState: 'floating' })
    expect(explorer.snap).toEqual({ layout: 'halves', zone: 'left', frac: { x: 0, y: 0, w: 0.5, h: 1 } })
    expect(explorer).toMatchObject({ state: 'snapped', x: 0, y: 0, width: 720, height: 852 })
    expect(explorer.extras).toEqual({ initialPath: 'C:\\Users\\DeVante\\Documents', selectName: 'CV.pdf' })

    expect(handoff.settings).toEqual(settings)
    expect(handoff.desktop).toEqual({
      pinnedApps: ['edge', 'explorer', 'calculator'],
      iconSize: 'large',
      iconsVisible: true,
      iconPositions: { 'Recycle Bin': { x: 900, y: 300 } },
      zoom: 1.2,
    })
    expect(handoff.consent).toBe(false)
  })

  it('keeps a snap that was resized along its edge', () => {
    const resized = source()
    const explorer = resized.windows[3]
    explorer.width = 864
    explorer.snap = { layout: 'halves', zone: 'left', frac: { x: 0, y: 0, w: 0.6, h: 1 } }
    const handoff = roundTrip(resized)!
    expect(handoff.windows[3]).toMatchObject({ width: 864, snap: { frac: { w: 0.6 } } })
  })

  it('carries the weather the taskbar shows, so that it does not say Loading while the other build asks again', () => {
    const weather = { temp: 12, condition: 'Overcast', icon: '☁️', city: 'Essex' }
    expect(roundTrip(source({ weather }))!.weather).toEqual(weather)
    expect(roundTrip(source({ weather: null }))!.weather).toBeNull()
    expect(roundTrip(source({ weather: { ...weather, temp: '--' as never } }))!.weather).toBeNull()
    expect(roundTrip(source({ weather: { ...weather, condition: 'x'.repeat(500) } }))!.weather).toBeNull()
  })

  it('carries a signed-out visitor with no windows, so that the other build shows its lock screen', () => {
    const handoff = roundTrip(source({ signedIn: false }))!
    expect(handoff.signedIn).toBe(false)
    expect(handoff.windows).toEqual([])
    expect(handoff.focused).toBeNull()
    expect(handoff.settings.theme).toBe('dark')
  })

  it('does not focus a minimised window', () => {
    const handoff = roundTrip(source({ focusedId: 13 }))!
    expect(handoff.focused).toBeNull()
  })

  it('works for an empty desktop, and for a visitor who never answered the cookie banner', () => {
    const handoff = roundTrip(source({ windows: [], focusedId: null, consent: null }))!
    expect(handoff.windows).toEqual([])
    expect(handoff.focused).toBeNull()
    expect(handoff.consent).toBeNull()
  })
})

describe('readHandoff turns away', () => {
  const text = (change: (h: Record<string, unknown>) => void = () => {}) => {
    const handoff = createHandoff(source(), NOW) as unknown as Record<string, unknown>
    change(handoff)
    return JSON.stringify(handoff)
  }

  it('a hand-off that has expired', () => {
    expect(readHandoff(text(), { ...OPTIONS, now: NOW + HANDOFF_TTL_MS + 1 })).toBeNull()
    expect(readHandoff(text(), { ...OPTIONS, now: NOW + HANDOFF_TTL_MS - 1 })).not.toBeNull()
  })

  it('but not one this page was already loading when it expired, as a slow connection can take longer', () => {
    const late = NOW + HANDOFF_TTL_MS + 4000
    expect(readHandoff(text(), { ...OPTIONS, now: late, loadingFor: 4500 })).not.toBeNull()
    expect(readHandoff(text(), { ...OPTIONS, now: late, loadingFor: 3000 })).toBeNull()
  })

  it('one dated in the future, which cannot be real', () => {
    expect(readHandoff(text(), { ...OPTIONS, now: NOW - 60_000 })).toBeNull()
  })

  it('a different version', () => {
    expect(readHandoff(text((h) => (h.version = HANDOFF_VERSION + 1)), OPTIONS)).toBeNull()
    expect(readHandoff(text((h) => delete h.version), OPTIONS)).toBeNull()
  })

  it('anything malformed', () => {
    for (const bad of [null, '', '{not json', 'null', '42', '[]', '"text"', '{}']) {
      expect(readHandoff(bad, OPTIONS), String(bad)).toBeNull()
    }
    expect(readHandoff(text((h) => (h.windows = 'lots')), OPTIONS)).toBeNull()
    expect(readHandoff(text((h) => (h.at = 'soon')), OPTIONS)).toBeNull()
    expect(readHandoff(text((h) => (h.settings = null)), OPTIONS)).toBeNull()
  })
})

describe('readHandoff tidies what it is given', () => {
  it('drops windows of apps this build does not have, and every second window of one app', () => {
    const state = source()
    state.windows.push({ ...state.windows[0], id: 15, app: 'no-such-app', z: 110 })
    state.windows.push({ ...state.windows[0], id: 16, z: 111 })
    const handoff = roundTrip(state)!
    expect(handoff.windows.map((w) => w.app)).toEqual(['notepad', 'settings', 'calculator', 'explorer'])
    expect(handoff.desktop.pinnedApps).toEqual(['edge', 'explorer', 'calculator'])

    const unknownPins = source({ desktop: { ...source().desktop, pinnedApps: ['edge', 'nope', 'edge'] } })
    expect(roundTrip(unknownPins)!.desktop.pinnedApps).toEqual(['edge'])
  })

  it('pulls windows back onto a smaller screen', () => {
    const small = { left: 0, top: 0, width: 1024, height: 720 }
    const state = source()
    state.windows[0] = { ...state.windows[0], x: 5000, y: 3000, width: 2000, height: 1500 }
    const handoff = roundTrip(state, { desktop: small })!
    const notepad = handoff.windows.find((w) => w.app === 'notepad')!
    expect(notepad.width).toBeLessThanOrEqual(small.width)
    expect(notepad.height).toBeLessThanOrEqual(small.height)
    expect(notepad.x).toBeLessThan(small.width)
    expect(notepad.y).toBeLessThan(small.height)
    expect(notepad.x).toBeGreaterThanOrEqual(0)

    const settingsWin = handoff.windows.find((w) => w.app === 'settings')!
    expect(settingsWin).toMatchObject({ x: 0, y: 0, width: small.width, height: small.height })
    const explorer = handoff.windows.find((w) => w.app === 'explorer')!
    expect(explorer).toMatchObject({ x: 0, y: 0, width: 512, height: 720 })
  })

  it('pulls a minimised window’s place back on screen too, for when it is restored', () => {
    const state = source()
    state.windows[2].floating = { x: 3000, y: 2000, width: 320, height: 480 }
    const calculator = roundTrip(state)!.windows.find((w) => w.app === 'calculator')!
    expect(calculator.state).toBe('minimized')
    expect(calculator.floating!.x).toBeLessThan(DESKTOP.width)
    expect(calculator.floating!.y).toBeLessThan(DESKTOP.height)
  })

  it('floats a snapped window whose snap is unknown at its last floating place, and mends what it can', () => {
    const state = source()
    state.windows[3].snap = { layout: 'no-such-layout', zone: 'left', frac: HALF_LEFT }
    state.windows[2].resumeState = 'sideways' as never
    state.windows[0].x = Number.NaN
    const handoff = roundTrip(state)!
    // A window with no place at all cannot be shown, so it stays behind.
    expect(handoff.windows.map((w) => w.app)).toEqual(['settings', 'calculator', 'explorer'])
    expect(handoff.windows[2]).toMatchObject({ state: 'floating', snap: null, x: 270, y: 126, width: 900, height: 600 })
    expect(handoff.windows[1]).toMatchObject({ state: 'minimized', resumeState: 'floating' })
  })

  it('keeps only the extras both builds understand, as text', () => {
    const state = source()
    state.windows[0].extras = { content: 'kept', filePath: 42, secret: 'dropped', locked: true }
    state.windows[1].extras = { currentTab: 'about', initialUrl: 'https://example.com' }
    const handoff = roundTrip(state)!
    expect(handoff.windows[0].extras).toEqual({ content: 'kept' })
    expect(handoff.windows[1].extras).toEqual({ currentTab: 'about' })
  })

  it('turns away addresses that could run code', () => {
    const state = source()
    state.windows[0] = { ...state.windows[0], app: 'edge', extras: { initialUrl: 'javascript:alert(1)' } }
    state.settings = { ...settings, wallpaper: 'javascript:alert(1)' }
    const handoff = roundTrip(state)!
    expect(handoff.windows[0].extras).toEqual({})
    expect(handoff.settings.wallpaper).toBeNull()

    state.windows[0].extras = { initialUrl: 'portfolio://projects' }
    state.settings = { ...settings, wallpaper: 'data:image/png;base64,AAAA' }
    const fine = roundTrip(state)!
    expect(fine.windows[0].extras).toEqual({ initialUrl: 'portfolio://projects' })
    expect(fine.settings.wallpaper).toBe('data:image/png;base64,AAAA')
  })

  it('keeps settings in range and drops the ones that make no sense', () => {
    const state = source({
      settings: { ...settings, theme: 'purple' as never, volume: 900, brightness: -5, wifi: 'yes' as never },
      desktop: { ...source().desktop, iconSize: 'huge' as never, zoom: 9, iconPositions: { a: { x: 'left', y: 3 } } as never },
      consent: 'maybe' as never,
    })
    const handoff = roundTrip(state)!
    expect(handoff.settings).toMatchObject({ theme: null, volume: 100, brightness: 30, wifi: null })
    expect(handoff.desktop).toMatchObject({ iconSize: null, zoom: 1.3, iconPositions: {} })
    expect(handoff.consent).toBeNull()

    // v1's sliders keep their value as text.
    const sliders = roundTrip(source({ settings: { ...settings, volume: '60' as never, brightness: ' ' as never } }))!
    expect(sliders.settings).toMatchObject({ volume: 60, brightness: null })
  })
})

describe('restoredWindows', () => {
  it('keeps the order, stacks the windows the same way from the first z, gives each a new id, and focuses the same one', () => {
    let id = 500
    const restored = restoredWindows(roundTrip(source())!, () => id++)
    expect(restored.windows.map((w) => [w.app, w.id, w.z])).toEqual([
      ['notepad', 500, 103],
      ['settings', 501, 100],
      ['calculator', 502, 101],
      ['explorer', 503, 102],
    ])
    expect(restored.focusedId).toBe(500)
    expect(restored.nextWindowZ).toBe(104)
    expect(restored.windows.every((w) => w.restored)).toBe(true)
  })

  it('stacks windows that share a z in the order they opened', () => {
    const state = source()
    for (const win of state.windows) win.z = 100
    const restored = restoredWindows(roundTrip(state)!, () => 1, 10)
    expect(restored.windows.map((w) => w.z)).toEqual([10, 11, 12, 13])
  })

  it('focuses nothing when nothing was focused, and copes with no windows', () => {
    const handoff = roundTrip(source({ focusedId: null }))!
    expect(restoredWindows(handoff, () => 1).focusedId).toBeNull()
    const empty = roundTrip(source({ windows: [], focusedId: null }))!
    expect(restoredWindows(empty, () => 1, 200)).toEqual({ windows: [], focusedId: null, nextWindowZ: 200 })
  })
})

describe('the extras each build keeps on a window', () => {
  it('reads v1’s own names, and gives them back', () => {
    const v1Window = { app: 'notepad', fileContent: 'hello', filePath: 'C:\\Users\\DeVante\\Desktop', loading: false }
    const shared = pickExtras('notepad', v1Window, V1_EXTRA_NAMES)
    expect(shared).toEqual({ content: 'hello', filePath: 'C:\\Users\\DeVante\\Desktop' })
    expect(renameExtras(shared, V1_EXTRA_NAMES)).toEqual({ fileContent: 'hello', filePath: 'C:\\Users\\DeVante\\Desktop' })
  })

  it('picks nothing for an app with no extras, or for no source at all', () => {
    expect(pickExtras('calculator', { content: 'x' })).toEqual({})
    expect(pickExtras('notepad', null)).toEqual({})
    expect(renameExtras({}, V1_EXTRA_NAMES)).toEqual({})
  })
})

describe('live extras', () => {
  it('reads what an open app shows now, until it stops sharing', () => {
    let folder = 'C:\\Users\\DeVante'
    const stop = shareLiveExtras(7, () => ({ initialPath: folder }))
    folder = 'C:\\Users\\DeVante\\Documents'
    expect(liveExtras(7)).toEqual({ initialPath: 'C:\\Users\\DeVante\\Documents' })
    expect(liveExtras('7')).toEqual({ initialPath: 'C:\\Users\\DeVante\\Documents' })
    stop()
    expect(liveExtras(7)).toEqual({})
  })

  it('gives nothing for a window that shares nothing, or whose app fails to say', () => {
    expect(liveExtras(99)).toEqual({})
    const stop = shareLiveExtras(8, () => {
      throw new Error('unmounted')
    })
    expect(liveExtras(8)).toEqual({})
    stop()
  })
})

describe('isPlainClick', () => {
  const click = (init: MouseEventInit = {}) => new MouseEvent('click', { button: 0, ...init })

  it('takes a plain left click, which switches in place', () => {
    expect(isPlainClick(click())).toBe(true)
  })

  it('leaves a click that opens a new tab or window to the browser', () => {
    expect(isPlainClick(click({ ctrlKey: true }))).toBe(false)
    expect(isPlainClick(click({ metaKey: true }))).toBe(false)
    expect(isPlainClick(click({ shiftKey: true }))).toBe(false)
    expect(isPlainClick(click({ altKey: true }))).toBe(false)
    expect(isPlainClick(click({ button: 1 }))).toBe(false)
  })

  it('takes a click that was already handled as no click at all', () => {
    const handled = click()
    Object.defineProperty(handled, 'defaultPrevented', { value: true })
    expect(isPlainClick(handled)).toBe(false)
    expect(isPlainClick(null)).toBe(false)
  })
})

describe('the hand-off in session storage', () => {
  beforeEach(() => sessionStorage.clear())

  it('is read once, then gone', () => {
    expect(writeHandoff(sessionStorage, createHandoff(source(), NOW))).toBe(true)
    expect(sessionStorage.getItem(HANDOFF_KEY)).not.toBeNull()
    expect(takeHandoff(sessionStorage, OPTIONS)?.windows).toHaveLength(4)
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
    expect(takeHandoff(sessionStorage, OPTIONS)).toBeNull()
  })

  it('is cleared even when it cannot be used', () => {
    sessionStorage.setItem(HANDOFF_KEY, '{not json')
    expect(takeHandoff(sessionStorage, OPTIONS)).toBeNull()
    expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
  })

  it('copes with storage that is blocked or full', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('full')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(writeHandoff(blocked, createHandoff(source(), NOW))).toBe(false)
    expect(takeHandoff(blocked, OPTIONS)).toBeNull()
  })
})
