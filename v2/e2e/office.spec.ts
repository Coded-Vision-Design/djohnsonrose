import { readFileSync } from 'node:fs'
import { test, expect, type Browser, type Locator, type Page } from '@playwright/test'

// Word, Excel, PowerPoint and PuTTY in both builds. Both draw the same markup,
// styled by assets/css/office.css, and run the rules in
// assets/js/windowing/office.js, so every check here runs against each, and the
// last ones compare the two builds' screenshots.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const
type Build = (typeof BUILDS)[number]

const portfolio = JSON.parse(readFileSync(new URL('../../data/portfolio.json', import.meta.url), 'utf8')) as {
  projects: { id: number; title: string; url: string }[]
}
const PROJECTS = portfolio.projects
const PHONE = { width: 375, height: 812 }
const TITLES = { word: 'Word', excel: 'Excel', powerpoint: 'PowerPoint', putty: 'PuTTY' } as const
type OfficeApp = keyof typeof TITLES

async function boot(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
      return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
    },
    undefined,
    { timeout: 20_000 },
  )
}

const openApp = (page: Page, app: string) =>
  page.evaluate((id) => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { openApp: (a: string) => void } }
      __osStore: { getState: () => { openApp: (a: string) => void } }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    store.openApp(id)
  }, app)

/** Opens an app and waits for its own content. A cold dev server can take a while to compile it. */
async function open(page: Page, app: OfficeApp) {
  await openApp(page, app)
  const win = page.getByRole('dialog', { name: TITLES[app], exact: true })
  await expect(win.locator(`[data-office-app="${app}"]`)).toBeVisible({ timeout: 20_000 })
  return win
}

const wordsIn = (count: Locator) => count.textContent().then((text) => Number(/(\d+)/.exec(text ?? '')?.[1] ?? NaN))

/** Each word of an element's text, and how many line boxes it was laid out on. */
const wordLines = (target: Locator) =>
  target.evaluate((el) => {
    const node = [...el.childNodes].find((child) => child.nodeType === 3 && child.textContent?.trim()) as Text
    const words: { word: string; lines: number }[] = []
    for (const match of node.data.matchAll(/\S+/g)) {
      const range = document.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + match[0].length)
      const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)))
      words.push({ word: match[0], lines: tops.size })
    }
    return words
  })

const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

for (const build of BUILDS) {
  test.describe(`${build.name} Word`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    test('counts the CV as soon as it opens, by its text', async ({ page }) => {
      const win = await open(page, 'word')
      const count = win.locator('[data-word-count]')
      await expect.poll(() => wordsIn(count)).toBeGreaterThan(300)
      // The words a reader sees, counted here without the app's own code.
      const seen = await win.locator('[data-word-editor]').evaluate(
        (el) => (el as HTMLElement).innerText.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length,
      )
      expect(await wordsIn(count)).toBe(seen)
    })

    test('an edit adds the words typed, not the markup', async ({ page }) => {
      const win = await open(page, 'word')
      const count = win.locator('[data-word-count]')
      await expect.poll(() => wordsIn(count)).toBeGreaterThan(300)
      const before = await wordsIn(count)
      // The end of the CV, so the typing cannot land against the next word.
      await win.locator('[data-word-editor] section p').first().click()
      await page.keyboard.press('Control+End')
      await page.keyboard.type(' Esq')
      await expect.poll(() => wordsIn(count)).toBe(before + 1)
      // Bold is markup, so making the word bold adds nothing.
      await page.keyboard.press('Control+Shift+ArrowLeft')
      const bold = win.getByRole('button', { name: 'Bold', exact: true })
      await expect(bold).toHaveAttribute('aria-pressed', 'false')
      await bold.click()
      await expect(bold).toHaveAttribute('aria-pressed', 'true')
      await expect.poll(() => wordsIn(count)).toBe(before + 1)
      await page.keyboard.press('End')
      await page.keyboard.type(' Jr')
      await expect.poll(() => wordsIn(count)).toBe(before + 2)
    })

    test('has the full ribbon', async ({ page }) => {
      const win = await open(page, 'word')
      for (const group of ['Clipboard', 'Font', 'Paragraph', 'Styles', 'Editing']) {
        await expect(win.locator(`[data-word-group="${group}"]`)).toBeVisible()
      }
      for (const name of ['Paste', 'Cut', 'Copy', 'Bold', 'Italic', 'Underline', 'Bullets', 'Numbering', 'Print PDF']) {
        await expect(win.getByRole('button', { name, exact: true })).toBeVisible()
      }
      await expect(win.getByLabel('Font name')).toHaveValue('Calibri')
      await expect(win.getByLabel('Font size')).toHaveValue('3')
    })

    test('Print prints its own document, not the first editable thing on the page', async ({ page }) => {
      const win = await open(page, 'word')
      await expect.poll(() => wordsIn(win.locator('[data-word-count]'))).toBeGreaterThan(300)
      // Something editable earlier in the page, as Excel's cells once were.
      await page.evaluate(() => {
        const decoy = document.createElement('div')
        decoy.contentEditable = 'true'
        decoy.textContent = 'DECOY CELL'
        document.body.prepend(decoy)
      })
      await page.context().addInitScript(() => {
        window.print = () => {}
      })
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        win.getByRole('button', { name: 'Print PDF' }).click(),
      ])
      await popup.waitForLoadState()
      await expect.poll(() => popup.content()).toContain('Johnson-Rose')
      const printed = await popup.content()
      expect(printed).not.toContain('DECOY CELL')
      expect(printed).toContain('Applications Support Engineer')
    })

    test('on a phone the page shrinks to fit and the name stays whole', async ({ page }) => {
      await page.setViewportSize(PHONE)
      const win = await open(page, 'word')
      const name = win.locator('[data-word-editor] h1').first()
      await expect(name).toBeVisible()
      for (const { word, lines } of await wordLines(name)) expect(lines, `"${word}" is split`).toBe(1)
      const fit = await win.locator('[data-word-area]').evaluate((area) => {
        const page = area.querySelector('[data-word-page]') as HTMLElement
        return { page: page.getBoundingClientRect().width, area: area.clientWidth }
      })
      expect(fit.page).toBeLessThanOrEqual(fit.area)
      await expect(win.locator('[data-word-zoom]')).not.toHaveText('100%')
      expect(await sideways(page)).toBeLessThanOrEqual(0)
    })

    test('the zoom buttons zoom the page', async ({ page }) => {
      await page.setViewportSize(PHONE)
      const win = await open(page, 'word')
      const zoom = win.locator('[data-word-zoom]')
      await expect(zoom).toHaveText(/^\d+%$/)
      const fitted = Number.parseInt((await zoom.textContent()) ?? '', 10)
      await win.getByRole('button', { name: 'Zoom in' }).click()
      await expect.poll(async () => Number.parseInt((await zoom.textContent()) ?? '', 10)).toBeGreaterThan(fitted)
      expect(await sideways(page)).toBeLessThanOrEqual(0)
    })

    test('reports a CV that will not load', async ({ page }) => {
      test.skip(build.name === 'v1', 'v1 renders the CV on the server, so there is nothing to fetch')
      await page.route('**/data/cv.php', (route) => route.fulfill({ status: 500, body: '<h1>Server error</h1>' }))
      const win = await open(page, 'word')
      await expect(win.locator('[data-word-editor]')).toContainText('could not be loaded')
      await expect(win.locator('[data-word-editor]')).not.toContainText('Server error')
    })
  })

  test.describe(`${build.name} Excel`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    test('shows the portfolio, one project to a row', async ({ page }) => {
      const win = await open(page, 'excel')
      await expect(win.locator('[data-cell="A1"]')).toHaveText('ID')
      await expect(win.locator('[data-cell="B1"]')).toHaveText('Title')
      for (const [i, project] of PROJECTS.entries()) {
        await expect(win.locator(`[data-cell="B${i + 2}"]`)).toHaveText(project.title)
      }
      await expect(win.locator('[data-excel-status]')).toContainText(`Count: ${PROJECTS.length}`)
    })

    test('a clicked cell shows in the name box and formula bar', async ({ page }) => {
      const win = await open(page, 'excel')
      await win.locator('[data-cell="F2"]').click()
      await expect(win.locator('[data-cell="F2"]')).toHaveAttribute('aria-selected', 'true')
      await expect(win.locator('[data-excel-namebox]')).toHaveText('F2')
      await expect(win.locator('[data-excel-formula]')).toHaveValue(PROJECTS[0].url)
    })

    test('says so when the data will not load', async ({ page }) => {
      await page.route('**/data/portfolio.json', (route) => route.fulfill({ status: 500, body: 'boom' }))
      const win = await open(page, 'excel')
      await expect(win.locator('[data-excel-status]')).toContainText('could not be loaded')
      await expect(win.locator('[data-cell="B2"]')).toHaveText('')
    })
  })

  test.describe(`${build.name} PowerPoint`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    // The case studies themselves are tested in case-studies.spec.ts.
    test('opens on the first project, with a case study for each project', async ({ page }) => {
      const win = await open(page, 'powerpoint')
      await expect(win.locator('[data-deck]')).toHaveText(PROJECTS.map((project) => project.title))
      await expect(win.locator('[data-slide-title]')).toHaveText(PROJECTS[0].title)
      await expect(win.locator('[data-slide-status]')).toHaveText(/^Slide 1 of \d+$/)
      await win.locator('[data-deck]').nth(2).click()
      await expect(win.locator('[data-slide-title]')).toHaveText(PROJECTS[2].title)
    })

    test('the arrow keys change slides only while PowerPoint has focus', async ({ page }) => {
      const win = await open(page, 'powerpoint')
      const title = win.locator('[data-slide-title]')
      await win.locator('[data-deck]').nth(1).click()
      await expect(title).toHaveText(PROJECTS[1].title)
      await win.locator('[data-slide-stage]').click()
      await page.keyboard.press('ArrowRight')
      await expect(title).toHaveText('Problem')

      // Another window takes focus, and the arrows are its own.
      await openApp(page, 'calculator')
      const calculator = page.getByRole('dialog', { name: 'Calculator', exact: true })
      await expect(calculator).toBeVisible()
      await page.waitForTimeout(400)
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(200)
      await expect(title).toHaveText('Problem')

      // Back in PowerPoint, they change slides again.
      await calculator.getByRole('button', { name: 'Close', exact: true }).click()
      await win.locator('[data-slide-stage]').click()
      await page.keyboard.press('ArrowLeft')
      await expect(title).toHaveText(PROJECTS[1].title)
      await page.keyboard.press('End')
      await expect(title).toHaveText('Desktop and mobile')
    })

    test('the Previous and Next buttons change slides too', async ({ page }) => {
      const win = await open(page, 'powerpoint')
      await win.getByRole('button', { name: 'Next slide' }).click()
      await expect(win.locator('[data-slide-status]')).toHaveText(/^Slide 2 of \d+$/)
      await win.getByRole('button', { name: 'Previous slide' }).click()
      await expect(win.locator('[data-slide-status]')).toHaveText(/^Slide 1 of \d+$/)
    })

    test('on a phone the slide shrinks to fit and its title wraps by words', async ({ page }) => {
      await page.setViewportSize(PHONE)
      const win = await open(page, 'powerpoint')
      const title = win.locator('[data-slide-title]')
      await expect(title).toHaveText(PROJECTS[0].title)
      for (const { word, lines } of await wordLines(title)) expect(lines, `"${word}" is split`).toBe(1)
      const fit = await win.locator('[data-slide-stage]').evaluate((stage) => {
        const slide = stage.querySelector('[data-slide]') as HTMLElement
        const a = slide.getBoundingClientRect()
        const b = stage.getBoundingClientRect()
        return { inside: a.left >= b.left - 1 && a.right <= b.right + 1, width: a.width }
      })
      expect(fit.inside).toBe(true)
      expect(fit.width).toBeGreaterThan(250)
      await expect(win.locator('[data-deck]').first()).toBeVisible()
      expect(await sideways(page)).toBeLessThanOrEqual(0)
    })
  })

  test.describe(`${build.name} PuTTY`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    test('has the classic look', async ({ page }) => {
      const win = await open(page, 'putty')
      const colours = await win.locator('[data-office-app="putty"]').evaluate((app) => ({
        panel: getComputedStyle(app.querySelector('[data-putty-panel]') as Element).backgroundColor,
        bar: getComputedStyle(app.querySelector('[data-putty-titlebar]') as Element).backgroundColor,
      }))
      expect(colours).toEqual({ panel: 'rgb(236, 233, 216)', bar: 'rgb(10, 36, 106)' })
      await expect(win.getByText('Basic options for your PuTTY session')).toBeVisible()
      await expect(win.locator('[data-putty-category="Session"]')).toHaveAttribute('aria-selected', 'true')
    })

    test('opens a saved session and answers in it', async ({ page }) => {
      const win = await open(page, 'putty')
      const openButton = win.getByRole('button', { name: 'Open', exact: true })
      await expect(openButton).toBeDisabled()
      await win.getByRole('option', { name: 'devante-homelab' }).click()
      await expect(win.getByLabel('Host Name (or IP address)')).toHaveValue('192.168.1.42')
      await openButton.click()
      const terminal = win.locator('[data-putty-terminal]')
      await expect(terminal).toContainText('Welcome to Ubuntu')
      const command = win.getByLabel('Command')
      await command.fill('whoami')
      await command.press('Enter')
      await expect(terminal).toContainText(/devante@192\.168\.1\.42:~\$ whoami\s+devante/)
      await command.fill('exit')
      await command.press('Enter')
      await expect(win.getByText('Basic options for your PuTTY session')).toBeVisible()
    })

    test('Cancel closes PuTTY', async ({ page }) => {
      const win = await open(page, 'putty')
      await win.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(win).toHaveCount(0)
    })

    test('fits a phone without scrolling sideways', async ({ page }) => {
      await page.setViewportSize(PHONE)
      const win = await open(page, 'putty')
      const openButton = win.getByRole('button', { name: 'Open', exact: true })
      await openButton.scrollIntoViewIfNeeded()
      const box = await openButton.boundingBox()
      expect(box && box.x + box.width).toBeLessThanOrEqual(PHONE.width)
      const app = await win.locator('[data-office-app="putty"]').evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(app).toBeLessThanOrEqual(0)
      expect(await sideways(page)).toBeLessThanOrEqual(0)
    })
  })
}

// ---- The two builds side by side ------------------------------------------------

/** Opens an app in each build, waits for it to settle, and returns what each saw. */
async function inBothBuilds<T>(
  browser: Browser,
  app: OfficeApp,
  viewport: { width: number; height: number },
  check: (win: Locator, page: Page, build: Build) => Promise<T>,
) {
  const seen: T[] = []
  for (const build of BUILDS) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await boot(page, build.url)
    const win = await open(page, app)
    seen.push(await check(win, page, build))
    await context.close()
  }
  return seen
}

/** Waits until nothing in the window is still loading or moving. */
async function settle(win: Locator, page: Page) {
  await win.evaluate(async (el) => {
    await Promise.allSettled(el.getAnimations({ subtree: true }).map((animation) => animation.finished))
    // A lazy picture far off screen may never load, so none is waited on for long.
    const loaded = (img: HTMLImageElement) =>
      Promise.race([img.decode(), new Promise((resolve) => setTimeout(resolve, 5000))])
    await Promise.allSettled([...el.querySelectorAll('img')].map(loaded))
    await document.fonts.ready
  })
  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
}

/** The share of pixels that differ between two screenshots of the same size. */
async function pixelDifference(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ([first, second]) => {
      const load = async (data: string) => {
        const image = new Image()
        image.src = `data:image/png;base64,${data}`
        await image.decode()
        return image
      }
      const [x, y] = await Promise.all([load(first), load(second)])
      if (x.width !== y.width || x.height !== y.height) return { size: false, share: 1 }
      const read = (image: HTMLImageElement) => {
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d') as CanvasRenderingContext2D
        context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, image.width, image.height).data
      }
      const [p, q] = [read(x), read(y)]
      let differ = 0
      for (let i = 0; i < p.length; i += 4) {
        const delta = Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2])
        if (delta > 48) differ++
      }
      return { size: true, share: differ / (p.length / 4) }
    },
    [a.toString('base64'), b.toString('base64')] as const,
  )
}

for (const viewport of [{ width: 1440, height: 900 }, PHONE]) {
  for (const app of Object.keys(TITLES) as OfficeApp[]) {
    test(`${TITLES[app]} looks the same in both builds at ${viewport.width}px`, async ({ browser }, testInfo) => {
      test.setTimeout(90_000) // Boots both builds.
      const shots = await inBothBuilds(browser, app, viewport, async (win, page, build) => {
        if (app === 'word') await expect.poll(() => wordsIn(win.locator('[data-word-count]'))).toBeGreaterThan(300)
        if (app === 'excel') await expect(win.locator('[data-cell="B2"]')).toHaveText(PROJECTS[0].title)
        if (app === 'powerpoint') await expect(win.locator('[data-slide-title]')).toHaveText(PROJECTS[0].title)
        await settle(win, page)
        const shot = await win.locator('.os-window-content').screenshot({ animations: 'disabled', caret: 'hide' })
        await testInfo.attach(`${app}-${build.name}-${viewport.width}.png`, { body: shot, contentType: 'image/png' })
        return shot
      })
      const page = await browser.newPage()
      const { size, share } = await pixelDifference(page, shots[0], shots[1])
      await page.close()
      expect(size, 'the windows are not the same size').toBe(true)
      // Measured at under 0.01% on every app and size: only a real difference gets past this.
      expect(share, 'share of pixels that differ').toBeLessThan(0.0002)
    })
  }
}

test('Word, Excel and PowerPoint show the same data in both builds', async ({ browser }) => {
  test.setTimeout(90_000)
  const words = await inBothBuilds(browser, 'word', { width: 1440, height: 900 }, async (win) => {
    await expect.poll(() => wordsIn(win.locator('[data-word-count]'))).toBeGreaterThan(300)
    return wordsIn(win.locator('[data-word-count]'))
  })
  expect(words[0]).toBe(words[1])
  const cells = await inBothBuilds(browser, 'excel', { width: 1440, height: 900 }, async (win) => {
    await expect(win.locator('[data-cell="B2"]')).toHaveText(PROJECTS[0].title)
    return win.locator('[data-cell]').evaluateAll((all) => all.map((cell) => `${cell.dataset.cell}=${cell.textContent}`))
  })
  expect(cells[0]).toEqual(cells[1])
  const slides = await inBothBuilds(browser, 'powerpoint', { width: 1440, height: 900 }, async (win) => {
    await expect(win.locator('[data-deck]')).toHaveCount(PROJECTS.length)
    return win.locator('[data-deck]').allInnerTexts()
  })
  expect(slides[0]).toEqual(slides[1])
})
