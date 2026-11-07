import { describe, it, expect, vi } from 'vitest'
import {
  NOTEPAD_MENUS,
  findNext,
  lineColumn,
  NOTEPAD_DEFAULTS,
  notepadCommands,
  notepadShortcut,
  pushUndo,
  readNotepadOptions,
  replaceAll,
  replaceNext,
  replaceRange,
  selectedText,
  stamp,
  stepZoom,
  textParts,
  type EditorState,
  type NotepadEditor,
} from '../../../assets/js/windowing/text-ops.js'

const state = (text: string, start = 0, end = start): EditorState => ({ text, start, end })

describe('textParts', () => {
  it('keeps plain text as one part', () => {
    expect(textParts('just words')).toEqual([{ text: 'just words', link: null, marked: false }])
  })

  it('splits out a link', () => {
    expect(textParts('see https://example.com now')).toEqual([
      { text: 'see ', link: null, marked: false },
      { text: 'https://example.com', link: 'https://example.com', marked: false },
      { text: ' now', link: null, marked: false },
    ])
  })

  it('marks a find result that sits inside a link, without breaking the link', () => {
    const parts = textParts('https://example.com', { start: 8, end: 15 })
    expect(parts.map((part) => part.text)).toEqual(['https://', 'example', '.com'])
    expect(parts.every((part) => part.link === 'https://example.com')).toBe(true)
    expect(parts.map((part) => part.marked)).toEqual([false, true, false])
  })

  it('returns text as data, so markup is never treated as HTML', () => {
    expect(textParts('<img src=x onerror=alert(1)>')).toEqual([
      { text: '<img src=x onerror=alert(1)>', link: null, marked: false },
    ])
  })
})

describe('readNotepadOptions', () => {
  it('starts from the defaults on a first visit', () => {
    expect(readNotepadOptions(null)).toEqual(NOTEPAD_DEFAULTS)
  })

  it('keeps saved choices and fills in any that are missing', () => {
    expect(readNotepadOptions('{"zoom":150}')).toEqual({ ...NOTEPAD_DEFAULTS, zoom: 150 })
  })

  it('falls back to the defaults when the saved copy is broken', () => {
    expect(readNotepadOptions('{not json')).toEqual(NOTEPAD_DEFAULTS)
  })
})

describe('replaceRange', () => {
  it('replaces the selection and puts the caret after it', () => {
    expect(replaceRange(state('hello world', 6, 11), 'there')).toEqual(state('hello there', 11))
  })

  it('inserts at the caret when nothing is selected', () => {
    expect(replaceRange(state('ab', 1), 'X')).toEqual(state('aXb', 2))
  })

  it('deletes when given nothing to put in', () => {
    expect(replaceRange(state('abc', 1, 2), '')).toEqual(state('ac', 1))
  })
})

describe('selectedText', () => {
  it('reads the selection, or nothing', () => {
    expect(selectedText(state('hello', 1, 3))).toBe('el')
    expect(selectedText(state('hello', 2))).toBe('')
  })
})

describe('findNext', () => {
  it('finds the next match after the caret', () => {
    expect(findNext('one two one', 'one', 1)).toEqual({ start: 8, end: 11 })
  })

  it('wraps round to the start', () => {
    expect(findNext('one two', 'one', 5)).toEqual({ start: 0, end: 3 })
  })

  it('ignores case unless asked', () => {
    expect(findNext('Hello', 'hello', 0)).toEqual({ start: 0, end: 5 })
    expect(findNext('Hello', 'hello', 0, { matchCase: true })).toBeNull()
  })

  it('finds nothing for an empty search or an unknown word', () => {
    expect(findNext('hello', '', 0)).toBeNull()
    expect(findNext('hello', 'bye', 0)).toBeNull()
  })
})

describe('replaceNext', () => {
  it('replaces a selected match, then selects the next one', () => {
    const next = replaceNext(state('cat cat', 0, 3), 'cat', 'dog')
    expect(next).toEqual({ text: 'dog cat', start: 4, end: 7 })
  })

  it('only selects the first match when none is selected', () => {
    expect(replaceNext(state('a cat', 0), 'cat', 'dog')).toEqual({ text: 'a cat', start: 2, end: 5 })
  })

  it('stays put when there is nothing to find', () => {
    expect(replaceNext(state('hello', 1), 'bye', 'x')).toEqual(state('hello', 1))
  })
})

describe('replaceAll', () => {
  it('replaces everything and counts', () => {
    expect(replaceAll('a a a', 'a', 'b')).toEqual({ text: 'b b b', count: 3 })
  })

  it('treats the search as plain text', () => {
    expect(replaceAll('1+1 and 1+1', '1+1', '2')).toEqual({ text: '2 and 2', count: 2 })
  })

  it('leaves replacement text alone', () => {
    expect(replaceAll('a', 'a', '$&$&').text).toBe('$&$&')
  })

  it('respects match case', () => {
    expect(replaceAll('A a', 'a', 'b', { matchCase: true })).toEqual({ text: 'A b', count: 1 })
    expect(replaceAll('A a', 'a', 'b')).toEqual({ text: 'b b', count: 2 })
  })

  it('does nothing for an empty search', () => {
    expect(replaceAll('abc', '', 'x')).toEqual({ text: 'abc', count: 0 })
  })
})

describe('lineColumn', () => {
  it('counts from one', () => {
    expect(lineColumn('', 0)).toEqual({ line: 1, column: 1 })
  })

  it('finds the line and column of the caret', () => {
    expect(lineColumn('one\ntwo\nthree', 9)).toEqual({ line: 3, column: 2 })
  })
})

describe('stamp', () => {
  it('reads as Windows Notepad writes it', () => {
    expect(stamp(new Date(2026, 10, 1, 9, 5))).toBe('09:05 01/11/2026')
  })
})

describe('stepZoom', () => {
  it('moves by ten', () => {
    expect(stepZoom(100, 1)).toBe(110)
    expect(stepZoom(100, -1)).toBe(90)
  })

  it('stays between 50 and 200', () => {
    expect(stepZoom(200, 1)).toBe(200)
    expect(stepZoom(50, -1)).toBe(50)
  })
})

describe('pushUndo', () => {
  it('remembers each earlier version', () => {
    expect(pushUndo(['a'], 'b')).toEqual(['a', 'b'])
  })

  it('skips a repeat', () => {
    expect(pushUndo(['a'], 'a')).toEqual(['a'])
  })

  it('forgets the oldest past the limit', () => {
    const full = Array.from({ length: 100 }, (_, i) => String(i))
    const next = pushUndo(full, 'new')
    expect(next).toHaveLength(100)
    expect(next[0]).toBe('1')
    expect(next.at(-1)).toBe('new')
  })
})

describe('notepadShortcut', () => {
  const key = (k: string, ctrlKey = true, metaKey = false) => ({ key: k, ctrlKey, metaKey })

  it('reads the Windows Notepad keys', () => {
    expect(notepadShortcut(key('z'))).toBe('undo')
    expect(notepadShortcut(key('f'))).toBe('find')
    expect(notepadShortcut(key('h'))).toBe('replace')
    expect(notepadShortcut(key('a'))).toBe('selectAll')
    expect(notepadShortcut(key('='))).toBe('zoomIn')
    expect(notepadShortcut(key('+'))).toBe('zoomIn')
    expect(notepadShortcut(key('-'))).toBe('zoomOut')
    expect(notepadShortcut(key('0'))).toBe('zoomReset')
    expect(notepadShortcut(key('F3', false))).toBe('findNext')
    expect(notepadShortcut(key('F5', false))).toBe('timeDate')
  })

  it('takes Cmd on a Mac', () => {
    expect(notepadShortcut(key('f', false, true))).toBe('find')
  })

  it('ignores plain typing and unknown keys', () => {
    expect(notepadShortcut(key('f', false))).toBeNull()
    expect(notepadShortcut(key('q'))).toBeNull()
  })
})

describe('NOTEPAD_MENUS', () => {
  it('has the three menus, each item with a command that exists', () => {
    const commands = notepadCommands(editor().ed)
    expect(NOTEPAD_MENUS.map((menu) => menu.label)).toEqual(['Edit', 'Format', 'View'])
    for (const menu of NOTEPAD_MENUS) {
      for (const item of menu.items) {
        if (!item.separator) expect(commands[item.id as string], item.id).toBeTypeOf('function')
      }
    }
  })
})

function editor(start: EditorState = state('hello world', 0, 5)) {
  let current = start
  const options: Record<string, unknown> = { wordWrap: true, monospace: true, statusBar: true, zoom: 100 }
  const undo: string[] = []
  const ed: NotepadEditor = {
    read: () => current,
    write: vi.fn((next: EditorState) => { current = next }),
    popUndo: vi.fn(() => undo.pop() ?? null),
    copy: vi.fn().mockResolvedValue(true),
    paste: vi.fn().mockResolvedValue('pasted'),
    openFind: vi.fn(),
    findNext: vi.fn(),
    option: (name) => options[name] as never,
    setOption: vi.fn((name, value) => { options[name] = value }),
    now: () => new Date(2026, 10, 1, 9, 5),
    toast: vi.fn(),
  }
  return { ed, state: () => current, options, undo }
}

describe('notepadCommands', () => {
  it('copies the selection, leaving the text', async () => {
    const { ed, state: read } = editor()
    await notepadCommands(ed).copy()
    expect(ed.copy).toHaveBeenCalledWith('hello')
    expect(read().text).toBe('hello world')
  })

  it('cuts the selection', async () => {
    const { ed, state: read } = editor()
    await notepadCommands(ed).cut()
    expect(ed.copy).toHaveBeenCalledWith('hello')
    expect(read().text).toBe(' world')
  })

  it('pastes over the selection', async () => {
    const { ed, state: read } = editor()
    await notepadCommands(ed).paste()
    expect(read().text).toBe('pasted world')
  })

  it('says how to paste when the browser refuses', async () => {
    const { ed, state: read } = editor()
    ed.paste = vi.fn().mockResolvedValue(null)
    await notepadCommands(ed).paste()
    expect(ed.toast).toHaveBeenCalledWith('Press Ctrl+V to paste')
    expect(read().text).toBe('hello world')
  })

  it('deletes the selection', () => {
    const { ed, state: read } = editor()
    notepadCommands(ed).delete()
    expect(read().text).toBe(' world')
  })

  it('selects everything', () => {
    const { ed, state: read } = editor()
    notepadCommands(ed).selectAll()
    expect(read()).toEqual(state('hello world', 0, 11))
  })

  it('stamps the time and date at the caret', () => {
    const { ed, state: read } = editor(state('', 0))
    notepadCommands(ed).timeDate()
    expect(read().text).toBe('09:05 01/11/2026')
  })

  it('undoes to the last version, with the caret at its end', () => {
    const { ed, state: read, undo } = editor()
    undo.push('older')
    notepadCommands(ed).undo()
    expect(read()).toEqual(state('older', 5))
  })

  it('does nothing to undo when there is no history', () => {
    const { ed } = editor()
    notepadCommands(ed).undo()
    expect(ed.write).not.toHaveBeenCalled()
  })

  it('toggles options, and steps and resets zoom', () => {
    const { ed, options } = editor()
    const commands = notepadCommands(ed)
    commands.wordWrap()
    expect(options.wordWrap).toBe(false)
    commands.statusBar()
    expect(options.statusBar).toBe(false)
    commands.zoomIn()
    expect(options.zoom).toBe(110)
    commands.zoomOut()
    commands.zoomOut()
    expect(options.zoom).toBe(90)
    commands.zoomReset()
    expect(options.zoom).toBe(100)
  })

  it('opens Find and Replace', () => {
    const { ed } = editor()
    const commands = notepadCommands(ed)
    commands.find()
    expect(ed.openFind).toHaveBeenCalledWith('find')
    commands.replace()
    expect(ed.openFind).toHaveBeenCalledWith('replace')
  })
})
