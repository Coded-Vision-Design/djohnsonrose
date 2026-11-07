import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  TASK_VIEW_KEYS,
  activateWindow,
  focusWindowElement,
  gridColumns,
  gridIndex,
  isSwitchRelease,
  keepFocusInside,
  neighbourAfterClose,
  recentWindows,
  restoreFocus,
  stepIndex,
  switcherKeyFromEvent,
  switcherStart,
} from '../../../assets/js/windowing/switcher.js'

type State = 'floating' | 'maximized' | 'snapped' | 'minimized'
const win = (id: number, z: number, state: State = 'floating') => ({ id, z, state })

const key = (k: string, mods: Partial<KeyboardEvent> & { code?: string; target?: EventTarget | null } = {}) => ({
  key: k,
  code: mods.code ?? '',
  altKey: false,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  target: null,
  ...mods,
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('recentWindows', () => {
  it('is empty when nothing is open', () => {
    expect(recentWindows([])).toEqual([])
  })

  it('lists a single window', () => {
    expect(recentWindows([win(1, 100)]).map((w) => w.id)).toEqual([1])
  })

  it('puts the most recently used window first, by z', () => {
    const list = [win(1, 100), win(2, 103), win(3, 101)]
    expect(recentWindows(list).map((w) => w.id)).toEqual([2, 3, 1])
  })

  it('puts minimised windows after the ones on screen, newest first', () => {
    const list = [win(1, 104, 'minimized'), win(2, 100), win(3, 102, 'minimized'), win(4, 101, 'maximized')]
    expect(recentWindows(list).map((w) => w.id)).toEqual([4, 2, 1, 3])
  })

  it('leaves the list it was given alone', () => {
    const list = [win(1, 100), win(2, 101)]
    recentWindows(list)
    expect(list.map((w) => w.id)).toEqual([1, 2])
  })

  it('treats a missing list as empty', () => {
    expect(recentWindows(null)).toEqual([])
    expect(recentWindows(undefined)).toEqual([])
  })
})

describe('switcherStart', () => {
  const list = [win(2, 103), win(3, 101), win(1, 100)]

  it('selects the window after the focused one, as Alt+Tab does', () => {
    expect(switcherStart(list, 2)).toBe(1)
  })

  it('selects the last window going backwards', () => {
    expect(switcherStart(list, 2, true)).toBe(2)
  })

  it('selects the first window when none has focus, such as on a clear desktop', () => {
    expect(switcherStart(list, null)).toBe(0)
    expect(switcherStart(list, null, true)).toBe(2)
  })

  it('stays on a single window, focused or not', () => {
    expect(switcherStart([win(1, 100)], 1)).toBe(0)
    expect(switcherStart([win(1, 100, 'minimized')], null)).toBe(0)
  })

  it('has nothing to select with no windows', () => {
    expect(switcherStart([], null)).toBe(-1)
    expect(switcherStart([], 4, true)).toBe(-1)
  })
})

describe('stepIndex', () => {
  it('moves on by one', () => {
    expect(stepIndex(0, 3, 1)).toBe(1)
    expect(stepIndex(2, 3, -1)).toBe(1)
  })

  it('wraps round from the last to the first', () => {
    expect(stepIndex(2, 3, 1)).toBe(0)
  })

  it('wraps round from the first to the last', () => {
    expect(stepIndex(0, 3, -1)).toBe(2)
  })

  it('stays put with one window', () => {
    expect(stepIndex(0, 1, 1)).toBe(0)
    expect(stepIndex(0, 1, -1)).toBe(0)
  })

  it('has nothing to select with no windows', () => {
    expect(stepIndex(0, 0, 1)).toBe(-1)
  })

  // A window can close while the switcher is up, which shortens the list.
  it('steps from the last card when the index has run past the end', () => {
    expect(stepIndex(4, 3, 1)).toBe(0)
    expect(stepIndex(4, 3, -1)).toBe(1)
    expect(stepIndex(-1, 3, 1)).toBe(0)
  })
})

describe('gridColumns', () => {
  it('counts the cards on the first row', () => {
    expect(gridColumns([40, 40, 40, 260, 260])).toBe(3)
  })

  it('counts every card when they share one row', () => {
    expect(gridColumns([40, 40])).toBe(2)
  })

  it('ignores rounding between cards on the same row', () => {
    expect(gridColumns([40, 40.4, 39.7, 260])).toBe(3)
  })

  it('is zero with no cards', () => {
    expect(gridColumns([])).toBe(0)
  })
})

describe('gridIndex', () => {
  // Seven cards, three to a row:  0 1 2 / 3 4 5 / 6
  it('moves left and right by one, and stops at either end', () => {
    expect(gridIndex(1, 'ArrowRight', 7, 3)).toBe(2)
    expect(gridIndex(1, 'ArrowLeft', 7, 3)).toBe(0)
    expect(gridIndex(0, 'ArrowLeft', 7, 3)).toBe(0)
    expect(gridIndex(6, 'ArrowRight', 7, 3)).toBe(6)
  })

  it('moves up and down by a row', () => {
    expect(gridIndex(1, 'ArrowDown', 7, 3)).toBe(4)
    expect(gridIndex(4, 'ArrowUp', 7, 3)).toBe(1)
    expect(gridIndex(1, 'ArrowUp', 7, 3)).toBe(1)
  })

  it('drops to the last card when the row below is shorter', () => {
    expect(gridIndex(5, 'ArrowDown', 7, 3)).toBe(6)
    expect(gridIndex(6, 'ArrowDown', 7, 3)).toBe(6)
  })

  it('goes to the first and last cards with Home and End', () => {
    expect(gridIndex(4, 'Home', 7, 3)).toBe(0)
    expect(gridIndex(1, 'End', 7, 3)).toBe(6)
  })

  it('starts at the first card when none has focus', () => {
    expect(gridIndex(-1, 'ArrowRight', 7, 3)).toBe(0)
  })

  it('leaves other keys alone, and has nowhere to go with no cards', () => {
    expect(gridIndex(1, 'Enter', 7, 3)).toBeNull()
    expect(gridIndex(0, 'ArrowRight', 0, 0)).toBeNull()
  })
})

describe('neighbourAfterClose', () => {
  const list = [win(2, 103), win(3, 101), win(1, 100)]

  it('moves on to the next card', () => {
    expect(neighbourAfterClose(list, 3)).toBe(1)
  })

  it('moves back to the previous card from the last', () => {
    expect(neighbourAfterClose(list, 1)).toBe(3)
  })

  it('has nowhere to go when the last window closes', () => {
    expect(neighbourAfterClose([win(4, 100)], 4)).toBeNull()
  })

  it('has nowhere to go for a window it does not know', () => {
    expect(neighbourAfterClose(list, 99)).toBeNull()
  })
})

describe('switcherKeyFromEvent', () => {
  it('moves on with Alt+Q and back with Alt+Shift+Q', () => {
    expect(switcherKeyFromEvent(key('q', { altKey: true, code: 'KeyQ' }))).toBe('next')
    expect(switcherKeyFromEvent(key('Q', { altKey: true, shiftKey: true, code: 'KeyQ' }))).toBe('previous')
  })

  it('does the same with Alt+Tab, when a browser passes it on', () => {
    expect(switcherKeyFromEvent(key('Tab', { altKey: true }))).toBe('next')
    expect(switcherKeyFromEvent(key('Tab', { altKey: true, shiftKey: true }))).toBe('previous')
  })

  it('knows Alt+Q on a Mac, where Option turns the letter into another character', () => {
    expect(switcherKeyFromEvent(key('œ', { altKey: true, code: 'KeyQ' }))).toBe('next')
  })

  it('opens Task View with Alt+Shift+T, or Win+Tab when the system lets it through', () => {
    expect(switcherKeyFromEvent(key('T', { altKey: true, shiftKey: true, code: 'KeyT' }))).toBe('taskView')
    expect(switcherKeyFromEvent(key('ˇ', { altKey: true, shiftKey: true, code: 'KeyT' }))).toBe('taskView')
    expect(switcherKeyFromEvent(key('Tab', { metaKey: true }))).toBe('taskView')
  })

  it('names the Task View keys the way aria-keyshortcuts wants them', () => {
    expect(TASK_VIEW_KEYS).toBe('Alt+Shift+T')
  })

  it('leaves AltGr, which is Ctrl+Alt, to type its characters', () => {
    expect(switcherKeyFromEvent(key('@', { altKey: true, ctrlKey: true, code: 'KeyQ' }))).toBeNull()
  })

  it('ignores the letters on their own and other combinations', () => {
    expect(switcherKeyFromEvent(key('q', { code: 'KeyQ' }))).toBeNull()
    expect(switcherKeyFromEvent(key('q', { altKey: true, metaKey: true, code: 'KeyQ' }))).toBeNull()
    expect(switcherKeyFromEvent(key('t', { altKey: true, code: 'KeyT' }))).toBeNull()
    expect(switcherKeyFromEvent(key('Tab'))).toBeNull()
  })

  it('lets a Mac type œ into a text field, but still switches from one on Windows', () => {
    const field = document.createElement('input')
    document.body.append(field)
    expect(switcherKeyFromEvent(key('œ', { altKey: true, code: 'KeyQ', target: field }))).toBeNull()
    expect(switcherKeyFromEvent(key('q', { altKey: true, code: 'KeyQ', target: field }))).toBe('next')
  })

  it('copes with an event that has no key', () => {
    expect(switcherKeyFromEvent({ altKey: true } as unknown as KeyboardEvent)).toBeNull()
  })
})

describe('isSwitchRelease', () => {
  it('is letting go of Alt', () => {
    expect(isSwitchRelease(key('Alt'))).toBe(true)
  })

  it('is not letting go of anything else', () => {
    expect(isSwitchRelease(key('Shift', { altKey: true }))).toBe(false)
    expect(isSwitchRelease(key('q', { altKey: true }))).toBe(false)
  })

  it('copes with an event that has no key', () => {
    expect(isSwitchRelease({} as KeyboardEvent)).toBe(false)
  })
})

describe('activateWindow', () => {
  const store = (windows: ReturnType<typeof win>[]) => ({
    windows,
    focusWindow: vi.fn(),
    toggleMinimize: vi.fn(),
  })

  it('brings a window on screen to the front', () => {
    const os = store([win(1, 100), win(2, 101)])
    expect(activateWindow(os, 1)).toBe(true)
    expect(os.focusWindow).toHaveBeenCalledWith(1)
    expect(os.toggleMinimize).not.toHaveBeenCalled()
  })

  it('restores a minimised window, which also focuses it', () => {
    const os = store([win(1, 100, 'minimized')])
    expect(activateWindow(os, 1)).toBe(true)
    expect(os.toggleMinimize).toHaveBeenCalledWith(1)
    expect(os.focusWindow).not.toHaveBeenCalled()
  })

  it('does nothing for a window that has gone', () => {
    const os = store([win(1, 100)])
    expect(activateWindow(os, 7)).toBe(false)
    expect(os.focusWindow).not.toHaveBeenCalled()
  })
})

describe('focusWindowElement', () => {
  it('moves keyboard focus into the window once it is drawn', () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div id="win-5" tabindex="-1"></div>'
    focusWindowElement(5)
    expect(document.activeElement).toBe(document.body)
    vi.runAllTimers()
    expect(document.activeElement?.id).toBe('win-5')
  })

  it('does nothing when the window is not there', () => {
    vi.useFakeTimers()
    focusWindowElement(5)
    expect(() => vi.runAllTimers()).not.toThrow()
    expect(document.activeElement).toBe(document.body)
  })
})

describe('restoreFocus', () => {
  // jsdom lays nothing out, so an element is shown unless it is marked hidden.
  const layOut = () =>
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
      return (this.closest('[hidden]') ? [] : [{}]) as unknown as DOMRectList
    })

  it('gives focus back to what had it before', () => {
    layOut()
    document.body.innerHTML = '<button id="opener"></button><button data-task-view-toggle></button>'
    restoreFocus(document.getElementById('opener'))
    expect(document.activeElement?.id).toBe('opener')
  })

  it('falls back to the Task View button on show when that has gone', () => {
    layOut()
    document.body.innerHTML =
      '<button data-task-view-toggle hidden id="phone"></button><button data-task-view-toggle id="desk"></button>'
    const gone = document.createElement('button')
    restoreFocus(gone)
    expect(document.activeElement?.id).toBe('desk')
  })

  it('falls back the same way when nothing had focus', () => {
    layOut()
    document.body.innerHTML = '<button data-task-view-toggle id="desk"></button>'
    restoreFocus(null)
    expect(document.activeElement?.id).toBe('desk')
  })
})

describe('keepFocusInside', () => {
  const setUp = () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
      return (this.closest('[hidden]') ? [] : [{}]) as unknown as DOMRectList
    })
    document.body.innerHTML = `
      <div id="dialog" tabindex="-1">
        <button id="done" hidden>Done</button>
        <button id="a">A</button>
        <button id="b">B</button>
        <button id="c" disabled>C</button>
      </div>`
    return document.getElementById('dialog') as HTMLElement
  }
  const tab = (shiftKey = false) => ({ key: 'Tab', shiftKey, preventDefault: vi.fn() })

  it('wraps Tab from the last control to the first', () => {
    const dialog = setUp()
    document.getElementById('b')!.focus()
    const event = tab()
    expect(keepFocusInside(event, dialog)).toBe(true)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(document.activeElement?.id).toBe('a')
  })

  it('wraps Shift+Tab from the first control to the last', () => {
    const dialog = setUp()
    document.getElementById('a')!.focus()
    expect(keepFocusInside(tab(true), dialog)).toBe(true)
    expect(document.activeElement?.id).toBe('b')
  })

  it('leaves Tab to the browser between the ends', () => {
    const dialog = setUp()
    document.getElementById('a')!.focus()
    const event = tab()
    expect(keepFocusInside(event, dialog)).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('keeps focus on the dialog itself when it has nothing to tab to', () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([] as unknown as DOMRectList)
    document.body.innerHTML = '<div id="dialog" tabindex="-1"></div>'
    const dialog = document.getElementById('dialog') as HTMLElement
    const event = tab()
    expect(keepFocusInside(event, dialog)).toBe(true)
    expect(document.activeElement).toBe(dialog)
  })

  it('ignores other keys and a missing dialog', () => {
    const dialog = setUp()
    expect(keepFocusInside({ key: 'Enter', shiftKey: false, preventDefault: vi.fn() }, dialog)).toBe(false)
    expect(keepFocusInside(tab(), null)).toBe(false)
  })
})
