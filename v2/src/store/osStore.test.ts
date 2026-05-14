import { beforeEach, describe, expect, it } from 'vitest'
import { useOsStore } from './osStore'

const reset = () => {
  // Reset to factory defaults — Zustand persists `loggedIn` + `settings`,
  // so we clear localStorage too.
  localStorage.clear()
  useOsStore.setState({
    isBooting: true,
    loggedIn: false,
    windows: [],
    focusedWindowId: null,
    nextWindowZ: 100,
    snapPreview: { show: false, x: 0, y: 0, w: 0, h: 0 },
    eventLogs: [],
    startMenuOpen: false,
    quickSettingsOpen: false,
    widgetsOpen: false,
    clock: { time: '', date: '' },
    weather: { temp: '--', condition: 'Loading...', icon: '☁️', city: 'London' },
    news: [],
  })
}

describe('osStore', () => {
  beforeEach(reset)

  describe('boot + auth', () => {
    it('finishBoot clears isBooting', () => {
      expect(useOsStore.getState().isBooting).toBe(true)
      useOsStore.getState().finishBoot()
      expect(useOsStore.getState().isBooting).toBe(false)
    })

    it('login sets loggedIn=true and clears isBooting', () => {
      useOsStore.getState().login()
      const s = useOsStore.getState()
      expect(s.loggedIn).toBe(true)
      expect(s.isBooting).toBe(false)
    })

    it('logout clears windows and focus', () => {
      const { openApp, logout } = useOsStore.getState()
      openApp('paint')
      openApp('calculator')
      expect(useOsStore.getState().windows).toHaveLength(2)
      logout()
      const s = useOsStore.getState()
      expect(s.loggedIn).toBe(false)
      expect(s.windows).toHaveLength(0)
      expect(s.focusedWindowId).toBeNull()
    })
  })

  describe('openApp', () => {
    it('pushes a new window and focuses it', () => {
      useOsStore.getState().openApp('paint')
      const s = useOsStore.getState()
      expect(s.windows).toHaveLength(1)
      expect(s.windows[0].app).toBe('paint')
      expect(s.windows[0].title).toBe('Paint')
      expect(s.focusedWindowId).toBe(s.windows[0].id)
    })

    it('uses provided title over capitalized app id', () => {
      useOsStore.getState().openApp('paint', 'Microsoft Paint')
      expect(useOsStore.getState().windows[0].title).toBe('Microsoft Paint')
    })

    it('focuses existing window instead of opening a duplicate', () => {
      const { openApp } = useOsStore.getState()
      openApp('paint')
      const firstId = useOsStore.getState().windows[0].id
      openApp('paint')
      const s = useOsStore.getState()
      expect(s.windows).toHaveLength(1)
      expect(s.focusedWindowId).toBe(firstId)
    })

    it('restores a minimized existing window', () => {
      const { openApp, toggleMinimize } = useOsStore.getState()
      openApp('paint')
      const id = useOsStore.getState().windows[0].id
      toggleMinimize(id)
      expect(useOsStore.getState().windows[0].minimized).toBe(true)
      openApp('paint')
      expect(useOsStore.getState().windows[0].minimized).toBe(false)
    })

    it('assigns increasing z-index to each new window', () => {
      const { openApp } = useOsStore.getState()
      openApp('paint')
      openApp('calculator')
      const [a, b] = useOsStore.getState().windows
      expect(b.z).toBeGreaterThan(a.z)
    })
  })

  describe('focusWindow', () => {
    it('bumps z above all others and updates focusedWindowId', () => {
      const { openApp, focusWindow } = useOsStore.getState()
      openApp('paint')
      openApp('calculator')
      const [a] = useOsStore.getState().windows
      focusWindow(a.id)
      const s = useOsStore.getState()
      const updated = s.windows.find((w) => w.id === a.id)!
      const other = s.windows.find((w) => w.id !== a.id)!
      expect(updated.z).toBeGreaterThan(other.z)
      expect(s.focusedWindowId).toBe(a.id)
    })
  })

  describe('toggleMinimize', () => {
    it('flips minimized flag', () => {
      const { openApp, toggleMinimize } = useOsStore.getState()
      openApp('paint')
      const id = useOsStore.getState().windows[0].id
      toggleMinimize(id)
      expect(useOsStore.getState().windows[0].minimized).toBe(true)
      toggleMinimize(id)
      expect(useOsStore.getState().windows[0].minimized).toBe(false)
    })

    it('focuses the window when un-minimizing', () => {
      const { openApp, toggleMinimize, focusWindow } = useOsStore.getState()
      openApp('paint')
      openApp('calculator')
      const [paint, calc] = useOsStore.getState().windows
      focusWindow(calc.id)
      toggleMinimize(paint.id) // minimize paint
      toggleMinimize(paint.id) // restore — should refocus paint
      expect(useOsStore.getState().focusedWindowId).toBe(paint.id)
    })
  })

  describe('toggleMaximize', () => {
    it('flips maximized flag', () => {
      const { openApp, toggleMaximize } = useOsStore.getState()
      openApp('paint')
      const id = useOsStore.getState().windows[0].id
      const wasMax = useOsStore.getState().windows[0].maximized
      toggleMaximize(id)
      expect(useOsStore.getState().windows[0].maximized).toBe(!wasMax)
    })
  })

  describe('closeWindow', () => {
    it('removes the window', () => {
      const { openApp, closeWindow } = useOsStore.getState()
      openApp('paint')
      const id = useOsStore.getState().windows[0].id
      closeWindow(id)
      expect(useOsStore.getState().windows).toHaveLength(0)
    })

    it('refocuses the next visible window when closing the focused one', () => {
      const { openApp, closeWindow, focusWindow } = useOsStore.getState()
      openApp('paint')
      openApp('calculator')
      openApp('notepad')
      const [paint, calc, notepad] = useOsStore.getState().windows
      focusWindow(notepad.id)
      closeWindow(notepad.id)
      // Next visible (highest z) should be calc (opened after paint).
      const focus = useOsStore.getState().focusedWindowId
      expect([calc.id, paint.id]).toContain(focus!)
    })

    it('sets focus to null when closing the only window', () => {
      const { openApp, closeWindow } = useOsStore.getState()
      openApp('paint')
      const id = useOsStore.getState().windows[0].id
      closeWindow(id)
      expect(useOsStore.getState().focusedWindowId).toBeNull()
    })
  })

  describe('moveWindow + resizeWindow', () => {
    it('moveWindow updates x/y only', () => {
      const { openApp, moveWindow } = useOsStore.getState()
      openApp('paint')
      const w = useOsStore.getState().windows[0]
      moveWindow(w.id, 123, 456)
      const updated = useOsStore.getState().windows[0]
      expect(updated.x).toBe(123)
      expect(updated.y).toBe(456)
      expect(updated.width).toBe(w.width)
      expect(updated.height).toBe(w.height)
    })

    it('resizeWindow updates all four dimensions', () => {
      const { openApp, resizeWindow } = useOsStore.getState()
      openApp('paint')
      const id = useOsStore.getState().windows[0].id
      resizeWindow(id, 10, 20, 500, 400)
      const w = useOsStore.getState().windows[0]
      expect(w).toMatchObject({ x: 10, y: 20, width: 500, height: 400 })
    })
  })

  describe('settings + logs', () => {
    it('updateSetting changes a single key without clobbering others', () => {
      useOsStore.getState().updateSetting('theme', 'dark')
      useOsStore.getState().updateSetting('volume', 50)
      const { theme, volume, sound } = useOsStore.getState().settings
      expect(theme).toBe('dark')
      expect(volume).toBe(50)
      expect(sound).toBe(true) // unchanged
    })

    it('logEvent prepends entries and caps at 100', () => {
      const { logEvent } = useOsStore.getState()
      for (let i = 0; i < 105; i++) {
        logEvent('System', 'Information', `event ${i}`)
      }
      const logs = useOsStore.getState().eventLogs
      expect(logs).toHaveLength(100)
      // Newest is at the front.
      expect(logs[0].description).toBe('event 104')
    })
  })

  describe('snap preview', () => {
    it('setSnapPreview swaps state shape wholesale', () => {
      useOsStore.getState().setSnapPreview({ show: true, x: 1, y: 2, w: 3, h: 4 })
      expect(useOsStore.getState().snapPreview).toEqual({ show: true, x: 1, y: 2, w: 3, h: 4 })
    })
  })

  describe('chrome popups', () => {
    it('toggleStartMenu opens it and closes the other two', () => {
      useOsStore.setState({
        quickSettingsOpen: true,
        widgetsOpen: true,
      })
      useOsStore.getState().toggleStartMenu()
      const s = useOsStore.getState()
      expect(s.startMenuOpen).toBe(true)
      expect(s.quickSettingsOpen).toBe(false)
      expect(s.widgetsOpen).toBe(false)
    })

    it('toggleQuickSettings opens it and closes the other two', () => {
      useOsStore.setState({ startMenuOpen: true })
      useOsStore.getState().toggleQuickSettings()
      const s = useOsStore.getState()
      expect(s.quickSettingsOpen).toBe(true)
      expect(s.startMenuOpen).toBe(false)
    })

    it('toggleWidgets opens it and closes the other two', () => {
      useOsStore.setState({ startMenuOpen: true, quickSettingsOpen: true })
      useOsStore.getState().toggleWidgets()
      const s = useOsStore.getState()
      expect(s.widgetsOpen).toBe(true)
      expect(s.startMenuOpen).toBe(false)
      expect(s.quickSettingsOpen).toBe(false)
    })

    it('toggleStartMenu a second time closes it', () => {
      const { toggleStartMenu } = useOsStore.getState()
      toggleStartMenu()
      expect(useOsStore.getState().startMenuOpen).toBe(true)
      toggleStartMenu()
      expect(useOsStore.getState().startMenuOpen).toBe(false)
    })

    it('closeAllPopups closes all three', () => {
      useOsStore.setState({
        startMenuOpen: true,
        quickSettingsOpen: true,
        widgetsOpen: true,
      })
      useOsStore.getState().closeAllPopups()
      const s = useOsStore.getState()
      expect(s.startMenuOpen).toBe(false)
      expect(s.quickSettingsOpen).toBe(false)
      expect(s.widgetsOpen).toBe(false)
    })

    it('openApp closes any open popup', () => {
      useOsStore.setState({ startMenuOpen: true })
      useOsStore.getState().openApp('paint')
      expect(useOsStore.getState().startMenuOpen).toBe(false)
    })

    it('logout closes all popups', () => {
      useOsStore.setState({
        loggedIn: true,
        startMenuOpen: true,
        widgetsOpen: true,
      })
      useOsStore.getState().logout()
      const s = useOsStore.getState()
      expect(s.startMenuOpen).toBe(false)
      expect(s.widgetsOpen).toBe(false)
      expect(s.loggedIn).toBe(false)
    })
  })

  describe('minimizeAll', () => {
    it('marks every window minimized', () => {
      const { openApp, minimizeAll } = useOsStore.getState()
      openApp('paint')
      openApp('calculator')
      openApp('notepad')
      minimizeAll()
      const allMin = useOsStore.getState().windows.every((w) => w.minimized)
      expect(allMin).toBe(true)
    })
  })

  describe('ambient setters', () => {
    it('setClock replaces clock state', () => {
      useOsStore.getState().setClock({ time: '12:34', date: '14/05/2026' })
      expect(useOsStore.getState().clock).toEqual({ time: '12:34', date: '14/05/2026' })
    })

    it('setWeather merges partial fields', () => {
      useOsStore.getState().setWeather({ temp: 18, condition: 'Sunny', icon: '☀️' })
      const w = useOsStore.getState().weather
      expect(w.temp).toBe(18)
      expect(w.city).toBe('London') // preserved
      expect(w.icon).toBe('☀️')
    })

    it('setNews replaces the array', () => {
      useOsStore
        .getState()
        .setNews([
          { title: 'A', link: 'http://a', description: '' },
          { title: 'B', link: 'http://b', description: '' },
        ])
      expect(useOsStore.getState().news).toHaveLength(2)
    })
  })
})
