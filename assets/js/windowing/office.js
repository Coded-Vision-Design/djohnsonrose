// Word, Excel, PowerPoint and PuTTY, shared by both builds. Everything here is
// framework-neutral: the data each app shows, the rules for counting, fitting,
// printing and moving between slides, and PuTTY's sessions and replies. Each
// build only draws the screen (with the classes in assets/css/office.css) and
// calls these, so the two cannot differ in what the apps show or do.

// ---- Loading -----------------------------------------------------------------

/** Fetches a shared file, refusing an error page rather than showing it. */
export async function loadChecked(url, kind = 'json', fetcher = globalThis.fetch) {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return kind === 'text' ? response.text() : response.json();
}

const projectsOf = (data) => (Array.isArray(data?.projects) ? data.projects : []);
const text = (value) => (value === undefined || value === null ? '' : String(value));

// ---- Word ----------------------------------------------------------------------

/** The page is A4's width at 96 dpi, near enough to Letter's 816px that Word draws. */
export const WORD_PAGE_WIDTH = 816;
export const WORD_TABS = ['File', 'Home', 'Insert', 'Draw', 'Design', 'Layout', 'References'];
export const WORD_FONTS = ['Calibri', 'Arial', 'Times New Roman', 'Segoe UI'];
/** execCommand's seven HTML sizes, labelled with the point sizes Word shows. */
export const WORD_SIZES = [
  { value: '1', label: '8' },
  { value: '2', label: '10' },
  { value: '3', label: '12' },
  { value: '4', label: '14' },
  { value: '5', label: '18' },
  { value: '6', label: '24' },
  { value: '7', label: '36' },
];

/** Ribbon and title bar icons, as 24px SVG paths. Outline icons are stroked. */
export const OFFICE_ICONS = {
  save: { d: 'M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 16a3 3 0 110-6 3 3 0 010 6zm3-10H5V5h10v4z' },
  undo: { d: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z' },
  paste: { stroke: true, d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  cut: { stroke: true, d: 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121' },
  copy: { stroke: true, d: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2' },
  bullets: { d: 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z' },
  numbering: { d: 'M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm1 3H2v1h2v.5H3v1h1v.5H2v1h3v-4H2v1zM7 5v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z' },
  alignLeft: { d: 'M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z' },
  alignCenter: { d: 'M7 15v2h10v-2H7zm-4-4v2h18v-2H3zm4-4v2h10V7H7zm-4-4v2h18V3H3zm4 16v2h10v-2H7z' },
  alignRight: { d: 'M21 15h-12v2h12v-2zm0-8h-12v2h12V7zM3 11h18v2H3v-2zm0 8h18v2H3v-2zM3 3h18v2H3V3z' },
  find: { stroke: true, d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  replace: { stroke: true, d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  print: { stroke: true, d: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z' },
  previous: { d: 'M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z' },
  next: { d: 'M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z' },
};

// Elements that start a new line, so the words either side of them stay apart.
const BLOCKS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BR', 'DD', 'DIV', 'DL', 'DT', 'FIGCAPTION', 'FIGURE',
  'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE',
  'SECTION', 'TABLE', 'TD', 'TH', 'TR', 'UL',
]);

/**
 * The words in an editor, read from its text rather than its markup. A line
 * break or a new paragraph keeps the words either side of it apart, and part of
 * a word in bold still counts as the one word.
 */
export function documentText(root) {
  if (!root) return '';
  let out = '';
  const walk = (node) => {
    if (node.nodeType === 3) {
      out += node.data;
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 11) return;
    const block = BLOCKS.has(node.nodeName);
    if (block) out += ' ';
    for (const child of node.childNodes) walk(child);
    if (block) out += ' ';
  };
  walk(root);
  return out;
}

/** Words as Word counts them: runs of text with a letter or number in them. */
export function countWords(value) {
  return text(value)
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/**
 * How far to shrink something so it fits the space there is, never past full
 * size. Word fits its page to the width, PowerPoint its slide to both edges.
 */
export function fitScale(box, content, { min = 0.1, max = 1 } = {}) {
  const ratios = [];
  if (content.width > 0) ratios.push(box.width / content.width);
  if (content.height > 0 && box.height !== undefined) ratios.push(box.height / content.height);
  if (!ratios.length) return max;
  const scale = Math.min(...ratios);
  if (!Number.isFinite(scale) || scale <= 0) return min;
  return Math.min(max, Math.max(min, scale));
}

const MIN_PAGE_ZOOM = 0.25;
const MAX_PAGE_ZOOM = 2;

/** The status bar's zoom buttons: ten per cent a press, landing on round steps. */
export function stepPageZoom(zoom, direction) {
  const from = Number.isFinite(zoom) ? zoom : 1;
  const tenths = Math.round(from * 100) / 10;
  const next = (direction > 0 ? Math.floor(tenths + 1e-9) + 1 : Math.ceil(tenths - 1e-9) - 1) / 10;
  return Math.min(MAX_PAGE_ZOOM, Math.max(MIN_PAGE_ZOOM, next));
}

/** Bold, italic, underline and alignment at the caret, for the ribbon to show. */
export function formatState(doc = document) {
  const on = (name) => {
    try {
      return Boolean(doc.queryCommandState(name));
    } catch {
      return false;
    }
  };
  const align = on('justifyCenter') ? 'center' : on('justifyRight') ? 'right' : on('justifyFull') ? 'justify' : 'left';
  return { bold: on('bold'), italic: on('italic'), underline: on('underline'), align };
}

const STYLE_BLOCKS = { normal: 'p', title: 'h1', heading: 'h2' };

/**
 * Runs a ribbon command on the editor's selection. execCommand is deprecated
 * but still works everywhere, and cannot read the clipboard, so Paste asks the
 * clipboard itself. Resolves false when the browser refuses.
 */
export async function runWordCommand(command, value, doc = document, clipboard = globalThis.navigator?.clipboard) {
  try {
    if (command === 'paste') {
      const pasted = await clipboard.readText();
      return doc.execCommand('insertText', false, pasted) !== false;
    }
    if (command === 'style') return doc.execCommand('formatBlock', false, STYLE_BLOCKS[value] ?? 'p') !== false;
    return doc.execCommand(command, false, value) !== false;
  } catch {
    return false;
  }
}

const escapeHtml = (value) =>
  text(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Prints one document: the editor the Print button belongs to, never whatever
 * else on the page happens to be editable. The site's own styles go with it so
 * the page prints as it looks. Returns false when a pop-up blocker stops it.
 */
export function printDocument({ title, html, styles = '' }, opener = window) {
  const popup = opener.open('', '_blank', 'width=900,height=1000');
  if (!popup) return false;
  popup.document.open();
  popup.document.write(
    `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${styles}` +
      '<style>html, body { height: auto; overflow: visible; background: #fff; }</style></head>' +
      `<body>${html}</body></html>`,
  );
  popup.document.close();
  popup.focus?.();
  // Give the copied stylesheets a moment to apply before the print dialog opens.
  popup.setTimeout(() => popup.print(), 500);
  return true;
}

/** The page's stylesheets, as markup a print window can take. */
export const pageStyles = (doc = document) =>
  [...doc.querySelectorAll('link[rel="stylesheet"], style')].map((node) => node.outerHTML).join('');

// ---- Excel ---------------------------------------------------------------------

export const SHEET_HEADERS = ['ID', 'Title', 'Location', 'Country', 'Stack', 'URL'];
export const EXCEL_TABS = ['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View'];

/** Excel's column letters: A to Z, then AA, AB and on. */
export function columnName(index) {
  if (!Number.isInteger(index) || index < 0) return '';
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

const projectRow = (project) => [
  text(project.id),
  text(project.title),
  text(project.location),
  text(project.country_code).toUpperCase(),
  Array.isArray(project.tags) ? project.tags.join(', ') : '',
  text(project.url),
];

/**
 * The portfolio as a sheet: headings in row 1, a project in each row after,
 * then empty rows to fill the window as a real sheet does.
 */
export function portfolioSheet(data, { columns = 10, minRows = 20 } = {}) {
  const projects = projectsOf(data);
  const letters = Array.from({ length: columns }, (_, i) => columnName(i));
  const values = [SHEET_HEADERS, ...projects.map(projectRow)];
  const total = Math.max(minRows, values.length + 1);
  const rows = Array.from({ length: total }, (_, r) => ({
    number: r + 1,
    cells: letters.map((letter, c) => ({
      ref: `${letter}${r + 1}`,
      value: values[r]?.[c] ?? '',
      header: r === 0,
    })),
  }));
  return { columns: letters, rows, count: projects.length };
}

/** A cell's value by its reference, such as B2. Empty off the sheet. */
export function cellValue(sheet, ref) {
  const match = /^([A-Z]+)(\d+)$/.exec(text(ref).toUpperCase());
  if (!match) return '';
  const column = sheet.columns.indexOf(match[1]);
  const row = sheet.rows[Number(match[2]) - 1];
  return (column >= 0 && row?.cells[column]?.value) || '';
}

// ---- PowerPoint ----------------------------------------------------------------

/** Slides are drawn at this size and shrunk to fit, as PowerPoint does. */
export const SLIDE_SIZE = { width: 960, height: 540 };
export const POWERPOINT_TABS = ['File', 'Home', 'Insert', 'Design', 'Transitions', 'Animations', 'Slide Show'];

/** A slide for each project, its picture found under the build's base path. */
export function portfolioDeck(data, base = '/') {
  return projectsOf(data)
    .filter((project) => text(project.title).trim())
    .map((project) => ({
      id: project.id,
      title: text(project.title),
      description: text(project.description),
      tags: Array.isArray(project.tags) ? project.tags.map(text) : [],
      image: project.thumbnail ? `${base}${project.thumbnail}` : '',
    }));
}

const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const SLIDE_STEPS = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 };

/**
 * The slide a key moves to, or null for a key PowerPoint leaves alone. Each
 * build only asks while PowerPoint's own window has focus.
 */
export function slideForKey(event, active, count) {
  if (!count || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.target?.closest?.(EDITABLE)) return null;
  if (event.key === 'Home') return 0;
  if (event.key === 'End') return count - 1;
  const step = SLIDE_STEPS[event.key];
  if (!step) return null;
  return Math.min(count - 1, Math.max(0, active + step));
}

// ---- PuTTY ---------------------------------------------------------------------

export const PUTTY_SESSIONS = [
  { name: 'Default Settings', host: '' },
  { name: 'devante-homelab', host: '192.168.1.42' },
  { name: 'cloud-prod-eu', host: 'prod-eu.example.com' },
  { name: 'staging-uk', host: 'staging.example.co.uk' },
];

/** PuTTY's own category tree. It is British software, so these spellings are its own. */
export const PUTTY_CATEGORIES = [
  { name: 'Session', children: ['Logging'] },
  { name: 'Terminal', children: ['Keyboard', 'Bell', 'Features'] },
  { name: 'Window', children: ['Appearance', 'Behaviour', 'Translation', 'Selection', 'Colours'] },
  { name: 'Connection', children: ['Data', 'Proxy', 'SSH', 'Serial'] },
];

export const PUTTY_CONNECTION_TYPES = ['SSH', 'Telnet', 'Rlogin', 'Serial'];
export const PUTTY_USER = 'devante';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n) => String(n).padStart(2, '0');

/** A date as Linux writes it in "Last login": Fri Nov  6 09:05:01 2026. */
const unixDate = (date) =>
  `${DAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${String(date.getDate()).padStart(2, ' ')} ` +
  `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())} ${date.getFullYear()}`;

const shortHost = (host) => (/^[\d.]+$/.test(host) ? host : host.split('.')[0]);

/** What the server prints when a session opens. */
export function puttyBanner({ host, date = new Date() }) {
  return [
    `login as: ${PUTTY_USER}`,
    `${PUTTY_USER}@${host}'s password:`,
    'Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-49-generic x86_64)',
    '',
    ' * Documentation:  https://help.ubuntu.com',
    ' * Management:     https://landscape.canonical.com',
    '',
    '  System load:  0.42               Processes:             148',
    '  Usage of /:   38.2% of 461.04GB  Users logged in:       1',
    '  Memory usage: 24%                Swap usage:            0%',
    '',
    `Last login: ${unixDate(date)} from 192.168.1.10`,
  ];
}

/** The prompt a session shows before each command. */
export const puttyPrompt = (host) => `${PUTTY_USER}@${shortHost(host)}:~$`;

/** The server's answer to a typed command. */
export function puttyReply(input, { host, date = new Date() }) {
  const line = text(input).trim();
  const reply = (lines, extra = {}) => ({ lines, clear: false, exit: false, ...extra });
  if (!line) return reply([]);
  const [command] = line.split(/\s+/);
  switch (command) {
    case 'exit':
    case 'logout':
      return reply(['logout'], { exit: true });
    case 'clear':
      return reply([], { clear: true });
    case 'whoami':
      return reply([PUTTY_USER]);
    case 'hostname':
      return reply([shortHost(host)]);
    case 'pwd':
      return reply([`/home/${PUTTY_USER}`]);
    case 'ls':
      return reply(['backups  deploy.sh  logs  www']);
    case 'date':
      return reply([unixDate(date)]);
    case 'uname':
      return reply([line.includes('-a') ? `Linux ${shortHost(host)} 6.8.0-49-generic #49-Ubuntu SMP x86_64 GNU/Linux` : 'Linux']);
    case 'uptime':
      return reply([` ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())} up 41 days,  3:12,  1 user,  load average: 0.42, 0.37, 0.31`]);
    case 'help':
      return reply(['Try: whoami, hostname, pwd, ls, date, uname -a, uptime, clear, exit']);
    default:
      return reply([`-bash: ${command}: command not found`]);
  }
}
