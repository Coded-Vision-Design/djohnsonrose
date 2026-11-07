import { describe, it, expect, vi } from 'vitest'
import {
  addressOf,
  addressedApp,
  followAddress,
  historyStep,
  pageTitle,
  readAddress,
  showAddressed,
} from '../../../assets/js/windowing/address.js'
import apps from '../../../data/apps.json'

// The address bar in both builds: each app's address, the desktop's, how the
// history follows the windows, and how Back and Forward bring them back.

const IDS = apps.apps.map((app) => app.id)

describe('addressOf', () => {
  it('gives an app its address under each build', () => {
    expect(addressOf('/', 'word')).toBe('/app/word')
    expect(addressOf('/v2/', 'word')).toBe('/v2/app/word')
  })

  it('gives the desktop the base path itself', () => {
    expect(addressOf('/', null)).toBe('/')
    expect(addressOf('/v2/', null)).toBe('/v2/')
  })

  it('works when the site sits in a folder', () => {
    expect(addressOf('/djohnsonrose/', 'excel')).toBe('/djohnsonrose/app/excel')
  })
})

describe('readAddress', () => {
  it('reads an app from its address in each build', () => {
    expect(readAddress('/', '/app/word', IDS)).toEqual({ app: 'word' })
    expect(readAddress('/v2/', '/v2/app/word', IDS)).toEqual({ app: 'word' })
    expect(readAddress('/v2/', '/v2/app/calculator/', IDS)).toEqual({ app: 'calculator' })
  })

  it('reads the desktop from the base path, and from /login and /desktop as v1 always has', () => {
    for (const [base, path] of [
      ['/', '/'],
      ['/', '/login'],
      ['/', '/desktop/'],
      ['/v2/', '/v2/'],
      ['/v2/', '/v2'],
      ['/v2/', '/v2/login'],
      ['/v2/', '/v2/desktop'],
    ]) {
      expect(readAddress(base, path, IDS), path).toEqual({ app: null })
    }
  })

  it('knows every app in data/apps.json', () => {
    for (const id of IDS) expect(readAddress('/v2/', `/v2/app/${id}`, IDS)).toEqual({ app: id })
  })

  it('gives null for anything that is neither', () => {
    for (const [base, path] of [
      ['/', '/app/nope'],
      ['/', '/app/'],
      ['/', '/app/word/extra'],
      ['/', '/APP/word'],
      ['/', '/app/Word'],
      ['/', '/privacy'],
      ['/', '/index.php'],
      ['/v2/', '/v2/anything'],
      ['/v2/', '/v2/app/nope'],
      ['/v2/', '/v2/app/word//'],
      ['/v2/', '/app/word'],
      ['/v2/', '/v2x/app/word'],
      ['/v2/', '/v2/app/toString'],
      ['/v2/', ''],
    ]) {
      expect(readAddress(base, path, IDS), path).toBeNull()
    }
  })

  it('copes with no list of apps', () => {
    expect(readAddress('/', '/app/word', undefined as unknown as string[])).toBeNull()
    expect(readAddress('/', '/', undefined as unknown as string[])).toEqual({ app: null })
  })
})

describe('addressedApp', () => {
  const windows = [
    { id: 1, app: 'word', state: 'floating' },
    { id: 2, app: 'excel', state: 'minimized' },
  ]

  it('names the focused window’s app', () => {
    expect(addressedApp(windows, 1)).toBe('word')
  })

  it('names nothing when the focused window is minimised or gone', () => {
    expect(addressedApp(windows, 2)).toBeNull()
    expect(addressedApp(windows, 9)).toBeNull()
    expect(addressedApp([], 1)).toBeNull()
  })

  it('names nothing when no window is focused', () => {
    expect(addressedApp(windows, null)).toBeNull()
    expect(addressedApp(undefined as unknown as [], null)).toBeNull()
  })
})

describe('historyStep', () => {
  const desktop = { app: null }
  const word = { app: 'word' }

  it('leaves the history alone when the address would not change', () => {
    expect(historyStep(word, 'word', true)).toBeNull()
    expect(historyStep(desktop, null, false)).toBeNull()
  })

  it('adds an entry when an app opens, or when anything takes over from the desktop', () => {
    expect(historyStep(word, 'excel', true)).toBe('push')
    expect(historyStep(desktop, 'word', true)).toBe('push')
    // Restored from the taskbar: Back still returns to the desktop.
    expect(historyStep(desktop, 'word', false)).toBe('push')
  })

  it('changes the current entry when another window comes forward, or the focused one goes', () => {
    expect(historyStep(word, 'excel', false)).toBe('replace')
    expect(historyStep(word, null, false)).toBe('replace')
  })

  it('treats an address that is not the site’s as the desktop it shows', () => {
    expect(historyStep(null, 'word', false)).toBe('push')
    expect(historyStep(null, null, false)).toBe('replace')
  })
})

describe('pageTitle', () => {
  const BASE = 'DeVanté Johnson-Rose | Portfolio OS'

  it('puts the app first, so that a narrow tab still shows it', () => {
    expect(pageTitle(BASE, 'Word')).toBe(`Word - ${BASE}`)
  })

  it('is the site’s own title on the desktop', () => {
    expect(pageTitle(BASE, null)).toBe(BASE)
    expect(pageTitle(BASE, '')).toBe(BASE)
  })
})

describe('showAddressed', () => {
  const store = (windows: { id: number; app: string; state: string }[]) => ({
    windows,
    openApp: vi.fn(),
    focusWindow: vi.fn(),
    toggleMinimize: vi.fn(),
    minimizeAll: vi.fn(),
  })

  it('brings an open window to the front', () => {
    const os = store([{ id: 4, app: 'word', state: 'floating' }])
    showAddressed(os, 'word')
    expect(os.focusWindow).toHaveBeenCalledWith(4)
    expect(os.openApp).not.toHaveBeenCalled()
  })

  it('restores a minimised window, and opens a closed app', () => {
    const os = store([{ id: 4, app: 'word', state: 'minimized' }])
    showAddressed(os, 'word')
    expect(os.toggleMinimize).toHaveBeenCalledWith(4)
    showAddressed(os, 'excel')
    expect(os.openApp).toHaveBeenCalledWith('excel')
  })

  it('shows the desktop for the desktop’s address', () => {
    const os = store([{ id: 4, app: 'word', state: 'floating' }])
    showAddressed(os, null)
    expect(os.minimizeAll).toHaveBeenCalledOnce()
    expect(os.focusWindow).not.toHaveBeenCalled()
  })
})

/** A window with just enough of history, location and document for followAddress. */
function fakeWindow(path: string) {
  const listeners = new Set<() => void>()
  const steps: [string, string][] = []
  const win = {
    location: { pathname: path },
    document: { title: 'Portfolio OS' },
    history: {
      state: null as unknown,
      pushState: (_: unknown, __: string, url: string) => {
        steps.push(['push', url])
        win.location.pathname = url
      },
      replaceState: (_: unknown, __: string, url: string) => {
        steps.push(['replace', url])
        win.location.pathname = url
      },
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    /** Back or Forward to `to`. */
    pop(to: string) {
      win.location.pathname = to
      for (const fn of listeners) fn()
    },
  }
  return { win, steps, listeners }
}

const settle = () => new Promise<void>((resolve) => queueMicrotask(resolve))

function follow(path = '/v2/') {
  const { win, steps, listeners } = fakeWindow(path)
  const show = vi.fn()
  const titles: Record<string, string> = { word: 'Word', excel: 'Excel' }
  const follower = followAddress({ base: '/v2/', appIds: IDS, titleOf: (app: string) => titles[app], show, win })
  return { follower, win, steps, show, listeners }
}

describe('followAddress', () => {
  it('changes nothing for the state the page starts in', async () => {
    const { follower, steps, win } = follow('/v2/app/word')
    follower.update({ app: null, opens: 0 })
    await settle()
    expect(steps).toEqual([])
    expect(win.document.title).toBe('Portfolio OS')
  })

  it('adds an entry with the app’s address and title when an app opens', async () => {
    const { follower, steps, win } = follow()
    follower.update({ app: null, opens: 0 })
    follower.update({ app: 'word', opens: 1 })
    await settle()
    expect(steps).toEqual([['push', '/v2/app/word']])
    expect(win.document.title).toBe('Word - Portfolio OS')
  })

  it('changes the entry when another window comes forward, and goes back to the desktop’s when none is left', async () => {
    const { follower, steps, win } = follow()
    follower.update({ app: null, opens: 0 })
    follower.update({ app: 'word', opens: 1 })
    await settle()
    follower.update({ app: 'excel', opens: 2 })
    await settle()
    follower.update({ app: 'word', opens: 2 })
    await settle()
    follower.update({ app: null, opens: 2 })
    await settle()
    expect(steps).toEqual([
      ['push', '/v2/app/word'],
      ['push', '/v2/app/excel'],
      ['replace', '/v2/app/word'],
      ['replace', '/v2/'],
    ])
    expect(win.document.title).toBe('Portfolio OS')
  })

  it('waits for changes made together to settle, and ignores ones that leave the app alone', async () => {
    const { follower, steps } = follow()
    follower.update({ app: null, opens: 0 })
    // A minimise passes through the desktop before the next window is focused.
    follower.update({ app: 'word', opens: 1 })
    follower.update({ app: null, opens: 1 })
    follower.update({ app: 'excel', opens: 1 })
    await settle()
    // The clock ticking, say.
    follower.update({ app: 'excel', opens: 1 })
    await settle()
    expect(steps).toEqual([['push', '/v2/app/excel']])
  })

  it('leaves the address alone when it already names the app, as after a deep link or Back', async () => {
    const { follower, steps, win } = follow('/v2/app/word')
    follower.update({ app: null, opens: 0 })
    follower.update({ app: 'word', opens: 1 })
    await settle()
    expect(steps).toEqual([])
    expect(win.document.title).toBe('Word - Portfolio OS')
  })

  it('shows what Back and Forward reach, and ignores addresses that are not the site’s', () => {
    const { win, show } = follow()
    win.pop('/v2/app/word')
    win.pop('/v2/')
    win.pop('/v2/somewhere-else')
    expect(show.mock.calls).toEqual([['word'], [null]])
  })

  it('stops listening once stopped, and drops a change still waiting', async () => {
    const { follower, win, show, steps, listeners } = follow()
    follower.update({ app: null, opens: 0 })
    follower.update({ app: 'word', opens: 1 })
    follower.stop()
    await settle()
    win.pop('/v2/app/word')
    expect(steps).toEqual([])
    expect(show).not.toHaveBeenCalled()
    expect(listeners.size).toBe(0)
  })
})
