import { describe, it, expect, vi } from 'vitest'
import {
  PUTTY_SESSIONS,
  SHEET_HEADERS,
  SLIDE_HEADINGS,
  SLIDE_SIZE,
  WORD_PAGE_WIDTH,
  caseStudyDecks,
  cellValue,
  columnName,
  countWords,
  deckIndex,
  documentText,
  fitScale,
  formatState,
  linkLabel,
  loadChecked,
  pageStyles,
  portfolioSheet,
  printDocument,
  puttyBanner,
  puttyPrompt,
  puttyReply,
  runWordCommand,
  showKey,
  slideForKey,
  slideMetrics,
  slidePoints,
  stepPageZoom,
  stepSlide,
  swipeStep,
  watchFit,
  watchSwipe,
  wordEditor,
  zoomSliderAt,
  type CaseSlide,
} from '../../../assets/js/windowing/office.js'
import realPortfolio from '../../../data/portfolio.json'
import realFiles from '../../../data/filesystem.json'

const portfolio = {
  projects: [
    {
      id: 101,
      title: 'Coded Vision Design',
      description: 'My studio site.',
      tags: ['Next.js', 'React'],
      url: 'https://codedvisiondesign.co.uk/',
      thumbnail: 'portfolio/codedvisiondesign.webp',
      location: 'UK',
      country_code: 'gb',
    },
    {
      id: 10,
      title: 'Boulevard Logistics',
      description: 'Pricing engine.',
      tags: ['PHP'],
      url: 'https://boulevardlogistics.co.uk/',
      thumbnail: 'portfolio/boulevardlogistics.webp',
      location: 'Northern Ireland',
      country_code: 'gb-nir',
    },
  ],
}

const html = (markup: string) => {
  const root = document.createElement('div')
  root.innerHTML = markup
  return root
}

const key = (name: string, extra: Partial<KeyboardEvent> & { target?: Element | null } = {}) =>
  ({ key: name, ctrlKey: false, metaKey: false, altKey: false, target: null, ...extra }) as unknown as KeyboardEvent

describe('loadChecked', () => {
  const reply = (status: number, body: string) =>
    vi.fn(async () => new Response(body, { status, headers: { 'Content-Type': 'application/json' } }))

  it('returns the parsed JSON of a good response', async () => {
    const fetcher = reply(200, '{"projects":[]}')
    await expect(loadChecked('/data/portfolio.json', 'json', fetcher)).resolves.toEqual({ projects: [] })
    expect(fetcher).toHaveBeenCalledWith('/data/portfolio.json')
  })

  it('returns the text when asked for text', async () => {
    await expect(loadChecked('/data/cv.php', 'text', reply(200, '<h1>CV</h1>'))).resolves.toBe('<h1>CV</h1>')
  })

  it('rejects an error status instead of reading the error page', async () => {
    await expect(loadChecked('/data/cv.php', 'text', reply(500, '<h1>Server error</h1>'))).rejects.toThrow('HTTP 500')
    await expect(loadChecked('/data/portfolio.json', 'json', reply(404, 'Not found'))).rejects.toThrow('HTTP 404')
  })

  it('passes a network failure on', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(loadChecked('/data/cv.php', 'text', fetcher)).rejects.toThrow('Failed to fetch')
  })
})

describe('documentText and countWords', () => {
  it('counts the words a reader sees', () => {
    expect(countWords('Applications Support Engineer')).toBe(3)
    expect(countWords('  spread\n\tout   words ')).toBe(3)
  })

  it('counts numbers but not bullets, separators or emoji on their own', () => {
    expect(countWords('100+ projects · 8K+ devices 📧 99.9%')).toBe(5)
    expect(countWords('· | 📧 ·')).toBe(0)
  })

  it('counts nothing in empty or missing text', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
    expect(countWords(null)).toBe(0)
    expect(countWords(undefined)).toBe(0)
  })

  it('reads text, not markup', () => {
    const root = html('<div class="text-4xl font-bold uppercase"><span style="color: red">Hello</span> world</div>')
    expect(documentText(root).trim()).toBe('Hello world')
    expect(countWords(documentText(root))).toBe(2)
  })

  it('keeps words apart across lines and paragraphs, as Enter writes them', () => {
    expect(countWords(documentText(html('hello<div>world</div><p>again</p>line<br>break')))).toBe(5)
    expect(countWords(documentText(html('<ul><li>one</li><li>two</li></ul>')))).toBe(2)
  })

  it('keeps a word whole when only part of it is formatted', () => {
    expect(countWords(documentText(html('<b>Hel</b>lo <i>wor</i><u>ld</u>')))).toBe(2)
  })

  it('reads nothing from a missing editor', () => {
    expect(documentText(null)).toBe('')
  })
})

describe('fitScale', () => {
  it('shrinks the page to the width there is', () => {
    expect(fitScale({ width: 408 }, { width: WORD_PAGE_WIDTH })).toBeCloseTo(0.5)
  })

  it('never grows past full size', () => {
    expect(fitScale({ width: 2000 }, { width: WORD_PAGE_WIDTH })).toBe(1)
  })

  it('fits a slide inside both edges', () => {
    expect(fitScale({ width: 960, height: 270 }, SLIDE_SIZE)).toBeCloseTo(0.5)
    expect(fitScale({ width: 480, height: 2000 }, SLIDE_SIZE)).toBeCloseTo(0.5)
  })

  it('keeps to the floor when there is no room or the size is unknown', () => {
    expect(fitScale({ width: 0 }, { width: WORD_PAGE_WIDTH }, { min: 0.2 })).toBe(0.2)
    expect(fitScale({ width: Number.NaN }, { width: WORD_PAGE_WIDTH }, { min: 0.2 })).toBe(0.2)
    expect(fitScale({ width: 500 }, { width: 0 })).toBe(1)
  })
})

describe('watchFit', () => {
  const observers: { callback: () => void; disconnect: ReturnType<typeof vi.fn> }[] = []
  class FakeResizeObserver {
    disconnect = vi.fn()
    constructor(callback: () => void) {
      observers.push({ callback, disconnect: this.disconnect })
    }
    observe() {}
  }

  const area = (width: number, height: number, padding = 0) => {
    const el = document.createElement('div')
    el.style.padding = `${padding}px`
    document.body.append(el)
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => width })
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => height })
    return el
  }

  it('fits now and again whenever the space changes, inside the padding', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const el = area(456, 900, 24)
    const scales: number[] = []
    const stop = watchFit(el, { width: WORD_PAGE_WIDTH }, (scale) => scales.push(scale))
    expect(scales).toEqual([0.5])
    Object.defineProperty(el, 'clientWidth', { get: () => 2000 })
    observers.at(-1)?.callback()
    expect(scales).toEqual([0.5, 1])
    stop()
    expect(observers.at(-1)?.disconnect).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('fits a slide by both edges', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const scales: number[] = []
    watchFit(area(960, 270), SLIDE_SIZE, (scale) => scales.push(scale))
    expect(scales[0]).toBeCloseTo(0.5)
    vi.unstubAllGlobals()
  })

  it('waits while there is no space, as when the window is minimised', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const scales: number[] = []
    watchFit(area(0, 0), { width: WORD_PAGE_WIDTH }, (scale) => scales.push(scale))
    expect(scales).toEqual([])
    expect(() => watchFit(null, SLIDE_SIZE, () => {})()).not.toThrow()
    vi.unstubAllGlobals()
  })
})

describe('stepPageZoom', () => {
  it('steps by ten per cent', () => {
    expect(stepPageZoom(1, 1)).toBeCloseTo(1.1)
    expect(stepPageZoom(1, -1)).toBeCloseTo(0.9)
  })

  it('lands back on a round step from a fitted zoom', () => {
    expect(stepPageZoom(0.43, 1)).toBeCloseTo(0.5)
    expect(stepPageZoom(0.43, -1)).toBeCloseTo(0.4)
  })

  it('stays between a quarter and double size', () => {
    expect(stepPageZoom(0.25, -1)).toBe(0.25)
    expect(stepPageZoom(2, 1)).toBe(2)
    expect(stepPageZoom(Number.NaN, 1)).toBeCloseTo(1.1)
  })
})

describe('zoomSliderAt', () => {
  it('puts 100% in the middle, as Word does', () => {
    expect(zoomSliderAt(1)).toBeCloseTo(0.5)
  })

  it('runs from the smallest zoom to the largest', () => {
    expect(zoomSliderAt(0.25)).toBe(0)
    expect(zoomSliderAt(2)).toBe(1)
    expect(zoomSliderAt(1.5)).toBeCloseTo(0.75)
  })

  it('keeps the knob on the track for any value', () => {
    expect(zoomSliderAt(0.01)).toBe(0)
    expect(zoomSliderAt(9)).toBe(1)
    expect(zoomSliderAt(Number.NaN)).toBeCloseTo(0.5)
  })
})

describe('wordEditor', () => {
  const setup = () => {
    const editor = html('<p>first words</p><p>second</p>')
    editor.contentEditable = 'true'
    document.body.append(editor)
    const execCommand = vi.fn(() => true)
    Object.assign(document, { execCommand, queryCommandState: (name: string) => name === 'bold' })
    const formats: { bold: boolean }[] = []
    const controller = wordEditor(editor, { onFormat: (format) => formats.push(format) })
    return { editor, execCommand, formats, controller }
  }
  const select = (node: Node, start: number, end: number) => {
    const range = document.createRange()
    range.setStart(node, start)
    range.setEnd(node, end)
    const selection = document.getSelection() as Selection
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
  }

  it('reports the formatting wherever the caret goes in the editor', () => {
    const { editor, formats, controller } = setup()
    select(editor.querySelector('p')?.firstChild as Node, 0, 5)
    expect(formats.at(-1)?.bold).toBe(true)
    controller.stop()
    editor.remove()
  })

  it('puts the selection back before a command, as a select or button may have taken focus', async () => {
    const { editor, execCommand, controller } = setup()
    const words = editor.querySelector('p')?.firstChild as Node
    select(words, 6, 11)
    document.getSelection()?.removeAllRanges()
    await controller.run('bold')
    expect(document.getSelection()?.toString()).toBe('words')
    expect(execCommand).toHaveBeenCalledWith('bold', false, undefined)
    controller.stop()
    editor.remove()
  })

  it('ignores a selection outside the editor, and stops listening when stopped', () => {
    const { editor, formats, controller } = setup()
    const outside = document.createElement('p')
    outside.textContent = 'elsewhere'
    document.body.append(outside)
    select(outside.firstChild as Node, 0, 4)
    expect(formats).toHaveLength(0)
    controller.stop()
    select(editor.querySelector('p')?.firstChild as Node, 0, 5)
    expect(formats).toHaveLength(0)
    outside.remove()
    editor.remove()
  })
})

describe('formatState', () => {
  const doc = (on: string[]) => ({ queryCommandState: (name: string) => on.includes(name) }) as unknown as Document

  it('reports the formatting at the caret', () => {
    expect(formatState(doc(['bold', 'justifyCenter']))).toEqual({
      bold: true,
      italic: false,
      underline: false,
      align: 'center',
    })
  })

  it('reads left alignment when nothing else is set', () => {
    expect(formatState(doc([])).align).toBe('left')
    expect(formatState(doc(['justifyRight'])).align).toBe('right')
  })

  it('reports nothing set when the browser cannot say', () => {
    const broken = {
      queryCommandState: () => {
        throw new Error('not supported')
      },
    } as unknown as Document
    expect(formatState(broken)).toEqual({ bold: false, italic: false, underline: false, align: 'left' })
  })
})

describe('runWordCommand', () => {
  it('runs a formatting command on the document', async () => {
    const execCommand = vi.fn(() => true)
    await runWordCommand('bold', undefined, { execCommand } as unknown as Document)
    expect(execCommand).toHaveBeenCalledWith('bold', false, undefined)
  })

  it('applies a style as a block format', async () => {
    const execCommand = vi.fn(() => true)
    await runWordCommand('style', 'title', { execCommand } as unknown as Document)
    expect(execCommand).toHaveBeenCalledWith('formatBlock', false, 'h1')
    await runWordCommand('style', 'normal', { execCommand } as unknown as Document)
    expect(execCommand).toHaveBeenCalledWith('formatBlock', false, 'p')
  })

  it('pastes from the clipboard, which execCommand cannot read', async () => {
    const execCommand = vi.fn(() => true)
    const clipboard = { readText: vi.fn(async () => 'pasted words') }
    await runWordCommand('paste', undefined, { execCommand } as unknown as Document, clipboard)
    expect(execCommand).toHaveBeenCalledWith('insertText', false, 'pasted words')
  })

  it('gives up quietly when a command or the clipboard is refused', async () => {
    const execCommand = vi.fn(() => {
      throw new Error('refused')
    })
    await expect(runWordCommand('italic', undefined, { execCommand } as unknown as Document)).resolves.toBe(false)
    const clipboard = { readText: vi.fn(async () => Promise.reject(new Error('denied'))) }
    await expect(
      runWordCommand('paste', undefined, { execCommand: vi.fn() } as unknown as Document, clipboard),
    ).resolves.toBe(false)
  })
})

describe('printDocument', () => {
  const popup = () => {
    let written = ''
    const win = {
      document: { open: vi.fn(), write: (text: string) => (written += text), close: vi.fn() },
      print: vi.fn(),
      focus: vi.fn(),
      setTimeout: (run: () => void) => run(),
    }
    return { win, written: () => written }
  }

  it('prints only the document it is given', () => {
    const { win, written } = popup()
    const opener = { open: vi.fn(() => win) }
    expect(printDocument({ title: 'CV', html: '<h1>DeVanté</h1>', styles: '<style>h1{}</style>' }, opener)).toBe(true)
    expect(written()).toContain('<h1>DeVanté</h1>')
    expect(written()).toContain('<style>h1{}</style>')
    expect(written()).toContain('<title>CV</title>')
    expect(win.print).toHaveBeenCalled()
  })

  it('escapes the title', () => {
    const { win, written } = popup()
    printDocument({ title: '<b>x</b>', html: '' }, { open: () => win })
    expect(written()).toContain('<title>&lt;b&gt;x&lt;/b&gt;</title>')
  })

  it('does nothing when a pop-up blocker stops the window', () => {
    expect(printDocument({ title: 'CV', html: 'x' }, { open: () => null })).toBe(false)
  })
})

describe('pageStyles', () => {
  const page = (head: string) => new DOMParser().parseFromString(`<html><head>${head}</head><body></body></html>`, 'text/html')

  it('copies the stylesheets and style blocks, in order', () => {
    const doc = page('<link rel="stylesheet" href="/assets/css/app.css"><style>p { color: red }</style>')
    expect(pageStyles(doc)).toBe('<link rel="stylesheet" href="/assets/css/app.css"><style>p { color: red }</style>')
  })

  it('leaves out links that are not stylesheets', () => {
    expect(pageStyles(page('<link rel="icon" href="/favicon.ico"><link rel="preload" href="/a.css">'))).toBe('')
  })

  it('copies nothing from a page without styles', () => {
    expect(pageStyles(page(''))).toBe('')
  })
})

describe('columnName', () => {
  it('names columns as Excel does', () => {
    expect(columnName(0)).toBe('A')
    expect(columnName(9)).toBe('J')
    expect(columnName(25)).toBe('Z')
  })

  it('carries on past Z', () => {
    expect(columnName(26)).toBe('AA')
    expect(columnName(27)).toBe('AB')
    expect(columnName(701)).toBe('ZZ')
    expect(columnName(702)).toBe('AAA')
  })

  it('names nothing for an index that is not a column', () => {
    expect(columnName(-1)).toBe('')
    expect(columnName(Number.NaN)).toBe('')
  })
})

describe('portfolioSheet', () => {
  it('puts the headings in row 1 and a project in each row after', () => {
    const sheet = portfolioSheet(portfolio)
    expect(sheet.columns).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'])
    expect(sheet.rows[0].cells.slice(0, SHEET_HEADERS.length).map((cell) => cell.value)).toEqual(SHEET_HEADERS)
    expect(sheet.rows[0].cells.every((cell) => cell.header)).toBe(true)
    expect(sheet.rows[1].cells.slice(0, 6).map((cell) => cell.value)).toEqual([
      '101',
      'Coded Vision Design',
      'UK',
      'GB',
      'Next.js, React',
      'https://codedvisiondesign.co.uk/',
    ])
    expect(sheet.rows[2].cells[3].value).toBe('GB-NIR')
    expect(sheet.rows[1].cells[0].ref).toBe('A2')
    expect(sheet.count).toBe(2)
  })

  it('fills the rest of the screen with empty rows', () => {
    const sheet = portfolioSheet(portfolio, { minRows: 20 })
    expect(sheet.rows).toHaveLength(20)
    expect(sheet.rows[19].number).toBe(20)
    expect(sheet.rows[19].cells.every((cell) => cell.value === '')).toBe(true)
    // Headings, two projects and always one empty row below them.
    expect(portfolioSheet(portfolio, { minRows: 2 }).rows).toHaveLength(4)
  })

  it('shows an empty sheet for data it cannot read', () => {
    for (const data of [null, {}, { projects: 'nope' }]) {
      const sheet = portfolioSheet(data)
      expect(sheet.count).toBe(0)
      expect(sheet.rows[1].cells.every((cell) => cell.value === '')).toBe(true)
    }
    const partial = portfolioSheet({ projects: [{ id: 7, title: 'No tags' }] })
    expect(partial.rows[1].cells.slice(0, 6).map((cell) => cell.value)).toEqual(['7', 'No tags', '', '', '', ''])
  })
})

describe('cellValue', () => {
  const sheet = portfolioSheet(portfolio)

  it('reads a cell by its reference', () => {
    expect(cellValue(sheet, 'B2')).toBe('Coded Vision Design')
    expect(cellValue(sheet, 'a1')).toBe('ID')
  })

  it('reads an empty cell as empty', () => {
    expect(cellValue(sheet, 'J20')).toBe('')
  })

  it('reads nothing for a reference off the sheet or not a reference at all', () => {
    expect(cellValue(sheet, 'Z99')).toBe('')
    expect(cellValue(sheet, 'hello')).toBe('')
  })
})

// ---- Case studies ----------------------------------------------------------------

const PROJECTS = 'C:\\Users\\DeVante\\Projects'
const FREELANCE = `${PROJECTS}\\Freelance`
const BOULEVARD = `${FREELANCE}\\Boulevard Logistics`

const files = {
  [PROJECTS]: [
    { name: 'Freelance', type: 'folder' },
    { name: 'Coded Vision Design', type: 'folder' },
  ],
  [`${PROJECTS}\\Coded Vision Design`]: [
    { name: 'Role_Description.txt', type: 'file', content: 'A role, not a case study.' },
  ],
  [FREELANCE]: [{ name: 'Boulevard Logistics', type: 'folder' }],
  [BOULEVARD]: [
    { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://boulevardlogistics.co.uk/' } },
    {
      name: 'requirements.txt',
      type: 'file',
      content: 'REQUIREMENTS:\n- Custom pricing engine.\n- Multi-variable calculation (fuel, pallets,\n  weight, distance).',
    },
    { name: 'plan.txt', type: 'file', content: 'PLAN:\n1. Audit the spreadsheet.\n2. Build the engine.' },
    {
      name: 'outcome.txt',
      type: 'file',
      content: 'OUTCOME:\n- Eliminated manual updates.\n- 75% reduction in booking time.\n- Live in production on PHP 8.5.',
    },
    { name: 'Pictures', type: 'folder' },
  ],
  [`${BOULEVARD}\\Pictures`]: [
    { name: 'Desktop UI.webp', type: 'image', url: 'portfolio/boulevardlogistics.webp' },
    { name: 'Mobile UI.webp', type: 'image', url: 'portfolio/boulevardlogistics-mobile.webp' },
  ],
}

const kinds = (slides: CaseSlide[]) => slides.map((slide) => `${slide.kind}:${slide.id}`)
const WHOLE = ['title:title', 'points:problem', 'points:approach', 'points:outcome', 'metrics:metrics', 'shots:shots']

describe('caseStudyDecks', () => {
  it('builds a whole case study from a project and its folder', () => {
    const [, boulevard] = caseStudyDecks(portfolio, files, '/base/')
    expect(boulevard.id).toBe(10)
    expect(boulevard.title).toBe('Boulevard Logistics')
    expect(boulevard.cover).toBe('/base/portfolio/boulevardlogistics.webp')
    expect(kinds(boulevard.slides)).toEqual(WHOLE)
    expect(boulevard.slides[0]).toEqual({
      kind: 'title',
      id: 'title',
      heading: 'Boulevard Logistics',
      text: 'Pricing engine.',
      tags: ['PHP'],
      url: 'https://boulevardlogistics.co.uk/',
      link: 'boulevardlogistics.co.uk',
      image: '/base/portfolio/boulevardlogistics.webp',
      alt: 'The Boulevard Logistics website',
    })
    // The problem is the requirements text and the approach is the plan.
    expect(boulevard.slides[1]).toEqual({
      kind: 'points',
      id: 'problem',
      heading: 'Problem',
      items: ['Custom pricing engine.', 'Multi-variable calculation (fuel, pallets, weight, distance).'],
      ordered: false,
    })
    expect(boulevard.slides[2]).toMatchObject({
      heading: 'Approach',
      items: ['Audit the spreadsheet.', 'Build the engine.'],
      ordered: true,
    })
    expect(boulevard.slides[3]).toMatchObject({
      heading: 'Outcome',
      items: ['Eliminated manual updates.', '75% reduction in booking time.', 'Live in production on PHP 8.5.'],
    })
    // A version number is not a result, so only the 75% counts.
    expect(boulevard.slides[4]).toEqual({
      kind: 'metrics',
      id: 'metrics',
      heading: 'Metrics',
      metrics: [{ figure: '75%', text: '75% reduction in booking time.' }],
    })
    expect(boulevard.slides[5]).toEqual({
      kind: 'shots',
      id: 'shots',
      heading: 'Desktop and mobile',
      shots: [
        { name: 'Desktop UI', url: '/base/portfolio/boulevardlogistics.webp', alt: 'Boulevard Logistics, Desktop UI' },
        { name: 'Mobile UI', url: '/base/portfolio/boulevardlogistics-mobile.webp', alt: 'Boulevard Logistics, Mobile UI' },
      ],
    })
  })

  it('leaves out each part a project does not have, rather than filling it', () => {
    // Coded Vision Design's folder holds a role, not a problem, approach or outcome.
    const [studio] = caseStudyDecks(portfolio, files)
    expect(kinds(studio.slides)).toEqual(['title:title', 'shots:shots'])
    // With only one shot, the slide is named after it.
    expect(studio.slides[1]).toMatchObject({
      heading: 'Desktop UI',
      shots: [{ name: 'Desktop UI', url: '/portfolio/codedvisiondesign.webp' }],
    })

    // An outcome with no figures in it has no metrics.
    const plain = {
      ...files,
      [BOULEVARD]: files[BOULEVARD].map((entry) =>
        entry.name === 'outcome.txt' ? { ...entry, content: 'OUTCOME:\n- Eliminated manual updates.' } : entry,
      ),
    }
    expect(kinds(caseStudyDecks(portfolio, plain)[1].slides)).toEqual(WHOLE.filter((kind) => kind !== 'metrics:metrics'))

    // An empty outcome and no shots at all.
    const thin = {
      ...files,
      [BOULEVARD]: files[BOULEVARD].map((entry) => (entry.name === 'outcome.txt' ? { ...entry, content: 'OUTCOME:\n' } : entry)),
      [`${BOULEVARD}\\Pictures`]: [],
    }
    const bare = { projects: [{ id: 10, title: 'Boulevard Logistics' }] }
    const [deck] = caseStudyDecks(bare, thin)
    expect(kinds(deck.slides)).toEqual(['title:title', 'points:problem', 'points:approach'])
    expect(deck.slides[0]).toMatchObject({ text: '', tags: [], url: '', link: '', image: '' })
    expect(deck.cover).toBe('')
  })

  it('gives a project with no folder only its title slide', () => {
    const [deck] = caseStudyDecks({ projects: [{ id: 5, title: 'Nowhere Ltd', description: 'Only this.' }] }, files)
    expect(kinds(deck.slides)).toEqual(['title:title'])
  })

  it('makes no decks from an empty list or data it cannot read', () => {
    expect(caseStudyDecks({ projects: [] }, files)).toEqual([])
    expect(caseStudyDecks(null, null)).toEqual([])
    expect(caseStudyDecks({ projects: {} }, 'nope')).toEqual([])
    // A project with no title has nothing to call its deck.
    expect(caseStudyDecks({ projects: [{ id: 1 }, portfolio.projects[1]] }, files)).toHaveLength(1)
  })

  describe('from the real data', () => {
    const decks = caseStudyDecks(realPortfolio, realFiles)
    const collapse = (value: string) => value.replace(/\s+/g, ' ')
    const sources = collapse(
      [
        JSON.stringify(realPortfolio.projects),
        ...Object.values(realFiles as Record<string, { content?: string }[]>).flatMap((entries) =>
          entries.map((entry) => entry.content ?? ''),
        ),
      ].join('\n'),
    )

    it('has a deck for every project, in the portfolio order', () => {
      expect(decks.map((deck) => deck.title)).toEqual(realPortfolio.projects.map((project) => project.title))
    })

    it('gives every freelance project its problem, approach, outcome and shots', () => {
      const freelance = (realFiles as Record<string, { name: string; type: string }[]>)[FREELANCE]
      for (const folder of freelance.filter((entry) => entry.type === 'folder')) {
        const deck = decks.find((item) => item.title === folder.name)
        expect(deck, folder.name).toBeDefined()
        const shown = kinds(deck?.slides ?? []).filter((kind) => kind !== 'metrics:metrics')
        expect(shown, folder.name).toEqual(WHOLE.filter((kind) => kind !== 'metrics:metrics'))
      }
    })

    it('shows metrics only for the projects whose outcome has figures in it', () => {
      const withMetrics = Object.fromEntries(
        decks
          .map((deck) => [deck.title, deck.slides.find((slide) => slide.kind === 'metrics')] as const)
          .filter(([, slide]) => slide)
          .map(([title, slide]) => [title, slide?.kind === 'metrics' ? slide.metrics.map((metric) => metric.figure) : []]),
      )
      expect(withMetrics).toEqual({
        'Bay Motors': ['#1'],
        'CPT Tours': ['9 days'],
        'Boulevard Logistics': ['75%'],
        'Euro-Goat': ['#1'],
        'BHR Recovery': ['4 hours', '72 hours'],
        'BJJ Havering': ['#1', '50%'],
        'Hameedahs Delights': ['24 hours'],
      })
    })

    it('puts nothing on a slide that is not already in the data', () => {
      const unsourced: string[] = []
      const check = (value: string) => {
        if (value && !sources.includes(collapse(value))) unsourced.push(value)
      }
      for (const deck of decks) {
        for (const slide of deck.slides) {
          expect(SLIDE_HEADINGS.includes(slide.heading) || slide.heading === deck.title, slide.heading).toBe(true)
          if (slide.kind === 'title') {
            ;[slide.text, ...slide.tags, slide.url, slide.link].forEach(check)
          } else if (slide.kind === 'points') {
            slide.items.forEach(check)
          } else if (slide.kind === 'metrics') {
            for (const metric of slide.metrics) {
              check(metric.text)
              expect(metric.text).toContain(metric.figure)
            }
          } else {
            for (const shot of slide.shots) check(shot.url.replace(/^\//, ''))
          }
        }
      }
      expect(unsourced).toEqual([])
    })
  })
})

describe('slideMetrics', () => {
  it('picks out the results that carry a figure, with the figure first', () => {
    expect(
      slideMetrics([
        'Reached #1 on Google for local searches within 3 weeks.',
        '50% increase in monthly student enrolments.',
        'Full project (Branding + Site) turned around in 72 hours.',
        'Drastic increase in new customer bookings.',
      ]),
    ).toEqual([
      { figure: '#1', text: 'Reached #1 on Google for local searches within 3 weeks.' },
      { figure: '50%', text: '50% increase in monthly student enrolments.' },
      { figure: '72 hours', text: 'Full project (Branding + Site) turned around in 72 hours.' },
    ])
  })

  it('does not take a version, an ordinal or a model for a result', () => {
    expect(slideMetrics(['Live in production; PHP 8.5 build.', 'Less reliance on 3rd party platforms.', 'Next.js 16'])).toEqual([])
  })

  it('finds none in nothing', () => {
    expect(slideMetrics([])).toEqual([])
    expect(slideMetrics(undefined)).toEqual([])
  })
})

describe('slidePoints', () => {
  it('reads one point to a line, without the heading line or the markers', () => {
    expect(slidePoints('PLAN:\n- One.\n- Two.')).toEqual({ items: ['One.', 'Two.'], ordered: false })
    expect(slidePoints('PLAN:\n1. One.\n2) Two.')).toEqual({ items: ['One.', 'Two.'], ordered: true })
  })

  it('joins a wrapped line to the point it continues, and keeps a plain line as a point', () => {
    expect(slidePoints('- Companion apps delivered\n  from the same codebase.\nPlain line.\r\n- Last.')).toEqual({
      items: ['Companion apps delivered from the same codebase.', 'Plain line.', 'Last.'],
      ordered: false,
    })
  })

  it('reads nothing from an empty file or one with only its heading', () => {
    expect(slidePoints('')).toEqual({ items: [], ordered: false })
    expect(slidePoints('OUTCOME:\n\n')).toEqual({ items: [], ordered: false })
    expect(slidePoints(undefined)).toEqual({ items: [], ordered: false })
  })
})

describe('deckIndex', () => {
  const decks = caseStudyDecks(portfolio, files)

  it('finds a deck by its project id, as a number or as text', () => {
    expect(deckIndex(decks, 10)).toBe(1)
    expect(deckIndex(decks, '10')).toBe(1)
    expect(deckIndex(decks, 101)).toBe(0)
  })

  it('starts on the first deck when none is asked for', () => {
    expect(deckIndex(decks, undefined)).toBe(0)
    expect(deckIndex(decks, null)).toBe(0)
  })

  it('starts on the first deck for one that does not exist, or when there are none', () => {
    expect(deckIndex(decks, 999)).toBe(0)
    expect(deckIndex([], 10)).toBe(0)
  })
})

describe('linkLabel', () => {
  it('shows an address as a person would type it', () => {
    expect(linkLabel('https://earthecho.co.uk/')).toBe('earthecho.co.uk')
    expect(linkLabel('https://www.baymotors.co.uk/')).toBe('www.baymotors.co.uk')
    expect(linkLabel('http://example.com/work/')).toBe('example.com/work')
  })

  it('leaves an address with no scheme as it is', () => {
    expect(linkLabel('example.com')).toBe('example.com')
  })

  it('shows nothing for no address', () => {
    expect(linkLabel('')).toBe('')
    expect(linkLabel(undefined)).toBe('')
  })
})

describe('stepSlide', () => {
  it('moves one slide either way', () => {
    expect(stepSlide(1, 1, 5)).toBe(2)
    expect(stepSlide(1, -1, 5)).toBe(0)
  })

  it('stops at the first and last slides', () => {
    expect(stepSlide(0, -1, 5)).toBe(0)
    expect(stepSlide(4, 1, 5)).toBe(4)
  })

  it('stays on the first slide of an empty deck', () => {
    expect(stepSlide(3, 1, 0)).toBe(0)
  })
})

describe('showKey', () => {
  it('ends the show on Esc', () => {
    expect(showKey(key('Escape'), 2, 5)).toBe('end')
  })

  it('moves between slides with the same keys as the editor', () => {
    expect(showKey(key('ArrowRight'), 2, 5)).toBe(3)
    expect(showKey(key('PageUp'), 2, 5)).toBe(1)
    expect(showKey(key('Home'), 2, 5)).toBe(0)
    expect(showKey(key('End'), 2, 5)).toBe(4)
  })

  it('leaves Esc with a modifier, and every other key, alone', () => {
    expect(showKey(key('Escape', { ctrlKey: true }), 2, 5)).toBeNull()
    expect(showKey(key('Escape', { shiftKey: true }), 2, 5)).toBeNull()
    expect(showKey(key('x'), 2, 5)).toBeNull()
  })
})

describe('swipeStep', () => {
  it('goes on when the finger moves left and back when it moves right', () => {
    expect(swipeStep({ x: 300, y: 200 }, { x: 180, y: 210 })).toBe(1)
    expect(swipeStep({ x: 100, y: 200 }, { x: 220, y: 190 })).toBe(-1)
  })

  it('ignores a short or mostly upright movement', () => {
    expect(swipeStep({ x: 100, y: 200 }, { x: 130, y: 200 })).toBe(0)
    expect(swipeStep({ x: 100, y: 100 }, { x: 170, y: 300 })).toBe(0)
  })

  it('ignores a swipe with no start or end', () => {
    expect(swipeStep(null, { x: 0, y: 0 })).toBe(0)
    expect(swipeStep({ x: 0, y: 0 }, null)).toBe(0)
  })
})

describe('watchSwipe', () => {
  // WebKit's desktop port cannot build Touch objects, so the page tests raise
  // plain events carrying touches, as these do.
  const raise = (target: Element, type: string, points: { x: number; y: number }[]) => {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'touches', { value: points.map((p) => ({ clientX: p.x, clientY: p.y })) })
    target.dispatchEvent(event)
  }

  it('reports a swipe across the element', () => {
    const element = document.createElement('div')
    const onStep = vi.fn()
    const stop = watchSwipe(element, onStep)
    raise(element, 'touchstart', [{ x: 300, y: 100 }])
    raise(element, 'touchmove', [{ x: 200, y: 105 }])
    raise(element, 'touchmove', [{ x: 120, y: 110 }])
    raise(element, 'touchend', [])
    expect(onStep).toHaveBeenCalledExactlyOnceWith(1)
    raise(element, 'touchstart', [{ x: 100, y: 100 }])
    raise(element, 'touchmove', [{ x: 260, y: 100 }])
    raise(element, 'touchend', [])
    expect(onStep).toHaveBeenLastCalledWith(-1)
    stop()
  })

  it('takes a tap, a pinch or a cancelled touch as no swipe', () => {
    const element = document.createElement('div')
    const onStep = vi.fn()
    watchSwipe(element, onStep)
    raise(element, 'touchstart', [{ x: 300, y: 100 }])
    raise(element, 'touchend', [])
    raise(element, 'touchstart', [{ x: 300, y: 100 }, { x: 340, y: 100 }])
    raise(element, 'touchmove', [{ x: 100, y: 100 }, { x: 380, y: 100 }])
    raise(element, 'touchend', [])
    raise(element, 'touchstart', [{ x: 300, y: 100 }])
    raise(element, 'touchmove', [{ x: 100, y: 100 }])
    raise(element, 'touchcancel', [])
    raise(element, 'touchend', [])
    expect(onStep).not.toHaveBeenCalled()
  })

  // Chrome takes a sideways swipe it is left to handle as a pan, and the finger
  // leaving at speed as a fling. The next tap then only stops that fling, so a
  // tap on Present or End show straight after a swipe would do nothing.
  it('keeps a sideways swipe from the browser, but leaves it an upright pan and a pinch', () => {
    const element = document.createElement('div')
    watchSwipe(element, vi.fn())
    const moved = (points: { x: number; y: number }[]) => {
      const event = new Event('touchmove', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', { value: points.map((p) => ({ clientX: p.x, clientY: p.y })) })
      element.dispatchEvent(event)
      return event.defaultPrevented
    }
    raise(element, 'touchstart', [{ x: 300, y: 100 }])
    expect(moved([{ x: 280, y: 104 }])).toBe(true)
    expect(moved([{ x: 200, y: 110 }])).toBe(true)
    raise(element, 'touchend', [])

    raise(element, 'touchstart', [{ x: 300, y: 100 }])
    expect(moved([{ x: 304, y: 160 }])).toBe(false)
    raise(element, 'touchend', [])

    raise(element, 'touchstart', [{ x: 300, y: 100 }, { x: 340, y: 100 }])
    expect(moved([{ x: 200, y: 100 }, { x: 400, y: 100 }])).toBe(false)
    raise(element, 'touchend', [])
  })

  it('stops listening when told to, and does nothing without an element', () => {
    const element = document.createElement('div')
    const onStep = vi.fn()
    watchSwipe(element, onStep)()
    raise(element, 'touchstart', [{ x: 300, y: 100 }])
    raise(element, 'touchmove', [{ x: 100, y: 100 }])
    raise(element, 'touchend', [])
    expect(onStep).not.toHaveBeenCalled()
    expect(() => watchSwipe(null, onStep)()).not.toThrow()
  })
})

describe('slideForKey', () => {
  it('moves to the next and previous slide', () => {
    expect(slideForKey(key('ArrowRight'), 0, 5)).toBe(1)
    expect(slideForKey(key('PageDown'), 1, 5)).toBe(2)
    expect(slideForKey(key('ArrowLeft'), 3, 5)).toBe(2)
    expect(slideForKey(key('ArrowUp'), 3, 5)).toBe(2)
    expect(slideForKey(key('Home'), 3, 5)).toBe(0)
    expect(slideForKey(key('End'), 0, 5)).toBe(4)
  })

  it('stays on the first and last slides at the ends', () => {
    expect(slideForKey(key('ArrowLeft'), 0, 5)).toBe(0)
    expect(slideForKey(key('ArrowRight'), 4, 5)).toBe(4)
  })

  it('leaves other keys, shortcuts and typing alone', () => {
    expect(slideForKey(key('a'), 0, 5)).toBeNull()
    expect(slideForKey(key('ArrowRight', { altKey: true }), 0, 5)).toBeNull()
    expect(slideForKey(key('ArrowRight', { ctrlKey: true }), 0, 5)).toBeNull()
    const field = document.createElement('input')
    expect(slideForKey(key('ArrowRight', { target: field }), 0, 5)).toBeNull()
    expect(slideForKey(key('ArrowRight'), 0, 0)).toBeNull()
  })
})

describe('PuTTY', () => {
  const date = new Date(2026, 10, 6, 9, 5, 1)

  it('keeps the saved sessions in one place', () => {
    expect(PUTTY_SESSIONS[0]).toEqual({ name: 'Default Settings', host: '' })
    expect(PUTTY_SESSIONS.every((session) => typeof session.host === 'string')).toBe(true)
  })

  it('greets a session as an Ubuntu server does', () => {
    const banner = puttyBanner({ host: '192.168.1.42', port: 22, date })
    expect(banner[0]).toBe('login as: devante')
    expect(banner).toContain('Last login: Fri Nov  6 09:05:01 2026 from 192.168.1.10')
    expect(banner.some((line) => line.includes('Welcome to Ubuntu'))).toBe(true)
  })

  it('dates the last login now when no date is given', () => {
    expect(puttyBanner({ host: 'h' }).some((line) => /^Last login: \w{3} \w{3} [ \d]\d \d\d:\d\d:\d\d \d{4} from /.test(line))).toBe(true)
  })

  it('prompts with the short host name, or the whole address', () => {
    expect(puttyPrompt('staging.example.co.uk')).toBe('devante@staging:~$')
    expect(puttyPrompt('192.168.1.42')).toBe('devante@192.168.1.42:~$')
    expect(puttyPrompt('')).toBe('devante@:~$')
  })

  it('answers the commands it knows', () => {
    const ctx = { host: 'staging.example.co.uk', date }
    expect(puttyReply('whoami', ctx).lines).toEqual(['devante'])
    expect(puttyReply('  hostname ', ctx).lines).toEqual(['staging'])
    expect(puttyReply('clear', ctx)).toEqual({ lines: [], clear: true, exit: false })
    expect(puttyReply('exit', ctx)).toEqual({ lines: ['logout'], clear: false, exit: true })
  })

  it('says nothing for an empty line', () => {
    expect(puttyReply('   ', { host: 'h', date })).toEqual({ lines: [], clear: false, exit: false })
  })

  it('reports a command it does not know, as bash does', () => {
    expect(puttyReply('rm -rf /', { host: 'h', date }).lines).toEqual(['-bash: rm: command not found'])
  })
})
