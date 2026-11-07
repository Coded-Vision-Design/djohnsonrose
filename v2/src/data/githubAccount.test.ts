import { describe, it, expect } from 'vitest'
import profile from '../../../data/profile.json'

// The owner's decision: no GitHub account name, profile or repository link
// anywhere on the site, for now. This reads every file either build serves or
// renders from (pages, partials, shared scripts and styles, data, llms.txt,
// v2's sources and its index.html) and looks for one. Comments citing someone
// else's project on GitHub, such as the Selawik font, are fine.

// The References app's file is encrypted, and is left alone.
const SERVED: Record<string, string> = {
  ...import.meta.glob<string>(['../../../partials/**/*.php', '../../../pages/**/*.php', '../../../api/**/*.php', '../../../lib/**/*.php'], { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>(['../../../assets/js/**/*.js', '../../../assets/css/**/*.css'], { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>(['../../../data/*.json', '!../../../data/references.enc.json', '../../../data/cv.php'], { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>(['../../../{llms,llm,robots}.txt', '../../../{manifest,sitemap}.*', '../../../{index,router,bootstrap,config}.php'], { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>(['../../index.html', '../../public/**/*.{json,svg,txt,html}'], { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>(['../**/*.{ts,tsx,js,css,json}', '!../**/*.test.{ts,tsx}', '!../test/**'], { query: '?raw', import: 'default', eager: true }),
}

/** Other people's projects on GitHub that a file may cite. */
const THIRD_PARTY = ['github.com/microsoft/Selawik']

/** Each GitHub link or account name in a text, other than a third-party citation. */
function accountMentions(text: string): string[] {
  const links = [...text.matchAll(/github\.com\/[\w.-]*(?:\/[\w.-]+)?/gi)]
    .map((m) => m[0].replace(/\.+$/, ''))
    .filter((link) => !THIRD_PARTY.some((allowed) => link.toLowerCase() === allowed.toLowerCase()))
  const names = [...text.matchAll(/CodedVisionDesign|Coded-Vision-Design/g)].map((m) => m[0])
  return [...links, ...names]
}

describe('accountMentions', () => {
  it('finds a profile link, a repository link and the account names', () => {
    expect(accountMentions('see https://github.com/CodedVisionDesign')).toEqual([
      'github.com/CodedVisionDesign',
      'CodedVisionDesign',
    ])
    expect(accountMentions("window.open('https://github.com/someone/repo/blob/main/x')")).toEqual(['github.com/someone/repo'])
    expect(accountMentions('<span>Coded-Vision-Design</span>')).toEqual(['Coded-Vision-Design'])
  })

  it('leaves the studio name, its own website and third-party citations alone', () => {
    expect(accountMentions('Coded Vision Design, https://codedvisiondesign.co.uk/, portfolio/codedvisiondesign.webp')).toEqual([])
    expect(accountMentions('/* https://github.com/microsoft/Selawik. Shared by both builds */')).toEqual([])
    expect(accountMentions('the GitHub app, github.webp')).toEqual([])
  })

  it('finds a bare github.com/ with no account after it', () => {
    expect(accountMentions('href="https://github.com/"')).toEqual(['github.com/'])
  })
})

describe('no GitHub account on the site', () => {
  it('reads the files both builds serve', () => {
    const names = Object.keys(SERVED)
    for (const expected of [
      '../../../partials/apps/github.php',
      '../../../partials/shell.php',
      '../../../partials/cv-page.php',
      '../../../pages/privacy.php',
      '../../../assets/js/windowing/terminal.js',
      '../../../data/profile.json',
      '../../../data/portfolio.json',
      '../../../data/cv.php',
      '../../../llms.txt',
      '../../../llm.txt',
      '../../../manifest.json',
      '../../index.html',
      '../apps/github/GitHub.tsx',
    ]) {
      expect(names, expected).toContain(expected)
    }
    expect(names.some((name) => name.endsWith('.test.ts'))).toBe(false)
  })

  it('names no GitHub account and links to none', () => {
    const found = Object.entries(SERVED).flatMap(([file, text]) => accountMentions(text).map((hit) => `${file}: ${hit}`))
    expect(found).toEqual([])
  })

  it('leaves the GitHub field of data/profile.json empty', () => {
    expect(profile.github).toBe('')
  })
})
