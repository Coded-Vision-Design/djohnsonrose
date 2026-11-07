// What Notepad can do to its text, shared by both builds. As with file-ops.js,
// the rules live here and each build only says how to read and change its editor.

const UNDO_LIMIT = 100;
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

export const NOTEPAD_OPTIONS_KEY = 'notepad.options';
export const NOTEPAD_DEFAULTS = { wordWrap: true, monospace: true, statusBar: true, zoom: 100 };

export const NOTEPAD_MENUS = [
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
      { separator: true },
      { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X' },
      { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C' },
      { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
      { id: 'delete', label: 'Delete', shortcut: 'Del' },
      { separator: true },
      { id: 'find', label: 'Find...', shortcut: 'Ctrl+F' },
      { id: 'findNext', label: 'Find Next', shortcut: 'F3' },
      { id: 'replace', label: 'Replace...', shortcut: 'Ctrl+H' },
      { separator: true },
      { id: 'selectAll', label: 'Select All', shortcut: 'Ctrl+A' },
      { id: 'timeDate', label: 'Time/Date', shortcut: 'F5' },
    ],
  },
  {
    id: 'format',
    label: 'Format',
    items: [
      { id: 'wordWrap', label: 'Word Wrap', option: 'wordWrap' },
      { id: 'monospace', label: 'Fixed-width Font', option: 'monospace' },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { id: 'zoomIn', label: 'Zoom In', shortcut: 'Ctrl+Plus' },
      { id: 'zoomOut', label: 'Zoom Out', shortcut: 'Ctrl+Minus' },
      { id: 'zoomReset', label: 'Restore Default Zoom', shortcut: 'Ctrl+0' },
      { separator: true },
      { id: 'statusBar', label: 'Status Bar', option: 'statusBar' },
    ],
  },
];

export function replaceRange({ text, start, end }, value) {
  const caret = start + value.length;
  return { text: text.slice(0, start) + value + text.slice(end), start: caret, end: caret };
}

export const selectedText = ({ text, start, end }) => text.slice(start, end);

const same = (a, b, matchCase) => (matchCase ? a === b : a.toLowerCase() === b.toLowerCase());
const folded = (value, matchCase) => (matchCase ? value : value.toLowerCase());

/** The next match after `from`, wrapping round to the start as Notepad does. */
export function findNext(text, query, from, { matchCase = false } = {}) {
  if (!query) return null;
  const haystack = folded(text, matchCase);
  const needle = folded(query, matchCase);
  const after = haystack.indexOf(needle, from);
  const start = after === -1 ? haystack.indexOf(needle) : after;
  return start === -1 ? null : { start, end: start + query.length };
}

export function replaceNext(state, query, replacement, options = {}) {
  const isMatch = query && same(selectedText(state), query, options.matchCase);
  const next = isMatch ? replaceRange(state, replacement) : state;
  const found = findNext(next.text, query, next.end, options);
  return found ? { text: next.text, ...found } : next;
}

export function replaceAll(text, query, replacement, { matchCase = false } = {}) {
  if (!query) return { text, count: 0 };
  const haystack = folded(text, matchCase);
  const needle = folded(query, matchCase);
  let out = '';
  let position = 0;
  let count = 0;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, position)) {
    out += text.slice(position, at) + replacement;
    position = at + query.length;
    count++;
  }
  return { text: out + text.slice(position), count };
}

const LINK = /\bhttps?:\/\/[-a-z0-9+&@#/%?=~_|!:,.;]*[-a-z0-9+&@#/%=~_|]/gi;

/**
 * Splits text for display: web addresses become links, and `mark` is the match
 * Find is showing. Nothing here goes through HTML, so text cannot become markup.
 */
export function textParts(text, mark = null) {
  const links = [...text.matchAll(LINK)].map((match) => ({ start: match.index, end: match.index + match[0].length }));
  const cuts = new Set([0, text.length]);
  for (const { start, end } of mark ? [...links, mark] : links) {
    cuts.add(start);
    cuts.add(end);
  }
  const points = [...cuts].sort((a, b) => a - b);
  return points.slice(0, -1).map((start, index) => {
    const end = points[index + 1];
    const link = links.find((item) => item.start <= start && end <= item.end);
    return {
      text: text.slice(start, end),
      link: link ? text.slice(link.start, link.end) : null,
      marked: Boolean(mark && mark.start <= start && end <= mark.end),
    };
  });
}

export function lineColumn(text, caret) {
  const lines = text.slice(0, caret).split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

const pad = (value) => String(value).padStart(2, '0');

/** Time and date as Windows Notepad writes them, for a British reader. */
export const stamp = (date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

export const stepZoom = (zoom, direction) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + direction * ZOOM_STEP));

export function pushUndo(stack, text) {
  if (stack[stack.length - 1] === text) return stack;
  return [...stack, text].slice(-UNDO_LIMIT);
}

/** Which command a key press means, or null when it is just typing. */
export function notepadShortcut({ key, ctrlKey, metaKey }) {
  if (key === 'F3') return 'findNext';
  if (key === 'F5') return 'timeDate';
  if (!ctrlKey && !metaKey) return null;
  return (
    {
      z: 'undo',
      f: 'find',
      h: 'replace',
      a: 'selectAll',
      '=': 'zoomIn',
      '+': 'zoomIn',
      '-': 'zoomOut',
      0: 'zoomReset',
    }[key.toLowerCase()] ?? null
  );
}

/**
 * What each Notepad menu item does. `ed` is each build's adapter: it reads and
 * writes the text and its selection, and keeps the options.
 */
export function notepadCommands(ed) {
  const edit = (value) => ed.write(replaceRange(ed.read(), value));
  const toggle = (option) => () => ed.setOption(option, !ed.option(option));
  const zoom = (direction) => () => ed.setOption('zoom', stepZoom(ed.option('zoom'), direction));

  return {
    undo: () => {
      const text = ed.popUndo();
      if (text !== null) ed.write({ text, start: text.length, end: text.length }, false);
    },
    cut: async () => {
      await ed.copy(selectedText(ed.read()));
      edit('');
    },
    copy: () => ed.copy(selectedText(ed.read())),
    paste: async () => {
      const text = await ed.paste();
      if (text === null) ed.toast('Press Ctrl+V to paste');
      else edit(text);
    },
    delete: () => edit(''),
    find: () => ed.openFind('find'),
    findNext: () => ed.findNext(),
    replace: () => ed.openFind('replace'),
    selectAll: () => {
      const { text } = ed.read();
      ed.write({ text, start: 0, end: text.length });
    },
    timeDate: () => edit(stamp(ed.now())),
    wordWrap: toggle('wordWrap'),
    monospace: toggle('monospace'),
    statusBar: toggle('statusBar'),
    zoomIn: zoom(1),
    zoomOut: zoom(-1),
    zoomReset: () => ed.setOption('zoom', NOTEPAD_DEFAULTS.zoom),
  };
}

/** Options saved from an earlier visit, on top of the defaults. */
export function readNotepadOptions(text) {
  try {
    return { ...NOTEPAD_DEFAULTS, ...JSON.parse(text) };
  } catch {
    return { ...NOTEPAD_DEFAULTS };
  }
}
