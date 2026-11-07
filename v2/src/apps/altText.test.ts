import { describe, it, expect } from 'vitest'

// Every picture in these v1 apps says what it shows, or alt="" when it only
// decorates, so a screen reader never reads out a file name.

const SOURCES = import.meta.glob('../../../partials/apps/*.php', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const PARTIALS = [
  'admin', 'calculator', 'database', 'docker', 'edge', 'eventviewer', 'explorer', 'filezilla',
  'flstudio', 'github', 'notepad', 'outlook', 'pdfreader', 'photos', 'references',
  'taskmanager', 'terminal', 'video', 'vscode',
]

/** The <img> tags in a partial that have no alt, with PHP blocks taken out first. */
function imagesWithoutAlt(source: string): string[] {
  const html = source.replace(/<\?php[\s\S]*?\?>/g, 'PHP')
  return [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((tag) => !/\s:?alt=/.test(tag))
}

describe('alt text in the v1 app partials', () => {
  it('finds a missing alt, and ignores PHP inside a tag', () => {
    expect(imagesWithoutAlt('<img src="a.webp">')).toHaveLength(1)
    expect(imagesWithoutAlt('<img src="<?php echo $x; ?>" alt="">')).toHaveLength(0)
    expect(imagesWithoutAlt('<img :src="x" :alt="name">')).toHaveLength(0)
  })

  for (const name of PARTIALS) {
    it(`${name}.php gives every image an alt`, () => {
      const source = SOURCES[`../../../partials/apps/${name}.php`]
      expect(source, `missing ${name}.php`).toBeDefined()
      expect(imagesWithoutAlt(source)).toEqual([])
    })
  }
})
