import { describe, it, expect, beforeEach } from 'vitest'
import { runCommand } from './commands'
import { useOsStore } from '../../store/osStore'

const ctx = () => ({ cwd: 'C:\\Users\\DeVante', store: useOsStore.getState() })

describe('terminal commands', () => {
  beforeEach(() => {
    localStorage.clear()
    useOsStore.setState({ windows: [], focusedWindowId: null })
  })

  it('empty input returns no-op', () => {
    expect(runCommand('', ctx())).toEqual({})
    expect(runCommand('   ', ctx())).toEqual({})
  })

  it('help lists commands', () => {
    const out = runCommand('help', ctx())
    expect(out.res).toMatch(/Available commands/)
    expect(out.res).toMatch(/Portfolio commands/)
  })

  it('whoami / ver / pwd are fixed strings', () => {
    expect(runCommand('whoami', ctx()).res).toBe('johnson-rose\\devante')
    expect(runCommand('ver', ctx()).res).toMatch(/Microsoft Windows/)
    expect(runCommand('pwd', ctx()).res).toBe('C:\\Users\\DeVante')
  })

  it('echo joins arguments', () => {
    expect(runCommand('echo hello world', ctx()).res).toBe('hello world')
  })

  it('cls / clear sets the clear flag', () => {
    expect(runCommand('cls', ctx()).clear).toBe(true)
    expect(runCommand('clear', ctx()).clear).toBe(true)
  })

  it('exit sets the exit flag', () => {
    expect(runCommand('exit', ctx()).exit).toBe(true)
  })

  it('ping defaults to localhost', () => {
    expect(runCommand('ping', ctx()).res).toMatch(/Pinging localhost \[127\.0\.0\.1\]/)
  })

  it('ping <host> echoes the host', () => {
    expect(runCommand('ping example.com', ctx()).res).toMatch(/Pinging example\.com/)
  })

  it('open <app> calls store.openApp', () => {
    const before = useOsStore.getState().windows.length
    runCommand('open calculator', ctx())
    expect(useOsStore.getState().windows.length).toBe(before + 1)
  })

  it('open chrome aliases to edge', () => {
    runCommand('open chrome', ctx())
    expect(useOsStore.getState().windows.some((w) => w.app === 'edge')).toBe(true)
  })

  it('open without an arg returns usage text', () => {
    expect(runCommand('open', ctx()).res).toMatch(/Usage: open/)
  })

  it('unknown command returns the Windows-style error', () => {
    expect(runCommand('xyzzy', ctx()).res).toMatch(/is not recognized/)
  })

  it('is case-insensitive on the base command', () => {
    expect(runCommand('WHOAMI', ctx()).res).toBe('johnson-rose\\devante')
    expect(runCommand('Help', ctx()).res).toMatch(/Available commands/)
  })
})
