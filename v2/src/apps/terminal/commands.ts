// Pure terminal command dispatcher — testable without React.

import type { useOsStore } from '../../store/osStore'
import { filesystem } from '../../data/filesystem'

type Store = ReturnType<typeof useOsStore.getState>

export interface CommandResult {
  /** Text to append to the terminal output. May be multi-line. */
  res?: string
  /** When true, the caller should clear the on-screen output entirely. */
  clear?: boolean
  /** When true, the caller should close the terminal window. */
  exit?: boolean
  /** When set, the caller should switch the prompt to this path (cd). */
  cwd?: string
}

export interface CommandContext {
  cwd: string
  store: Store
}

export function runCommand(raw: string, ctx: CommandContext): CommandResult {
  const cmd = raw.trim()
  if (!cmd) return {}
  const parts = cmd.split(/\s+/)
  const base = parts[0].toLowerCase()
  const args = parts.slice(1)

  switch (base) {
    case 'help':
      return {
        res: [
          'Available commands:',
          '  help            Show this help message',
          '  whoami          Display current user',
          '  ver             Show OS version',
          '  pwd             Print working directory',
          '  dir / ls        List the current directory',
          '  cd <path>       Change directory (use .. to go up)',
          '  date / time     Show date or time',
          '  echo <text>     Print text',
          '  cls / clear     Clear the terminal',
          '  open <app>      Open an app by id (e.g. open paint)',
          '  ping <host>     Mock ping output',
          '  ipconfig        Mock network configuration',
          '  systeminfo      Mock system summary',
          '  exit            Close the terminal',
          '',
          'Portfolio commands:',
          '  about           About this portfolio',
          '  projects        List portfolio projects',
          '  contact         Display contact info',
        ].join('\n'),
      }
    case 'whoami':
      return { res: 'johnson-rose\\devante' }
    case 'ver':
      return { res: 'Microsoft Windows [Version 10.0.22631.3007]' }
    case 'pwd':
      return { res: ctx.cwd }
    case 'date':
      return {
        res:
          'The current date is: ' +
          new Date().toLocaleDateString('en-GB', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
      }
    case 'time':
      return { res: 'The current time is: ' + new Date().toLocaleTimeString() }
    case 'echo':
      return { res: args.join(' ') }
    case 'dir':
    case 'ls': {
      const files = filesystem[ctx.cwd] ?? []
      if (files.length === 0) return { res: 'Directory is empty.' }
      const lines = [` Directory of ${ctx.cwd}`, '']
      for (const f of files) {
        const tag = f.type === 'folder' ? '<DIR>' : '     '
        lines.push(`01/02/2026  12:00 PM    ${tag}          ${f.name}`)
      }
      lines.push(`               ${files.length} File(s)`)
      return { res: lines.join('\n') }
    }
    case 'cd': {
      const target = args[0]
      if (!target || target === '.') return {}
      if (target === '..') {
        const parts = ctx.cwd.split('\\')
        if (parts.length === 2 && parts[1] === '') return {} // already at C:\
        const next = parts.slice(0, -1).join('\\') || 'C:\\'
        return { cwd: next }
      }
      const files = filesystem[ctx.cwd] ?? []
      const folder = files.find(
        (f) => f.type === 'folder' && f.name.toLowerCase() === target.toLowerCase(),
      )
      if (!folder) return { res: 'The system cannot find the path specified.' }
      const next = (ctx.cwd.endsWith('\\') ? ctx.cwd : ctx.cwd + '\\') + folder.name
      return { cwd: next }
    }
    case 'systeminfo':
      return {
        res: [
          'Host Name:           DEV-PORTFOLIO',
          'OS Name:             Microsoft Windows 11 Pro',
          'OS Version:          10.0.22631 N/A Build 22631',
          'System Type:         x64-based PC',
          'Processor(s):        AMD Ryzen 7 9800X3D (8-Core, 16-Thread)',
        ].join('\n'),
      }
    case 'about':
      return {
        res: [
          'DeVanté Johnson-Rose | Portfolio OS',
          'Version: 2.0.0 (React)',
          'Built with: Vite, React 19, TypeScript, Tailwind, Zustand.',
          'Running parallel to the original PHP/Alpine v1 — type "open edge"',
          'to see it in the browser app, or visit / on the host.',
        ].join('\n'),
      }
    case 'ping': {
      const host = args[0] || 'localhost'
      const ip = '127.0.0.1'
      return {
        res: [
          `Pinging ${host} [${ip}] with 32 bytes of data:`,
          `Reply from ${ip}: bytes=32 time<1ms TTL=128`,
          `Reply from ${ip}: bytes=32 time<1ms TTL=128`,
          `Reply from ${ip}: bytes=32 time<1ms TTL=128`,
          `Reply from ${ip}: bytes=32 time<1ms TTL=128`,
          '',
          `Ping statistics for ${ip}:`,
          '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)',
        ].join('\n'),
      }
    }
    case 'ipconfig':
      return {
        res: [
          'Windows IP Configuration',
          '',
          'Ethernet adapter Ethernet:',
          '   Connection-specific DNS Suffix  . :',
          '   IPv4 Address. . . . . . . . . . . : 192.168.1.15',
          '   Subnet Mask . . . . . . . . . . . : 255.255.255.0',
          '   Default Gateway . . . . . . . . . : 192.168.1.1',
        ].join('\n'),
      }
    case 'projects':
      return {
        res: [
          'Portfolio Projects:',
          '  - English Open BJJ',
          '  - Bay Motors',
          '  - CPT Tours',
          '  - EKBJJ',
          '  - Euro-Goat',
          '  - Boulevard Logistics',
          '',
          'Type "open photos" to browse the gallery.',
        ].join('\n'),
      }
    case 'contact':
      return {
        res: [
          'Contact DeVanté:',
          '  Email: devante@johnson-rose.co.uk',
          '  GitHub: github.com/CodedVisionDesign',
        ].join('\n'),
      }
    case 'cls':
    case 'clear':
      return { clear: true }
    case 'exit':
      return { exit: true }
    case 'open': {
      const id = args[0] === 'chrome' ? 'edge' : args[0]
      if (!id) return { res: 'Usage: open <app_name>' }
      // Defer to the caller so the registry's defaultSize is applied.
      ctx.store.openApp(id)
      return { res: `Attempting to open ${id}...` }
    }
    default:
      return {
        res: `'${base}' is not recognized as an internal or external command, operable program or batch file.`,
      }
  }
}
