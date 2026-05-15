import { describe, expect, it } from 'vitest'
import { type Row, execute, parse, ParseError } from './sql'

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
