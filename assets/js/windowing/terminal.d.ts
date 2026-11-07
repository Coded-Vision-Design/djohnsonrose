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

/** The parts of data/profile.json that cv and man devante print. */
export interface TerminalProfile {
  name?: string
  headline?: string
  location?: string
  alumniOf?: string
}

/** The parts of data/portfolio.json that cv, skills and man devante print. */
export interface TerminalPortfolio {
  summary?: string
  philosophy?: string
  experience?: { role: string; company: string; period: string; location?: string }[]
  skills?: Record<string, string[]> | string[]
}

export interface TerminalContext {
  cwd: string
  fileSystem: Record<string, TerminalEntry[]>
  projects: TerminalProject[]
  email: string
  build: 'v1' | 'v2'
  now?: Date
  profile?: TerminalProfile
  portfolio?: TerminalPortfolio
  /** App ids, which Tab completes after open. */
  apps?: string[]
}

/** Where Tab completion is up to, handed back on the next Tab to cycle. */
export interface CompletionSession {
  head: string
  matches: string[]
  index: number
  line: string
}

export interface TourStep {
  title: string
  lines: string[]
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
export const LINKEDIN_PROFILE: string
export const WINDOWS_VERSION: string

export const TERMINAL_COMMANDS: readonly string[]
export const TOUR_STEPS: readonly TourStep[]

export function splitArgs(text: string): string[]
export function resolvePath(fs: Record<string, TerminalEntry[]>, cwd: string, target: string): string | null
export function resolveFile(
  fs: Record<string, TerminalEntry[]>,
  cwd: string,
  target: string,
): { entry: TerminalEntry; folder: string } | null
export function completionKey(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>,
  line: string,
): 'next' | 'back' | null
export function completeTerminalLine(
  line: string,
  ctx: Pick<TerminalContext, 'cwd' | 'fileSystem' | 'apps'>,
  session?: CompletionSession | null,
  back?: boolean,
): { line: string; session: CompletionSession | null }
export function dirLine(entry: TerminalEntry): string
export function runTerminalCommand(raw: string, ctx: TerminalContext): TerminalResult
