import { describe, it, expect } from 'vitest'
import {
  TERMINAL_COMMANDS,
  TERMINAL_HOME,
  completeTerminalLine,
  completionKey,
  type CompletionSession,
  type TerminalContext,
} from '../../../assets/js/windowing/terminal.js'
import fileSystemData from '../../../data/filesystem.json'

// Tab completion in the Terminal both builds use: commands, then folders and
// files, case-insensitive like Windows, cycling on each Tab and back on Shift+Tab.

const fileSystem = fileSystemData as unknown as TerminalContext['fileSystem']
const ctx = (cwd = TERMINAL_HOME) => ({ cwd, fileSystem, apps: ['paint', 'photos', 'terminal', 'vscode'] })

/** Presses Tab (or Shift+Tab) on a line as many times as asked, and returns each line shown. */
function press(line: string, times: number, cwd = TERMINAL_HOME, back = false) {
  const seen: string[] = []
  let session: CompletionSession | null = null
  for (let i = 0; i < times; i++) {
    const next = completeTerminalLine(line, ctx(cwd), session, back)
    line = next.line
    session = next.session
    seen.push(line)
  }
  return seen
}

describe('completionKey', () => {
  const key = (init: Partial<KeyboardEventInit>) => new KeyboardEvent('keydown', { key: 'Tab', ...init })

  it('Tab goes forward and Shift+Tab back on a line with something on it', () => {
    expect(completionKey(key({}), 'cd do')).toBe('next')
    expect(completionKey(key({ shiftKey: true }), 'cd do')).toBe('back')
  })

  it('leaves Tab to move focus on an empty line, so the keyboard is never trapped', () => {
    expect(completionKey(key({}), '')).toBeNull()
    expect(completionKey(key({ shiftKey: true }), '   ')).toBeNull()
  })

  it('ignores other keys and Tab with Ctrl, Alt or the Windows key', () => {
    expect(completionKey(key({ key: 'Enter' }), 'cd')).toBeNull()
    expect(completionKey(key({ ctrlKey: true }), 'cd')).toBeNull()
    expect(completionKey(key({ altKey: true }), 'cd')).toBeNull()
    expect(completionKey(key({ metaKey: true }), 'cd')).toBeNull()
  })
})

describe('completing a command', () => {
  it('finishes the only match', () => {
    expect(press('he', 1)).toEqual(['help'])
    expect(press('sk', 2)).toEqual(['skills', 'skills'])
  })

  it('ignores case, like Windows', () => {
    expect(press('WHO', 1)).toEqual(['whoami'])
  })

  it('cycles through every match in order, then wraps', () => {
    const matches = TERMINAL_COMMANDS.filter((name) => name.startsWith('c'))
    expect(matches).toEqual(['cat', 'cd', 'chdir', 'clear', 'cls', 'contact', 'cv'])
    expect(press('c', matches.length + 1)).toEqual([...matches, 'cat'])
  })

  it('goes backwards on Shift+Tab, starting from the last match', () => {
    expect(press('c', 2, TERMINAL_HOME, true)).toEqual(['cv', 'contact'])
  })

  it('leaves a line with no match alone', () => {
    expect(completeTerminalLine('xyz', ctx())).toEqual({ line: 'xyz', session: null })
  })
})

describe('completing a path', () => {
  it('completes a folder in the current folder and adds a backslash', () => {
    expect(press('cd doc', 1)).toEqual(['cd Documents\\'])
  })

  it('completes inside a folder the visitor typed, keeping what they typed', () => {
    expect(press('cat desktop\\ach', 1)).toEqual(['cat desktop\\achievements.txt'])
    expect(press('cat C:\\Win', 1)).toEqual(['cat C:\\Windows\\'])
    expect(press('type ..\\Desk', 1, `${TERMINAL_HOME}\\Documents`)).toEqual(['type ..\\Desktop\\'])
    expect(press('cat ~/desk', 1, 'C:\\Windows')).toEqual(['cat ~\\Desktop\\'])
  })

  it('quotes a name with a space or an apostrophe, and cycles to the next', () => {
    expect(press('cd prog', 2, 'C:\\')).toEqual(['cd "Program Files\\"', 'cd "Program Files (x86)\\"'])
    expect(press('cd fr', 1, `${TERMINAL_HOME}\\Projects`)).toEqual(['cd Freelance\\'])
    expect(press('cd ram', 1, `${TERMINAL_HOME}\\Projects\\Freelance`)).toEqual(['cd "Ram\'s Taxis\\"'])
  })

  it('carries on from a quoted folder the visitor goes on typing in', () => {
    expect(press('cd "Program Files\\"Mic', 1, 'C:\\')).toEqual(['cd "Program Files\\Microsoft Office\\"'])
  })

  it('offers only folders to cd and dir, but files too to cat', () => {
    const cd = press('cd a', 5, `${TERMINAL_HOME}\\Desktop`)
    expect(cd.every((line) => !line.includes('achievements'))).toBe(true)
    expect(press('cat a', 1, `${TERMINAL_HOME}\\Desktop`)).toEqual(['cat achievements.txt'])
  })

  it('lists every named entry for an empty name, and skips entries without one', () => {
    const named = fileSystem[`${TERMINAL_HOME}\\Desktop`].filter((entry) => entry.name)
    const lines = press('cat ', named.length, `${TERMINAL_HOME}\\Desktop`)
    expect(new Set(lines).size).toBe(named.length)
    expect(lines.some((line) => line.includes('undefined'))).toBe(false)
  })

  it('completes manual pages after man', () => {
    expect(press('man dev', 1)).toEqual(['man devante'])
    expect(press('man sk', 1)).toEqual(['man skills'])
  })

  it('completes app ids after open', () => {
    expect(press('open p', 3)).toEqual(['open paint', 'open photos', 'open paint'])
  })

  it('finds nothing in a folder that does not exist', () => {
    expect(completeTerminalLine('cd nowhere\\a', ctx())).toEqual({ line: 'cd nowhere\\a', session: null })
  })

  it('starts again once the line has changed', () => {
    const first = completeTerminalLine('cd prog', ctx('C:\\'))
    expect(first.line).toBe('cd "Program Files\\"')
    const edited = completeTerminalLine('cd "Program Files\\"A', ctx('C:\\'), first.session)
    expect(edited.line).toBe('cd "Program Files\\Adobe\\"')
  })
})
