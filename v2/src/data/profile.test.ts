import { describe, it, expect } from 'vitest'
import profile from '../../../data/profile.json'
import portfolio from '../../../data/portfolio.json'
import shellPhp from '../../../partials/shell.php?raw'
import indexHtml from '../../index.html?raw'
import sitemap from '../../../sitemap.xml?raw'
import llms from '../../../llms.txt?raw'

// The head of each desktop is written by hand: v1's in partials/shell.php and
// v2's in index.html. These checks keep the two identical where they must be,
// and tie the structured data to data/profile.json, which /cv reads too.

const HEADS = { v1: shellPhp, v2: indexHtml }
const SHARE_IMAGE = `${profile.url}assets/img/share-card.png`

/** The content of a <meta> tag, by its property or name. */
function meta(html: string, key: string) {
  const tag = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))
  return tag?.[1]
}

const canonical = (html: string) => html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]

type Node = Record<string, unknown> & { '@type': string }

/** One node of the JSON-LD graph, by its type. */
function node(html: string, type: string): Node | undefined {
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
  if (!block) return undefined
  const graph = (JSON.parse(block) as { '@graph': Node[] })['@graph']
  return graph.find((n) => n['@type'] === type)
}

describe('desktop metadata', () => {
  it.each(Object.entries(HEADS))('%s points its canonical at the one desktop URL', (_, html) => {
    expect(canonical(html)).toBe('https://devante.johnson-rose.co.uk/')
    expect(meta(html, 'og:url')).toBe(canonical(html))
  })

  it.each(Object.entries(HEADS))('%s shares the 1200x630 card', (_, html) => {
    expect(meta(html, 'og:image')).toBe(SHARE_IMAGE)
    expect(meta(html, 'twitter:image')).toBe(SHARE_IMAGE)
    expect(meta(html, 'og:image:width')).toBe('1200')
    expect(meta(html, 'og:image:height')).toBe('630')
    expect(meta(html, 'og:image:type')).toBe('image/png')
    expect(meta(html, 'og:image:alt')).toBeTruthy()
    expect(meta(html, 'twitter:image:alt')).toBe(meta(html, 'og:image:alt'))
    expect(meta(html, 'twitter:card')).toBe('summary_large_image')
  })

  it('gives both builds the same share text for the image', () => {
    expect(meta(indexHtml, 'og:image:alt')).toBe(meta(shellPhp, 'og:image:alt'))
  })

  it('describes the same person in both builds', () => {
    const v1 = node(shellPhp, 'Person')
    expect(v1).toBeDefined()
    expect(node(indexHtml, 'Person')).toEqual(v1)
  })

  it('describes the same website in both builds', () => {
    const v1 = node(shellPhp, 'WebSite')
    expect(v1).toBeDefined()
    expect(node(indexHtml, 'WebSite')).toEqual(v1)
  })

  it('fills out the person from data/profile.json', () => {
    const person = node(shellPhp, 'Person')!
    expect(person['@id']).toBe(`${profile.url}#person`)
    expect(person.jobTitle).toBeTruthy()
    expect(person.worksFor).toEqual(
      profile.worksFor.map((name) => expect.objectContaining({ '@type': 'Organization', name })),
    )
    expect(person.alumniOf).toEqual({ '@type': 'CollegeOrUniversity', name: profile.alumniOf })
    expect(person.knowsAbout).toEqual(profile.knowsAbout)
    expect(person.sameAs).toEqual([profile.github, profile.linkedin].filter(Boolean))
  })
})

describe('sitemap.xml', () => {
  const urls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1])
  const locs = urls.map((u) => u.match(/<loc>(.*?)<\/loc>/)?.[1])

  it('lists the desktop, the CV and the privacy notice', () => {
    expect(locs).toEqual([profile.url, `${profile.url}cv`, `${profile.url}privacy`])
  })

  it('leaves out addresses whose canonical is the desktop', () => {
    expect(sitemap).not.toContain('/app/')
    expect(sitemap).not.toContain('/v2/')
  })

  it('dates every entry', () => {
    for (const url of urls) {
      const lastmod = url.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1]
      expect(lastmod, url).toBeDefined()
      expect(lastmod! >= '2026-11-06', url).toBe(true)
    }
  })
})

describe('llms.txt', () => {
  it('opens with the name and a summary', () => {
    const [title, , summary] = llms.split(/\r?\n/)
    expect(title).toBe(`# ${profile.name}`)
    expect(summary.startsWith('> ')).toBe(true)
  })

  it('links the CV page and the PDF', () => {
    expect(llms).toContain(`(${profile.url}cv)`)
    expect(llms).toContain(`(${profile.url}data/cv.pdf)`)
  })

  it('uses the CV headline', () => {
    expect(llms).toContain(profile.headline)
  })

  it('lists the featured projects', () => {
    const featured = portfolio.projects.filter((p) => 'featured' in p && p.featured)
    expect(featured).toHaveLength(4)
    for (const project of featured) expect(llms).toContain(`[${project.title}](${project.url})`)
  })

  it('keeps to the house style', () => {
    expect(llms).not.toMatch(/[\u2013\u2014]/)
  })
})
