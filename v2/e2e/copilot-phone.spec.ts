import { readFileSync } from 'node:fs'
import { test, expect, type Locator, type Page } from '@playwright/test'

// Copilot on a phone, in both builds: as an iPhone on WebKit and a Pixel on
// Chromium (the iphone and android projects). The app fills the screen, every
// control is big enough for a finger, nothing scrolls sideways, and each
// requirement of a match becomes a card. api/copilot.php is stubbed.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

const MATCH = JSON.parse(readFileSync(new URL('./fixtures/copilot-match.json', import.meta.url), 'utf8'))
const ANSWER = {
  answer: 'He maintains business-critical applications at Killik & Co and builds PowerShell automation for them.',
  covered: true,
  grounded: true,
  citations: [
    { id: 'role-killik-co', title: 'Applications Support Engineer, Killik & Co', target: { type: 'cv', anchor: 'experience-title' } },
    { id: 'file-documents-career-uea-txt', title: 'Career: UEA.txt', target: { type: 'file', path: 'C:\\Users\\DeVante\\Documents\\Career\\UEA.txt' } },
  ],
}
const JOB = 'Applications Support Analyst. You will support business-critical applications, automate with PowerShell, query SQL Server and work to ITIL. Azure is a plus.'

async function boot(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.route('**/api/copilot.php', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { enabled: true } })
    return route.fulfill({ json: route.request().postDataJSON().task === 'match' ? MATCH : ANSWER })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return document.documentElement.dataset.osMode === 'phone' && !!(w.Alpine?.store('os') ?? w.__osStore)
  })
  await page.evaluate(() => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { openApp: (a: string) => void } }
      __osStore: { getState: () => { openApp: (a: string) => void } }
    }
    ;(w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()).openApp('copilot')
  })
  const win = page.getByRole('dialog', { name: 'Copilot', exact: true })
  await expect(win.locator('[data-copilot]')).toBeVisible({ timeout: 20_000 })
  return win
}

/** The controls that are shorter than a fingertip, by their text. */
const tooSmall = (controls: Locator) =>
  controls.evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null && el.getBoundingClientRect().height < 44)
      .map((el) => `${(el.textContent ?? '').trim().slice(0, 30)} (${Math.round(el.getBoundingClientRect().height)}px)`),
  )

const sideways = (page: Page, win: Locator) =>
  win.locator('[data-copilot]').evaluate((el) => ({
    copilot: el.scrollWidth - el.clientWidth,
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))

for (const build of BUILDS) {
  test.describe(`${build.name} Copilot on a phone`, () => {
    test('fills the screen and answers a question with finger-sized sources', async ({ page }) => {
      const win = await boot(page, build.url)
      const box = (await win.boundingBox())!
      expect(Math.round(box.width)).toBe(page.viewportSize()!.width)

      await win.locator('[data-copilot-suggestion]').first().tap()
      await expect(win.locator('[data-copilot-message="assistant"]').last()).toContainText(ANSWER.answer)
      await expect(win.locator('[data-citation]')).toHaveCount(ANSWER.citations.length)
      expect(await tooSmall(win.locator('[role="tab"], [data-citation], .copilot-button'))).toEqual([])
      expect(await sideways(page, win)).toEqual({ copilot: 0, page: 0 })

      // A source still opens its file, full screen.
      await win.locator('[data-citation="file-documents-career-uea-txt"]').tap()
      await expect(page.getByRole('dialog', { name: 'UEA.txt', exact: true })).toBeVisible()
    })

    test('shows each requirement of a match as a card, and the CV fits the screen', async ({ page }) => {
      const win = await boot(page, build.url)
      await win.getByRole('tab', { name: 'Job match' }).tap()
      await win.getByLabel('Paste a job description').fill(JOB)
      await win.getByRole('button', { name: 'Match', exact: true }).tap()
      const rows = win.locator('[data-copilot-table] tbody tr')
      await expect(rows).toHaveCount(MATCH.requirements.length)

      const width = (await win.locator('.copilot-scroll').boundingBox())!.width
      for (const row of await rows.all()) {
        const card = (await row.boundingBox())!
        expect(card.width).toBeLessThanOrEqual(width)
        // The requirement, its strength and its evidence stack inside the card.
        const strength = (await row.locator('[data-strength]').boundingBox())!
        expect(strength.x + strength.width).toBeLessThanOrEqual(card.x + card.width)
      }
      expect(await tooSmall(win.locator('[data-citation], .copilot-button'))).toEqual([])

      const frame = win.locator('[data-copilot-cv]')
      await expect(win.frameLocator('[data-copilot-cv]').locator('h1')).toHaveText(MATCH.cv.name)
      expect((await frame.boundingBox())!.width).toBeLessThanOrEqual(width)
      expect(await frame.evaluate((el: HTMLIFrameElement) => {
        const doc = el.contentDocument!
        return doc.documentElement.scrollWidth - doc.documentElement.clientWidth
      })).toBeLessThanOrEqual(0)
      expect(await sideways(page, win)).toEqual({ copilot: 0, page: 0 })
    })
  })
}
