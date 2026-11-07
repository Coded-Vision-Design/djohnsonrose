import { describe, it, expect } from 'vitest'
import {
  TERMINAL_COMMANDS,
  TERMINAL_HOME,
  TOUR_STEPS,
  resolveFile,
  runTerminalCommand,
  type TerminalContext,
} from '../../../assets/js/windowing/terminal.js'
import fileSystemData from '../../../data/filesystem.json'
import portfolio from '../../../data/portfolio.json'
import profile from '../../../data/profile.json'

// The Terminal's CV, skills, file and tour commands, from the shared data.

const fileSystem = fileSystemData as unknown as TerminalContext['fileSystem']
const DESKTOP = `${TERMINAL_HOME}\\Desktop`
const achievements = fileSystem[DESKTOP].find((entry) => entry.name === 'achievements.txt')!

const ctx = (patch: Partial<TerminalContext> = {}): TerminalContext => ({
  cwd: TERMINAL_HOME,
  fileSystem,
  projects: portfolio.projects,
  email: 'devante@johnson-rose.co.uk',
  build: 'v2',
  profile,
  portfolio,
  ...patch,
})

const run = (raw: string, patch: Partial<TerminalContext> = {}) => runTerminalCommand(raw, ctx(patch))

describe('cv', () => {
  it('prints the headline, location, summary and the current roles', () => {
    const out = run('cv').res ?? ''
    expect(out).toContain(profile.name)
    expect(out).toContain(profile.headline)
    expect(out).toContain(profile.location)
    expect(out).toContain(portfolio.summary)
    for (const job of portfolio.experience.filter((job) => /present$/i.test(job.period))) {
      expect(out).toContain(`${job.role}, ${job.company} (${job.period})`)
    }
  })

  it('leaves out roles that have ended', () => {
    const ended = portfolio.experience.find((job) => !/present$/i.test(job.period))!
    expect(run('cv').res).not.toContain(ended.company)
  })

  it('says the full CV is at /cv', () => {
    expect(run('cv').res).toMatch(/full CV is at \/cv\b/)
  })

  it('still points at /cv when the data is missing', () => {
    const out = run('CV', { profile: undefined, portfolio: undefined }).res ?? ''
    expect(out).toMatch(/\/cv/)
    expect(out).not.toMatch(/undefined/)
  })
})

describe('skills', () => {
  it('prints every skill under its group', () => {
    const out = run('skills').res ?? ''
    expect(out).toContain('Languages and frameworks: ' + portfolio.skills.frameworks.join(', '))
    expect(out).toContain('AI and APIs: ' + portfolio.skills.apis.join(', '))
    for (const list of Object.values(portfolio.skills)) for (const skill of list) expect(out).toContain(skill)
  })

  it('names a group it does not know by its key, and lists ungrouped skills on one line', () => {
    expect(run('skills', { portfolio: { skills: { 'cloud hosting': ['VPS'] } } }).res).toContain('Cloud hosting: VPS')
    expect(run('skills', { portfolio: { skills: ['PHP', 'React'] } }).res).toContain('PHP, React')
  })

  it('says so when there are no skills', () => {
    expect(run('skills', { portfolio: undefined }).res).toMatch(/No skills/)
  })
})

describe('resolveFile', () => {
  it('finds a file from the current folder, whatever its case', () => {
    expect(resolveFile(fileSystem, TERMINAL_HOME, 'desktop\\ACHIEVEMENTS.TXT')).toEqual({
      entry: achievements,
      folder: DESKTOP,
    })
  })

  it('follows absolute paths, the home folder, .. and forward slashes', () => {
    expect(resolveFile(fileSystem, 'C:\\Windows', `${DESKTOP}\\achievements.txt`)?.entry).toBe(achievements)
    expect(resolveFile(fileSystem, 'C:\\Windows', '~/Desktop/achievements.txt')?.entry).toBe(achievements)
    expect(resolveFile(fileSystem, `${TERMINAL_HOME}\\Documents`, '..\\Desktop\\achievements.txt')?.entry).toBe(achievements)
  })

  it('returns a folder as a folder, and null for a missing path', () => {
    expect(resolveFile(fileSystem, TERMINAL_HOME, 'Documents\\')?.entry.type).toBe('folder')
    expect(resolveFile(fileSystem, TERMINAL_HOME, 'nowhere.txt')).toBeNull()
    expect(resolveFile(fileSystem, TERMINAL_HOME, 'nowhere\\a.txt')).toBeNull()
    expect(resolveFile(fileSystem, TERMINAL_HOME, '')).toBeNull()
  })
})

describe('cat and type', () => {
  it('print a text file relative to the current folder', () => {
    expect(run('cat Desktop\\achievements.txt').res).toBe(achievements.content)
    expect(run('type achievements.txt', { cwd: DESKTOP }).res).toBe(achievements.content)
  })

  it('take quoted and unquoted names with spaces', () => {
    const career = `${TERMINAL_HOME}\\Documents\\Career`
    const file = fileSystem[career].find((entry) => entry.name === 'Killik and Co.txt')!
    expect(run('cat "Killik and Co.txt"', { cwd: career }).res).toBe(file.content)
    expect(run('TYPE killik and co.txt', { cwd: career }).res).toBe(file.content)
  })

  it('print a file the visitor wrote, even an empty one', () => {
    const fs = { ...fileSystem, [DESKTOP]: [...fileSystem[DESKTOP], { name: 'note.txt', type: 'file', content: '' }] }
    expect(run('cat Desktop\\note.txt', { fileSystem: fs })).toEqual({ res: '' })
  })

  it('explain a folder, a missing file, a program and a missing name', () => {
    expect(run('cat Documents').res).toMatch(/Documents is a folder.*dir Documents/)
    expect(run('cat nowhere.txt').res).toMatch(/cannot find the file.*nowhere\.txt/i)
    expect(run('cat "C:\\Program Files\\Microsoft VS Code\\Code.exe"').res).toMatch(/Code\.exe is not a text file/)
    expect(run('type').res).toMatch(/Usage: type <file>/)
    expect(run('cat').res).toMatch(/Usage: cat <file>/)
  })
})

describe('tour', () => {
  it('starts at step one and points at the next', () => {
    const out = run('tour').res ?? ''
    expect(out).toMatch(/^Step 1 of \d/)
    expect(out).toContain('tour 2')
    expect(run('tour 1').res).toBe(out)
  })

  it('suggests the CV, commands and apps, and the last step has no next', () => {
    const all = TOUR_STEPS.map((_, i) => run(`tour ${i + 1}`).res).join('\n')
    for (const hint of ['"cv"', '"skills"', '"cat ', 'Tab', '"open vscode"', '/cv', '"help"']) expect(all).toContain(hint)
    expect(run(`tour ${TOUR_STEPS.length}`).res).not.toMatch(/tour \d/)
  })

  it('never opens anything itself', () => {
    for (let step = 1; step <= TOUR_STEPS.length; step++) expect(run(`tour ${step}`).open).toBeUndefined()
  })

  it('says how many steps there are for a step it does not have', () => {
    for (const step of ['0', '99', 'next']) {
      expect(run(`tour ${step}`).res).toBe(`There are ${TOUR_STEPS.length} steps. Type "tour" to start again.`)
    }
  })
})

describe('man', () => {
  const page = run('man devante').res ?? ''
  const section = (name: string) => page.split(/\n(?=[A-Z][A-Z ]+\n)/).find((part) => part.startsWith(`${name}\n`)) ?? ''

  it('man devante has the sections of a manual page, in order', () => {
    const headings = page.split('\n').filter((line) => /^[A-Z][A-Z ]+$/.test(line))
    expect(headings).toEqual(['NAME', 'SYNOPSIS', 'DESCRIPTION', 'EXPERIENCE', 'SKILLS', 'SEE ALSO'])
    expect(page.split('\n')[0]).toMatch(/^DEVANTE\(1\)\s+.+\s+DEVANTE\(1\)$/)
  })

  it('is built from the shared data', () => {
    expect(section('NAME')).toContain(`devante - ${profile.name}, ${profile.headline}`)
    for (const job of portfolio.experience.filter((job) => /present$/i.test(job.period))) {
      expect(section('SYNOPSIS')).toContain(`devante --role "${job.role}" --at "${job.company}"`)
    }
    expect(section('DESCRIPTION')).toContain(portfolio.summary)
    expect(section('DESCRIPTION')).toContain(profile.location)
    for (const job of portfolio.experience) {
      expect(section('EXPERIENCE')).toMatch(new RegExp(`${job.period}\\s+${job.role.replace(/[()/]/g, '\\$&')}, ${job.company.replace(/[()&]/g, '\\$&')}`))
    }
    for (const list of Object.values(portfolio.skills)) for (const skill of list) expect(section('SKILLS')).toContain(skill)
  })

  it('points at /cv and the cv and skills commands, and never at a GitHub account', () => {
    expect(section('SEE ALSO')).toMatch(/cv\(1\).*skills\(1\).*\/cv/s)
    for (const command of ['man devante', 'cv', 'skills', 'tour 1', 'tour 2', 'tour 3', 'tour 4', 'man cv']) {
      expect(run(command).res, command).not.toMatch(/github|CodedVisionDesign/i)
    }
  })

  it('gives the Terminal commands short pages, whatever the case', () => {
    expect(run('man cat').res).toMatch(/^CAT\(1\)[\s\S]*NAME\n\s+cat, type - [\s\S]*SYNOPSIS\n\s+cat <file>/)
    expect(run('man TYPE').res).toBe(run('man cat').res)
    for (const command of ['cv', 'skills', 'tour', 'man']) expect(run(`man ${command}`).res).toMatch(new RegExp(`^${command.toUpperCase()}\\(1\\)`))
    expect(run('man dir').res).toMatch(/NAME\n\s+dir, ls - List a folder/)
  })

  it('has a page for every command the Terminal knows', () => {
    for (const name of TERMINAL_COMMANDS) expect(run(`man ${name}`).res, name).not.toMatch(/No manual entry/)
  })

  it('asks which page on its own, and says when there is no page', () => {
    expect(run('man').res).toMatch(/What manual page do you want\?[\s\S]*man devante/)
    expect(run('man xyzzy').res).toBe('No manual entry for xyzzy')
  })

  it('still writes a page when the data is missing', () => {
    const bare = run('man devante', { profile: undefined, portfolio: undefined }).res ?? ''
    expect(bare).toContain('NAME')
    expect(bare).toContain('/cv')
    expect(bare).not.toMatch(/undefined/)
  })
})

describe('help and the command list', () => {
  const help = run('help').res ?? ''

  it('lists the new commands and Tab', () => {
    for (const word of ['cat <file>', 'type', 'cv', 'skills', 'tour', 'man <page>', 'Tab']) expect(help).toContain(word)
  })

  it('every command in help can be completed', () => {
    const named = help
      .split('\n')
      .filter((line) => /^ {2}[a-z]/.test(line))
      .flatMap((line) => line.trim().split(/\s{2,}/)[0].split(' / '))
      .map((usage) => usage.split(' ')[0])
    expect(named.length).toBeGreaterThan(15)
    for (const name of named) expect(TERMINAL_COMMANDS, name).toContain(name)
  })

  it('every command that can be completed is one the Terminal knows', () => {
    for (const name of TERMINAL_COMMANDS) expect(run(name).res ?? '', name).not.toMatch(/is not recognized/)
    expect([...TERMINAL_COMMANDS]).toEqual([...TERMINAL_COMMANDS].sort())
  })
})
