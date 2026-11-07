import { describe, it, expect } from 'vitest'
import { filesystem } from './filesystem'
import { explorerSidebar, folderPath } from '../../../assets/js/windowing/file-ops.js'
import data from '../../../data/filesystem.json'

// data/filesystem.json, which both builds show. Path rules live in file-ops.js
// and are tested in src/windowing/fileOps.test.ts.

const raw = data as Record<string, { name: string; type: string; icon?: string; path?: string }[]>

describe('the shared file system', () => {
  it('gives every folder an entry of its own, so none opens to nothing', () => {
    const missing: string[] = []
    for (const [path, entries] of Object.entries(filesystem)) {
      for (const entry of entries) {
        if (entry.type !== 'folder') continue
        const target = folderPath(entry, path)
        if (!filesystem[target]) missing.push(target)
      }
    }
    expect(missing).toEqual([])
  })

  it('has Downloads and Public, which used to be missing', () => {
    expect(filesystem['C:\\Users\\DeVante\\Downloads']).toBeDefined()
    expect(filesystem['C:\\Users\\Public']).toBeDefined()
    expect(filesystem['C:\\Program Files\\XAMPP\\htdocs']).toBeDefined()
  })

  it('points every Explorer sidebar item at a folder that exists', () => {
    for (const item of explorerSidebar(filesystem, [], '/assets/img/')) {
      if (!item.path) continue
      expect(filesystem[item.path], `missing path: ${item.path}`).toBeDefined()
    }
  })

  it('names a picture for every icon, never an emoji', () => {
    const emoji: string[] = []
    for (const [path, entries] of Object.entries(raw)) {
      for (const entry of entries) {
        if (entry.icon && !/\.(webp|svg|png)$/.test(entry.icon)) emoji.push(`${path}\\${entry.name}: ${entry.icon}`)
      }
    }
    expect(emoji).toEqual([])
  })

  it('serves image icons from assets/img', () => {
    const desktop = filesystem['C:\\Users\\DeVante\\Desktop']
    expect(desktop.length).toBeGreaterThan(0)
    for (const entry of desktop) {
      if (entry.icon?.endsWith('.webp')) expect(entry.icon.startsWith('/assets/img/')).toBe(true)
    }
  })

  it('gives each freelance project a Visit Site link, requirements, plan, outcome and pictures', () => {
    const root = 'C:\\Users\\DeVante\\Projects\\Freelance'
    for (const project of filesystem[root]) {
      if (project.type !== 'folder') continue
      const names = filesystem[`${root}\\${project.name}`].map((entry) => entry.name)
      for (const required of ['Visit Site.url', 'requirements.txt', 'plan.txt', 'outcome.txt', 'Pictures']) {
        expect(names, `missing '${required}' for ${project.name}`).toContain(required)
      }
      const pictures = filesystem[`${root}\\${project.name}\\Pictures`].map((entry) => entry.name)
      expect(pictures, `missing Desktop UI for ${project.name}`).toContain('Desktop UI.webp')
      expect(pictures, `missing Mobile UI for ${project.name}`).toContain('Mobile UI.webp')
    }
  })

  // House style is British English, and visitors read these files as your own words.
  it('is written in British English', () => {
    const text = JSON.stringify(data)
    const american = /\b(optimiz\w*|inquir\w*|organiz\w*|behavior\w*|favorite\w*|travelers?|colors?|centers?)\b/gi
    expect(text.match(american) ?? []).toEqual([])
  })
})
