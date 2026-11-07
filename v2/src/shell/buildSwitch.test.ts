import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOsStore } from '../store/osStore'
import { pinnedApps } from '../apps/manifest'
import { readConsent, resetConsentForTests, setConsent } from '../lib/consent'
import { HANDOFF_KEY, createHandoff, shareLiveExtras } from '../../../assets/js/windowing/handoff.js'
import { arriveFromOtherBuild, followBuildLink } from './buildSwitch'

// The build switch in v2: what the store leaves for v1, and how it takes what
// v1 left. handoff.test.ts checks the hand-off itself.

const DESKTOP = { left: 0, top: 0, width: 1440, height: 852 }
const defaults = useOsStore.getState().settings

const darkSystem = (dark: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query.includes('dark'),
    addEventListener: () => {},
    removeEventListener: () => {},
  }))

/** What v1 leaves when it switches: two windows, one of them focused. */
const fromV1 = (signedIn = true) =>
  createHandoff(
    {
      from: 'v1',
      signedIn,
      windows: [
        { id: 1, app: 'explorer', title: 'Documents', x: 40, y: 30, width: 900, height: 600, z: 120, state: 'floating', extras: { initialPath: 'C:\\Users\\DeVante\\Documents' } },
        { id: 2, app: 'calculator', title: 'Calculator', x: 0, y: 0, width: 1440, height: 852, z: 110, state: 'maximized', floating: { x: 560, y: 186, width: 320, height: 480 } },
      ],
      focusedId: 1,
      settings: { ...defaults, theme: 'dark', themeChosen: true, wallpaper: '/assets/img/wallpaper-two.webp', nightLight: true, volume: 20 },
      desktop: { pinnedApps: ['edge', 'calculator'], iconSize: 'small', iconsVisible: false, iconPositions: { GitHub: { x: 500, y: 200 } }, zoom: 0.8 },
      consent: true,
      weather: { temp: 9, condition: 'Light rain', icon: 'rain', city: 'Essex' },
    },
    Date.now(),
  )

const leave = (handoff: unknown) => sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff))

describe('the build switch in v2', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    resetConsentForTests()
    useOsStore.setState({
      isBooting: true,
      loggedIn: false,
      windows: [],
      focusedWindowId: null,
      nextWindowZ: 100,
      desktop: DESKTOP,
      windowMode: 'desktop',
      pinnedApps,
      settings: defaults,
      themeChosen: false,
      desktopZoom: 1,
      iconPositions: {},
      weather: { temp: '--', condition: 'Loading...', icon: 'cloud', city: 'Essex', status: 'loading' },
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('arriving from v1', () => {
    it('opens the same windows, stacked and focused as they were, with no boot or lock screen', () => {
      leave(fromV1())
      expect(arriveFromOtherBuild()).toBe(true)
      const s = useOsStore.getState()
      expect(s.isBooting).toBe(false)
      expect(s.loggedIn).toBe(true)
      // In the order they opened, stacked as they were.
      expect(s.windows.map((w) => [w.app, w.title, w.state, w.z])).toEqual([
        ['explorer', 'Documents', 'floating', 101],
        ['calculator', 'Calculator', 'maximized', 100],
      ])
      const explorer = s.windows[0]
      expect(explorer).toMatchObject({ x: 40, y: 30, width: 900, height: 600, restored: true })
      expect(explorer.extra).toEqual({ initialPath: 'C:\\Users\\DeVante\\Documents' })
      expect(s.windows[1].floating).toEqual({ x: 560, y: 186, width: 320, height: 480 })
      expect(s.focusedWindowId).toBe(explorer.id)
      expect(s.nextWindowZ).toBe(102)
      // Read once, then gone.
      expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
    })

    it('takes the theme, wallpaper, display settings, pins, icons and cookie choice', () => {
      leave(fromV1())
      arriveFromOtherBuild()
      const s = useOsStore.getState()
      expect(s.settings).toMatchObject({ theme: 'dark', wallpaper: '/assets/img/wallpaper-two.webp', nightLight: true, volume: 20 })
      expect(s.themeChosen).toBe(true)
      expect(s.pinnedApps).toEqual(['edge', 'calculator'])
      expect(s.desktopIconSize).toBe('small')
      expect(s.desktopIconsVisible).toBe(false)
      expect(s.iconPositions).toEqual({ GitHub: { x: 500, y: 200 } })
      expect(s.desktopZoom).toBe(0.8)
      expect(readConsent()).toBe(true)
      expect(s.weather).toEqual({ temp: 9, condition: 'Light rain', icon: 'rain', city: 'Essex', status: 'ready' })
      // Kept, as a choice made in Settings is.
      expect(JSON.parse(localStorage.getItem('react.os')!).state.settings.theme).toBe('dark')
    })

    it('follows the system when the visitor never chose a theme in v1', () => {
      darkSystem(true)
      const handoff = fromV1() as { settings: Record<string, unknown> }
      handoff.settings.theme = 'dark'
      handoff.settings.themeChosen = false
      useOsStore.setState({ settings: { ...defaults, theme: 'light' }, themeChosen: true })
      leave(handoff)
      arriveFromOtherBuild()
      expect(useOsStore.getState().settings.theme).toBe('dark')
      expect(useOsStore.getState().themeChosen).toBe(false)
    })

    it('shows the lock screen, and no windows, for a visitor who was signed out', () => {
      useOsStore.setState({ loggedIn: true })
      leave(fromV1(false))
      arriveFromOtherBuild()
      const s = useOsStore.getState()
      expect(s.loggedIn).toBe(false)
      expect(s.isBooting).toBe(false)
      expect(s.windows).toEqual([])
      expect(s.settings.wallpaper).toBe('/assets/img/wallpaper-two.webp')
    })

    it('boots as before when there is no hand-off, or only a stale one', () => {
      expect(arriveFromOtherBuild()).toBe(false)
      const stale = fromV1() as { at: number }
      stale.at -= 60_000
      leave(stale)
      expect(arriveFromOtherBuild()).toBe(false)
      expect(useOsStore.getState()).toMatchObject({ isBooting: true, loggedIn: false, windows: [] })
    })

    it('boots as before when session storage is blocked', () => {
      const blocked = {
        getItem: () => {
          throw new DOMException('blocked', 'SecurityError')
        },
        setItem: () => {},
        removeItem: () => {},
      } as unknown as Storage
      expect(arriveFromOtherBuild(blocked)).toBe(false)
    })
  })

  describe('leaving for v1', () => {
    it('leaves the windows, what each shows now, and the settings, then goes', () => {
      const go = vi.fn()
      setConsent(false)
      const { openApp, toggleMinimize, switchBuild } = useOsStore.getState()
      useOsStore.setState({ loggedIn: true, weather: { temp: 12, condition: 'Overcast', icon: 'cloud', city: 'Essex', status: 'ready' } })
      openApp('notepad', 'notes.txt', { extra: { content: 'hello', filePath: 'C:\\Users\\DeVante\\Desktop' } })
      openApp('explorer', 'File Explorer')
      openApp('calculator')
      const [, explorer, calculator] = useOsStore.getState().windows
      toggleMinimize(calculator.id)
      const stop = shareLiveExtras(explorer.id, () => ({ initialPath: 'C:\\Users\\DeVante\\Pictures' }))

      switchBuild('/', 'PHP Build', go)
      stop()

      expect(go).toHaveBeenCalledWith('/')
      const handoff = JSON.parse(sessionStorage.getItem(HANDOFF_KEY)!)
      expect(handoff).toMatchObject({ from: 'v2', signedIn: true, focused: 1, consent: false })
      expect(handoff.windows.map((w: { app: string }) => w.app)).toEqual(['notepad', 'explorer', 'calculator'])
      expect(handoff.windows[0].extras).toEqual({ content: 'hello', filePath: 'C:\\Users\\DeVante\\Desktop' })
      expect(handoff.windows[1].extras).toEqual({ initialPath: 'C:\\Users\\DeVante\\Pictures' })
      expect(handoff.windows[2]).toMatchObject({ state: 'minimized', resumeState: 'floating' })
      expect(handoff.settings.theme).toBe(defaults.theme)
      expect(handoff.weather).toEqual({ temp: 12, condition: 'Overcast', icon: 'cloud', city: 'Essex' })
      expect(useOsStore.getState().eventLogs[0].description).toBe('Version switch: opening PHP Build (/)')
    })

    it('still goes when session storage is full', () => {
      const go = vi.fn()
      const setItem = Storage.prototype.setItem
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
        if (this === sessionStorage) throw new DOMException('full', 'QuotaExceededError')
        setItem.call(this, key, value)
      })
      useOsStore.getState().switchBuild('/', 'PHP Build', go)
      expect(go).toHaveBeenCalledWith('/')
      expect(sessionStorage.getItem(HANDOFF_KEY)).toBeNull()
    })
  })

  describe('the chip', () => {
    const switchBuild = useOsStore.getState().switchBuild
    afterEach(() => useOsStore.setState({ switchBuild }))

    const link = () => {
      const a = document.createElement('a')
      a.setAttribute('href', '/')
      return a
    }

    it('switches in place on a plain click', () => {
      const switchBuild = vi.fn()
      useOsStore.setState({ switchBuild })
      const event = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, defaultPrevented: false, preventDefault: vi.fn(), currentTarget: link() }
      followBuildLink(event as never, 'PHP Build')
      expect(event.preventDefault).toHaveBeenCalled()
      expect(switchBuild).toHaveBeenCalledWith('/', 'PHP Build')
    })

    it('leaves a click that opens a new tab to the browser', () => {
      const switchBuild = vi.fn()
      useOsStore.setState({ switchBuild })
      const event = { button: 0, ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, defaultPrevented: false, preventDefault: vi.fn(), currentTarget: link() }
      followBuildLink(event as never, 'PHP Build')
      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(switchBuild).not.toHaveBeenCalled()
    })
  })
})
