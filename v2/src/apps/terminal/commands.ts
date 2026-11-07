// The commands themselves live in assets/js/windowing/terminal.js, shared with
// v1. This only hands them v2's file system and data, and opens any app they ask for.

import { useOsStore } from '../../store/osStore'
import {
  completeTerminalLine,
  runTerminalCommand,
  type CompletionSession,
  type TerminalContext,
  type TerminalResult,
} from '../../../../assets/js/windowing/terminal.js'
import { appManifest } from '../manifest'
import portfolio from '../../../../data/portfolio.json'
import profile from '../../../../data/profile.json'

type Store = ReturnType<typeof useOsStore.getState>

export type CommandResult = TerminalResult

export interface CommandContext {
  cwd: string
  store: Store
}

export const CONTACT_EMAIL = 'devante@johnson-rose.co.uk'

const fileSystem = () => useOsStore.getState().fileSystem as TerminalContext['fileSystem']

export function runCommand(raw: string, ctx: CommandContext): CommandResult {
  const result = runTerminalCommand(raw, {
    cwd: ctx.cwd,
    fileSystem: fileSystem(),
    projects: portfolio.projects,
    email: CONTACT_EMAIL,
    build: 'v2',
    profile,
    portfolio,
  })
  if (result.open) ctx.store.openApp(result.open)
  return result
}

/** Tab completion over v2's file system and apps. Pass back the session to cycle. */
export function completeCommand(line: string, cwd: string, session: CompletionSession | null, back: boolean) {
  return completeTerminalLine(line, { cwd, fileSystem: fileSystem(), apps: Object.keys(appManifest) }, session, back)
}
