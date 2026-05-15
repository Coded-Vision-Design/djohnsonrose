// Tiny client-side SELECT engine for the SSMS-styled Database app.
//
// The server already returns whole tables (api/cv_data.php) — this module
// takes the user's query string, parses it, then projects / filters / sorts /
// limits the row set in JS. The grammar is intentionally minimal:
//
//   SELECT <columns> FROM <table>
//     [WHERE <condition> [AND|OR <condition>]…]
//     [ORDER BY <col> [ASC|DESC]]
//     [LIMIT <n>]
//
//   <columns>    ::= '*'  |  ident (',' ident)*
//   <condition>  ::= ident <op> <literal>
//   <op>         ::= '=' | '!=' | '<>' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'NOT LIKE'
//   <literal>    ::= 'quoted string' | "quoted string" | number
//
// Anything outside the grammar throws a `ParseError` the UI surfaces verbatim,
// so visitors get real "syntax near 'foo'" feedback rather than a silent
// fallback to SELECT *.

export type Row = Record<string, string | number | null>

export interface Ast {
  columns: string[] // ['*'] for all columns
  table: string
  where: Condition | null
  orderBy: { column: string; direction: 'ASC' | 'DESC' } | null
  limit: number | null
}

type Op = '=' | '!=' | '<>' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'NOT LIKE'
export type Condition =
  | { kind: 'cmp'; column: string; op: Op; value: string | number }
  | { kind: 'and'; left: Condition; right: Condition }
  | { kind: 'or'; left: Condition; right: Condition }

export class ParseError extends Error {}

// ---- Tokenizer ----------------------------------------------------------

type Token =
  | { type: 'ident'; value: string }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'op'; value: Op | '(' | ')' | ',' | '*' }
  | { type: 'kw'; value: string }

const KEYWORDS = new Set([
  'select', 'from', 'where', 'and', 'or', 'order', 'by', 'asc', 'desc', 'limit', 'like', 'not',
])

function tokenize(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === '*' || ch === '(' || ch === ')' || ch === ',') {
      out.push({ type: 'op', value: ch })
      i++
      continue
    }
    if (ch === '=' || ch === '<' || ch === '>' || ch === '!') {
      let op = ch
      if (src[i + 1] === '=' || (ch === '<' && src[i + 1] === '>')) {
        op += src[i + 1]
        i += 2
      } else {
        i += 1
      }
      out.push({ type: 'op', value: op as Op })
      continue
    }
    if (ch === "'" || ch === '"') {
      const quote = ch
      let j = i + 1
      let str = ''
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\' && j + 1 < src.length) {
          str += src[j + 1]
          j += 2
        } else {
          str += src[j]
          j += 1
        }
      }
      if (j >= src.length) throw new ParseError(`Unterminated string literal at column ${i + 1}`)
      out.push({ type: 'string', value: str })
      i = j + 1
      continue
    }
    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      out.push({ type: 'number', value: Number(src.slice(i, j)) })
      i = j
      continue
    }
    if (/[a-zA-Z_[`]/.test(ch)) {
      let j = i
      while (j < src.length && /[a-zA-Z0-9_.[\]`]/.test(src[j])) j++
      const word = src.slice(i, j)
      const lower = word.toLowerCase()
      if (KEYWORDS.has(lower)) {
        out.push({ type: 'kw', value: lower })
      } else {
        // Strip bracket / backtick noise so [Portfolio_DB].[dbo].[experience]
        // becomes 'experience'.
        const clean = word.replace(/[`[\]]/g, '').split('.').pop() ?? word
        out.push({ type: 'ident', value: clean })
      }
      i = j
      continue
    }
    throw new ParseError(`Unexpected character '${ch}' at column ${i + 1}`)
  }
  return out
}

// ---- Parser -------------------------------------------------------------

export function parse(sql: string): Ast {
  const tokens = tokenize(sql.trim().replace(/;\s*$/, ''))
  let pos = 0

  const peek = () => tokens[pos]
  const eat = (predicate: (t: Token) => boolean, expected: string): Token => {
    const t = tokens[pos]
    if (!t || !predicate(t)) throw new ParseError(`Expected ${expected}, got '${describe(t)}'`)
    pos++
    return t
  }
  const consumeKw = (kw: string) =>
    eat((t) => t.type === 'kw' && t.value === kw, kw.toUpperCase())

  consumeKw('select')

  // Columns
  const columns: string[] = []
  if (peek()?.type === 'op' && (peek() as { value: unknown }).value === '*') {
    pos++
    columns.push('*')
  } else {
    columns.push((eat((t) => t.type === 'ident', 'column name') as { value: string }).value)
    while (peek()?.type === 'op' && (peek() as { value: unknown }).value === ',') {
      pos++
      columns.push((eat((t) => t.type === 'ident', 'column name') as { value: string }).value)
    }
  }

  consumeKw('from')
  const table = (eat((t) => t.type === 'ident', 'table name') as { value: string }).value.toLowerCase()

  let where: Condition | null = null
  if (peek()?.type === 'kw' && (peek() as { value: string }).value === 'where') {
    pos++
    where = parseExpr()
  }

  let orderBy: Ast['orderBy'] = null
  if (peek()?.type === 'kw' && (peek() as { value: string }).value === 'order') {
    pos++
    consumeKw('by')
    const col = (eat((t) => t.type === 'ident', 'column name') as { value: string }).value
    let direction: 'ASC' | 'DESC' = 'ASC'
    if (peek()?.type === 'kw' && ((peek() as { value: string }).value === 'asc' || (peek() as { value: string }).value === 'desc')) {
      direction = (peek() as { value: string }).value.toUpperCase() as 'ASC' | 'DESC'
      pos++
    }
    orderBy = { column: col, direction }
  }

  let limit: number | null = null
  if (peek()?.type === 'kw' && (peek() as { value: string }).value === 'limit') {
    pos++
    const n = eat((t) => t.type === 'number', 'limit number') as { value: number }
    limit = Math.max(0, Math.floor(n.value))
  }

  if (pos < tokens.length) {
    throw new ParseError(`Unexpected '${describe(tokens[pos])}' after end of statement`)
  }

  return { columns, table, where, orderBy, limit }

  function parseExpr(): Condition {
    let left = parseAnd()
    while (peek()?.type === 'kw' && (peek() as { value: string }).value === 'or') {
      pos++
      left = { kind: 'or', left, right: parseAnd() }
    }
    return left
  }
  function parseAnd(): Condition {
    let left = parseCmp()
    while (peek()?.type === 'kw' && (peek() as { value: string }).value === 'and') {
      pos++
      left = { kind: 'and', left, right: parseCmp() }
    }
    return left
  }
  function parseCmp(): Condition {
    const column = (eat((t) => t.type === 'ident', 'column name') as { value: string }).value
    let op: Op
    const t = peek()
    if (t?.type === 'kw' && t.value === 'not') {
      pos++
      consumeKw('like')
      op = 'NOT LIKE'
    } else if (t?.type === 'kw' && t.value === 'like') {
      pos++
      op = 'LIKE'
    } else if (t?.type === 'op' && ['=', '!=', '<>', '<', '<=', '>', '>='].includes(t.value as string)) {
      op = t.value as Op
      pos++
    } else {
      throw new ParseError(`Expected comparison operator after '${column}'`)
    }
    const valTok = eat(
      (tt) => tt.type === 'string' || tt.type === 'number',
      'literal value (string or number)',
    )
    const value = (valTok as { value: string | number }).value
    return { kind: 'cmp', column, op, value }
  }
}

function describe(t: Token | undefined): string {
  if (!t) return 'end of query'
  if (t.type === 'kw') return t.value.toUpperCase()
  return String((t as { value: unknown }).value)
}

// ---- Executor -----------------------------------------------------------

export function execute(ast: Ast, rows: Row[]): Row[] {
  let result = rows
  if (ast.where) {
    result = result.filter((r) => evalCondition(ast.where!, r))
  }
  if (ast.orderBy) {
    const { column, direction } = ast.orderBy
    result = [...result].sort((a, b) => {
      const av = a[column]
      const bv = b[column]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return direction === 'ASC' ? cmp : -cmp
    })
  }
  if (ast.limit != null) result = result.slice(0, ast.limit)
  if (!ast.columns.includes('*')) {
    result = result.map((r) => {
      const out: Row = {}
      for (const c of ast.columns) out[c] = r[c] ?? null
      return out
    })
  }
  return result
}

function evalCondition(cond: Condition, row: Row): boolean {
  if (cond.kind === 'and') return evalCondition(cond.left, row) && evalCondition(cond.right, row)
  if (cond.kind === 'or') return evalCondition(cond.left, row) || evalCondition(cond.right, row)
  const lhs = row[cond.column]
  const rhs = cond.value
  switch (cond.op) {
    case '=':
      return looseEq(lhs, rhs)
    case '!=':
    case '<>':
      return !looseEq(lhs, rhs)
    case '<':
      return numericPair(lhs, rhs, (a, b) => a < b)
    case '<=':
      return numericPair(lhs, rhs, (a, b) => a <= b)
    case '>':
      return numericPair(lhs, rhs, (a, b) => a > b)
    case '>=':
      return numericPair(lhs, rhs, (a, b) => a >= b)
    case 'LIKE':
      return likeMatch(String(lhs ?? ''), String(rhs))
    case 'NOT LIKE':
      return !likeMatch(String(lhs ?? ''), String(rhs))
  }
}

function looseEq(a: unknown, b: unknown): boolean {
  if (a == null) return b == null
  if (typeof a === 'number' && typeof b === 'number') return a === b
  return String(a).toLowerCase() === String(b).toLowerCase()
}

function numericPair(a: unknown, b: unknown, fn: (x: number, y: number) => boolean): boolean {
  const ax = Number(a)
  const bx = Number(b)
  if (Number.isNaN(ax) || Number.isNaN(bx)) return false
  return fn(ax, bx)
}

function likeMatch(value: string, pattern: string): boolean {
  // % = any sequence, _ = single char. Escape the rest.
  const re = new RegExp(
    '^' +
      pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/%/g, '.*')
        .replace(/_/g, '.') +
      '$',
    'i',
  )
  return re.test(value)
}

// ---- Example queries used by the help panel -----------------------------

export const EXAMPLES = [
  { label: "Find roles with 'SCCM'",      sql: "SELECT role, company, period FROM experience WHERE highlights LIKE '%SCCM%'" },
  { label: 'Microsoft certifications',    sql: "SELECT name, year FROM certifications WHERE issuer = 'Microsoft'" },
  { label: 'Anthropic certifications',    sql: "SELECT name FROM certifications WHERE issuer = 'Anthropic' ORDER BY name" },
  { label: 'Frontend skills',             sql: "SELECT name FROM skills WHERE category = 'frameworks' ORDER BY name" },
  { label: 'Projects built with React',   sql: "SELECT title, location FROM projects WHERE tags LIKE '%React%'" },
  { label: 'UK-based clients',            sql: "SELECT title, url FROM projects WHERE location = 'UK'" },
  { label: 'Most recent 3 jobs',          sql: 'SELECT role, company, period FROM experience ORDER BY id DESC LIMIT 3' },
  { label: 'All achievements',            sql: 'SELECT title, result FROM achievements' },
] as const
