import { readFileSync } from 'node:fs'
import { test, expect, type Browser, type Page, type Route } from '@playwright/test'

// Copilot in both builds: the chat, where its sources open, the job matcher,
// the tailored CV's print and download, and the state before a key is set.
// api/copilot.php is stubbed with page.route throughout, so no test reaches
// Anthropic or needs a key. tests/php/copilot_*_test.php cover the server.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const
type Build = (typeof BUILDS)[number]

const MATCH = JSON.parse(readFileSync(new URL('./fixtures/copilot-match.json', import.meta.url), 'utf8'))

const CITATIONS = [
  { id: 'role-killik-co', title: 'Applications Support Engineer, Killik & Co', target: { type: 'cv', anchor: 'experience-title' } },
  { id: 'file-documents-career-uea-txt', title: 'Career: UEA.txt', target: { type: 'file', path: 'C:\\Users\\DeVante\\Documents\\Career\\UEA.txt' } },
  { id: 'project-earth-echo', title: 'Earth Echo', target: { type: 'folder', path: 'C:\\Users\\DeVante\\Projects\\Freelance\\Earth Echo' } },
  { id: 'word-cv', title: 'CV document (Word)', target: { type: 'app', app: 'word' } },
]
const ANSWER = {
  answer: 'He maintains business-critical applications at Killik & Co and builds PowerShell automation for them.',
  covered: true,
  grounded: true,
  citations: CITATIONS,
}
const JOB = 'Applications Support Analyst. You will support business-critical applications, automate with PowerShell, query SQL Server and work to ITIL. Azure is a plus.'

type Body = { task: string; question?: string; history?: { role: string; text: string }[]; job?: string }

/**
 * Stands in for api/copilot.php. GET says whether it is switched on; each POST
 * is recorded and answered by the next reply in the list (the last one repeats).
 */
async function stubCopilot(page: Page, replies: { status?: number; body: unknown }[], enabled = true) {
  const sent: Body[] = []
  await page.route('**/api/copilot.php', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill(enabled
        ? { status: 200, json: { enabled: true } }
        : { status: 503, json: { error: 'Copilot is not switched on yet.', code: 'off' } })
      return
    }
    sent.push(route.request().postDataJSON() as Body)
    const reply = replies[Math.min(sent.length - 1, replies.length - 1)]
    await route.fulfill({ status: reply.status ?? 200, json: reply.body })
  })
  return sent
}

async function boot(page: Page, build: Build) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(build.url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })
}

const call = (page: Page, method: string, ...args: unknown[]) =>
  page.evaluate(
    ([m, a]) => {
      const w = window as unknown as {
        Alpine?: { store: (n: string) => Record<string, (...x: unknown[]) => unknown> }
        __osStore: { getState: () => Record<string, (...x: unknown[]) => unknown> }
      }
      const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
      return store[m as string](...(a as unknown[]))
    },
    [method, args] as const,
  )

const windowOf = (page: Page, title: string) => page.getByRole('dialog', { name: title, exact: true })

async function openCopilot(page: Page) {
  await call(page, 'openApp', 'copilot')
  const win = windowOf(page, 'Copilot')
  await expect(win.locator('[data-copilot]')).toBeVisible({ timeout: 15_000 })
  return win
}

async function ask(page: Page, question: string) {
  const win = windowOf(page, 'Copilot')
  await win.getByLabel('Ask Copilot about DeVanté').fill(question)
  await win.getByLabel('Ask Copilot about DeVanté').press('Enter')
}

async function runMatch(page: Page) {
  const win = windowOf(page, 'Copilot')
  await win.getByRole('tab', { name: 'Job match' }).click()
  await win.getByLabel('Paste a job description').fill(JOB)
  await win.getByRole('button', { name: 'Match', exact: true }).click()
  await expect(win.locator('[data-copilot-table] tbody tr')).toHaveCount(MATCH.requirements.length)
  // The preview has loaded and been sized to the CV inside it.
  await expect(win.frameLocator('[data-copilot-cv]').locator('h1')).toHaveText(MATCH.cv.name)
  await expect.poll(() => win.locator('[data-copilot-cv]').evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(600)
}

for (const build of BUILDS) {
  test.describe(`${build.name} Copilot`, () => {
    // Each test boots a whole desktop, and a match also loads the CV preview.
    test.describe.configure({ timeout: 60_000 })

    test('says it is not switched on yet, and points to the CV', async ({ page }) => {
      const sent = await stubCopilot(page, [{ body: ANSWER }], false)
      await boot(page, build)
      const win = await openCopilot(page)
      const off = win.locator('[data-copilot-off]')
      await expect(off).toBeVisible()
      await expect(off.getByRole('heading', { name: 'Copilot is not switched on yet' })).toBeVisible()
      await expect(off.getByRole('link', { name: 'Read the CV' })).toHaveAttribute('href', /\/cv$/)
      await expect(win.getByLabel('Ask Copilot about DeVanté')).toHaveCount(0)
      expect(sent).toEqual([])
    })

    test('turns off if the server says so mid-chat', async ({ page }) => {
      await stubCopilot(page, [{ status: 503, body: { error: 'Copilot is not switched on yet.', code: 'off' } }])
      await boot(page, build)
      const win = await openCopilot(page)
      await ask(page, 'What does he do now?')
      await expect(win.locator('[data-copilot-off]')).toBeVisible()
    })

    test('answers a question with the sources it used', async ({ page }) => {
      const sent = await stubCopilot(page, [{ body: ANSWER }])
      await boot(page, build)
      const win = await openCopilot(page)
      await expect(win.locator('[data-copilot-suggestion]')).toHaveCount(4)
      await ask(page, '  What does he do at Killik?  ')

      const log = win.locator('[data-copilot-log]')
      await expect(log.locator('[data-copilot-message="user"]')).toHaveText('What does he do at Killik?')
      const answer = log.locator('[data-copilot-message="assistant"]').last()
      await expect(answer).toContainText(ANSWER.answer)
      await expect(answer.locator('[data-citation]')).toHaveText([
        /^CV\s*Applications Support Engineer, Killik & Co/,
        /^File\s*Career: UEA\.txt/,
        /^Folder\s*Earth Echo/,
        /^App\s*CV document \(Word\)/,
      ])
      await expect(answer.locator('[data-copilot-ungrounded]')).toHaveCount(0)
      expect(sent).toEqual([{ task: 'chat', question: 'What does he do at Killik?', history: [] }])
      // The box empties and suggestions go once the chat has started.
      await expect(win.getByLabel('Ask Copilot about DeVanté')).toHaveValue('')
      await expect(win.locator('[data-copilot-suggestion]')).toHaveCount(0)
    })

    test('sends the chat so far with a follow-up question', async ({ page }) => {
      const sent = await stubCopilot(page, [{ body: ANSWER }])
      await boot(page, build)
      const win = await openCopilot(page)
      await win.locator('[data-copilot-suggestion]').first().click()
      await expect(win.locator('[data-copilot-message="assistant"]')).toHaveCount(2)
      await ask(page, 'And before that?')
      await expect(win.locator('[data-copilot-message="assistant"]')).toHaveCount(3)
      expect(sent[1]).toEqual({
        task: 'chat',
        question: 'And before that?',
        history: [
          { role: 'user', text: 'What does he do now?' },
          { role: 'assistant', text: ANSWER.answer },
        ],
      })
    })

    test('sources open the right place', async ({ page, context }) => {
      await stubCopilot(page, [{ body: ANSWER }])
      await boot(page, build)
      const win = await openCopilot(page)
      await ask(page, 'What does he do at Killik?')
      const sources = win.locator('[data-copilot-message="assistant"]').last()

      const cvLink = sources.locator('[data-citation="role-killik-co"]')
      await expect(cvLink).toHaveAttribute('href', /\/cv#experience-title$/)
      await expect(cvLink).toHaveAttribute('target', '_blank')
      const [tab] = await Promise.all([context.waitForEvent('page'), cvLink.click()])
      await tab.waitForLoadState('domcontentloaded')
      expect(new URL(tab.url()).pathname + new URL(tab.url()).hash).toBe('/cv#experience-title')
      await expect(tab.locator('#experience-title')).toBeVisible()
      await tab.close()

      await sources.locator('[data-citation="file-documents-career-uea-txt"]').click()
      await expect(windowOf(page, 'UEA.txt')).toBeVisible()
      // Notepad shows the career file's own text.
      await expect(windowOf(page, 'UEA.txt')).toContainText('Desktop Developer / 3rd Line Engineer')

      await win.click({ position: { x: 200, y: 20 } })
      await sources.locator('[data-citation="project-earth-echo"]').click()
      await expect(windowOf(page, 'Earth Echo')).toBeVisible()

      await win.click({ position: { x: 200, y: 20 } })
      await sources.locator('[data-citation="word-cv"]').click()
      await expect(windowOf(page, 'Word')).toBeVisible()
    })

    test('says when a source has gone from this desktop', async ({ page }) => {
      await stubCopilot(page, [{ body: { ...ANSWER, citations: [{ id: 'x', title: 'Gone.txt', target: { type: 'file', path: 'C:\\Users\\DeVante\\Gone.txt' } }] } }])
      await boot(page, build)
      const win = await openCopilot(page)
      await ask(page, 'Hi')
      await win.locator('[data-citation="x"]').click()
      await expect(win.locator('[data-copilot-notice]')).toHaveText('That file is no longer on this desktop. It may have been moved or deleted.')
    })

    test('says plainly when the data does not cover a question', async ({ page }) => {
      await stubCopilot(page, [{ body: { answer: 'The site\'s data does not say what food he likes.', covered: false, grounded: false, citations: [] } }])
      await boot(page, build)
      const win = await openCopilot(page)
      await ask(page, 'What is his favourite food?')
      const answer = win.locator('[data-copilot-message="assistant"]').last()
      await expect(answer).toContainText('does not say')
      await expect(answer.locator('[data-citation]')).toHaveCount(0)
      await expect(answer.locator('[data-copilot-ungrounded]')).toHaveCount(0)
    })

    test('warns when an answer has no source that could be checked', async ({ page }) => {
      await stubCopilot(page, [{ body: { answer: 'He likes cheese.', covered: true, grounded: false, citations: [] } }])
      await boot(page, build)
      const win = await openCopilot(page)
      await ask(page, 'Food?')
      await expect(win.locator('[data-copilot-ungrounded]')).toHaveText('No source could be checked for this answer, so treat it with care.')
    })

    test('shows an error, then answers the next question', async ({ page }) => {
      await stubCopilot(page, [
        { status: 429, body: { error: 'That is a lot of questions for one minute. Please wait a moment and try again.', code: 'rate_limited' } },
        { body: ANSWER },
      ])
      await boot(page, build)
      const win = await openCopilot(page)
      await ask(page, 'One')
      await expect(win.locator('[data-copilot-message="error"]')).toHaveText('That is a lot of questions for one minute. Please wait a moment and try again.')
      await ask(page, 'Two')
      await expect(win.locator('[data-copilot-message="assistant"]').last()).toContainText(ANSWER.answer)
    })

    test('will not send an empty or overlong question', async ({ page }) => {
      const sent = await stubCopilot(page, [{ body: ANSWER }])
      await boot(page, build)
      const win = await openCopilot(page)
      const box = win.getByLabel('Ask Copilot about DeVanté')
      await expect(box).toHaveAttribute('maxlength', '500')
      await expect(win.getByRole('button', { name: 'Send' })).toBeDisabled()
      await box.fill('a'.repeat(500))
      await expect(win.locator('[data-copilot-count]').first()).toHaveText('500 / 500')
      expect(sent).toEqual([])
    })

    test('matches a job description, requirement by requirement', async ({ page }) => {
      const sent = await stubCopilot(page, [{ body: MATCH }])
      await boot(page, build)
      const win = await openCopilot(page)
      await runMatch(page)
      expect(sent).toEqual([{ task: 'match', job: JOB }])

      const rows = win.locator('[data-copilot-table] tbody tr')
      for (const [i, item] of MATCH.requirements.entries()) {
        await expect(rows.nth(i).locator('th')).toHaveText(item.requirement)
        await expect(rows.nth(i).locator('[data-strength]')).toHaveText({ strong: 'Strong', partial: 'Partial', none: 'None' }[item.strength as string]!)
        await expect(rows.nth(i).locator('[data-citation]')).toHaveCount(item.citations.length)
      }
      await expect(win.locator('[data-copilot-counts]')).toHaveText('3 strong · 1 partial · 1 none')
      await expect(win.locator('[data-copilot-gaps] li')).toHaveText(MATCH.gaps)
      const summary = win.locator('[data-copilot-summary]')
      await expect(summary).toContainText('Generated by Copilot')
      await expect(summary).toContainText(MATCH.summary.text)
      await expect(summary.locator('[data-citation]')).toHaveCount(MATCH.summary.citations.length)

      const cv = win.frameLocator('[data-copilot-cv]')
      // Matched skills are marked where the CV lists them, never added or reworded.
      await expect(cv.locator('mark')).toHaveText(['MS SQL Server', 'Active Directory', 'PowerShell', 'MSSMS'])
      await expect(cv.locator('[data-cv-generated]')).toContainText('Generated by Copilot')
      await expect(cv.locator('.role h3').first()).toHaveText(MATCH.cv.roles[0].title)

      // Only the results scroll: the window itself, with Copilot's header, stays put.
      await win.locator('[data-copilot-cv]').evaluate((el) => el.scrollIntoView({ block: 'start' }))
      expect(await win.locator('.os-window-content').evaluate((el) => el.scrollTop)).toBe(0)
      await expect(win.locator('.copilot-header')).toBeInViewport()
    })

    test('a requirement\'s source opens from the table', async ({ page, context }) => {
      await stubCopilot(page, [{ body: MATCH }])
      await boot(page, build)
      const win = await openCopilot(page)
      await runMatch(page)
      const link = win.locator('[data-copilot-table] tbody tr').first().locator('[data-citation="role-killik-co"]')
      const [tab] = await Promise.all([context.waitForEvent('page'), link.click()])
      expect(new URL(tab.url()).hash).toBe('#experience-title')
      await tab.close()
    })

    test('will not match a job description that is too short', async ({ page }) => {
      const sent = await stubCopilot(page, [{ body: MATCH }])
      await boot(page, build)
      const win = await openCopilot(page)
      await win.getByRole('tab', { name: 'Job match' }).click()
      await win.getByLabel('Paste a job description').fill('PHP developer')
      await win.getByRole('button', { name: 'Match', exact: true }).click()
      await expect(win.locator('[data-copilot-match-error]')).toHaveText('Paste the whole job description, at least 80 characters.')
      expect(sent).toEqual([])
    })

    test('prints the tailored CV, and only the CV', async ({ page }) => {
      await stubCopilot(page, [{ body: MATCH }])
      await boot(page, build)
      const win = await openCopilot(page)
      await runMatch(page)
      await win.locator('[data-copilot-cv]').evaluate((frame: HTMLIFrameElement) => {
        const view = frame.contentWindow as Window & { printed?: number }
        view.printed = 0
        view.print = () => {
          view.printed! += 1
        }
      })
      const printed = page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)))
      await win.getByRole('button', { name: 'Print the tailored CV' }).click()
      await printed
      expect(await win.locator('[data-copilot-cv]').evaluate((frame: HTMLIFrameElement) => (frame.contentWindow as Window & { printed?: number }).printed)).toBe(1)
      expect(await page.evaluate(() => (window as Window & { printed?: number }).printed)).toBeUndefined()

      // The CV has its own print layout: A4 margins and no screen padding.
      await page.emulateMedia({ media: 'print' })
      const cv = win.frameLocator('[data-copilot-cv]')
      await expect(cv.locator('main')).toHaveCSS('padding-top', '0px')
      await page.emulateMedia({ media: 'screen' })
      await expect(cv.locator('main')).not.toHaveCSS('padding-top', '0px')
    })

    test('downloads the tailored CV as a file', async ({ page }) => {
      await stubCopilot(page, [{ body: MATCH }])
      await boot(page, build)
      const win = await openCopilot(page)
      await runMatch(page)
      const [download] = await Promise.all([page.waitForEvent('download'), win.getByRole('button', { name: 'Download the tailored CV' }).click()])
      expect(download.suggestedFilename()).toBe('DeVante-Johnson-Rose-CV-tailored.html')
      const html = readFileSync((await download.path())!, 'utf8')
      expect(html).toContain('<html lang="en-GB">')
      expect(html).toContain('<mark>PowerShell</mark>')
      expect(html).toContain('@media print')
      expect(html).not.toMatch(/<script/i)
      await expect(win.locator('[data-copilot-notice]')).toHaveText('Saved DeVante-Johnson-Rose-CV-tailored.html.')
    })

    test('the tabs work from the keyboard', async ({ page }) => {
      await stubCopilot(page, [{ body: ANSWER }])
      await boot(page, build)
      const win = await openCopilot(page)
      const chat = win.getByRole('tab', { name: 'Chat' })
      await expect(chat).toHaveAttribute('aria-selected', 'true')
      await chat.focus()
      await page.keyboard.press('ArrowRight')
      await expect(win.getByRole('tab', { name: 'Job match' })).toBeFocused()
      await expect(win.getByRole('tab', { name: 'Job match' })).toHaveAttribute('aria-selected', 'true')
      await expect(win.getByLabel('Paste a job description')).toBeVisible()
      await page.keyboard.press('ArrowLeft')
      await expect(chat).toHaveAttribute('aria-selected', 'true')
      await expect(win.getByLabel('Ask Copilot about DeVanté')).toBeVisible()
    })
  })
}

/** Where the main parts of Copilot sit inside its window, rounded to whole pixels. */
const layout = (page: Page) =>
  page.evaluate(() => {
    const win = [...document.querySelectorAll('[role="dialog"]')].find((el) => el.getAttribute('aria-label') === 'Copilot') as Element
    const origin = win.querySelector('[data-copilot]')!.getBoundingClientRect()
    const rect = (el: Element | null) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return [r.x - origin.x, r.y - origin.y, r.width, r.height].map(Math.round)
    }
    const all = (selector: string) => [...win.querySelectorAll(selector)].filter((el) => (el as HTMLElement).offsetParent !== null).map(rect)
    return {
      window: rect(win)?.slice(2),
      header: rect(win.querySelector('.copilot-header')),
      tabs: all('[role="tab"]'),
      messages: all('[data-copilot-message]'),
      citations: all('[data-citation]'),
      composer: rect(win.querySelector('.copilot-composer:not([hidden])')),
      rows: all('[data-copilot-table] tbody tr'),
      frame: rect(win.querySelector('[data-copilot-cv]')),
      colours: [win.querySelector('[data-copilot-message="user"]'), win.querySelector('[data-strength="strong"]')].map((el) =>
        el ? [getComputedStyle(el).backgroundColor, getComputedStyle(el).color] : null,
      ),
    }
  })

async function inBothBuilds<T>(browser: Browser, viewport: { width: number; height: number }, check: (page: Page) => Promise<T>) {
  const seen: T[] = []
  for (const build of BUILDS) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await stubCopilot(page, [{ body: ANSWER }, { body: MATCH }])
    await boot(page, build)
    seen.push(await check(page))
    await context.close()
  }
  return seen
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
]) {
  test(`Copilot lays out the same in both builds at ${viewport.width}px`, async ({ browser }) => {
    test.setTimeout(90_000)
    const [v1, v2] = await inBothBuilds(browser, viewport, async (page) => {
      const win = await openCopilot(page)
      await page.waitForTimeout(400) // Past the window's opening animation.
      await ask(page, 'What does he do at Killik?')
      await expect(win.locator('[data-citation]')).toHaveCount(CITATIONS.length)
      const chat = await layout(page)
      await runMatch(page)
      await win.locator('[data-copilot-results]').evaluate((el) => el.scrollIntoView({ block: 'start' }))
      const match = await layout(page)
      const overflow = await win.locator('[data-copilot]').evaluate((el) => el.scrollWidth - el.clientWidth)
      return { chat, match, overflow }
    })
    expect(v1.overflow, 'Copilot scrolls sideways').toBeLessThanOrEqual(0)
    expect(v1).toEqual(v2)
  })
}
