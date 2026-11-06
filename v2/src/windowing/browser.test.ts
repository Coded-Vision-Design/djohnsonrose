import { describe, it, expect } from 'vitest'
import {
  HOME_TITLE,
  HOME_URL,
  featuredProjects,
  isExternal,
  navigateTab,
  newTab,
  normaliseAddress,
  projectTags,
  siteName,
  tabBack,
  tabForward,
  tabTitle,
} from '../../../assets/js/windowing/browser.js'
import portfolio from '../../../data/portfolio.json'

// The rules of the Chrome app both builds share: what an address means, the
// tabs' history, and which projects the home page shows.

describe('normaliseAddress', () => {
  it('keeps full web addresses and the home page', () => {
    expect(normaliseAddress('https://earthecho.co.uk/')).toBe('https://earthecho.co.uk/')
    expect(normaliseAddress('http://example.com')).toBe('http://example.com')
    expect(normaliseAddress(HOME_URL)).toBe(HOME_URL)
  })

  it('adds https:// to a bare site name, as Chrome does', () => {
    expect(normaliseAddress('  earthecho.co.uk ')).toBe('https://earthecho.co.uk')
    expect(normaliseAddress('www.bbc.co.uk/news')).toBe('https://www.bbc.co.uk/news')
  })

  it('turns words into a search, and an empty bar into the home page', () => {
    expect(normaliseAddress('jiu jitsu')).toBe('https://www.google.com/search?q=jiu%20jitsu')
    expect(normaliseAddress('   ')).toBe(HOME_URL)
  })
})

describe('site names and titles', () => {
  it('names a site by its host, without www', () => {
    expect(siteName('https://www.baymotors.co.uk/')).toBe('baymotors.co.uk')
    expect(tabTitle('https://earthecho.co.uk/about')).toBe('earthecho.co.uk')
  })

  it('calls the home page Featured Projects', () => {
    expect(tabTitle(HOME_URL)).toBe(HOME_TITLE)
    expect(HOME_TITLE).toBe('Featured Projects')
  })

  it('falls back to the text for something that is not an address', () => {
    expect(siteName('not a url')).toBe('not a url')
    expect(isExternal('https://x.co')).toBe(true)
    expect(isExternal(HOME_URL)).toBe(false)
    expect(isExternal('javascript:alert(1)')).toBe(false)
  })
})

describe('tab history', () => {
  it('a new tab starts at the address given, or home', () => {
    expect(newTab(1)).toMatchObject({ id: 1, url: HOME_URL, title: HOME_TITLE, back: [], forward: [] })
    expect(newTab(2, 'ramstaxis.co.uk')).toMatchObject({ url: 'https://ramstaxis.co.uk', title: 'ramstaxis.co.uk' })
  })

  it('navigates, goes back and forward', () => {
    const start = newTab(1)
    const away = navigateTab(start, 'earthecho.co.uk')
    expect(away).toMatchObject({ url: 'https://earthecho.co.uk', back: [HOME_URL], forward: [] })
    const back = tabBack(away)
    expect(back).toMatchObject({ url: HOME_URL, title: HOME_TITLE, back: [], forward: ['https://earthecho.co.uk'] })
    expect(tabForward(back)).toMatchObject({ url: 'https://earthecho.co.uk', back: [HOME_URL], forward: [] })
  })

  it('does nothing with no history, or when the address is the same', () => {
    const start = newTab(1)
    expect(tabBack(start)).toBe(start)
    expect(tabForward(start)).toBe(start)
    expect(navigateTab(start, HOME_URL)).toBe(start)
  })
})

describe('featured projects', () => {
  it('shows the featured projects from data/portfolio.json', () => {
    const shown = featuredProjects(portfolio.projects)
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.every((p) => 'featured' in p && p.featured)).toBe(true)
  })

  it('shows every project when none is featured, so the page never blanks', () => {
    const plain = [{ title: 'A' }, { title: 'B' }]
    expect(featuredProjects(plain)).toEqual(plain)
  })

  it('copes with a missing list and missing tags', () => {
    expect(featuredProjects(undefined)).toEqual([])
    expect(projectTags({ title: 'No tags' })).toEqual([])
    expect(projectTags({ title: 'Bad tags', tags: 'PHP' })).toEqual([])
    expect(projectTags({ title: 'Tags', tags: ['PHP'] })).toEqual(['PHP'])
  })
})
