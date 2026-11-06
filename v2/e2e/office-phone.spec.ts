import { readFileSync } from 'node:fs'
import { test, expect, type Locator, type Page } from '@playwright/test'

// Word, PowerPoint and PuTTY on real phones: as an iPhone on WebKit, Safari's
// own engine, and as a Pixel on Chromium. The page and the slide shrink to fit
// with CSS zoom, which each engine must draw the same way. office.spec.ts
// covers the rest on the desktop.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

const portfolio = JSON.parse(readFileSync(new URL('../../data/portfolio.json', import.meta.url), 'utf8')) as {
  projects: { title: string }[]
}

async function boot(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-desktop-item="achievements.txt"]').waitFor({ timeout: 20_000 })
}

async function open(page: Page, app: string, title: string) {
  await page.evaluate((id) => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { openApp: (a: string) => void } }
      __osStore: { getState: () => { openApp: (a: string) => void } }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    store.openApp(id)
  }, app)
  const win = page.getByRole('dialog', { name: title, exact: true })
  await expect(win.locator(`[data-office-app="${app}"]`)).toBeVisible({ timeout: 20_000 })
  return win
}

/** How many lines each word of an element's text was laid out on. */
const wordLines = (target: Locator) =>
  target.evaluate((el) => {
    const node = [...el.childNodes].find((child) => child.nodeType === 3 && child.textContent?.trim()) as Text
    return [...node.data.matchAll(/\S+/g)].map((match) => {
      const range = document.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + match[0].length)
      return { word: match[0], lines: new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size }
    })
  })

const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

for (const build of BUILDS) {
  test.describe(`${build.name} office apps on a phone`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    test('Word shrinks the CV to fit and keeps the name whole', async ({ page }) => {
      const win = await open(page, 'word', 'Word')
      const name = win.locator('[data-word-editor] h1').first()
      await expect(name).toBeVisible()
      for (const { word, lines } of await wordLines(name)) expect(lines, `"${word}" is split`).toBe(1)
      const fit = await win.locator('[data-word-area]').evaluate((area) => ({
        page: (area.querySelector('[data-word-page]') as HTMLElement).getBoundingClientRect().width,
        area: area.clientWidth,
      }))
      expect(fit.page).toBeLessThanOrEqual(fit.area)
      await expect(win.locator('[data-word-count]')).not.toHaveText('0 words')
      expect(await sideways(page)).toBeLessThanOrEqual(0)
    })

    test('PowerPoint shrinks the slide to fit and wraps its title by words', async ({ page }) => {
      const win = await open(page, 'powerpoint', 'PowerPoint')
      const title = win.locator('[data-slide-title]')
      await expect(title).toHaveText(portfolio.projects[0].title)
      for (const { word, lines } of await wordLines(title)) expect(lines, `"${word}" is split`).toBe(1)
      const inside = await win.locator('[data-slide-stage]').evaluate((stage) => {
        const slide = (stage.querySelector('[data-slide]') as HTMLElement).getBoundingClientRect()
        const box = stage.getBoundingClientRect()
        return slide.left >= box.left - 1 && slide.right <= box.right + 1
      })
      expect(inside).toBe(true)
      await win.locator('[data-slide-thumb]').nth(1).click()
      await expect(title).toHaveText(portfolio.projects[1].title)
      expect(await sideways(page)).toBeLessThanOrEqual(0)
    })

    test('PuTTY fits without scrolling sideways', async ({ page }) => {
      const win = await open(page, 'putty', 'PuTTY')
      const app = await win.locator('[data-office-app="putty"]').evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(app).toBeLessThanOrEqual(0)
      await expect(win.getByRole('button', { name: 'Open', exact: true })).toBeVisible()
      expect(await sideways(page)).toBeLessThanOrEqual(0)
    })
  })
}
