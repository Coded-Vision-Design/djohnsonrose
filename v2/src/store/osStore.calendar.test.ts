import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOsStore } from './osStore'

// The clock's flyout in the store: one panel at a time with Start, Quick
// Settings and Widgets, and the notifications shown this session.

describe('osStore calendar flyout', () => {
  beforeEach(() => {
    useOsStore.setState({
      startMenuOpen: false,
      quickSettingsOpen: false,
      widgetsOpen: false,
      calendarOpen: false,
      notifications: [],
      toast: null,
    })
  })
  afterEach(() => vi.useRealTimers())

  it('opens from the clock and closes Start, Quick Settings and Widgets', () => {
    useOsStore.setState({ startMenuOpen: true, quickSettingsOpen: true, widgetsOpen: true })
    useOsStore.getState().toggleCalendar()
    expect(useOsStore.getState()).toMatchObject({
      calendarOpen: true,
      startMenuOpen: false,
      quickSettingsOpen: false,
      widgetsOpen: false,
    })
    useOsStore.getState().toggleCalendar()
    expect(useOsStore.getState().calendarOpen).toBe(false)
  })

  it('closes when Start, Quick Settings or Widgets opens', () => {
    for (const open of ['toggleStartMenu', 'toggleQuickSettings', 'toggleWidgets'] as const) {
      useOsStore.setState({ startMenuOpen: false, quickSettingsOpen: false, widgetsOpen: false, calendarOpen: true })
      useOsStore.getState()[open]()
      expect(useOsStore.getState().calendarOpen, open).toBe(false)
    }
  })

  it('closes with the other popups', () => {
    useOsStore.setState({ calendarOpen: true })
    useOsStore.getState().closeAllPopups()
    expect(useOsStore.getState().calendarOpen).toBe(false)
  })

  it('lists each toast shown, newest first, until cleared', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 7, 10, 0))
    useOsStore.getState().showToast('Link copied')
    vi.setSystemTime(new Date(2026, 10, 7, 10, 5))
    useOsStore.getState().showToast('Press Ctrl+V to paste')
    const notes = useOsStore.getState().notifications
    expect(notes.map((note) => note.message)).toEqual(['Press Ctrl+V to paste', 'Link copied'])
    expect(notes[1].time).toBe(new Date(2026, 10, 7, 10, 0).getTime())

    // The toast itself still goes after a few seconds, but stays listed.
    vi.advanceTimersByTime(3000)
    expect(useOsStore.getState().toast).toBeNull()
    expect(useOsStore.getState().notifications).toHaveLength(2)

    useOsStore.getState().clearNotifications()
    expect(useOsStore.getState().notifications).toEqual([])
  })

  it('lists nothing that was not shown', () => {
    useOsStore.getState().showToast('')
    expect(useOsStore.getState().notifications).toEqual([])
  })
})
