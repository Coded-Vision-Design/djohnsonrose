// The commands themselves live in assets/js/windowing/terminal.js, shared with
// v1. This only hands them v2's file system and opens any app they ask for.

import { useOsStore } from '../../store/osStore'
import {
  runTerminalCommand,
  type TerminalContext,
  type TerminalResult,
} from '../../../../assets/js/windowing/terminal.js'
import portfolio from '../../../../data/portfolio.json'

type Store = ReturnType<typeof useOsStore.getState>

export type CommandResult = TerminalResult

export interface CommandContext {
  cwd: string
  store: Store
}

export const CONTACT_EMAIL = 'devante@johnson-rose.co.uk'

export function runCommand(raw: string, ctx: CommandContext): CommandResult {
  const result = runTerminalCommand(raw, {
    cwd: ctx.cwd,
    fileSystem: useOsStore.getState().fileSystem as TerminalContext['fileSystem'],
    projects: portfolio.projects,
    email: CONTACT_EMAIL,
    build: 'v2',
  })
  if (result.open) ctx.store.openApp(result.open)
  return result
}
