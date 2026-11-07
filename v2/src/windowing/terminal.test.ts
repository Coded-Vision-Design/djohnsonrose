import { describe, it, expect } from 'vitest'
import {
  GITHUB_PROFILE,
  TERMINAL_HOME,
  dirLine,
  resolvePath,
  runTerminalCommand,
  splitArgs,
  type TerminalContext,
} from '../../../assets/js/windowing/terminal.js'
import { entryDate } from '../../../assets/js/windowing/file-ops.js'
import fileSystemData from '../../../data/filesystem.json'
import portfolio from '../../../data/portfolio.json'

// The Terminal both builds use: the commands, their paths and their output.

const fileSystem = fileSystemData as unknown as TerminalContext['fileSystem']
const { projects } = portfolio

const ctx = (patch: Partial<TerminalContext> = {}): TerminalContext => ({
  cwd: TERMINAL_HOME,
  fileSystem,
  projects,
  email: 'devante@johnson-rose.co.uk',
  build: 'v2',
  ...patch,
})

const run = (raw: string, patch: Partial<TerminalContext> = {}) => runTerminalCommand(raw, ctx(patch))

describe('splitArgs', () => {
  it('splits on runs of spaces', () => {
    expect(splitArgs('cd   Documents')).toEqual(['cd', 'Documents'])
  })

  it('keeps a quoted path with spaces together', () => {
    expect(splitArgs('cd "Program Files"')).toEqual(['cd', 'Program Files'])
    expect(splitArgs("cd 'Program Files (x86)'")).toEqual(['cd', 'Program Files (x86)'])
    expect(splitArgs('echo "a  b" c')).toEqual(['echo', 'a  b', 'c'])
  })

  it('copes with an unclosed quote and empty input', () => {
    expect(splitArgs('cd "Program Files')).toEqual(['cd', 'Program Files'])
    expect(splitArgs('   ')).toEqual([])
  })
})

describe('resolvePath', () => {
  it('goes up from C:\\Users to C:\\, not C:', () => {
    expect(resolvePath(fileSystem, 'C:\\Users', '..')).toBe('C:\\')
  })

  it('stays at C:\\ when already there', () => {
    expect(resolvePath(fileSystem, 'C:\\', '..')).toBe('C:\\')
  })

  it('finds folders whatever their case, with the real name', () => {
    expect(resolvePath(fileSystem, 'C:\\', 'program files')).toBe('C:\\Program Files')
  })

  it('follows several steps, absolute paths and the home folder', () => {
    expect(resolvePath(fileSystem, TERMINAL_HOME, 'Documents\\Career')).toBe('C:\\Users\\DeVante\\Documents\\Career')
    expect(resolvePath(fileSystem, TERMINAL_HOME, '..\\..')).toBe('C:\\')
    expect(resolvePath(fileSystem, TERMINAL_HOME, 'C:\\Windows')).toBe('C:\\Windows')
    expect(resolvePath(fileSystem, TERMINAL_HOME, '\\')).toBe('C:\\')
    expect(resolvePath(fileSystem, 'C:\\Windows', '~')).toBe(TERMINAL_HOME)
    expect(resolvePath(fileSystem, TERMINAL_HOME, './Documents/')).toBe('C:\\Users\\DeVante\\Documents')
  })

  it('returns null for a folder that does not exist, or a file', () => {
    expect(resolvePath(fileSystem, TERMINAL_HOME, 'zztop')).toBeNull()
    expect(resolvePath(fileSystem, 'C:\\Users\\DeVante\\Documents', 'achievements.txt')).toBeNull()
  })
})

describe('cd', () => {
  it('cd .. from C:\\Users goes to C:\\', () => {
    expect(run('cd ..', { cwd: 'C:\\Users' }).cwd).toBe('C:\\')
  })

  it('cd .. walks one level up', () => {
    expect(run('cd ..', { cwd: 'C:\\Users\\DeVante\\Documents' }).cwd).toBe(TERMINAL_HOME)
  })

  it('takes quoted paths with spaces, and unquoted ones as cmd does', () => {
    expect(run('cd "Program Files"', { cwd: 'C:\\' }).cwd).toBe('C:\\Program Files')
    expect(run('cd Program Files (x86)', { cwd: 'C:\\' }).cwd).toBe('C:\\Program Files (x86)')
  })

  it('does nothing with no path', () => {
    expect(run('cd')).toEqual({})
  })

  it('reports a missing folder with the Windows error', () => {
    const out = run('cd zztop')
    expect(out.cwd).toBeUndefined()
    expect(out.res).toMatch(/cannot find the path/)
  })
})

describe('dir', () => {
  it('shows each entry with the date the file system gives it', () => {
    const out = run('dir', { cwd: 'C:\\Users\\DeVante\\Documents' }).res ?? ''
    expect(out).toMatch(/Directory of C:\\Users\\DeVante\\Documents/)
    expect(out).not.toMatch(/01\/02\/2026/)
    const file = fileSystem['C:\\Users\\DeVante\\Documents'].find((e) => e.type !== 'folder')
    expect(file).toBeDefined()
    expect(out).toContain(dirLine(file!))
  })

  it('dates a line as dd/mm/yyyy hh:mm, folders as <DIR> and files by size', () => {
    const when = new Date(2026, 4, 7, 9, 5)
    expect(dirLine({ name: 'Career', type: 'folder', modified: when.getTime() })).toBe(
      '07/05/2026  09:05    <DIR>          Career',
    )
    expect(dirLine({ name: 'a.txt', type: 'file', content: 'x'.repeat(1234), modified: when.getTime() })).toBe(
      '07/05/2026  09:05             1,234 a.txt',
    )
  })

  it('counts files, bytes and folders like Windows', () => {
    const out = run('dir', { cwd: 'C:\\Users\\DeVante\\Documents' }).res ?? ''
    expect(out).toMatch(/\d+ File\(s\)\s+[\d,]+ bytes/)
    expect(out).toMatch(/\d+ Dir\(s\)/)
  })

  it('lists another folder by path, and says when it is empty', () => {
    expect(run('dir "C:\\Recycle Bin"').res).toMatch(/File Not Found|Directory of C:\\Recycle Bin/)
    expect(run('ls Documents').res).toMatch(/Directory of C:\\Users\\DeVante\\Documents/)
    expect(run('dir nowhere').res).toMatch(/cannot find the path/)
  })

  it('a dated entry keeps its date', () => {
    const entry = { name: 'x.txt', type: 'file', content: '', modified: new Date(2025, 0, 2, 3, 4).getTime() }
    expect(dirLine(entry)).toContain('02/01/2025  03:04')
    expect(entryDate(entry).getFullYear()).toBe(2025)
  })
})

describe('other commands', () => {
  it('ver reports Windows 11 25H2, build 26200', () => {
    expect(run('ver').res).toMatch(/^Microsoft Windows \[Version 10\.0\.26200\.\d+\]$/)
    expect(run('systeminfo').res).toMatch(/Build 26200/)
    expect(run('systeminfo').res).not.toMatch(/22631/)
  })

  it('lists every project in data/portfolio.json, featured ones first', () => {
    const out = run('projects').res ?? ''
    for (const project of projects) expect(out).toContain(project.title)
    const firstOther = projects.find((p) => !('featured' in p && p.featured))!
    const lastFeatured = [...projects].reverse().find((p) => 'featured' in p && p.featured)!
    expect(out.indexOf(lastFeatured.title)).toBeLessThan(out.indexOf(firstOther.title))
  })

  it('contact gives the email and the GitHub profile that exists', () => {
    const out = run('contact').res ?? ''
    expect(out).toContain('devante@johnson-rose.co.uk')
    expect(out).toContain(GITHUB_PROFILE)
    expect(GITHUB_PROFILE).toBe('github.com/CodedVisionDesign')
    expect(out).not.toContain('devantejr')
  })

  it('help, whoami, pwd and echo', () => {
    expect(run('help').res).toMatch(/Available commands/)
    expect(run('WHOAMI').res).toBe('johnson-rose\\devante')
    expect(run('pwd').res).toBe(TERMINAL_HOME)
    expect(run('echo "hello   world" again').res).toBe('hello   world again')
  })

  it('about names the build it runs in', () => {
    expect(run('about', { build: 'v1' }).res).toMatch(/PHP/)
    expect(run('about', { build: 'v2' }).res).toMatch(/React/)
  })

  it('asks the caller to clear, exit or open an app', () => {
    expect(run('cls')).toEqual({ clear: true })
    expect(run('clear')).toEqual({ clear: true })
    expect(run('exit')).toEqual({ exit: true })
    expect(run('open chrome')).toMatchObject({ open: 'edge' })
    expect(run('open paint')).toMatchObject({ open: 'paint' })
    expect(run('open').res).toMatch(/Usage: open/)
  })

  it('ping echoes the host', () => {
    expect(run('ping').res).toMatch(/Pinging localhost/)
    expect(run('ping example.com').res).toMatch(/Pinging example\.com/)
  })

  it('empty input does nothing, and an unknown command gets the Windows error', () => {
    expect(run('   ')).toEqual({})
    expect(run('xyzzy').res).toMatch(/'xyzzy' is not recognized/)
  })
})
