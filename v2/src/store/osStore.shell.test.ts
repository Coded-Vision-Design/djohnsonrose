import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOsStore } from './osStore'
import { pinnedApps } from '../apps/manifest'
import { resetConsentForTests, setConsent } from '../lib/consent'

// The review fixes that live in the store: theme, pins, Quick Settings,
// Recommended times, telemetry and the Widgets failure states.

const persisted = (state: Record<string, unknown>) =>
  localStorage.setItem('react.os', JSON.stringify({ state, version: 0 }))

const darkSystem = (dark: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query.includes('dark'),
    addEventListener: () => {},
    removeEventListener: () => {},
  }))

describe('osStore shell', () => {
  beforeEach(() => {
    localStorage.clear()
    resetConsentForTests()
    useOsStore.setState({ windows: [], pinnedApps, recent: {}, themeChosen: false })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('theme', () => {
    it('follows the system when the visitor has not chosen', async () => {
      darkSystem(true)
      persisted({ loggedIn: true, settings: { ...useOsStore.getState().settings, theme: 'light' } })
      await useOsStore.persist.rehydrate()
      expect(useOsStore.getState().settings.theme).toBe('dark')
    })

    it('keeps a theme the visitor chose', async () => {
      darkSystem(true)
      persisted({ settings: { ...useOsStore.getState().settings, theme: 'light' }, themeChosen: true })
      await useOsStore.persist.rehydrate()
      expect(useOsStore.getState().settings.theme).toBe('light')
    })

    it('treats a saved dark theme from before as a choice', async () => {
      darkSystem(false)
      persisted({ settings: { ...useOsStore.getState().settings, theme: 'dark' } })
      await useOsStore.persist.rehydrate()
      expect(useOsStore.getState().settings.theme).toBe('dark')
    })

    it('records a choice made in Settings', () => {
      useOsStore.getState().setTheme('dark')
      expect(useOsStore.getState().settings.theme).toBe('dark')
      expect(useOsStore.getState().themeChosen).toBe(true)
    })
  })

  describe('taskbar pins', () => {
    it('are saved with the other settings', () => {
      useOsStore.getState().togglePinned('calculator')
      const saved = JSON.parse(localStorage.getItem('react.os')!).state
      expect(saved.pinnedApps).toContain('calculator')
    })
  })

  describe('Quick Settings', () => {
    it('applies a toggle and the settings tied to it, as v1 does', () => {
      useOsStore.getState().updateSetting('brightness', 80)
      useOsStore.getState().toggleQuickSetting('airplane')
      expect(useOsStore.getState().settings).toMatchObject({ airplane: true, wifi: false, bluetooth: false })
      useOsStore.getState().toggleQuickSetting('batterySaver')
      expect(useOsStore.getState().settings).toMatchObject({ batterySaver: true, brightness: 50 })
    })
  })

  describe('Recommended', () => {
    it('remembers when the CV and Projects were opened', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1_000)
      useOsStore.getState().openApp('pdfreader', 'CV', { extra: { pdfUrl: '/data/cv.pdf' } })
      useOsStore.getState().openApp('explorer', 'Projects', { extra: { initialPath: 'C:\\Users\\DeVante\\Projects' } })
      expect(useOsStore.getState().recent).toEqual({ cv: 1_000, projects: 1_000 })
    })
  })

  describe('telemetry', () => {
    it('sends the app with an app-open event', () => {
      const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() =>
        Promise.resolve(new Response(null)),
      )
      vi.stubGlobal('fetch', fetchMock)
      setConsent(true)
      useOsStore.getState().openApp('calculator')
      const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init.body)))
      expect(bodies.some((b) => b.details?.app === 'calculator')).toBe(true)
    })
  })

  describe('Widgets', () => {
    it('starts loading, and can say the news failed', () => {
      expect(useOsStore.getState().newsStatus).toBe('loading')
      useOsStore.getState().setNewsStatus('error')
      expect(useOsStore.getState().newsStatus).toBe('error')
    })
  })
})
