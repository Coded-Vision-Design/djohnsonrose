import { afterEach, describe, expect, it, vi } from 'vitest'
import { LIKELY_APPS, loadLikelyApps, preloadWhenIdle } from './preload'
import { apps } from './registry'

const loaders = () => ({
  explorer: vi.fn(() => Promise.resolve()),
  notepad: vi.fn(() => Promise.resolve()),
  word: vi.fn(() => Promise.resolve()),
  terminal: vi.fn(() => Promise.resolve()),
})

describe('preloading likely apps', () => {
  afterEach(() => vi.useRealTimers())

  it('names only apps that exist', () => {
    expect(LIKELY_APPS).toEqual(['explorer', 'notepad', 'word', 'terminal'])
    for (const id of LIKELY_APPS) expect(apps[id], id).toBeDefined()
  })

  it('loads every likely app once the browser is idle', async () => {
    const idle: Array<() => void> = []
    const load = vi.fn(() => Promise.resolve([]))
    const win = { requestIdleCallback: vi.fn((cb: () => void) => idle.push(cb)), cancelIdleCallback: vi.fn() }
    preloadWhenIdle(load, win)
    expect(load).not.toHaveBeenCalled()
    expect(win.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 5000 })
    idle[0]()
    expect(load).toHaveBeenCalledTimes(1)

    const fns = loaders()
    await loadLikelyApps(fns)
    for (const fn of Object.values(fns)) expect(fn).toHaveBeenCalledTimes(1)
  })

  it('falls back to a timer where there is no requestIdleCallback, and can be cancelled', () => {
    vi.useFakeTimers()
    const load = vi.fn(() => Promise.resolve([]))
    const cancel = preloadWhenIdle(load, {})
    vi.advanceTimersByTime(1999)
    expect(load).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(load).toHaveBeenCalledTimes(1)

    const load2 = vi.fn(() => Promise.resolve([]))
    preloadWhenIdle(load2, {})()
    vi.advanceTimersByTime(5000)
    expect(load2).not.toHaveBeenCalled()
    expect(typeof cancel).toBe('function')
  })

  it('does nothing when the visitor has asked to save data', () => {
    const load = vi.fn(() => Promise.resolve([]))
    const win = { requestIdleCallback: vi.fn(), cancelIdleCallback: vi.fn() }
    preloadWhenIdle(load, win, true)
    expect(win.requestIdleCallback).not.toHaveBeenCalled()
  })

  it('keeps loading the rest when one app fails, without an unhandled rejection', async () => {
    const fns = loaders()
    fns.notepad.mockImplementation(() => Promise.reject(new Error('offline')))
    await expect(loadLikelyApps(fns)).resolves.toHaveLength(4)
    expect(fns.word).toHaveBeenCalledTimes(1)
    expect(fns.terminal).toHaveBeenCalledTimes(1)
  })
})
