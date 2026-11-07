import { describe, expect, it } from 'vitest'
import {
  SQL_COLUMNS,
  SQL_EXAMPLES,
  SQL_TABLES,
  SqlParseError as ParseError,
  executeSql as execute,
  latestQuery,
  parseSql as parse,
  sqlElapsedLabel,
  type Row,
} from '../../../assets/js/windowing/sql.js'

// The SELECT engine both builds' SQL Server Management Studio run.

const sampleExperience: Row[] = [
  { id: 12, role: 'Applications Support Engineer', company: 'Killik & Co', period: 'Apr 2025 - Present', location: 'Ipswich', highlights: 'AI tooling and PowerShell automation. SQL via MSSMS.' },
  { id: 10, role: 'Desktop Developer', company: 'UEA', period: 'Nov 2021 - Apr 2025', location: 'Norwich', highlights: 'SCCM and JAMF for 8,000+ devices. PowerShell automation.' },
  { id: 9, role: 'Systems Engineer II', company: 'Skyscanner', period: 'Mar 2020 - Nov 2021', location: 'Global', highlights: 'AI heat-sensing CCTV. JAMF/SCCM, MacBook provisioning.' },
  { id: 8, role: 'Desk Side Engineer', company: 'Shawbrook Bank', period: 'Mar 2017 - Mar 2020', location: 'Essex', highlights: 'SCCM imaging, PowerShell scripting.' },
]

describe('sql parser', () => {
  it('parses SELECT * FROM table', () => {
    expect(parse('SELECT * FROM experience')).toMatchObject({
      columns: ['*'],
      table: 'experience',
      where: null,
    })
  })

  it('parses column projection', () => {
    expect(parse('select role, company from experience').columns).toEqual(['role', 'company'])
  })

  it('parses bracketed SSMS table names', () => {
    expect(parse('SELECT * FROM [Portfolio_DB].[dbo].[experience]').table).toBe('experience')
  })

  it('parses WHERE with LIKE', () => {
    const ast = parse("SELECT * FROM experience WHERE highlights LIKE '%SCCM%'")
    expect(ast.where).toMatchObject({ kind: 'cmp', column: 'highlights', op: 'LIKE', value: '%SCCM%' })
  })

  it('parses WHERE with NOT LIKE', () => {
    const ast = parse("SELECT * FROM experience WHERE company NOT LIKE 'Killik%'")
    expect(ast.where).toMatchObject({ kind: 'cmp', column: 'company', op: 'NOT LIKE', value: 'Killik%' })
  })

  it('parses AND / OR with precedence', () => {
    const ast = parse(
      "SELECT * FROM experience WHERE company = 'UEA' OR company = 'Skyscanner' AND location = 'Global'",
    )
    expect(ast.where?.kind).toBe('or')
  })

  it('parses ORDER BY DESC and LIMIT', () => {
    const ast = parse('SELECT role FROM experience ORDER BY id DESC LIMIT 2')
    expect(ast.orderBy).toEqual({ column: 'id', direction: 'DESC' })
    expect(ast.limit).toBe(2)
  })

  it('throws on unterminated string', () => {
    expect(() => parse("SELECT * FROM experience WHERE role = 'unclosed")).toThrow(ParseError)
  })

  it('throws on missing FROM', () => {
    expect(() => parse('SELECT *')).toThrow(ParseError)
  })

  it('throws on garbage at end', () => {
    expect(() => parse('SELECT * FROM experience FOO')).toThrow(ParseError)
  })
})

describe('sql executor', () => {
  it('LIKE filters case-insensitively', () => {
    const ast = parse("SELECT role FROM experience WHERE highlights LIKE '%sccm%'")
    const rows = execute(ast, sampleExperience)
    expect(rows.map((r) => r.role)).toEqual([
      'Desktop Developer',
      'Systems Engineer II',
      'Desk Side Engineer',
    ])
  })

  it('column projection drops other columns', () => {
    const ast = parse("SELECT role, company FROM experience WHERE company = 'UEA'")
    const rows = execute(ast, sampleExperience)
    expect(rows).toEqual([{ role: 'Desktop Developer', company: 'UEA' }])
  })

  it('ORDER BY DESC sorts numerically when both sides are numbers', () => {
    const ast = parse('SELECT id FROM experience ORDER BY id DESC LIMIT 2')
    const rows = execute(ast, sampleExperience)
    expect(rows.map((r) => r.id)).toEqual([12, 10])
  })

  it('AND combines conditions', () => {
    const ast = parse(
      "SELECT company FROM experience WHERE highlights LIKE '%SCCM%' AND location = 'Norwich'",
    )
    expect(execute(ast, sampleExperience).map((r) => r.company)).toEqual(['UEA'])
  })

  it('OR combines conditions', () => {
    const ast = parse(
      "SELECT company FROM experience WHERE company = 'UEA' OR company = 'Killik & Co'",
    )
    expect(execute(ast, sampleExperience).map((r) => r.company).sort()).toEqual([
      'Killik & Co',
      'UEA',
    ])
  })
})

describe('LIKE patterns', () => {
  const rows: Row[] = [
    { id: 1, name: 'C*' },
    { id: 2, name: 'Cobol' },
    { id: 3, name: 'C++' },
    { id: 4, name: 'a.b' },
    { id: 5, name: 'axb' },
  ]
  const names = (sql: string) => execute(parse(sql), rows).map((r) => r.name)

  it('treats * as a plain character, not a wildcard', () => {
    expect(names("SELECT name FROM skills WHERE name LIKE 'C*'")).toEqual(['C*'])
    expect(names("SELECT name FROM skills WHERE name LIKE 'C*%'")).toEqual(['C*'])
  })

  it('keeps every other regular expression character plain', () => {
    expect(names("SELECT name FROM skills WHERE name LIKE 'C++'")).toEqual(['C++'])
    expect(names("SELECT name FROM skills WHERE name LIKE 'a.b'")).toEqual(['a.b'])
  })

  it('still takes % and _ as SQL wildcards', () => {
    expect(names("SELECT name FROM skills WHERE name LIKE 'C%'")).toEqual(['C*', 'Cobol', 'C++'])
    expect(names("SELECT name FROM skills WHERE name LIKE 'a_b'")).toEqual(['a.b', 'axb'])
  })
})

describe('latestQuery', () => {
  it('only the newest query may show its result', () => {
    const queries = latestQuery()
    const first = queries.start()
    const second = queries.start()
    expect(queries.isLatest(first)).toBe(false)
    expect(queries.isLatest(second)).toBe(true)
  })

  it('each runner counts on its own', () => {
    const a = latestQuery()
    const b = latestQuery()
    const ticket = a.start()
    b.start()
    b.start()
    expect(a.isLatest(ticket)).toBe(true)
  })
})

describe('tables and labels', () => {
  it('lists the columns of every table', () => {
    for (const table of SQL_TABLES) expect(SQL_COLUMNS[table.id]?.length).toBeGreaterThan(0)
  })

  it('every example parses and names a known table', () => {
    for (const example of SQL_EXAMPLES) {
      const ast = parse(example.sql)
      expect(SQL_TABLES.some((t) => t.id === ast.table)).toBe(true)
    }
  })

  it('formats the elapsed time like SSMS', () => {
    expect(sqlElapsedLabel(null)).toBe('00:00:00')
    expect(sqlElapsedLabel(12.5)).toBe('00:00:00.013')
    expect(sqlElapsedLabel(2400)).toBe('00:00:02')
  })
})
