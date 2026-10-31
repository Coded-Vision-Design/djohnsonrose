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
    snapPreview: { rect: null, bar: null, target: null },
    snapAssist: null,
    snapFlyout: null,
    taskSwitcherOpen: false,
    desktop: { left: 0, top: 0, width: 1920, height: 1032 },
    windowMode: 'desktop',
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
      expect(useOsStore.getState().windows[0].state).toBe('minimized')
      openApp('paint')
      expect(useOsStore.getState().windows[0].state).toBe('floating')
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
    it('moves between minimised and the previous state', () => {
      const { openApp, toggleMinimize } = useOsStore.getState()
      openApp('paint')
      const id = useOsStore.getState().windows[0].id
      toggleMinimize(id)
      expect(useOsStore.getState().windows[0].state).toBe('minimized')
      toggleMinimize(id)
      expect(useOsStore.getState().windows[0].state).toBe('floating')
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
    it('fills the usable desktop and restores the floating rectangle', () => {
      const { openApp, toggleMaximize } = useOsStore.getState()
      openApp('paint')
      const before = useOsStore.getState().windows[0]
      toggleMaximize(before.id)
      expect(useOsStore.getState().windows[0]).toMatchObject({
        state: 'maximized',
        x: 0,
        y: 0,
        width: 1920,
        height: 1032,
      })
      toggleMaximize(before.id)
      expect(useOsStore.getState().windows[0]).toMatchObject({
        state: 'floating',
        x: before.x,
        y: before.y,
        width: before.width,
        height: before.height,
      })
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

  describe('moveWindow + applyWindowPatches', () => {
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

    it('applyWindowPatches updates all four dimensions', () => {
      const { openApp, applyWindowPatches } = useOsStore.getState()
      openApp('paint')
      const id = useOsStore.getState().windows[0].id
      applyWindowPatches({ [id]: { x: 10, y: 20, width: 500, height: 400 } })
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
    it('holds the preview apart from the windows', () => {
      useOsStore.getState().openApp('paint')
      const windows = useOsStore.getState().windows
      const rect = { x: 1, y: 2, width: 3, height: 4 }
      useOsStore.getState().setSnapPreview({ rect, bar: null, target: null })
      expect(useOsStore.getState().snapPreview.rect).toEqual(rect)
      expect(useOsStore.getState().windows).toBe(windows)
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
      const allMin = useOsStore.getState().windows.every((w) => w.state === 'minimized')
      expect(allMin).toBe(true)
      expect(useOsStore.getState().focusedWindowId).toBeNull()
    })
  })

  describe('focus', () => {
    it('hands focus to the highest window when one is closed', () => {
      const { openApp, focusWindow, closeWindow } = useOsStore.getState()
      openApp('paint')
      openApp('calculator')
      openApp('notepad')
      const [paint, , notepad] = useOsStore.getState().windows
      focusWindow(paint.id)
      focusWindow(notepad.id)
      closeWindow(notepad.id)
      expect(useOsStore.getState().focusedWindowId).toBe(paint.id)
    })

    it('hands focus on when a window is minimised', () => {
      const { openApp, toggleMinimize } = useOsStore.getState()
      openApp('paint')
      openApp('calculator')
      const [paint, calculator] = useOsStore.getState().windows
      toggleMinimize(calculator.id)
      expect(useOsStore.getState().focusedWindowId).toBe(paint.id)
    })

    it('does not replace the window when it is already on top', () => {
      const { openApp, focusWindow } = useOsStore.getState()
      openApp('paint')
      const before = useOsStore.getState().windows[0]
      focusWindow(before.id)
      expect(useOsStore.getState().windows[0]).toBe(before)
    })
  })

  describe('snapping', () => {
    const open = (...apps: string[]) => {
      for (const app of apps) useOsStore.getState().openApp(app)
      return useOsStore.getState().windows
    }

    it('snaps, then restores the floating rectangle', () => {
      const [w] = open('paint')
      const { snapWindow, runShortcut } = useOsStore.getState()
      snapWindow(w.id, 'halves', 'left')
      expect(useOsStore.getState().windows[0]).toMatchObject({ state: 'snapped', x: 0, width: 960, height: 1032 })
      runShortcut('left')
      expect(useOsStore.getState().windows[0]).toMatchObject({ state: 'snapped', x: 960 })
      runShortcut('left')
      expect(useOsStore.getState().windows[0]).toMatchObject({ state: 'floating', x: w.x, width: w.width })
    })

    it('offers other windows for the empty side, then fills it', () => {
      const [a, b] = open('paint', 'calculator')
      useOsStore.getState().snapWindow(a.id, 'halves', 'left')
      expect(useOsStore.getState().snapAssist).toMatchObject({ zone: 'right', candidates: [b.id] })
      useOsStore.getState().fillSnapAssist(b.id)
      expect(useOsStore.getState().windows[1]).toMatchObject({ state: 'snapped', x: 960 })
      expect(useOsStore.getState().snapAssist).toBeNull()
    })

    it('offers nothing when no other window is open', () => {
      const [a] = open('paint')
      useOsStore.getState().snapWindow(a.id, 'halves', 'left')
      expect(useOsStore.getState().snapAssist).toBeNull()
    })

    it('refits windows when the desktop changes, and clears anything mid-arrangement', () => {
      const [a, b] = open('paint', 'calculator')
      useOsStore.getState().snapWindow(a.id, 'halves', 'right')
      useOsStore.getState().setDesktop({ left: 0, top: 0, width: 1280, height: 672 }, 'desktop')
      const state = useOsStore.getState()
      expect(state.windows[0]).toMatchObject({ x: 640, width: 640, height: 672 })
      expect(state.snapAssist).toBeNull()
      expect(state.windows[1].id).toBe(b.id)
    })

    it('keeps real window state through a phone layout', () => {
      const [a] = open('paint')
      const { snapWindow, setDesktop } = useOsStore.getState()
      snapWindow(a.id, 'halves', 'left')
      setDesktop({ left: 0, top: 0, width: 390, height: 796 }, 'phone')
      expect(useOsStore.getState().isMobile).toBe(true)
      setDesktop({ left: 0, top: 0, width: 1920, height: 1032 }, 'desktop')
      expect(useOsStore.getState().windows[0]).toMatchObject({ state: 'snapped', width: 960 })
    })
  })

  describe('runShortcut', () => {
    it('closes the focused window', () => {
      useOsStore.getState().openApp('paint')
      expect(useOsStore.getState().runShortcut('close')).toBe(true)
      expect(useOsStore.getState().windows).toHaveLength(0)
    })

    it('does nothing without a focused window', () => {
      expect(useOsStore.getState().runShortcut('left')).toBe(false)
    })

    it('does not snap on a phone', () => {
      useOsStore.setState({ windowMode: 'phone' })
      useOsStore.getState().openApp('paint')
      expect(useOsStore.getState().runShortcut('left')).toBe(false)
      expect(useOsStore.getState().windows[0].state).toBe('floating')
    })

    it('minimises a floating window on the way down', () => {
      useOsStore.getState().openApp('paint')
      useOsStore.getState().runShortcut('down')
      expect(useOsStore.getState().windows[0].state).toBe('minimized')
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
