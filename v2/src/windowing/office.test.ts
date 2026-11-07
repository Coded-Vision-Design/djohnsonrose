import { describe, it, expect, vi } from 'vitest'
import {
  PUTTY_SESSIONS,
  SHEET_HEADERS,
  SLIDE_SIZE,
  WORD_PAGE_WIDTH,
  cellValue,
  columnName,
  countWords,
  documentText,
  fitScale,
  formatState,
  loadChecked,
  pageStyles,
  portfolioDeck,
  portfolioSheet,
  printDocument,
  puttyBanner,
  puttyPrompt,
  puttyReply,
  runWordCommand,
  slideForKey,
  stepPageZoom,
  watchFit,
  wordEditor,
  zoomSliderAt,
} from '../../../assets/js/windowing/office.js'

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

describe('portfolioDeck', () => {
  it('makes a slide of each project, with its picture under the base path', () => {
    const deck = portfolioDeck(portfolio, '/base/')
    expect(deck).toHaveLength(2)
    expect(deck[0]).toEqual({
      id: 101,
      title: 'Coded Vision Design',
      description: 'My studio site.',
      tags: ['Next.js', 'React'],
      image: '/base/portfolio/codedvisiondesign.webp',
    })
  })

  it('leaves out a project with no title', () => {
    expect(portfolioDeck({ projects: [{ id: 1 }, portfolio.projects[1]] })).toHaveLength(1)
  })

  it('makes no slides from data it cannot read', () => {
    expect(portfolioDeck(null)).toEqual([])
    expect(portfolioDeck({ projects: {} })).toEqual([])
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
