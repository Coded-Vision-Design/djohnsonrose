import { readFileSync } from 'node:fs'
import { test, expect, type Locator, type Page } from '@playwright/test'

// Word, PowerPoint and PuTTY on real phones: as an iPhone on WebKit, Safari's
// own engine, and as a Pixel on Chromium. The page and the slide shrink to fit
// with CSS zoom, which each engine must draw the same way, and PowerPoint's
// case studies turn with a swipe. office.spec.ts and case-studies.spec.ts
// cover the rest on the desktop.

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

/**
 * A finger drawn across the middle of an element. Chromium takes it through its
 * own touch input; WebKit has no such door, so there the page gets the touch
 * events, as phone.spec.ts does, carrying their touches.
 */
async function swipe(page: Page, browserName: string, target: Locator, direction: 'left' | 'right') {
  const box = await target.boundingBox()
  if (!box) throw new Error('nothing to swipe')
  const y = box.y + box.height / 2
  const [from, to] = direction === 'left' ? [box.x + box.width * 0.8, box.x + box.width * 0.2] : [box.x + box.width * 0.2, box.x + box.width * 0.8]
  const points = Array.from({ length: 7 }, (_, i) => ({ x: from + ((to - from) * i) / 6, y }))
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]] })
    for (const point of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
    return
  }
  await page.evaluate((path) => {
    const target = document.elementFromPoint(path[0].x, path[0].y)
    const raise = (type: string, at: { x: number; y: number } | null) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', { value: at ? [{ target, clientX: at.x, clientY: at.y }] : [] })
      target?.dispatchEvent(event)
    }
    raise('touchstart', path[0])
    for (const point of path.slice(1)) raise('touchmove', point)
    raise('touchend', null)
  }, points)
}

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
      await win.locator('[data-deck]').nth(1).click()
      await expect(title).toHaveText(portfolio.projects[1].title)
      expect(await sideways(page)).toBeLessThanOrEqual(0)
    })

    test('a swipe across the slide turns it, in the window and in the show', async ({ page, browserName }) => {
      const win = await open(page, 'powerpoint', 'PowerPoint')
      const title = win.locator('[data-slide-stage] [data-slide-title]')
      // Boulevard Logistics, whose case study has every section.
      await win.locator('[data-deck="10"]').tap()
      await expect(title).toHaveText('Boulevard Logistics')
      const stage = win.locator('[data-slide-stage]')
      await swipe(page, browserName, stage, 'left')
      await expect(title).toHaveText('Problem')
      await swipe(page, browserName, stage, 'left')
      await expect(title).toHaveText('Approach')
      await swipe(page, browserName, stage, 'right')
      await expect(title).toHaveText('Problem')

      await win.getByRole('button', { name: 'Present' }).tap()
      const show = page.locator('[data-present]')
      await expect(show.locator('[data-slide-title]')).toHaveText('Problem')
      const box = await show.boundingBox()
      expect(box).toEqual({ x: 0, y: 0, ...page.viewportSize() })
      await swipe(page, browserName, show, 'left')
      await expect(show.locator('[data-slide-title]')).toHaveText('Approach')
      await expect(show.locator('[data-show-counter]')).toHaveText('3 / 6')
      await swipe(page, browserName, show, 'right')
      await expect(show.locator('[data-slide-title]')).toHaveText('Problem')
      await show.getByRole('button', { name: 'End show' }).tap()
      await expect(show).toBeHidden()
      await expect(title).toHaveText('Problem')
      expect(await sideways(page)).toBeLessThanOrEqual(0)
    })

    test("PowerPoint's controls are big enough for a finger", async ({ page }) => {
      const win = await open(page, 'powerpoint', 'PowerPoint')
      await expect(win.locator('[data-slide-title]')).toHaveText(portfolio.projects[0].title)
      const small = async (targets: Locator) =>
        (await targets.evaluateAll((all) => all.map((el) => [el.getAttribute('aria-label') ?? el.textContent?.trim(), el.getBoundingClientRect()] as const)))
          .filter(([, box]) => box.width < 44 || box.height < 44)
          .map(([name]) => name)
      expect(await small(win.locator('.ppt-toolbar button'))).toEqual([])
      expect(await small(win.locator('[data-deck]'))).toEqual([])
      await win.getByRole('button', { name: 'Present' }).tap()
      const show = page.locator('[data-present]')
      await expect(show).toBeVisible()
      expect(await small(show.locator('button'))).toEqual([])
      await show.getByRole('button', { name: 'End show' }).tap()
      await expect(show).toBeHidden()
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
