import { describe, it, expect } from 'vitest'
import { apps, getApp, listApps, groupAppsByLetter, searchApps } from './registry'

describe('apps registry', () => {
  it('includes all the apps the v1 PHP version had partials for', () => {
    const v1Apps = [
      'edge', 'vscode', 'explorer', 'terminal', 'notepad', 'word', 'excel',
      'powerpoint', 'outlook', 'photoshop', 'flstudio', 'docker', 'putty',
      'filezilla', 'database', 'settings', 'taskmanager', 'eventviewer',
      'calculator', 'paint', 'photos', 'video', 'pdfreader',
    ] as const
    for (const id of v1Apps) {
      expect(apps[id], `missing app: ${id}`).toBeDefined()
    }
  })

  it('every app has a non-empty title and icon', () => {
    for (const a of listApps()) {
      expect(a.title.length).toBeGreaterThan(0)
      expect(a.icon.length).toBeGreaterThan(0)
    }
  })

  it('getApp returns undefined for unknown ids', () => {
    expect(getApp('does-not-exist')).toBeUndefined()
  })

  it('searchApps is case-insensitive substring match', () => {
    const hits = searchApps('OFFI') // shouldn't match anything (no Office app)
    expect(hits.every((h) => h.title.toLowerCase().includes('offi'))).toBe(true)
    const wordHits = searchApps('word')
    expect(wordHits.map((h) => h.id)).toContain('word')
  })

  it('searchApps with empty query returns []', () => {
    expect(searchApps('')).toEqual([])
  })

  it('groupAppsByLetter buckets by first letter and sorts within each group', () => {
    const groups = groupAppsByLetter()
    // Letters in alphabetical order.
    const letters = groups.map((g) => g.letter)
    const sorted = [...letters].sort()
    expect(letters).toEqual(sorted)
    // Within a letter group, apps sorted by title.
    for (const g of groups) {
      const titles = g.apps.map((a) => a.title)
      const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b))
      expect(titles).toEqual(sortedTitles)
    }
  })
})
