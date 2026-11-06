export interface TerminalEntry {
  name: string
  type: string
  path?: string
  content?: string
  /** Milliseconds since 1970, as file-ops.js keeps it. */
  modified?: number
}

export interface TerminalProject {
  title: string
  url?: string
  featured?: boolean
}

export interface TerminalContext {
  cwd: string
  fileSystem: Record<string, TerminalEntry[]>
  projects: TerminalProject[]
  email: string
  build: 'v1' | 'v2'
  now?: Date
}

export interface TerminalResult {
  /** Text to print. May be several lines. */
  res?: string
  /** The new working folder, after cd. */
  cwd?: string
  /** An app id the caller should open. */
  open?: string
  /** The caller should clear the screen. */
  clear?: boolean
  /** The caller should close the Terminal. */
  exit?: boolean
}

export const TERMINAL_HOME: string
export const GITHUB_PROFILE: string
export const WINDOWS_VERSION: string

export function splitArgs(text: string): string[]
export function resolvePath(fs: Record<string, TerminalEntry[]>, cwd: string, target: string): string | null
export function dirLine(entry: TerminalEntry): string
export function runTerminalCommand(raw: string, ctx: TerminalContext): TerminalResult
