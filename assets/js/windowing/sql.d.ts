export type Row = Record<string, string | number | null>

export type SqlOp = '=' | '!=' | '<>' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'NOT LIKE'

export type Condition =
  | { kind: 'cmp'; column: string; op: SqlOp; value: string | number }
  | { kind: 'and'; left: Condition; right: Condition }
  | { kind: 'or'; left: Condition; right: Condition }

export interface Ast {
  /** ['*'] for every column. */
  columns: string[]
  table: string
  where: Condition | null
  orderBy: { column: string; direction: 'ASC' | 'DESC' } | null
  limit: number | null
}

export type SqlTable = 'experience' | 'projects' | 'certifications' | 'education' | 'skills' | 'achievements' | 'interests'

export interface SqlOutcome {
  executed: { rows: Row[]; columns: string[]; elapsed: number } | null
  table: SqlTable | null
  error: string | null
}

export class SqlParseError extends Error {}

export const SQL_TABLES: { id: SqlTable; label: string }[]
export const SQL_COLUMNS: Record<SqlTable, string[]>
export const SQL_EXAMPLES: { label: string; sql: string }[]

export function parseSql(sql: string): Ast
export function executeSql(ast: Ast, rows: Row[]): Row[]
export function likeMatch(value: string, pattern: string): boolean
export function runSql(sql: string, loadTable: (table: SqlTable) => Promise<Row[]>, now?: () => number): Promise<SqlOutcome>
export function latestQuery(): { start: () => number; isLatest: (ticket: number) => boolean }
export function sqlElapsedLabel(ms: number | null | undefined): string
