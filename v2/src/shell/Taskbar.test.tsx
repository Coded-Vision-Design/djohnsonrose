import { StrictMode } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { Taskbar } from './Taskbar'
import { useOsStore } from '../store/osStore'

// Regression: selectors that build new arrays/objects each call (e.g. via
// `.map`, spread, `new Set`) break React's getSnapshot caching and produce
// "Maximum update depth exceeded". This used to happen in Taskbar's
// `openAppIds` selector — keep this here so it can't come back unnoticed.
const renderTaskbar = () =>
  render(
    <StrictMode>
      <Taskbar />
    </StrictMode>,
  )

const resetStore = () => {
  localStorage.clear()
  useOsStore.setState({
    isBooting: false,
    loggedIn: true,
    windows: [],
    focusedWindowId: null,
    nextWindowZ: 100,
    snapPreview: { show: false, x: 0, y: 0, w: 0, h: 0 },
    eventLogs: [],
    startMenuOpen: false,
    quickSettingsOpen: false,
    widgetsOpen: false,
    clock: { time: '12:00', date: '14/05/2026' },
    weather: { temp: 18, condition: 'Sunny', icon: '☀️', city: 'London' },
    news: [],
  })
}

describe('Taskbar', () => {
  beforeEach(resetStore)

  it('renders without infinite re-render loops in StrictMode', () => {
    const { unmount } = renderTaskbar()
    unmount()
  })

  it('renders open windows in addition to pinned apps', () => {
    const { getAllByRole, unmount } = renderTaskbar()
    const buttonsBefore = getAllByRole('button').length

    act(() => {
      useOsStore.getState().openApp('calculator')
    })

    const buttonsAfter = getAllByRole('button').length
    // Calculator isn't in the default pinned list, so opening it adds a button.
    expect(buttonsAfter).toBeGreaterThan(buttonsBefore)
    unmount()
  })

  it('does not add a duplicate button for a pinned app that is also open', () => {
    // 'edge' IS pinned by default.
    const { getAllByRole, unmount } = renderTaskbar()
    const before = getAllByRole('button').length

    act(() => {
      useOsStore.getState().openApp('edge')
    })

    const after = getAllByRole('button').length
    expect(after).toBe(before)
    unmount()
  })
})
