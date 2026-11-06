import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  ICON_CELL,
  ICON_MARGIN,
  animateWindowOut,
  browserName,
  detectOs,
  deviceInfo,
  displayFilter,
  focusAfterClose,
  initialTheme,
  layoutDesktopIcons,
  quickTogglePatch,
  relativeTime,
  reserveBottomSpace,
  shellKeyFromEvent,
  storedNumber,
  whenAssetsReady,
} from '../../../assets/js/windowing/shell-ui.js'

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.70',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  opera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0',
  chromebook:
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
}

describe('detectOs', () => {
  it('names the desktop systems', () => {
    expect(detectOs(UA.windowsChrome)).toBe('Windows')
    expect(detectOs(UA.macSafari)).toBe('macOS')
    expect(detectOs(UA.linuxFirefox)).toBe('Linux')
    expect(detectOs(UA.chromebook)).toBe('ChromeOS')
  })

  it('finds phones before the desktop systems their agents also name', () => {
    expect(detectOs(UA.iphone)).toBe('iOS') // "like Mac OS X"
    expect(detectOs(UA.android)).toBe('Android') // "Linux"
    expect(detectOs(UA.samsung)).toBe('Android')
  })

  it('counts an iPad that asks for the desktop site as iOS', () => {
    expect(detectOs(UA.macSafari, 5)).toBe('iOS')
    expect(detectOs(UA.macSafari, 0)).toBe('macOS')
  })

  it('copes with an empty or missing agent', () => {
    expect(detectOs('')).toBe('Unknown')
    expect(detectOs(undefined as unknown as string)).toBe('Unknown')
  })
})

describe('browserName', () => {
  it('names the browser and its major version', () => {
    expect(browserName(UA.windowsChrome)).toBe('Chrome 131')
    expect(browserName(UA.macSafari)).toBe('Safari 17')
    expect(browserName(UA.linuxFirefox)).toBe('Firefox 133')
  })

  it('finds browsers built on Chrome before Chrome itself', () => {
    expect(browserName(UA.windowsEdge)).toBe('Edge 131')
    expect(browserName(UA.opera)).toBe('Opera 115')
    expect(browserName(UA.samsung)).toBe('Samsung Internet 26')
    expect(browserName(UA.iphoneChrome)).toBe('Chrome 131')
  })

  it('never reports Netscape, and says Other when it cannot tell', () => {
    expect(browserName('Mozilla/5.0')).toBe('Other')
    expect(browserName('')).toBe('Other')
  })
})

describe('deviceInfo', () => {
  it('describes the visitor in the shape the log endpoint reads', () => {
    const info = deviceInfo({
      userAgent: UA.android,
      screen: { width: 412, height: 915 },
      touchPoints: 5,
      now: new Date('2026-11-06T10:00:00Z'),
    })
    expect(info).toMatchObject({
      os: 'Android',
      browser: 'Chrome 130',
      resolution: '412x915',
      userAgent: UA.android,
    })
    expect(info.deviceTime).toContain('2026')
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-11-06T15:00:00')

  it('reads like the Start menu in Windows 11', () => {
    expect(relativeTime(new Date('2026-11-06T14:59:40'), now)).toBe('Just now')
    expect(relativeTime(new Date('2026-11-06T14:43:00'), now)).toBe('17m ago')
    expect(relativeTime(new Date('2026-11-06T13:00:00'), now)).toBe('2h ago')
    expect(relativeTime(new Date('2026-11-05T09:00:00'), now)).toBe('Yesterday')
    expect(relativeTime(new Date('2026-11-02T09:00:00'), now)).toBe('Monday')
    expect(relativeTime(new Date('2026-10-01T09:00:00'), now)).toBe('1 Oct')
  })

  it('treats a time in the future, from a skewed clock, as just now', () => {
    expect(relativeTime(new Date('2026-11-06T15:05:00'), now)).toBe('Just now')
  })

  it('says yesterday for late last night, even within 24 hours', () => {
    expect(relativeTime(new Date('2026-11-05T23:30:00'), new Date('2026-11-06T08:00:00'))).toBe('Yesterday')
  })

  it('accepts timestamps, and gives null for no time at all', () => {
    expect(relativeTime(now.getTime() - 5 * 60_000, now)).toBe('5m ago')
    expect(relativeTime(null, now)).toBeNull()
    expect(relativeTime(Number.NaN, now)).toBeNull()
  })
})

describe('initialTheme', () => {
  it('keeps a theme the visitor chose', () => {
    expect(initialTheme('light', true)).toBe('light')
    expect(initialTheme('dark', false)).toBe('dark')
  })

  it('follows the system on a first visit', () => {
    expect(initialTheme(null, true)).toBe('dark')
    expect(initialTheme(null, false)).toBe('light')
  })

  it('ignores a saved value that is not a theme', () => {
    expect(initialTheme('purple', true)).toBe('dark')
  })
})

describe('displayFilter', () => {
  const base = { brightness: 100, nightLight: false, accessibility: false }

  it('is none when nothing changes the display', () => {
    expect(displayFilter(base)).toBe('none')
  })

  it('dims, warms and raises contrast together', () => {
    expect(displayFilter({ ...base, brightness: 60 })).toBe('brightness(60%)')
    expect(displayFilter({ ...base, nightLight: true })).toBe('sepia(40%) saturate(120%)')
    expect(displayFilter({ brightness: '70', nightLight: true, accessibility: true })).toBe(
      'brightness(70%) sepia(40%) saturate(120%) contrast(120%) brightness(110%)',
    )
  })

  it('ignores a brightness that is not a number', () => {
    expect(displayFilter({ ...base, brightness: 'abc' })).toBe('none')
  })
})

describe('quickTogglePatch', () => {
  const settings = {
    wifi: true,
    bluetooth: true,
    airplane: false,
    batterySaver: false,
    nightLight: false,
    accessibility: false,
    brightness: 80,
  }

  it('flips a plain toggle', () => {
    expect(quickTogglePatch(settings, 'nightLight')).toEqual({ nightLight: true })
    expect(quickTogglePatch(settings, 'accessibility')).toEqual({ accessibility: true })
  })

  it('turns the radios off with flight mode, and back on without it', () => {
    expect(quickTogglePatch(settings, 'airplane')).toEqual({ airplane: true, wifi: false, bluetooth: false })
    expect(quickTogglePatch({ ...settings, airplane: true, wifi: false, bluetooth: false }, 'airplane')).toEqual({
      airplane: false,
      wifi: true,
      bluetooth: true,
    })
  })

  it('ends flight mode when a radio comes back on', () => {
    expect(quickTogglePatch({ ...settings, airplane: true, wifi: false }, 'wifi')).toEqual({
      wifi: true,
      airplane: false,
    })
    expect(quickTogglePatch(settings, 'wifi')).toEqual({ wifi: false })
  })

  it('caps brightness with energy saver, and restores it after', () => {
    expect(quickTogglePatch(settings, 'batterySaver')).toEqual({ batterySaver: true, brightness: 50 })
    expect(quickTogglePatch({ ...settings, brightness: 40 }, 'batterySaver')).toEqual({
      batterySaver: true,
      brightness: 40,
    })
    expect(quickTogglePatch({ ...settings, batterySaver: true }, 'batterySaver')).toEqual({
      batterySaver: false,
      brightness: 100,
    })
  })

  it('changes nothing for a toggle it does not know', () => {
    expect(quickTogglePatch(settings, 'theme')).toEqual({})
  })
})

describe('storedNumber', () => {
  it('reads a saved number, including zero', () => {
    expect(storedNumber('40', 75)).toBe(40)
    expect(storedNumber('0', 75)).toBe(0)
  })

  it('falls back when nothing was saved', () => {
    expect(storedNumber(null, 75)).toBe(75)
    expect(storedNumber('', 75)).toBe(75)
  })

  it('falls back on a value that is not a number', () => {
    expect(storedNumber('loud', 75)).toBe(75)
  })
})

describe('shellKeyFromEvent', () => {
  const key = (k: string, mods: Partial<KeyboardEvent> = {}) =>
    ({ key: k, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...mods }) as KeyboardEvent

  it('opens Task Manager on Ctrl+Shift+Esc', () => {
    expect(shellKeyFromEvent(key('Escape', { ctrlKey: true, shiftKey: true }))).toBe('taskManager')
  })

  it('searches on Win+S but leaves Ctrl+S to the app', () => {
    expect(shellKeyFromEvent(key('s', { metaKey: true }))).toBe('search')
    expect(shellKeyFromEvent(key('S', { metaKey: true }))).toBe('search')
    expect(shellKeyFromEvent(key('s', { ctrlKey: true }))).toBeNull()
    expect(shellKeyFromEvent(key('s', { metaKey: true, ctrlKey: true }))).toBeNull()
  })

  it('dismisses on Esc alone', () => {
    expect(shellKeyFromEvent(key('Escape'))).toBe('dismiss')
    expect(shellKeyFromEvent(key('Escape', { shiftKey: true }))).toBeNull()
    expect(shellKeyFromEvent(key('a'))).toBeNull()
  })
})

describe('layoutDesktopIcons', () => {
  const area = { width: 1280, height: 760 }
  const rows = Math.floor((area.height - ICON_MARGIN * 2) / ICON_CELL)

  it('fills columns from the top left, with the first icon at the origin', () => {
    const names = ['PC', 'a', 'b']
    const out = layoutDesktopIcons(names, {}, area)
    expect(out.PC).toEqual({ x: ICON_MARGIN, y: ICON_MARGIN })
    expect(out.a).toEqual({ x: ICON_MARGIN, y: ICON_MARGIN + ICON_CELL })
    expect(out.b).toEqual({ x: ICON_MARGIN, y: ICON_MARGIN + ICON_CELL * 2 })
  })

  it('starts a new column when one is full, and skips slots the visitor took', () => {
    const names = Array.from({ length: rows + 1 }, (_, i) => `i${i}`)
    const stored = { i0: { x: ICON_MARGIN, y: ICON_MARGIN + ICON_CELL } }
    const out = layoutDesktopIcons(names, stored, area)
    expect(out.i0).toEqual(stored.i0)
    expect(out.i1).toEqual({ x: ICON_MARGIN, y: ICON_MARGIN })
    expect(out[`i${rows}`].x).toBe(ICON_MARGIN + ICON_CELL)
  })

  it('pulls a moved icon back on screen when the desktop shrinks', () => {
    const out = layoutDesktopIcons(['a'], { a: { x: 1200, y: 700 } }, { width: 640, height: 360 })
    expect(out.a.x).toBeLessThanOrEqual(640 - ICON_CELL)
    expect(out.a.y).toBeLessThanOrEqual(360 - ICON_CELL)
    expect(out.a.x).toBeGreaterThanOrEqual(0)
  })

  it('still places icons on a desktop too small for one row', () => {
    const out = layoutDesktopIcons(['a', 'b'], {}, { width: 100, height: 40 })
    expect(out.a).toEqual({ x: ICON_MARGIN, y: 0 })
    expect(out.b).toEqual({ x: ICON_MARGIN + ICON_CELL, y: 0 })
  })
})

describe('whenAssetsReady', () => {
  afterEach(() => vi.useRealTimers())

  it('waits for every asset, but no less than the minimum', async () => {
    vi.useFakeTimers()
    let release!: () => void
    const load = vi.fn((url: string) =>
      url === 'slow' ? new Promise<void>((resolve) => (release = resolve)) : Promise.resolve(),
    )
    let done = false
    void whenAssetsReady(['fast', 'slow'], { minMs: 300, maxMs: 5000, load }).then(() => (done = true))
    await vi.advanceTimersByTimeAsync(1000)
    expect(done).toBe(false)
    release()
    await vi.advanceTimersByTimeAsync(0)
    expect(done).toBe(true)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('holds a fast load for the minimum, so the screen does not flash', async () => {
    vi.useFakeTimers()
    let done = false
    void whenAssetsReady(['a'], { minMs: 800, load: () => Promise.resolve() }).then(() => (done = true))
    await vi.advanceTimersByTimeAsync(700)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(100)
    expect(done).toBe(true)
  })

  it('gives up waiting after the maximum, and shrugs off failed or empty assets', async () => {
    vi.useFakeTimers()
    let done = false
    const load = (url: string) => (url === 'bad' ? Promise.reject(new Error('404')) : new Promise<void>(() => {}))
    void whenAssetsReady(['bad', 'never', '', null], { minMs: 0, maxMs: 2000, load }).then(() => (done = true))
    await vi.advanceTimersByTimeAsync(1999)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
  })
})

describe('animateWindowOut', () => {
  const setMotion = (reduce: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce') }))

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('leaves a copy of the window behind that the screen reader cannot see', () => {
    setMotion(false)
    document.body.innerHTML =
      '<div id="layer"><div id="win-1" role="dialog" aria-label="Notepad" class="os-window"><input id="field"></div></div>'
    const ghost = animateWindowOut(document.getElementById('win-1'), 'close')!
    expect(ghost).not.toBeNull()
    expect(ghost.parentElement?.id).toBe('layer')
    expect(ghost.getAttribute('aria-hidden')).toBe('true')
    expect(ghost.hasAttribute('role')).toBe(false)
    expect(ghost.querySelector('[id]')).toBeNull()
    expect(ghost.classList.contains('os-window')).toBe(false)
    expect(ghost.dataset.leaving).toBe('close')
  })

  it('removes the copy when its animation ends', () => {
    setMotion(false)
    document.body.innerHTML = '<div id="layer"><div id="win-1" class="os-window"></div></div>'
    const ghost = animateWindowOut(document.getElementById('win-1'), 'minimise')!
    expect(ghost.dataset.leaving).toBe('minimise')
    ghost.dispatchEvent(new Event('animationend'))
    expect(document.querySelectorAll('[data-leaving]')).toHaveLength(0)
  })

  it('does nothing with reduced motion, or without a window', () => {
    setMotion(true)
    document.body.innerHTML = '<div id="layer"><div id="win-1" class="os-window"></div></div>'
    expect(animateWindowOut(document.getElementById('win-1'), 'close')).toBeNull()
    expect(document.querySelectorAll('[data-leaving]')).toHaveLength(0)
    expect(animateWindowOut(null, 'close')).toBeNull()
  })
})

describe('focusAfterClose', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('moves focus to the next window', () => {
    document.body.innerHTML =
      '<div id="win-2" tabindex="-1"></div><button data-taskbar-app="notepad"></button><button data-start-button></button>'
    focusAfterClose(2, 'notepad')
    expect(document.activeElement?.id).toBe('win-2')
  })

  it('goes back to the taskbar button when no window is left', () => {
    document.body.innerHTML = '<button data-taskbar-app="explorer"></button><button data-start-button></button>'
    focusAfterClose(null, 'explorer')
    expect(document.activeElement?.getAttribute('data-taskbar-app')).toBe('explorer')
  })

  it('falls back to Start when the app had no button of its own', () => {
    document.body.innerHTML = '<button data-start-button></button>'
    focusAfterClose(7, 'calc"ulator')
    expect(document.activeElement?.hasAttribute('data-start-button')).toBe(true)
  })
})

describe('reserveBottomSpace', () => {
  it('publishes the height of a bar, and clears it when stopped', () => {
    const bar = document.createElement('div')
    Object.defineProperty(bar, 'offsetHeight', { value: 96 })
    const stop = reserveBottomSpace(bar)
    expect(document.documentElement.style.getPropertyValue('--os-banner-inset')).toBe('96px')
    stop()
    expect(document.documentElement.style.getPropertyValue('--os-banner-inset')).toBe('0px')
  })
})
