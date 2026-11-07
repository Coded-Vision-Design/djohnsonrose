import { describe, it, expect } from 'vitest'
import {
  SOURCE_FILES,
  SOURCE_START,
  closeSourceTab,
  highlightSource,
  openSourceTab,
  renderSource,
  sourceFolders,
  sourceGroups,
  sourceLanguage,
  sourceRows,
  sourceTree,
  sourceUrl,
  tokenizeSource,
  type SourceLanguage,
} from '../../../assets/js/windowing/source-viewer.js'
import rootRules from '../../../.htaccess?raw'
import dataRules from '../../../data/.htaccess?raw'
import deployConfig from '../../../deploy-config.json'

// VS Code's read-only view of the site's own source, shared by both builds.

const repoPath = (key: string) => key.replace(/^(\.\.\/)+/, '')
const onDisk = [
  ...Object.keys(import.meta.glob('../../../assets/js/windowing/*.js')),
  ...Object.keys(import.meta.glob('../../../assets/js/windowing/*.d.ts')),
  ...Object.keys(import.meta.glob('../../../assets/css/*.css')),
  ...Object.keys(import.meta.glob('../../../data/*.json')),
].map(repoPath)

const basename = (path: string) => path.split('/').pop() as string

/** The FilesMatch patterns an .htaccess file grants or denies. */
const filesMatch = (rules: string, verdict: 'granted' | 'denied') =>
  [...rules.matchAll(new RegExp(`<FilesMatch "([^"]+)">\\s*Require all ${verdict}`, 'g'))].map((m) => new RegExp(m[1]))

/** A deploy-config pattern as a regular expression, where * stands for any name. */
const globRule = (pattern: string) =>
  new RegExp('^' + pattern.replace(/[.+^$(){}|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$')

/** Whether a deploy leaves the path out, with rsync's rules: a pattern with no slash matches any part. */
const leftOutOfDeploy = (path: string) =>
  deployConfig.exclude_patterns.some((pattern) => {
    const glob = globRule(pattern)
    return pattern.includes('/')
      ? glob.test(path) || path.startsWith(`${pattern}/`)
      : path.split('/').some((part) => glob.test(part))
  })

const denied = filesMatch(rootRules, 'denied')
const [dataAllowed] = filesMatch(dataRules, 'granted')

/** What a visitor's browser can already download, as the rules above say. */
const isPublic = (path: string) =>
  !denied.some((rule) => rule.test(basename(path))) &&
  !leftOutOfDeploy(path) &&
  (!path.startsWith('data/') || dataAllowed.test(basename(path)))

describe('the files VS Code lists', () => {
  it('are every shared module, its types, every stylesheet and the public data, and nothing else', () => {
    const expected = onDisk
      .filter(isPublic)
      // The compiled stylesheet is one minified line, and the references are ciphertext.
      .filter((path) => path !== 'assets/css/app.css' && path !== 'data/references.enc.json')
      .sort()
    expect(expected.length).toBeGreaterThan(40)
    expect([...SOURCE_FILES], 'add the new file to SOURCE_FILES in assets/js/windowing/source-viewer.js').toEqual(expected)
  })

  it('all exist and all are public', () => {
    for (const path of SOURCE_FILES) {
      expect(onDisk, path).toContain(path)
      expect(isPublic(path), path).toBe(true)
    }
  })

  it('never include server code, config or secrets', () => {
    for (const path of SOURCE_FILES) {
      expect(path).not.toMatch(/\.php$|^lib\/|^api\/|\.env|config|\.htaccess|^\.|\/\./)
      expect(path).toMatch(/^(assets\/js\/windowing|assets\/css|data)\/[\w.-]+$/)
    }
  })

  it('the rules this test reads are really there', () => {
    expect(denied.length).toBeGreaterThan(2)
    expect(dataAllowed.test('portfolio.json')).toBe(true)
    expect(dataAllowed.test('profile.json')).toBe(false)
    expect(leftOutOfDeploy('assets/css/input.css')).toBe(true)
    expect(leftOutOfDeploy('assets/css/windowing.css')).toBe(false)
  })

  it('open on a file in the list', () => {
    expect(SOURCE_FILES).toContain(SOURCE_START)
  })
})

describe('sourceUrl', () => {
  it('points at a listed file under the site base', () => {
    expect(sourceUrl('/', 'assets/js/windowing/terminal.js')).toBe('/assets/js/windowing/terminal.js')
    expect(sourceUrl('/site/', 'data/portfolio.json')).toBe('/site/data/portfolio.json')
  })

  it('refuses anything not in the list', () => {
    for (const path of ['config.php', '.env', '../.env', 'lib/cv.php', 'api/app.php', 'data/profile.json', '']) {
      expect(sourceUrl('/', path), path).toBeNull()
    }
  })
})

describe('sourceLanguage', () => {
  it('knows each kind of file the viewer shows', () => {
    expect(sourceLanguage('assets/js/windowing/terminal.js')).toBe('javascript')
    expect(sourceLanguage('assets/js/windowing/terminal.d.ts')).toBe('typescript')
    expect(sourceLanguage('assets/css/office.css')).toBe('css')
    expect(sourceLanguage('data/portfolio.json')).toBe('json')
  })

  it('treats anything else as plain text', () => {
    expect(sourceLanguage('README')).toBe('text')
    expect(sourceLanguage('')).toBe('text')
  })
})

describe('the explorer tree', () => {
  const files = ['data/b.json', 'assets/js/x.js', 'assets/css/a.css', 'data/a.json', 'top.css']

  it('puts folders before files, each in name order', () => {
    const tree = sourceTree(files)
    expect(tree.map((node) => node.name)).toEqual(['assets', 'data', 'top.css'])
    expect(tree[0].children?.map((node) => node.path)).toEqual(['assets/css', 'assets/js'])
    expect(tree[1].children?.map((node) => node.name)).toEqual(['a.json', 'b.json'])
  })

  it('shows the rows of open folders only, with their depth', () => {
    expect(sourceRows(files, ['assets', 'assets/js'])).toEqual([
      { path: 'assets', name: 'assets', kind: 'folder', depth: 0, open: true },
      { path: 'assets/css', name: 'css', kind: 'folder', depth: 1, open: false },
      { path: 'assets/js', name: 'js', kind: 'folder', depth: 1, open: true },
      { path: 'assets/js/x.js', name: 'x.js', kind: 'file', depth: 2, open: false },
      { path: 'data', name: 'data', kind: 'folder', depth: 0, open: false },
      { path: 'top.css', name: 'top.css', kind: 'file', depth: 0, open: false },
    ])
  })

  it('shows only the top level when nothing is open, and nothing for no files', () => {
    expect(sourceRows(files, []).map((row) => row.path)).toEqual(['assets', 'data', 'top.css'])
    expect(sourceRows([], ['assets'])).toEqual([])
  })

  it('names the folders that hold a file', () => {
    expect(sourceFolders('assets/js/windowing/terminal.js')).toEqual(['assets', 'assets/js', 'assets/js/windowing'])
    expect(sourceFolders('top.css')).toEqual([])
  })

  it('groups the files by folder for the phone picker, in tree order', () => {
    expect(sourceGroups(files)).toEqual([
      { folder: 'assets/css', files: [{ path: 'assets/css/a.css', name: 'a.css' }] },
      { folder: 'assets/js', files: [{ path: 'assets/js/x.js', name: 'x.js' }] },
      { folder: 'data', files: [{ path: 'data/a.json', name: 'a.json' }, { path: 'data/b.json', name: 'b.json' }] },
      { folder: '', files: [{ path: 'top.css', name: 'top.css' }] },
    ])
  })
})

describe('tabs', () => {
  it('opens a file in a new tab, or brings its tab forward', () => {
    expect(openSourceTab({ tabs: [], active: null }, 'a')).toEqual({ tabs: ['a'], active: 'a' })
    expect(openSourceTab({ tabs: ['a', 'b'], active: 'b' }, 'a')).toEqual({ tabs: ['a', 'b'], active: 'a' })
  })

  it('closing the open tab moves to the one on its right, or its left at the end', () => {
    expect(closeSourceTab({ tabs: ['a', 'b', 'c'], active: 'b' }, 'b')).toEqual({ tabs: ['a', 'c'], active: 'c' })
    expect(closeSourceTab({ tabs: ['a', 'b', 'c'], active: 'c' }, 'c')).toEqual({ tabs: ['a', 'b'], active: 'b' })
  })

  it('closing another tab keeps the open one, and the last tab leaves nothing open', () => {
    expect(closeSourceTab({ tabs: ['a', 'b'], active: 'b' }, 'a')).toEqual({ tabs: ['b'], active: 'b' })
    expect(closeSourceTab({ tabs: ['a'], active: 'a' }, 'a')).toEqual({ tabs: [], active: null })
    expect(closeSourceTab({ tabs: ['a'], active: 'a' }, 'zz')).toEqual({ tabs: ['a'], active: 'a' })
  })
})

/** The coloured tokens of each line, as "type:text", leaving plain text out. */
const coloured = (text: string, language: SourceLanguage) =>
  tokenizeSource(text, language).map((line) => line.filter(([type]) => type !== 'plain').map(([type, t]) => `${type}:${t}`))

describe('tokenizeSource for JavaScript and TypeScript', () => {
  it('colours keywords, strings, comments and numbers', () => {
    expect(coloured("const a = 'x' + \"y\" + 0x1f + 2.5e3 // note", 'javascript')).toEqual([
      ['keyword:const', "string:'x'", 'string:"y"', 'number:0x1f', 'number:2.5e3', 'comment:// note'],
    ])
  })

  it('tells a regex from a division', () => {
    expect(coloured('return /a\\/b[/]c/g.test(s)', 'javascript')).toEqual([
      ['keyword:return', 'regex:/a\\/b[/]c/g', 'function:test'],
    ])
    expect(coloured('x = a / b / 2', 'javascript')).toEqual([['number:2']])
  })

  it('carries block comments and template strings over several lines', () => {
    expect(coloured('/* one\ntwo */ let\n`a\nb` + 1', 'javascript')).toEqual([
      ['comment:/* one'],
      ['comment:two */', 'keyword:let'],
      ['string:`a'],
      ['string:b`', 'number:1'],
    ])
  })

  it('colours literals, calls and type names', () => {
    expect(coloured('if (this.ok(null)) new Date(true)', 'javascript')).toEqual([
      ['keyword:if', 'literal:this', 'function:ok', 'literal:null', 'keyword:new', 'type:Date', 'literal:true'],
    ])
  })

  it('knows the TypeScript words in a .d.ts', () => {
    expect(coloured('export interface A { b?: string }', 'typescript')).toEqual([
      ['keyword:export', 'keyword:interface', 'type:A', 'type:string'],
    ])
  })

  it('stops an unclosed string at the end of its line', () => {
    expect(coloured("'abc\nconst", 'javascript')).toEqual([["string:'abc"], ['keyword:const']])
  })
})

describe('tokenizeSource for CSS', () => {
  it('colours selectors, properties and values', () => {
    expect(coloured('.a:hover, #b > c { color: #fff; margin: 0 10px !important }', 'css')).toEqual([
      [
        'selector:.a:hover,',
        'selector:#b',
        'selector:>',
        'selector:c',
        'property:color',
        'number:#fff',
        'property:margin',
        'number:0',
        'number:10px',
        'keyword:!important',
      ],
    ])
  })

  it('colours at-rules, nested rules, functions, strings and comments', () => {
    expect(coloured("@import 'x.css';\n@media (max-width: 767px) {\n  /* a */ .b { --c: var(--d) }\n}", 'css')).toEqual([
      ['at-rule:@import', "string:'x.css'"],
      ['at-rule:@media', 'number:767px'],
      ['comment:/* a */', 'selector:.b', 'property:--c', 'function:var'],
      [],
    ])
  })

  it('takes a last declaration with no semicolon', () => {
    expect(coloured('a{b:1}', 'css')).toEqual([['selector:a', 'property:b', 'number:1']])
  })
})

describe('tokenizeSource for JSON and text', () => {
  it('tells keys from values in JSON', () => {
    expect(coloured('{"a": 1, "b": "x",\n "c": [true, null, -2.5]}', 'json')).toEqual([
      ['property:"a"', 'number:1', 'property:"b"', 'string:"x"'],
      ['property:"c"', 'literal:true', 'literal:null', 'number:-2.5'],
    ])
  })

  it('leaves text plain, line by line', () => {
    expect(tokenizeSource('a<b\nc', 'text')).toEqual([[['plain', 'a<b']], [['plain', 'c']]])
  })

  it('gives an empty file one empty line', () => {
    expect(tokenizeSource('', 'javascript')).toEqual([[]])
  })
})

describe('highlightSource and renderSource', () => {
  it('escapes the source, so a file can never add markup', () => {
    const html = highlightSource('<script>alert("x")</script> & \'y\'', 'text')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;')
  })

  it('numbers every line, and wraps each colour in a class', () => {
    const html = highlightSource('let a\r\n\r\nb', 'javascript')
    expect(html.match(/class="vsc-ln"/g)).toHaveLength(3)
    expect(html).toContain('<span class="tok-keyword">let</span>')
    expect(html).not.toContain('\r')
    expect(html).not.toMatch(/style=/)
  })

  it('describes the file for the status bar', () => {
    expect(renderSource('a\nb\n', 'assets/js/windowing/x.d.ts')).toMatchObject({
      lines: 3,
      language: 'typescript',
      languageName: 'TypeScript',
    })
    expect(renderSource('', 'notes').lines).toBe(1)
  })
})
