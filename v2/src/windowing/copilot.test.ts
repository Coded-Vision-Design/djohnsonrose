import { describe, it, expect, vi } from 'vitest'
import {
  COPILOT_ENDPOINT,
  COPILOT_TABS,
  MISSING_SOURCE,
  countLabel,
  matchCountsText,
  tabAfterKey,
  HISTORY_TEXT_MAX,
  HISTORY_TURNS,
  JOB_MAX,
  JOB_MIN,
  QUESTION_MAX,
  CopilotError,
  askCopilot,
  chatBody,
  citationHref,
  copilotStatus,
  historyFor,
  jobProblem,
  matchBody,
  matchCounts,
  openCitation,
  printTailoredCv,
  questionProblem,
  saveTailoredCv,
  strengthLabel,
  tailoredCvFileName,
  tailoredCvHtml,
  watchCvFrame,
  type ChatTurn,
  type Citation,
  type TailoredCv,
} from '../../../assets/js/windowing/copilot.js'

// Copilot in both builds: what is sent to api/copilot.php, how its replies and
// errors are read, where a citation opens, and the tailored CV file.

const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }))

const turns = (...pairs: [string, string][]): ChatTurn[] =>
  pairs.flatMap(([q, a]) => [
    { role: 'user', text: q },
    { role: 'assistant', text: a },
  ])

const cvCitation: Citation = { id: 'role-killik-co', title: 'Applications Support Engineer, Killik & Co', target: { type: 'cv', anchor: 'experience-title' } }
const fileCitation: Citation = { id: 'file-documents-career-uea-txt', title: 'Career: UEA.txt', target: { type: 'file', path: 'C:\\Users\\DeVante\\Documents\\Career\\UEA.txt' } }
const folderCitation: Citation = { id: 'project-earth-echo', title: 'Earth Echo', target: { type: 'folder', path: 'C:\\Users\\DeVante\\Projects\\Freelance\\Earth Echo' } }
const appCitation: Citation = { id: 'word-cv', title: 'CV document (Word)', target: { type: 'app', app: 'word' } }

const fileSystem = {
  'C:\\Users\\DeVante\\Documents\\Career': [{ name: 'UEA.txt', type: 'file', content: 'UEA' }],
  'C:\\Users\\DeVante\\Projects\\Freelance': [{ name: 'Earth Echo', type: 'folder' }],
}

const cv: TailoredCv = {
  name: 'DeVanté Johnson-Rose',
  headline: 'Full Stack Developer',
  location: 'Essex, UK',
  email: 'devante@johnson-rose.co.uk',
  website: 'https://devante.johnson-rose.co.uk/',
  linkedin: '',
  summary: 'Applications Support Engineer and Full-Stack Developer.',
  generated: { text: 'A good fit for automation work.', citations: [cvCitation] },
  roles: [
    { id: 'role-killik-co', title: 'Applications Support Engineer', company: 'Killik & Co', location: 'Ipswich', period: 'Apr 2025 - Present', highlights: ['Build PowerShell automation.', '<script>alert(1)</script>'] },
  ],
  otherRoles: [{ id: 'role-skyscanner', title: 'Systems Engineer II', company: 'Skyscanner', location: 'Global', period: 'Mar 2020 - Nov 2021' }],
  projects: [{ id: 'project-earth-echo', title: 'Earth Echo', description: 'Carbon tracker.', tags: ['Next.js'], url: 'https://earthecho.co.uk/' }],
  skills: [{ id: 'skills-operations', label: 'Automation and delivery', items: [{ name: 'PowerShell', matched: true }, { name: 'Bash', matched: false }] }],
  education: [{ title: 'BSc (Hons) Business Computing, 2:1', issuer: 'University of East Anglia' }],
  certificates: [{ id: 'certificates-comptia', issuer: 'CompTIA', years: '2011-2025', names: ['Server+', 'A+'] }],
}

describe('limits', () => {
  it('match the server (lib/copilot.php), which tests/php/copilot_test.php checks too', () => {
    expect(QUESTION_MAX).toBe(500)
    expect(JOB_MIN).toBe(80)
    expect(JOB_MAX).toBe(6000)
    expect(HISTORY_TURNS * 2).toBe(6)
    expect(HISTORY_TEXT_MAX).toBe(1200)
    expect(COPILOT_ENDPOINT).toBe('api/copilot.php')
  })
})

describe('questionProblem and jobProblem', () => {
  it('accept a question within the limit', () => {
    expect(questionProblem('What does he do now?')).toBe('')
    expect(questionProblem('é'.repeat(QUESTION_MAX))).toBe('')
  })

  it('ask for a question when there is none', () => {
    expect(questionProblem('   ')).toMatch(/type a question/i)
  })

  it('count characters as the server does, not UTF-16 units', () => {
    expect(questionProblem('😀'.repeat(QUESTION_MAX))).toBe('')
    expect(questionProblem('a'.repeat(QUESTION_MAX + 1))).toMatch(/500 characters/)
  })

  it('want a whole job description, within the limit', () => {
    expect(jobProblem('PHP developer')).toMatch(/at least 80 characters/)
    expect(jobProblem('a'.repeat(JOB_MAX + 1))).toMatch(/6,000 characters/)
    expect(jobProblem('Senior developer with PHP, Laravel and MySQL experience, leading a small team of three.')).toBe('')
  })
})

describe('historyFor', () => {
  it('sends nothing before the first answer', () => {
    expect(historyFor([])).toEqual([])
    expect(historyFor([{ role: 'user', text: 'Hi' }])).toEqual([])
  })

  it('sends questions with their answers, oldest first', () => {
    expect(historyFor(turns(['Hi', 'Hello'], ['And?', 'More']))).toEqual(turns(['Hi', 'Hello'], ['And?', 'More']))
  })

  it('keeps only the last few exchanges', () => {
    const many = turns(['1', 'a'], ['2', 'b'], ['3', 'c'], ['4', 'd'])
    expect(historyFor(many)).toEqual(turns(['2', 'b'], ['3', 'c'], ['4', 'd']))
    expect(historyFor(many)).toHaveLength(HISTORY_TURNS * 2)
  })

  it('leaves out a question that ended in an error, and the welcome', () => {
    const messages: ChatTurn[] = [
      { role: 'assistant', text: 'Welcome' },
      { role: 'user', text: 'Broken' },
      { role: 'error', text: 'Copilot is busy' },
      ...turns(['Hi', 'Hello']),
    ]
    expect(historyFor(messages)).toEqual(turns(['Hi', 'Hello']))
  })

  it('shortens a long answer to what the server takes', () => {
    const [, answer] = historyFor(turns(['Hi', 'x'.repeat(5000)]))
    expect([...answer.text].length).toBeLessThanOrEqual(HISTORY_TEXT_MAX)
  })
})

describe('chatBody and matchBody', () => {
  it('name the task and trim the text', () => {
    expect(chatBody('  Hi  ', turns(['a', 'b']))).toEqual({ task: 'chat', question: 'Hi', history: turns(['a', 'b']) })
    expect(matchBody('  job  ')).toEqual({ task: 'match', job: 'job' })
  })
})

describe('askCopilot', () => {
  it('posts JSON to the endpoint under the base path and returns the reply', async () => {
    const fetcher = reply(200, { answer: 'Yes', covered: true, grounded: true, citations: [] })
    await expect(askCopilot({ task: 'chat', question: 'Hi', history: [] }, { fetcher, basePath: '/site/' })).resolves.toMatchObject({ answer: 'Yes' })
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/site/api/copilot.php')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual({ task: 'chat', question: 'Hi', history: [] })
  })

  it('says when Copilot is not switched on', async () => {
    const error = await askCopilot(matchBody('x'), { fetcher: reply(503, { error: 'Copilot is not switched on yet.', code: 'off' }) }).catch((e) => e)
    expect(error).toBeInstanceOf(CopilotError)
    expect(error).toMatchObject({ status: 503, code: 'off', message: 'Copilot is not switched on yet.' })
  })

  it('passes the server\'s own message on', async () => {
    const error = await askCopilot(matchBody('x'), { fetcher: reply(429, { error: 'Please wait a moment.', code: 'rate_limited' }) }).catch((e) => e)
    expect(error).toMatchObject({ status: 429, code: 'rate_limited', message: 'Please wait a moment.' })
  })

  it('gives a plain message when the error is not JSON', async () => {
    const error = await askCopilot(matchBody('x'), { fetcher: reply(500, '<h1>Error</h1>') }).catch((e) => e)
    expect(error).toMatchObject({ status: 500, code: 'error' })
    expect(error.message).toMatch(/could not answer/i)
  })

  it('says when the site cannot be reached', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const error = await askCopilot(matchBody('x'), { fetcher }).catch((e) => e)
    expect(error).toMatchObject({ status: 0, code: 'network' })
    expect(error.message).toMatch(/could not be reached/i)
  })

  it('treats a 200 that is not JSON as an error', async () => {
    await expect(askCopilot(matchBody('x'), { fetcher: reply(200, 'oops') })).rejects.toBeInstanceOf(CopilotError)
  })
})

describe('copilotStatus', () => {
  it('is on when the server says so', async () => {
    await expect(copilotStatus({ fetcher: reply(200, { enabled: true }) })).resolves.toBe('on')
  })

  it('is off when no key is set', async () => {
    await expect(copilotStatus({ fetcher: reply(503, { error: 'Copilot is not switched on yet.', code: 'off' }) })).resolves.toBe('off')
  })

  it('is unknown when the check itself fails, so a question can still be tried', async () => {
    await expect(copilotStatus({ fetcher: reply(500, 'x') })).resolves.toBe('unknown')
    const fetcher = vi.fn(async () => {
      throw new TypeError('offline')
    })
    await expect(copilotStatus({ fetcher })).resolves.toBe('unknown')
  })
})

describe('citations', () => {
  it('link a CV section to its anchor on /cv', () => {
    expect(citationHref(cvCitation)).toBe('/cv#experience-title')
    expect(citationHref(cvCitation, '/site/')).toBe('/site/cv#experience-title')
  })

  it('give no link for a file, a folder or an app', () => {
    expect(citationHref(fileCitation)).toBeNull()
    expect(citationHref(appCitation)).toBeNull()
  })

  it('cannot be made to link anywhere else', () => {
    expect(citationHref({ ...cvCitation, target: { type: 'cv', anchor: '"><img src=x>' } })).toBe('/cv#%22%3E%3Cimg%20src%3Dx%3E')
  })

  it('open a file in its app, through the build\'s own opener', () => {
    const openEntry = vi.fn()
    expect(openCitation(fileCitation, { fileSystem, openEntry, openApp: vi.fn(), openUrl: vi.fn() })).toBe(true)
    expect(openEntry).toHaveBeenCalledWith(fileSystem['C:\\Users\\DeVante\\Documents\\Career'][0], 'C:\\Users\\DeVante\\Documents\\Career')
  })

  it('open a project folder in File Explorer', () => {
    const openEntry = vi.fn()
    expect(openCitation(folderCitation, { fileSystem, openEntry, openApp: vi.fn(), openUrl: vi.fn() })).toBe(true)
    expect(openEntry).toHaveBeenCalledWith({ name: 'Earth Echo', type: 'folder' }, 'C:\\Users\\DeVante\\Projects\\Freelance')
  })

  it('say so when the visitor has moved or deleted the file', () => {
    const openEntry = vi.fn()
    expect(openCitation(fileCitation, { fileSystem: {}, openEntry, openApp: vi.fn(), openUrl: vi.fn() })).toBe(false)
    expect(openEntry).not.toHaveBeenCalled()
  })

  it('open an app or the CV page', () => {
    const openApp = vi.fn()
    const openUrl = vi.fn()
    expect(openCitation(appCitation, { fileSystem, openEntry: vi.fn(), openApp, openUrl })).toBe(true)
    expect(openApp).toHaveBeenCalledWith('word')
    expect(openCitation(cvCitation, { fileSystem, openEntry: vi.fn(), openApp, openUrl, basePath: '/' })).toBe(true)
    expect(openUrl).toHaveBeenCalledWith('/cv#experience-title')
  })

  it('refuse a target they do not know', () => {
    const bad = { id: 'x', title: 'x', target: { type: 'script', src: 'x' } } as unknown as Citation
    expect(openCitation(bad, { fileSystem, openEntry: vi.fn(), openApp: vi.fn(), openUrl: vi.fn() })).toBe(false)
  })
})

describe('what the two apps show alike', () => {
  it('count characters against the limit, with thousands marked', () => {
    expect(countLabel('', QUESTION_MAX)).toBe('0 / 500')
    expect(countLabel('😀é', QUESTION_MAX)).toBe('2 / 500')
    expect(countLabel('a'.repeat(1234), JOB_MAX)).toBe('1,234 / 6,000')
  })

  it('sum up a match in one line', () => {
    expect(matchCountsText([{ strength: 'strong' }, { strength: 'partial' }, { strength: 'none' }, { strength: 'strong' }])).toBe('2 strong · 1 partial · 1 none')
    expect(matchCountsText([])).toBe('0 strong · 0 partial · 0 none')
  })

  it('move between the tabs with the arrow keys, Home and End', () => {
    expect(COPILOT_TABS).toEqual(['chat', 'match'])
    expect(tabAfterKey('chat', 'ArrowRight')).toBe('match')
    expect(tabAfterKey('match', 'ArrowRight')).toBe('chat')
    expect(tabAfterKey('chat', 'ArrowLeft')).toBe('match')
    expect(tabAfterKey('match', 'Home')).toBe('chat')
    expect(tabAfterKey('chat', 'End')).toBe('match')
    expect(tabAfterKey('chat', 'Enter')).toBeNull()
  })

  it('explain a source that has gone', () => {
    expect(MISSING_SOURCE).toBe('That file is no longer on this desktop. It may have been moved or deleted.')
  })
})

describe('strengths', () => {
  it('have words, not just colours', () => {
    expect(strengthLabel('strong')).toBe('Strong')
    expect(strengthLabel('partial')).toBe('Partial')
    expect(strengthLabel('none')).toBe('None')
    expect(strengthLabel('excellent' as never)).toBe('None')
  })

  it('are counted for the summary line', () => {
    expect(matchCounts([{ strength: 'strong' }, { strength: 'none' }, { strength: 'strong' }])).toEqual({ strong: 2, partial: 0, none: 1 })
    expect(matchCounts([])).toEqual({ strong: 0, partial: 0, none: 0 })
  })
})

describe('tailoredCvHtml', () => {
  const html = tailoredCvHtml(cv)
  const doc = new DOMParser().parseFromString(html, 'text/html')

  it('is a whole document in British English, with print styles', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(doc.documentElement.lang).toBe('en-GB')
    expect(doc.title).toBe('DeVanté Johnson-Rose, CV')
    expect(html).toContain('@media print')
    expect(html).toContain('@page')
  })

  it('shows the CV\'s own text', () => {
    expect(doc.querySelector('h1')?.textContent).toBe('DeVanté Johnson-Rose')
    expect(doc.body.textContent).toContain('Applications Support Engineer and Full-Stack Developer.')
    expect(doc.body.textContent).toContain('Build PowerShell automation.')
    expect(doc.body.textContent).toContain('BSc (Hons) Business Computing, 2:1')
    expect(doc.body.textContent).toContain('Server+')
  })

  it('escapes everything it is given', () => {
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(doc.querySelector('script')).toBeNull()
    expect(doc.body.textContent).toContain('<script>alert(1)</script>')
  })

  it('highlights the matched skills, and only those', () => {
    expect([...doc.querySelectorAll('mark')].map((mark) => mark.textContent)).toEqual(['PowerShell'])
  })

  it('labels the generated summary and names its sources', () => {
    const generated = doc.querySelector('[data-cv-generated]')
    expect(generated?.textContent).toMatch(/Generated by Copilot/)
    expect(generated?.textContent).toContain('A good fit for automation work.')
    expect(generated?.textContent).toContain('Applications Support Engineer, Killik & Co')
  })

  it('leaves the generated summary out when there is none', () => {
    const plain = new DOMParser().parseFromString(tailoredCvHtml({ ...cv, generated: null }), 'text/html')
    expect(plain.querySelector('[data-cv-generated]')).toBeNull()
  })

  it('lists the other roles in brief', () => {
    expect(doc.body.textContent).toContain('Other experience')
    expect(doc.body.textContent).toContain('Systems Engineer II')
  })

  it('links only to web addresses', () => {
    const unsafe = tailoredCvHtml({ ...cv, website: 'javascript:alert(1)', projects: [{ ...cv.projects[0], url: 'javascript:alert(2)' }] })
    expect(unsafe).not.toContain('javascript:')
    expect([...doc.querySelectorAll('a')].every((a) => /^(https:|mailto:)/.test(a.getAttribute('href') ?? ''))).toBe(true)
  })

  it('loads nothing from anywhere', () => {
    expect(doc.querySelectorAll('img, link, script, iframe')).toHaveLength(0)
  })

  it('has no em or en dashes of its own', () => {
    expect(html).not.toMatch(/\u2013|\u2014/)
  })
})

describe('saving and printing the tailored CV', () => {
  it('names the file without accents', () => {
    expect(tailoredCvFileName(cv)).toBe('DeVante-Johnson-Rose-CV-tailored.html')
    expect(tailoredCvFileName({ ...cv, name: '' })).toBe('CV-tailored.html')
  })

  it('downloads the document as an HTML file', async () => {
    const created = vi.fn<(blob: Blob) => string>(() => 'blob:cv')
    const revoked = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked }))
    const clicks: { href: string; download: string }[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push({ href: this.href, download: this.download })
    })
    expect(saveTailoredCv(cv)).toBe('DeVante-Johnson-Rose-CV-tailored.html')
    expect(clicks).toEqual([{ href: 'blob:cv', download: 'DeVante-Johnson-Rose-CV-tailored.html' }])
    const blob = created.mock.calls[0][0]
    expect(blob.type).toBe('text/html;charset=utf-8')
    expect(await blob.text()).toBe(tailoredCvHtml(cv))
    expect(document.querySelector('a[download]')).toBeNull()
    click.mockRestore()
    vi.unstubAllGlobals()
  })

  it('prints the preview frame', () => {
    const print = vi.fn()
    const focus = vi.fn()
    expect(printTailoredCv({ contentWindow: { print, focus } } as unknown as HTMLIFrameElement)).toBe(true)
    expect(print).toHaveBeenCalled()
  })

  it('says when there is nothing to print', () => {
    expect(printTailoredCv(null)).toBe(false)
    expect(printTailoredCv({ contentWindow: null } as unknown as HTMLIFrameElement)).toBe(false)
  })
})

describe('watchCvFrame', () => {
  const fakeFrame = (height: number | null) => {
    const listeners: Record<string, () => void> = {}
    return {
      listeners,
      style: {} as Record<string, string>,
      contentDocument: height === null ? null : { body: { scrollHeight: height } },
      addEventListener: (type: string, fn: () => void) => (listeners[type] = fn),
      removeEventListener: (type: string) => delete listeners[type],
    }
  }

  it('makes the preview as tall as the CV in it, and again once it loads', () => {
    const frame = fakeFrame(900)
    const stop = watchCvFrame(frame as unknown as HTMLIFrameElement)
    expect(frame.style.height).toBe('900px')
    ;(frame.contentDocument as { body: { scrollHeight: number } }).body.scrollHeight = 1200
    frame.listeners.load()
    expect(frame.style.height).toBe('1200px')
    stop()
    expect(frame.listeners.load).toBeUndefined()
  })

  it('leaves a frame with nothing in it alone', () => {
    const frame = fakeFrame(null)
    expect(() => watchCvFrame(frame as unknown as HTMLIFrameElement)()).not.toThrow()
    expect(frame.style.height).toBeUndefined()
    expect(() => watchCvFrame(null)()).not.toThrow()
  })
})
