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

/**
 * The file or folder a path names from `cwd`, whatever its case, as
 * { entry, folder } where `folder` holds it, or null when nothing is there.
 */
export function resolveFile(fs, cwd, target) {
  const path = target.replace(/\//g, '\\').replace(/\\+$/, '');
  const slash = path.lastIndexOf('\\');
  const name = path.slice(slash + 1).toLowerCase();
  if (!name || name === '.' || name === '..' || name === '~' || /^[a-z]:$/i.test(name)) return null;
  const folder = slash < 0 ? cwd : resolvePath(fs, cwd, path.slice(0, slash + 1));
  const entry = folder && (fs[folder] ?? []).find((item) => item.name?.toLowerCase() === name);
  return entry ? { entry, folder } : null;
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
  '  cat <file>      Print a text file (type <file> works too)',
  '  cd <path>       Change directory (.. goes up, quote paths with spaces)',
  '  date / time     Show date or time',
  '  echo <text>     Print text',
  '  cls / clear     Clear the terminal',
  '  open <app>      Open an app by id (e.g. open paint)',
  '  ping <host>     Mock ping output',
  '  ipconfig        Mock network configuration',
  '  systeminfo      Mock system summary',
  '  exit            Close the terminal',
  '  Tab             Complete a command or a path (Shift+Tab goes back)',
  '',
  'Portfolio commands:',
  '  about           About this portfolio',
  '  tour            A short tour, one step at a time',
  '  cv              A short CV, with the current roles',
  '  skills          Skills, grouped',
  '  man <page>      A manual page: try "man devante"',
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

/** Every command the Terminal knows, in order, for Tab to complete. */
export const TERMINAL_COMMANDS = [
  'about', 'cat', 'cd', 'chdir', 'clear', 'cls', 'contact', 'cv', 'date', 'dir', 'echo', 'exit',
  'help', 'ipconfig', 'ls', 'man', 'open', 'ping', 'projects', 'pwd', 'set-location', 'skills',
  'systeminfo', 'time', 'tour', 'type', 'ver', 'whoami',
];

// The CV page's names for the skill groups in data/portfolio.json.
const SKILL_GROUPS = {
  frameworks: 'Languages and frameworks',
  tools: 'Data and infrastructure',
  operations: 'Automation and delivery',
  apis: 'AI and APIs',
};

const groupName = (key) => (Object.hasOwn(SKILL_GROUPS, key) ? SKILL_GROUPS[key] : key.charAt(0).toUpperCase() + key.slice(1));

const currentRoles = (portfolio) => (portfolio?.experience ?? []).filter((job) => /present$/i.test(job.period ?? ''));

/** The skills as [group name, skills] pairs, or one unnamed group when the data has none. */
function skillGroups(skills) {
  if (Array.isArray(skills)) return skills.length ? [['', skills]] : [];
  return Object.entries(skills ?? {})
    .filter(([, list]) => Array.isArray(list) && list.length)
    .map(([key, list]) => [groupName(key), list]);
}

/** The headline, location, summary and the roles that are still going, from the shared data. */
function cvText(profile, portfolio) {
  const roles = currentRoles(portfolio);
  const lines = [profile?.name, profile?.headline, profile?.location].filter(Boolean);
  if (portfolio?.summary) lines.push('', portfolio.summary);
  if (roles.length) {
    lines.push('', 'Current roles:', ...roles.map((job) => `  - ${job.role}, ${job.company} (${job.period})`));
  }
  if (lines.length) lines.push('');
  lines.push('The full CV is at /cv. Type "skills" for skills, or "projects" for the work.');
  return lines.join('\n');
}

function skillsText(skills) {
  const groups = skillGroups(skills);
  if (!groups.length) return 'No skills are listed.';
  return ['Skills:', ...groups.map(([name, list]) => `  ${name ? `${name}: ` : ''}${list.join(', ')}`)].join('\n');
}

// Files with no text kept for them that a visitor would still expect to read.
const TEXT_FILE = /\.(txt|md|log|csv|ini|json)$/i;

const quoteArg = (text) => (/[\s']/.test(text) ? `"${text}"` : text);

/** What cat and type print: the file, or why it cannot. */
function catText(fs, cwd, command, target) {
  if (!target) return `Usage: ${command} <file>`;
  const found = resolveFile(fs, cwd, target);
  const isFolder = found ? found.entry.type === 'folder' : resolvePath(fs, cwd, target) !== null;
  if (isFolder) return `${found?.entry.name ?? target} is a folder. Type "dir ${quoteArg(target)}" to list it.`;
  if (!found) return `The system cannot find the file specified: ${target}`;
  const { entry } = found;
  if (entry.type === 'file' && (typeof entry.content === 'string' || TEXT_FILE.test(entry.name))) {
    return entry.content ?? '';
  }
  const run = entry.type === 'app' && entry.app ? ` Type "open ${entry.app}" to run it.` : '';
  return `${entry.name} is not a text file.${run}`;
}

/** The tour, one step at a time. It only ever suggests: the visitor types each command. */
export const TOUR_STEPS = [
  {
    title: 'Who this is',
    lines: [
      "This is DeVanté Johnson-Rose's portfolio, built to look and work like Windows 11.",
      'Type "cv" for a short CV, or "skills" for what he works with.',
      '"man devante" has the lot, as a manual page.',
    ],
  },
  {
    title: 'Look around the files',
    lines: [
      '"dir" lists this folder, and "cd Documents" goes into one ("cd .." comes back).',
      '"cat Desktop\\achievements.txt" prints a file. "type" does the same, as in Windows.',
      'Press Tab to finish a command or a name, and Tab again for the next match.',
    ],
  },
  {
    title: 'Open the apps',
    lines: [
      '"open vscode" shows the source code of this site, read-only.',
      '"open explorer" browses the same files, and "projects" lists the work.',
      'The tour never opens anything for you: type a command when you want to.',
    ],
  },
  {
    title: 'Take it with you',
    lines: [
      'The full CV is at /cv, as a plain page.',
      '"contact" shows how to get in touch, and "help" lists every command.',
    ],
  },
];

function tourText(arg) {
  const step = arg === undefined ? 1 : Number(arg);
  if (!Number.isInteger(step) || step < 1 || step > TOUR_STEPS.length) {
    return `There are ${TOUR_STEPS.length} steps. Type "tour" to start again.`;
  }
  const { title, lines } = TOUR_STEPS[step - 1];
  const next = step < TOUR_STEPS.length ? `Next: type "tour ${step + 1}".` : 'That is the end of the tour.';
  return [`Step ${step} of ${TOUR_STEPS.length}: ${title}`, '', ...lines.map((line) => `  ${line}`), '', next].join('\n');
}

/** A Unix manual page: a title line, then each section that has something in it, indented. */
function manPage(title, sections) {
  const head = `${title.toUpperCase()}(1)`;
  const lines = [`${head}          Portfolio Manual          ${head}`];
  for (const [heading, body] of sections) {
    if (body.length) lines.push('', heading, ...body.map((line) => (line ? `    ${line}` : '')));
  }
  return lines.join('\n');
}

// Pages for the commands that need more than their line in help.
const MAN_PAGES = {
  cat: {
    name: 'cat, type - print a text file',
    synopsis: ['cat <file>', 'type <file>'],
    description: [
      'Prints a text file from the files on this PC. A path starts in the current folder, or at C:\\ or ~.',
      'Quote a path with spaces, or press Tab to complete it. A folder or a program is named, not printed.',
    ],
    seeAlso: 'dir(1), cd(1)',
  },
  cv: {
    name: 'cv - a short CV',
    synopsis: ['cv'],
    description: [
      'Prints the headline, location and summary, and the roles that are still going.',
      'The full CV is at /cv.',
    ],
    seeAlso: 'skills(1), devante(1)',
  },
  skills: {
    name: 'skills - the skills on the CV, grouped',
    synopsis: ['skills'],
    description: ['Prints the skills from the CV, in the groups the CV at /cv uses.'],
    seeAlso: 'cv(1), devante(1)',
  },
  tour: {
    name: 'tour - a short tour of this Terminal',
    synopsis: ['tour', 'tour <step>'],
    description: ['Shows one step at a time. Each step suggests commands to try, and opens nothing for you.'],
    seeAlso: 'help(1)',
  },
  man: {
    name: 'man - the manual pages',
    synopsis: ['man <page>'],
    description: ['Shows a manual page. "man devante" is the page about DeVanté, and every command in help has one.'],
    seeAlso: 'help(1)',
  },
};
const MAN_ALIASES = { type: 'cat', chdir: 'cd', 'set-location': 'cd' };

/** The help table as { names, forms, about } rows, so that man can describe any command in it. */
const helpRows = () =>
  HELP.split('\n')
    .filter((line) => /^ {2}[a-z]/.test(line))
    .map((line) => {
      const [usage, about] = line.trim().split(/\s{2,}/);
      const forms = usage.split(' / ');
      return { names: forms.map((form) => form.split(' ')[0]), forms, about };
    });

/** man devante: the person, as a manual page, from data/profile.json and data/portfolio.json only. */
function devantePage(profile, portfolio) {
  const name = [profile?.name, profile?.headline].filter(Boolean).join(', ');
  const where = [
    profile?.location ? `Based in ${profile.location}.` : '',
    profile?.alumniOf ? `Studied at ${profile.alumniOf}.` : '',
  ].filter(Boolean).join(' ');
  const description = [portfolio?.summary, portfolio?.philosophy, where].filter(Boolean).flatMap((text, i) => (i ? ['', text] : [text]));
  const jobs = portfolio?.experience ?? [];
  const width = Math.max(0, ...jobs.map((job) => (job.period ?? '').length));
  const experience = jobs.map(
    (job) => `${(job.period ?? '').padEnd(width)}   ${job.role}, ${job.company}${job.location ? `, ${job.location}` : ''}`,
  );
  const skills = skillGroups(portfolio?.skills).flatMap(([group, list]) => (group ? [group, `    ${list.join(', ')}`] : [list.join(', ')]));
  return manPage('devante', [
    ['NAME', [name ? `devante - ${name}` : 'devante']],
    ['SYNOPSIS', currentRoles(portfolio).map((job) => `devante --role "${job.role}" --at "${job.company}"`)],
    ['DESCRIPTION', description],
    ['EXPERIENCE', experience],
    ['SKILLS', skills],
    ['SEE ALSO', ['cv(1), skills(1), and the full CV at /cv']],
  ]);
}

function manText(topic, ctx) {
  if (!topic) return 'What manual page do you want?\nTry "man devante", or "man" and any command in help, such as "man cat".';
  const key = topic.toLowerCase();
  if (key === 'devante') return devantePage(ctx.profile, ctx.portfolio);
  const command = MAN_ALIASES[key] ?? key;
  const page = Object.hasOwn(MAN_PAGES, command) ? MAN_PAGES[command] : null;
  if (page) {
    return manPage(command, [
      ['NAME', [page.name]],
      ['SYNOPSIS', page.synopsis],
      ['DESCRIPTION', page.description],
      ['SEE ALSO', [page.seeAlso]],
    ]);
  }
  const row = helpRows().find((entry) => entry.names.includes(command));
  if (!row) return `No manual entry for ${topic}`;
  return manPage(command, [
    ['NAME', [`${row.names.join(', ')} - ${row.about}`]],
    ['SYNOPSIS', row.forms],
  ]);
}

/** What man can show, for Tab to complete. */
const MAN_TOPICS = ['devante', ...TERMINAL_COMMANDS].sort();

/** The word at the end of a line: where it starts, which word it is, and its text without quotes. */
function lastWord(line) {
  let start = line.length;
  let index = -1;
  let word = '';
  let quote = null;
  let inWord = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote) {
      if (char === quote) quote = null;
      else word += char;
    } else if (/\s/.test(char)) {
      inWord = false;
    } else {
      if (!inWord) {
        inWord = true;
        start = i;
        word = '';
        index++;
      }
      if (char === '"' || char === "'") quote = char;
      else word += char;
    }
  }
  return inWord ? { start, index, word } : { start: line.length, index: index + 1, word: '' };
}

// Commands that only take a folder, so Tab offers them nothing else.
const FOLDER_COMMANDS = new Set(['cd', 'chdir', 'set-location', 'dir', 'ls']);

/** What the last word of a line could become: a command, an app id after open, or a path. */
function completions(line, ctx) {
  const { start, index, word } = lastWord(line);
  const head = line.slice(0, start);
  const lower = word.toLowerCase();
  if (index === 0) return { head, matches: TERMINAL_COMMANDS.filter((name) => name.startsWith(lower)) };

  const command = splitArgs(line)[0].toLowerCase();
  if (command === 'open') return { head, matches: [...(ctx.apps ?? [])].sort().filter((id) => id.startsWith(lower)) };
  if (command === 'man') return { head, matches: MAN_TOPICS.filter((topic) => topic.startsWith(lower)) };

  const typed = word.replace(/\//g, '\\');
  const slash = typed.lastIndexOf('\\');
  const folderPart = typed.slice(0, slash + 1);
  const prefix = typed.slice(slash + 1).toLowerCase();
  const folder = folderPart ? resolvePath(ctx.fileSystem, ctx.cwd, folderPart) : ctx.cwd;
  if (!folder) return { head, matches: [] };
  const foldersOnly = FOLDER_COMMANDS.has(command);
  const matches = (ctx.fileSystem[folder] ?? [])
    .filter((entry) => entry.name?.toLowerCase().startsWith(prefix) && (!foldersOnly || entry.type === 'folder'))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
    .map((entry) => quoteArg(folderPart + entry.name + (entry.type === 'folder' ? '\\' : '')));
  return { head, matches };
}

/**
 * Tab completion, case-insensitive like Windows. Pass back the session from the
 * last call to cycle: each Tab moves to the next match, and Shift+Tab (`back`)
 * to the one before. Any change to the line starts again.
 */
export function completeTerminalLine(line, ctx, session = null, back = false) {
  if (session && session.line === line && session.matches.length) {
    const count = session.matches.length;
    const index = (session.index + (back ? count - 1 : 1)) % count;
    const next = session.head + session.matches[index];
    return { line: next, session: { ...session, index, line: next } };
  }
  const { head, matches } = completions(line, ctx);
  if (!matches.length) return { line, session: null };
  const index = back ? matches.length - 1 : 0;
  const next = head + matches[index];
  return { line: next, session: { head, matches, index, line: next } };
}

/**
 * Runs one command line. `ctx` is { cwd, fileSystem, projects, email, build, now? },
 * with `profile` and `portfolio` (data/profile.json and data/portfolio.json) for cv and skills.
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
    case 'cat':
    case 'type':
      return { res: catText(ctx.fileSystem, ctx.cwd, base, args.join(' ')) };
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
    case 'tour':
      return { res: tourText(args[0]) };
    case 'cv':
      return { res: cvText(ctx.profile, ctx.portfolio) };
    case 'skills':
      return { res: skillsText(ctx.portfolio?.skills) };
    case 'man':
      return { res: manText(args[0], ctx) };
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
