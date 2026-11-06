// The Terminal's commands, shared by both builds. A command gets the file system
// and the portfolio, and returns what to print. Opening an app, clearing the
// screen and closing the window are left to the build that asked.

import { entryDate, entrySize, folderPath, parentPath } from './file-ops.js';

export const TERMINAL_HOME = 'C:\\Users\\DeVante';
export const GITHUB_PROFILE = 'github.com/CodedVisionDesign';
// Windows 11 2025 Update (25H2).
export const WINDOWS_VERSION = '10.0.26200.9711';

const ROOT = 'C:\\';

/** Words of a command line. Quotes keep a path with spaces together. */
export function splitArgs(text) {
  const args = [];
  let word = '';
  let quote = null;
  let started = false;
  for (const char of text) {
    if (quote) {
      if (char === quote) quote = null;
      else word += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) args.push(word);
      word = '';
      started = false;
    } else {
      word += char;
      started = true;
    }
  }
  if (started) args.push(word);
  return args;
}

/** The folder a path names from `cwd`, with its real capitals, or null. */
export function resolvePath(fs, cwd, target) {
  let path = cwd;
  let rest = target.replace(/\//g, '\\');
  if (rest === '~' || rest.startsWith('~\\')) {
    path = TERMINAL_HOME;
    rest = rest.slice(1);
  } else if (/^[a-z]:/i.test(rest)) {
    // A folder kept outside the tree, such as C:\Recycle Bin, is found by its key.
    const key = Object.keys(fs).find((k) => k.toLowerCase() === rest.replace(/\\+$/, '').toLowerCase());
    if (key) return key;
    path = ROOT;
    rest = rest.slice(2);
  } else if (rest.startsWith('\\')) {
    path = ROOT;
  }
  for (const part of rest.split('\\')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      path = parentPath(path);
      continue;
    }
    const folder = (fs[path] ?? []).find(
      (entry) => entry.type === 'folder' && entry.name.toLowerCase() === part.toLowerCase(),
    );
    if (!folder) return null;
    path = folderPath(folder, path);
  }
  return path;
}

const two = (n) => String(n).padStart(2, '0');

/** One line of `dir`, as Windows prints it: date, time, then <DIR> or the size. */
export function dirLine(entry) {
  const date = entryDate(entry);
  const when = `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()}  ${two(date.getHours())}:${two(date.getMinutes())}`;
  const size = entry.type === 'folder' ? '<DIR>         ' : entrySize(entry).toLocaleString('en-GB').padStart(14);
  return `${when}    ${size} ${entry.name}`;
}

function listFolder(fs, path) {
  const entries = fs[path] ?? [];
  const lines = [` Directory of ${path}`, ''];
  if (entries.length === 0) return [...lines, 'File Not Found'].join('\n');
  const files = entries.filter((entry) => entry.type !== 'folder');
  const bytes = files.reduce((total, entry) => total + entrySize(entry), 0);
  lines.push(...entries.map(dirLine));
  lines.push(`${String(files.length).padStart(16)} File(s) ${bytes.toLocaleString('en-GB').padStart(14)} bytes`);
  lines.push(`${String(entries.length - files.length).padStart(16)} Dir(s)`);
  return lines.join('\n');
}

const NOT_FOUND = 'The system cannot find the path specified.';

const HELP = [
  'Available commands:',
  '  help            Show this help message',
  '  whoami          Display current user',
  '  ver             Show the Windows version',
  '  pwd             Print working directory',
  '  dir / ls        List a folder',
  '  cd <path>       Change directory (.. goes up, quote paths with spaces)',
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
].join('\n');

const BUILDS = {
  v1: 'the PHP build (PHP 8, Alpine.js 3, Tailwind 4)',
  v2: 'the React build (React 19, TypeScript, Zustand, Vite, Tailwind 4)',
};

function projectList(projects) {
  const featured = projects.filter((project) => project.featured);
  const others = projects.filter((project) => !project.featured);
  const width = Math.max(0, ...projects.map((project) => project.title.length));
  const line = (project) => `  - ${project.title.padEnd(width)}  ${project.url ?? ''}`.trimEnd();
  return [
    'Featured projects:',
    ...featured.map(line),
    '',
    'More projects:',
    ...others.map(line),
    '',
    'Type "open chrome" to see the featured projects.',
  ].join('\n');
}

/**
 * Runs one command line. `ctx` is { cwd, fileSystem, projects, email, build, now? }.
 * The result may hold `res` (text to print), `cwd`, `open` (an app id), `clear` or `exit`.
 */
export function runTerminalCommand(raw, ctx) {
  const args = splitArgs(raw.trim());
  if (args.length === 0) return {};
  const base = args.shift().toLowerCase();
  const now = ctx.now ?? new Date();

  switch (base) {
    case 'help':
      return { res: HELP };
    case 'whoami':
      return { res: 'johnson-rose\\devante' };
    case 'ver':
      return { res: `Microsoft Windows [Version ${WINDOWS_VERSION}]` };
    case 'pwd':
      return { res: ctx.cwd };
    case 'date':
      return {
        res: 'The current date is: ' + now.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
      };
    case 'time':
      return { res: 'The current time is: ' + now.toLocaleTimeString('en-GB') };
    case 'echo':
      return { res: args.join(' ') };
    case 'dir':
    case 'ls': {
      const path = args.length ? resolvePath(ctx.fileSystem, ctx.cwd, args.join(' ')) : ctx.cwd;
      return { res: path ? listFolder(ctx.fileSystem, path) : NOT_FOUND };
    }
    case 'cd':
    case 'chdir':
    case 'set-location': {
      if (args.length === 0) return {};
      const path = resolvePath(ctx.fileSystem, ctx.cwd, args.join(' '));
      return path ? { cwd: path } : { res: NOT_FOUND };
    }
    case 'systeminfo':
      return {
        res: [
          'Host Name:           DEV-PORTFOLIO',
          'OS Name:             Microsoft Windows 11 Pro',
          `OS Version:          ${WINDOWS_VERSION.split('.').slice(0, 3).join('.')} N/A Build ${WINDOWS_VERSION.split('.')[2]}`,
          'System Type:         x64-based PC',
          'Processor(s):        AMD Ryzen 7 9800X3D (8-Core, 16-Thread)',
        ].join('\n'),
      };
    case 'about':
      return {
        res: [
          'DeVanté Johnson-Rose | Portfolio OS',
          `You are using ${BUILDS[ctx.build] ?? BUILDS.v1}.`,
          'The portfolio is built twice, in PHP and in React, and both look and work the same.',
          'Type "projects" to see the work, or "contact" to get in touch.',
        ].join('\n'),
      };
    case 'ping': {
      const host = args[0] || 'localhost';
      const ip = '127.0.0.1';
      return {
        res: [
          `Pinging ${host} [${ip}] with 32 bytes of data:`,
          ...Array.from({ length: 4 }, () => `Reply from ${ip}: bytes=32 time<1ms TTL=128`),
          '',
          `Ping statistics for ${ip}:`,
          '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)',
        ].join('\n'),
      };
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
      };
    case 'projects':
      return { res: projectList(ctx.projects ?? []) };
    case 'contact':
      return { res: ['Contact DeVanté:', `  Email: ${ctx.email}`, `  GitHub: ${GITHUB_PROFILE}`].join('\n') };
    case 'cls':
    case 'clear':
      return { clear: true };
    case 'exit':
      return { exit: true };
    case 'open': {
      const id = args[0]?.toLowerCase() === 'chrome' ? 'edge' : args[0]?.toLowerCase();
      if (!id) return { res: 'Usage: open <app_name>' };
      return { res: `Attempting to open ${id}...`, open: id };
    }
    default:
      return {
        res: `'${base}' is not recognized as an internal or external command, operable program or batch file.`,
      };
  }
}
