import { describe, it, expect } from 'vitest'
import shell from '../../../partials/shell.php?raw'

// v1 spreads every shared module into one object, window.OsWindowing (see
// partials/shell.php). Two modules exporting the same name would clash there,
// the later one silently winning, while v2, which imports each module by name,
// kept working: so v1 alone would break. Every exported name must be unique.

const modules = import.meta.glob<string>('../../../assets/js/windowing/*.js', { query: '?raw', import: 'default', eager: true })

function spreadModules(page: string): string[] {
  const imports = Object.fromEntries(
    [...page.matchAll(/import \* as (\w+) from '[^']*windowing\/([\w-]+)\.js/g)].map((m) => [m[1], m[2]]),
  )
  const spread = /window\.OsWindowing = \{([^}]*)\}/.exec(page)?.[1] ?? ''
  return [...spread.matchAll(/\.\.\.(\w+)/g)].map((m) => imports[m[1]])
}

function exportedNames(source: string): string[] {
  return [...source.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1])
}

describe('window.OsWindowing', () => {
  it('spreads modules that all exist', () => {
    const files = spreadModules(shell)
    expect(files.length).toBeGreaterThan(10)
    for (const file of files) expect(modules[`../../../assets/js/windowing/${file}.js`], file).toBeDefined()
  })

  it('gets every name from one module only', () => {
    const owner: Record<string, string> = {}
    const clashes: string[] = []
    for (const file of spreadModules(shell)) {
      for (const name of exportedNames(modules[`../../../assets/js/windowing/${file}.js`] ?? '')) {
        if (owner[name]) clashes.push(`${name}: ${owner[name]} and ${file}`)
        else owner[name] = file
      }
    }
    expect(clashes).toEqual([])
  })
})
