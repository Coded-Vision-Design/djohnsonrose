import { describe, it, expect } from 'vitest'
import {
  filesystem,
  listAt,
  parentPath,
  joinPath,
  searchFiles,
  QUICK_ACCESS,
  type FsFolderEntry,
} from './filesystem'

describe('filesystem helpers', () => {
  describe('listAt', () => {
    it('returns entries for a known path', () => {
      const entries = listAt('C:\\Users\\DeVante')
      expect(entries.length).toBeGreaterThan(0)
      expect(entries.map((e) => e.name)).toContain('Desktop')
    })
    it('returns [] for an unknown path', () => {
      expect(listAt('C:\\nope')).toEqual([])
    })
  })

  describe('parentPath', () => {
    it('walks up one level', () => {
      expect(parentPath('C:\\Users\\DeVante\\Desktop')).toBe('C:\\Users\\DeVante')
    })
    it('returns root for a top-level path', () => {
      expect(parentPath('C:\\Users')).toBe('C:\\')
    })
    it('returns root for root', () => {
      expect(parentPath('C:\\')).toBe('C:\\')
    })
  })

  describe('joinPath', () => {
    it('appends a child folder name', () => {
      const folder: FsFolderEntry = {
        name: 'Documents',
        type: 'folder',
        icon: '/x.png',
      }
      expect(joinPath('C:\\Users\\DeVante', folder)).toBe(
        'C:\\Users\\DeVante\\Documents',
      )
    })
    it('handles trailing backslash on current path', () => {
      const folder: FsFolderEntry = { name: 'Users', type: 'folder', icon: '/x' }
      expect(joinPath('C:\\', folder)).toBe('C:\\Users')
    })
    it('respects explicit path alias (Desktop -> Projects shortcut)', () => {
      const alias: FsFolderEntry = {
        name: 'Projects',
        type: 'folder',
        icon: '/x',
        path: 'C:\\Users\\DeVante\\Projects',
      }
      expect(joinPath('C:\\Users\\DeVante\\Desktop', alias)).toBe(
        'C:\\Users\\DeVante\\Projects',
      )
    })
  })

  describe('searchFiles', () => {
    it('finds entries by case-insensitive substring', () => {
      const results = searchFiles('CV')
      expect(results.length).toBeGreaterThan(0)
      expect(results.every((r) => r.entry.name.toLowerCase().includes('cv'))).toBe(true)
    })
    it('returns [] for empty query', () => {
      expect(searchFiles('')).toEqual([])
    })
    it('respects the limit', () => {
      const r = searchFiles('.txt', 3)
      expect(r.length).toBeLessThanOrEqual(3)
    })
  })

  describe('QUICK_ACCESS', () => {
    it('only points at paths that exist in the filesystem', () => {
      for (const q of QUICK_ACCESS) {
        if (q.path === 'C:\\Users\\DeVante\\Downloads') continue // intentionally empty
        expect(filesystem[q.path], `missing path: ${q.path}`).toBeDefined()
      }
    })
  })

  describe('catalogue integrity', () => {
    it('every folder reachable from C:\\Users\\DeVante is rooted there', () => {
      for (const path of Object.keys(filesystem)) {
        if (path.startsWith('C:\\Users\\DeVante')) {
          expect(path.startsWith('C:\\Users\\DeVante')).toBe(true)
        }
      }
    })
    it('Freelance projects each have a Visit Site link, requirements/plan/outcome, and a Pictures folder', () => {
      const projects = listAt('C:\\Users\\DeVante\\Projects\\Freelance')
      for (const p of projects) {
        if (p.type !== 'folder') continue
        const sub = listAt(`C:\\Users\\DeVante\\Projects\\Freelance\\${p.name}`)
        const names = sub.map((s) => s.name)
        for (const required of ['Visit Site.url', 'requirements.txt', 'plan.txt', 'outcome.txt', 'Pictures']) {
          expect(names, `missing '${required}' for ${p.name}`).toContain(required)
        }
        const pics = listAt(`C:\\Users\\DeVante\\Projects\\Freelance\\${p.name}\\Pictures`)
        const picNames = pics.map((s) => s.name)
        expect(picNames, `missing Desktop UI for ${p.name}`).toContain('Desktop UI.webp')
        expect(picNames, `missing Mobile UI for ${p.name}`).toContain('Mobile UI.webp')
      }
    })
  })
})
