// The small SELECT engine behind SQL Server Management Studio, shared by both
// builds. The server only ever returns whole tables (api/cv_data.php); the
// query typed by a visitor is parsed and applied here, in the browser, so no
// typed SQL reaches MySQL. The grammar is deliberately small:
//
//   SELECT <columns> FROM <table>
//     [WHERE <condition> [AND|OR <condition>]...]
//     [ORDER BY <col> [ASC|DESC]]
//     [LIMIT <n>]
//
//   <columns>    ::= '*'  |  ident (',' ident)*
//   <condition>  ::= ident <op> <literal>
//   <op>         ::= '=' | '!=' | '<>' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'NOT LIKE'
//   <literal>    ::= 'quoted string' | "quoted string" | number
//
// Anything outside the grammar throws an SqlParseError the app shows as it is,
// so visitors get real "syntax near 'foo'" feedback.

export class SqlParseError extends Error {}

export const SQL_TABLES = [
  { id: 'experience', label: 'dbo.Experience' },
  { id: 'projects', label: 'dbo.Projects' },
  { id: 'certifications', label: 'dbo.Certifications' },
  { id: 'education', label: 'dbo.Education' },
  { id: 'skills', label: 'dbo.Skills' },
  { id: 'achievements', label: 'dbo.Achievements' },
  { id: 'interests', label: 'dbo.Interests' },
];

export const SQL_COLUMNS = {
  experience: ['id', 'role', 'company', 'period', 'location', 'highlights'],
  projects: ['id', 'title', 'description', 'tags', 'url', 'location', 'country'],
  certifications: ['id', 'name', 'issuer', 'year'],
  education: ['id', 'title', 'issuer'],
  skills: ['id', 'category', 'name'],
  achievements: ['id', 'title', 'result', 'category', 'date'],
  interests: ['id', 'name'],
};

export const SQL_EXAMPLES = [
  { label: "Find roles with 'SCCM'", sql: "SELECT role, company, period FROM experience WHERE highlights LIKE '%SCCM%'" },
  { label: 'Microsoft certifications', sql: "SELECT name, year FROM certifications WHERE issuer = 'Microsoft'" },
  { label: 'Anthropic certifications', sql: "SELECT name FROM certifications WHERE issuer = 'Anthropic' ORDER BY name" },
  { label: 'Frontend skills', sql: "SELECT name FROM skills WHERE category = 'frameworks' ORDER BY name" },
  { label: 'Projects built with React', sql: "SELECT title, location FROM projects WHERE tags LIKE '%React%'" },
  { label: 'UK-based clients', sql: "SELECT title, url FROM projects WHERE location = 'UK'" },
  { label: 'Most recent 3 jobs', sql: 'SELECT role, company, period FROM experience ORDER BY id DESC LIMIT 3' },
  { label: 'All achievements', sql: 'SELECT title, result FROM achievements' },
];

const KEYWORDS = new Set([
  'select', 'from', 'where', 'and', 'or', 'order', 'by', 'asc', 'desc', 'limit', 'like', 'not',
]);
const COMPARISONS = ['=', '!=', '<>', '<', '<=', '>', '>='];

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '*' || ch === '(' || ch === ')' || ch === ',') {
      out.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '=' || ch === '<' || ch === '>' || ch === '!') {
      let op = ch;
      if (src[i + 1] === '=' || (ch === '<' && src[i + 1] === '>')) {
        op += src[i + 1];
        i += 2;
      } else {
        i += 1;
      }
      out.push({ type: 'op', value: op });
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      let str = '';
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\' && j + 1 < src.length) {
          str += src[j + 1];
          j += 2;
        } else {
          str += src[j];
          j += 1;
        }
      }
      if (j >= src.length) throw new SqlParseError(`Unterminated string literal at column ${i + 1}`);
      out.push({ type: 'string', value: str });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ type: 'number', value: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_[`]/.test(ch)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_.[\]`]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const lower = word.toLowerCase();
      if (KEYWORDS.has(lower)) {
        out.push({ type: 'kw', value: lower });
      } else {
        // [Portfolio_DB].[dbo].[experience] becomes 'experience'.
        const clean = word.replace(/[`[\]]/g, '').split('.').pop() || word;
        out.push({ type: 'ident', value: clean });
      }
      i = j;
      continue;
    }
    throw new SqlParseError(`Unexpected character '${ch}' at column ${i + 1}`);
  }
  return out;
}

function describe(t) {
  if (!t) return 'end of query';
  if (t.type === 'kw') return t.value.toUpperCase();
  return String(t.value);
}

export function parseSql(sql) {
  const tokens = tokenize(sql.trim().replace(/;\s*$/, ''));
  let pos = 0;

  const peek = () => tokens[pos];
  const isKw = (kw) => peek()?.type === 'kw' && peek().value === kw;
  const isOp = (op) => peek()?.type === 'op' && peek().value === op;
  const eat = (predicate, expected) => {
    const t = tokens[pos];
    if (!t || !predicate(t)) throw new SqlParseError(`Expected ${expected}, got '${describe(t)}'`);
    pos++;
    return t;
  };
  const consumeKw = (kw) => eat((t) => t.type === 'kw' && t.value === kw, kw.toUpperCase());
  const ident = (expected) => eat((t) => t.type === 'ident', expected).value;

  function parseCmp() {
    const column = ident('column name');
    let op;
    const t = peek();
    if (t?.type === 'kw' && t.value === 'not') {
      pos++;
      consumeKw('like');
      op = 'NOT LIKE';
    } else if (t?.type === 'kw' && t.value === 'like') {
      pos++;
      op = 'LIKE';
    } else if (t?.type === 'op' && COMPARISONS.includes(t.value)) {
      op = t.value;
      pos++;
    } else {
      throw new SqlParseError(`Expected comparison operator after '${column}'`);
    }
    const value = eat((tt) => tt.type === 'string' || tt.type === 'number', 'literal value (string or number)').value;
    return { kind: 'cmp', column, op, value };
  }

  function parseAnd() {
    let left = parseCmp();
    while (isKw('and')) {
      pos++;
      left = { kind: 'and', left, right: parseCmp() };
    }
    return left;
  }

  function parseExpr() {
    let left = parseAnd();
    while (isKw('or')) {
      pos++;
      left = { kind: 'or', left, right: parseAnd() };
    }
    return left;
  }

  consumeKw('select');

  const columns = [];
  if (isOp('*')) {
    pos++;
    columns.push('*');
  } else {
    columns.push(ident('column name'));
    while (isOp(',')) {
      pos++;
      columns.push(ident('column name'));
    }
  }

  consumeKw('from');
  const table = ident('table name').toLowerCase();

  let where = null;
  if (isKw('where')) {
    pos++;
    where = parseExpr();
  }

  let orderBy = null;
  if (isKw('order')) {
    pos++;
    consumeKw('by');
    const column = ident('column name');
    let direction = 'ASC';
    if (isKw('asc') || isKw('desc')) {
      direction = peek().value.toUpperCase();
      pos++;
    }
    orderBy = { column, direction };
  }

  let limit = null;
  if (isKw('limit')) {
    pos++;
    limit = Math.max(0, Math.floor(eat((t) => t.type === 'number', 'limit number').value));
  }

  if (pos < tokens.length) {
    throw new SqlParseError(`Unexpected '${describe(tokens[pos])}' after end of statement`);
  }

  return { columns, table, where, orderBy, limit };
}

function looseEq(a, b) {
  if (a == null) return b == null;
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function numericPair(a, b, fn) {
  const ax = Number(a);
  const bx = Number(b);
  if (Number.isNaN(ax) || Number.isNaN(bx)) return false;
  return fn(ax, bx);
}

/** SQL LIKE: % is any run of characters and _ is one. Everything else, * included, is plain. */
export function likeMatch(value, pattern) {
  const source = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.');
  return new RegExp(`^${source}$`, 'is').test(value);
}

function evalCondition(cond, row) {
  if (cond.kind === 'and') return evalCondition(cond.left, row) && evalCondition(cond.right, row);
  if (cond.kind === 'or') return evalCondition(cond.left, row) || evalCondition(cond.right, row);
  const lhs = row[cond.column];
  const rhs = cond.value;
  switch (cond.op) {
    case '=':
      return looseEq(lhs, rhs);
    case '!=':
    case '<>':
      return !looseEq(lhs, rhs);
    case '<':
      return numericPair(lhs, rhs, (a, b) => a < b);
    case '<=':
      return numericPair(lhs, rhs, (a, b) => a <= b);
    case '>':
      return numericPair(lhs, rhs, (a, b) => a > b);
    case '>=':
      return numericPair(lhs, rhs, (a, b) => a >= b);
    case 'LIKE':
      return likeMatch(String(lhs ?? ''), String(rhs));
    case 'NOT LIKE':
      return !likeMatch(String(lhs ?? ''), String(rhs));
    default:
      return false;
  }
}

export function executeSql(ast, rows) {
  let result = rows;
  if (ast.where) result = result.filter((r) => evalCondition(ast.where, r));
  if (ast.orderBy) {
    const { column, direction } = ast.orderBy;
    result = [...result].sort((a, b) => {
      const av = a[column];
      const bv = b[column];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return direction === 'ASC' ? cmp : -cmp;
    });
  }
  if (ast.limit != null) result = result.slice(0, ast.limit);
  if (!ast.columns.includes('*')) {
    result = result.map((r) => {
      const out = {};
      for (const c of ast.columns) out[c] = r[c] ?? null;
      return out;
    });
  }
  return result;
}

/**
 * Runs a query against tables fetched by `loadTable(id)`. Resolves to
 * { executed: { rows, columns, elapsed } | null, table, error }.
 */
export async function runSql(sql, loadTable, now = () => performance.now()) {
  const started = now();
  try {
    const ast = parseSql(sql);
    if (!SQL_TABLES.some((t) => t.id === ast.table)) {
      throw new SqlParseError(`Unknown table '${ast.table}'. Known tables: ${SQL_TABLES.map((t) => t.id).join(', ')}.`);
    }
    const rows = executeSql(ast, await loadTable(ast.table));
    const columns = ast.columns.includes('*') ? SQL_COLUMNS[ast.table] : ast.columns;
    return { executed: { rows, columns, elapsed: now() - started }, table: ast.table, error: null };
  } catch (e) {
    return { executed: null, table: null, error: e.message };
  }
}

/**
 * Queries can finish out of order, as each may wait for a different table.
 * Each run takes a ticket, and only the newest ticket may show its result.
 */
export function latestQuery() {
  let newest = 0;
  return {
    start: () => ++newest,
    isLatest: (ticket) => ticket === newest,
  };
}

export function sqlElapsedLabel(ms) {
  if (ms == null) return '00:00:00';
  if (ms < 1000) return `00:00:${(ms / 1000).toFixed(3).padStart(6, '0')}`;
  return `00:00:${String(Math.floor(ms / 1000)).padStart(2, '0')}`;
}
