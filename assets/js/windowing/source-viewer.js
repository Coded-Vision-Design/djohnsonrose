// VS Code's read-only view of the site's own source, shared by both builds. It
// lists and fetches only files every visitor's browser can already download:
// the shared modules and their types, the stylesheets and the public data.
// Never add server code (.php, lib/, api/, config) here. The test beside it,
// v2/src/windowing/sourceViewer.test.ts, checks this list against the folders,
// the .htaccess rules and the deploy, so a new or removed file cannot slip by.

export const SOURCE_FILES = [
  'assets/css/drawing.css',
  'assets/css/flstudio.css',
  'assets/css/fonts.css',
  'assets/css/office.css',
  'assets/css/windowing.css',
  'assets/js/windowing/address.d.ts',
  'assets/js/windowing/address.js',
  'assets/js/windowing/browser.d.ts',
  'assets/js/windowing/browser.js',
  'assets/js/windowing/calculator.d.ts',
  'assets/js/windowing/calculator.js',
  'assets/js/windowing/calendar.d.ts',
  'assets/js/windowing/calendar.js',
  'assets/js/windowing/devtools.d.ts',
  'assets/js/windowing/devtools.js',
  'assets/js/windowing/drawing.d.ts',
  'assets/js/windowing/drawing.js',
  'assets/js/windowing/file-ops.d.ts',
  'assets/js/windowing/file-ops.js',
  'assets/js/windowing/fl-studio.d.ts',
  'assets/js/windowing/fl-studio.js',
  'assets/js/windowing/media.d.ts',
  'assets/js/windowing/media.js',
  'assets/js/windowing/office.d.ts',
  'assets/js/windowing/office.js',
  'assets/js/windowing/references.d.ts',
  'assets/js/windowing/references.js',
  'assets/js/windowing/shell-core.d.ts',
  'assets/js/windowing/shell-core.js',
  'assets/js/windowing/shell-ui.d.ts',
  'assets/js/windowing/shell-ui.js',
  'assets/js/windowing/source-viewer.d.ts',
  'assets/js/windowing/source-viewer.js',
  'assets/js/windowing/sql.d.ts',
  'assets/js/windowing/sql.js',
  'assets/js/windowing/switcher.d.ts',
  'assets/js/windowing/switcher.js',
  'assets/js/windowing/terminal.d.ts',
  'assets/js/windowing/terminal.js',
  'assets/js/windowing/text-ops.d.ts',
  'assets/js/windowing/text-ops.js',
  'assets/js/windowing/tour.d.ts',
  'assets/js/windowing/tour.js',
  'assets/js/windowing/weather.d.ts',
  'assets/js/windowing/weather.js',
  'assets/js/windowing/widgets.d.ts',
  'assets/js/windowing/widgets.js',
  'assets/js/windowing/windowing.d.ts',
  'assets/js/windowing/windowing.js',
  'data/client_wins.json',
  'data/portfolio.json',
];

/** The file VS Code opens with: the window manager both builds share. */
export const SOURCE_START = 'assets/js/windowing/windowing.js';

/** Where a listed file is served under the site's base path, or null for anything else. */
export function sourceUrl(base, path) {
  return SOURCE_FILES.includes(path) ? `${base}${path}` : null;
}

export const SOURCE_LANGUAGES = {
  javascript: { name: 'JavaScript', badge: 'JS' },
  typescript: { name: 'TypeScript', badge: 'TS' },
  css: { name: 'CSS', badge: '#' },
  json: { name: 'JSON', badge: '{}' },
  text: { name: 'Plain Text', badge: 'TXT' },
};

export function sourceLanguage(path) {
  if (/\.ts$/.test(path)) return 'typescript';
  if (/\.m?js$/.test(path)) return 'javascript';
  if (/\.css$/.test(path)) return 'css';
  if (/\.json$/.test(path)) return 'json';
  return 'text';
}

const byName = (a, b) => {
  if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
  const [x, y] = [a.name.toLowerCase(), b.name.toLowerCase()];
  return x < y ? -1 : x > y ? 1 : 0;
};

const sortNodes = (nodes) =>
  nodes.sort(byName).map((node) => (node.children ? { ...node, children: sortNodes(node.children) } : node));

/** The files as a tree of folders, folders first, each level in name order as VS Code shows it. */
export function sourceTree(files = SOURCE_FILES) {
  const root = [];
  for (const file of files) {
    const parts = file.split('/');
    let level = root;
    parts.forEach((name, i) => {
      const path = parts.slice(0, i + 1).join('/');
      if (i === parts.length - 1) {
        level.push({ name, path, kind: 'file' });
        return;
      }
      let folder = level.find((node) => node.kind === 'folder' && node.name === name);
      if (!folder) {
        folder = { name, path, kind: 'folder', children: [] };
        level.push(folder);
      }
      level = folder.children;
    });
  }
  return sortNodes(root);
}

/** The explorer's rows: every node whose folders are all open, with how deep it sits. */
export function sourceRows(files = SOURCE_FILES, expanded = []) {
  const open = new Set(expanded);
  const rows = [];
  const walk = (nodes, depth) => {
    for (const node of nodes) {
      const isOpen = node.kind === 'folder' && open.has(node.path);
      rows.push({ path: node.path, name: node.name, kind: node.kind, depth, open: isOpen });
      if (isOpen) walk(node.children, depth + 1);
    }
  };
  walk(sourceTree(files), 0);
  return rows;
}

/** The folders that hold a file, outermost first, to open in the explorer. */
export function sourceFolders(path) {
  const parts = path.split('/').slice(0, -1);
  return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
}

/** The files by folder, in the explorer's order, for the picker phones show instead. */
export function sourceGroups(files = SOURCE_FILES) {
  const groups = [];
  const walk = (nodes, folder) => {
    for (const node of nodes) if (node.kind === 'folder') walk(node.children, node.path);
    const here = nodes.filter((node) => node.kind === 'file').map(({ path, name }) => ({ path, name }));
    if (here.length) groups.push({ folder, files: here });
  };
  walk(sourceTree(files), '');
  return groups;
}

/** Opens a file in a tab, or brings its tab forward. State is { tabs, active }. */
export function openSourceTab(state, path) {
  return { tabs: state.tabs.includes(path) ? state.tabs : [...state.tabs, path], active: path };
}

/** Closes a tab. Closing the open one moves to its right-hand neighbour, as VS Code does. */
export function closeSourceTab(state, path) {
  const at = state.tabs.indexOf(path);
  if (at < 0) return state;
  const tabs = state.tabs.filter((tab) => tab !== path);
  const active = state.active === path ? (tabs[at] ?? tabs[at - 1] ?? null) : state.active;
  return { tabs, active };
}

// ---- Syntax colouring -------------------------------------------------------
// Light, line by line colouring for the four kinds of file the viewer shows. It
// is not a parser: a token it cannot place is left plain, never dropped.

/** Splits text into [kind, text] pieces with sticky regular expressions, tried in order. */
function lex(text, rules, skip = () => false) {
  const pieces = [];
  let at = 0;
  while (at < text.length) {
    let piece = null;
    for (const [kind, rule] of rules) {
      if (skip(kind, pieces)) continue;
      rule.lastIndex = at;
      const match = rule.exec(text);
      if (match?.[0]) {
        piece = [kind, match[0]];
        break;
      }
    }
    piece ??= ['plain', text[at]];
    pieces.push(piece);
    at += piece[1].length;
  }
  return pieces;
}

const ANY = ['plain', /[^]/y];
const SPACE = ['space', /\s+/y];
const BLOCK_COMMENT = ['comment', /\/\*[\s\S]*?(?:\*\/|$)/y];
const SINGLE_QUOTED = ['string', /'(?:\\.|[^'\\\n])*'?/y];
const DOUBLE_QUOTED = ['string', /"(?:\\.|[^"\\\n])*"?/y];

const words = (list) => new Set(list.split(' '));
const JS_KEYWORDS = words(
  'async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch throw try typeof var void while with yield',
);
// Words that are only keywords in some places, so a key such as { type: 1 } stays plain.
const CONTEXTUAL = words(
  'async from get of set static abstract as asserts declare enum implements infer interface is keyof namespace private protected public readonly satisfies type unique',
);
const TS_KEYWORDS = words(
  'abstract as asserts declare enum implements infer interface is keyof namespace private protected public readonly satisfies type unique',
);
const TS_TYPES = words('any bigint boolean never number object string symbol unknown');
const LITERALS = words('true false null undefined this NaN Infinity');
// A slash after one of these starts a regular expression, not a division.
const BEFORE_REGEX = words('return typeof instanceof in of new delete void throw case do else yield await');

const JS_RULES = [
  SPACE,
  ['comment', /\/\/[^\n]*/y],
  BLOCK_COMMENT,
  SINGLE_QUOTED,
  DOUBLE_QUOTED,
  ['string', /`(?:\\[\s\S]|[^`\\])*`?/y],
  ['regex', /\/(?![*/])(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\/[a-z]*/y],
  ['number', /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?)n?/y],
  ['word', /[A-Za-z_$][\w$]*/y],
  ANY,
];

/** The last piece that was not space or a comment. */
const lastSolid = (pieces) => {
  for (let i = pieces.length - 1; i >= 0; i--) if (pieces[i][0] !== 'space' && pieces[i][0] !== 'comment') return pieces[i];
  return null;
};

function regexAllowed(pieces) {
  const prev = lastSolid(pieces);
  if (!prev) return true;
  if (prev[0] === 'plain') return /[(,=:[!&|?{};+\-*%<>~^]$/.test(prev[1]);
  return prev[0] === 'word' && BEFORE_REGEX.has(prev[1]);
}

const NEXT_SOLID = /\s*(\S?)/y;

/** The first character after `from` that is not space, or '' at the end. */
const nextSolid = (text, from) => {
  NEXT_SOLID.lastIndex = from;
  return NEXT_SOLID.exec(text)[1];
};

function tokenizeScript(text, typescript) {
  const pieces = lex(text, JS_RULES, (kind, done) => kind === 'regex' && !regexAllowed(done));
  let offset = 0;
  let prev = null;
  return pieces.map(([kind, piece]) => {
    const end = (offset += piece.length);
    let type = kind === 'space' ? 'plain' : kind;
    if (kind === 'word') {
      const next = nextSolid(text, end);
      const afterDot = prev === '.';
      const isKey = CONTEXTUAL.has(piece) && (next === ':' || next === '?');
      if (afterDot) type = next === '(' ? 'function' : 'plain';
      else if (LITERALS.has(piece)) type = 'literal';
      else if ((JS_KEYWORDS.has(piece) || (typescript && TS_KEYWORDS.has(piece))) && !isKey) type = 'keyword';
      else if (typescript && TS_TYPES.has(piece)) type = 'type';
      else if (/^[A-Z]/.test(piece) && !/^[A-Z\d_]{2,}$/.test(piece)) type = 'type';
      else if (next === '(') type = 'function';
      else type = 'plain';
    }
    if (kind !== 'space' && kind !== 'comment') prev = piece;
    return [type, piece];
  });
}

const CSS_RULES = [
  SPACE,
  BLOCK_COMMENT,
  SINGLE_QUOTED,
  DOUBLE_QUOTED,
  ['punct', /[{};:(),]/y],
  ['chunk', /(?:[^\s{};:'"/(),]|\/(?!\*))+/y],
];

/** A value in a declaration or an at-rule: numbers, colours, !important and function names. */
function cssValue(piece, next) {
  if (piece === '!important') return 'keyword';
  if (/^#[\da-f]{3,8}$/i.test(piece) || /^[-+]?\.?\d/.test(piece)) return 'number';
  return next === '(' ? 'function' : 'plain';
}

function tokenizeCss(text) {
  const pieces = lex(text, CSS_RULES);
  const solid = (i) => {
    while (i < pieces.length && (pieces[i][0] === 'space' || pieces[i][0] === 'comment')) i++;
    return pieces[i];
  };
  // What a statement is depends on what ends it: { for a rule, ; or } for a declaration.
  const endsWithBlock = (i) => {
    for (; i < pieces.length; i++) {
      const [kind, piece] = pieces[i];
      if (kind === 'punct' && (piece === '{' || piece === ';' || piece === '}')) return piece === '{';
    }
    return false;
  };
  let mode = 'start';
  return pieces.map(([kind, piece], i) => {
    if (kind === 'space') return ['plain', piece];
    if (kind === 'comment') return ['comment', piece];
    if (kind === 'punct' && (piece === '{' || piece === ';' || piece === '}')) {
      mode = 'start';
      return ['plain', piece];
    }
    if (mode === 'start') mode = piece.startsWith('@') ? 'at-rule' : endsWithBlock(i) ? 'selector' : 'property';
    if (mode === 'selector') return [kind === 'string' ? 'string' : 'selector', piece];
    if (kind === 'string') return ['string', piece];
    if (mode === 'at-rule' && piece.startsWith('@')) return ['at-rule', piece];
    if (mode === 'property') {
      if (piece === ':') mode = 'value';
      return [kind === 'chunk' ? 'property' : 'plain', piece];
    }
    return [kind === 'chunk' ? cssValue(piece, solid(i + 1)?.[1]) : 'plain', piece];
  });
}

const JSON_RULES = [
  SPACE,
  DOUBLE_QUOTED,
  ['number', /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y],
  ['word', /[A-Za-z_]\w*/y],
  ANY,
];

function tokenizeJson(text) {
  let offset = 0;
  return lex(text, JSON_RULES).map(([kind, piece]) => {
    const end = (offset += piece.length);
    if (kind === 'string') return [nextSolid(text, end) === ':' ? 'property' : 'string', piece];
    if (kind === 'word') return [LITERALS.has(piece) ? 'literal' : 'plain', piece];
    return [kind === 'space' ? 'plain' : kind, piece];
  });
}

/** Cuts tokens at line ends, joining neighbours of one kind and dropping empty pieces. */
function intoLines(tokens) {
  const lines = [[]];
  for (const [type, text] of tokens) {
    text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (!part) return;
      const line = lines[lines.length - 1];
      const last = line[line.length - 1];
      if (last && last[0] === type) last[1] += part;
      else line.push([type, part]);
    });
  }
  return lines;
}

/** The source as lines of [type, text] tokens. Plain text is 'plain'. */
export function tokenizeSource(text, language) {
  const source = text.replace(/\r\n?/g, '\n');
  if (language === 'javascript' || language === 'typescript') return intoLines(tokenizeScript(source, language === 'typescript'));
  if (language === 'css') return intoLines(tokenizeCss(source));
  if (language === 'json') return intoLines(tokenizeJson(source));
  return intoLines([['plain', source]]);
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

/**
 * The source as rows of numbered, coloured lines. Every piece of the file is
 * escaped, so a file can only ever show as text. Colours come from classes in
 * windowing.css, never inline styles, which the Content-Security-Policy forbids.
 */
export function highlightSource(text, language) {
  return tokenizeSource(text, language)
    .map((tokens, i) => {
      const code = tokens
        .map(([type, part]) => (type === 'plain' ? escapeHtml(part) : `<span class="tok-${type}">${escapeHtml(part)}</span>`))
        .join('');
      return `<span class="vsc-row"><span class="vsc-ln" aria-hidden="true">${i + 1}</span><span class="vsc-src">${code}</span></span>`;
    })
    .join('');
}

/** Everything the editor and its status bar show for a file. */
export function renderSource(text, path) {
  const language = sourceLanguage(path);
  return {
    html: highlightSource(text, language),
    lines: text.replace(/\r\n?/g, '\n').split('\n').length,
    language,
    languageName: SOURCE_LANGUAGES[language].name,
  };
}
