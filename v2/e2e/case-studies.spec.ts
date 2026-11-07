import { readFileSync } from 'node:fs'
import { test, expect, type Browser, type Locator, type Page } from '@playwright/test'

// PowerPoint as a case study reader, in both builds: a deck for each project,
// opened from the Case study file in its folder, read with the buttons, the
// keys or a show that fills the screen. The decks are built in
// assets/js/windowing/office.js and unit tested in src/windowing/office.test.ts.
// Swipes on phones are in office-phone.spec.ts.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const
type Build = (typeof BUILDS)[number]

const portfolio = JSON.parse(readFileSync(new URL('../../data/portfolio.json', import.meta.url), 'utf8')) as {
  projects: { id: number; title: string }[]
}
const PROJECTS = portfolio.projects
const FREELANCE = 'C:\\Users\\DeVante\\Projects\\Freelance'
const PHONE = { width: 375, height: 812 }
const DESKTOP = { width: 1440, height: 900 }

// Boulevard Logistics has every section: its approach is numbered and its
// outcome has a figure. Earth Echo has the most words and no figures.
const BOULEVARD = 10
const EARTH_ECHO = 102
const BOULEVARD_HEADINGS = ['Boulevard Logistics', 'Problem', 'Approach', 'Outcome', 'Metrics', 'Desktop and mobile']

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

/** Calls a store method in either build. */
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

/** Opens an app with extra data, which v1 takes as the third argument and v2 inside options. */
const openWith = (page: Page, build: Build, app: string, title: string | null, extra: object) =>
  build.name === 'v1'
    ? call(page, 'openApp', app, title, extra)
    : call(page, 'openApp', app, title ?? undefined, { extra })

const powerpoint = (page: Page) => page.locator('.os-window').filter({ has: page.locator('[data-office-app="powerpoint"]') })
const heading = (win: Locator) => win.locator('[data-slide-stage] [data-slide-title]')
const counter = (win: Locator) => win.locator('[data-slide-counter]')
const show = (page: Page) => page.locator('[data-present]')
const file = (page: Page, name: string) => page.locator(`[data-explorer-file="${name}"]`)

/** Opens PowerPoint at a project's deck, as its Case study file does, and waits for the slide. */
async function openDeck(page: Page, build: Build, deck: number) {
  await openWith(page, build, 'powerpoint', 'Case study.pptx', { deck })
  const win = powerpoint(page)
  await expect(heading(win)).toBeVisible({ timeout: 20_000 })
  return win
}

/** The heading of every slide in the open deck, read by stepping through it. */
async function headings(win: Locator) {
  const seen: string[] = []
  const total = Number((await counter(win).textContent())?.split(' / ')[1])
  for (let i = 0; i < total; i += 1) {
    await expect(counter(win)).toHaveText(`${i + 1} / ${total}`)
    seen.push((await heading(win).textContent()) ?? '')
    if (i < total - 1) await win.getByRole('button', { name: 'Next slide' }).click()
  }
  return seen
}

for (const build of BUILDS) {
  test.describe(`${build.name} case studies`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    for (const how of ['a double click', 'Enter', "the menu's Open"] as const) {
      test(`Explorer opens a project's case study with ${how}`, async ({ page }) => {
        await openWith(page, build, 'explorer', 'Bay Motors', { initialPath: `${FREELANCE}\\Bay Motors` })
        const caseStudy = file(page, 'Case study.pptx')
        await expect(caseStudy).toBeVisible({ timeout: 15_000 })
        if (how === 'a double click') {
          await caseStudy.dblclick()
        } else if (how === 'Enter') {
          await caseStudy.click()
          await page.keyboard.press('Enter')
        } else {
          await caseStudy.click({ button: 'right' })
          await page.locator('[data-menu-item="Open"]').click()
        }
        const win = powerpoint(page)
        await expect(heading(win)).toHaveText('Bay Motors', { timeout: 20_000 })
        await expect(win).toHaveAttribute('aria-label', 'Case study.pptx')
        await expect(win.locator('[data-deck-title]')).toHaveText('Bay Motors case study - PowerPoint')
        await expect(win.locator('[data-deck][aria-current="true"]')).toHaveText('Bay Motors')
        await expect(counter(win)).toHaveText(/^1 \/ \d+$/)
      })
    }

    test('lists the case study in Explorer as a PowerPoint presentation', async ({ page }) => {
      await openWith(page, build, 'explorer', 'Earth Echo', { initialPath: `${FREELANCE}\\Earth Echo` })
      const caseStudy = file(page, 'Case study.pptx')
      await expect(caseStudy).toBeVisible({ timeout: 15_000 })
      await expect(caseStudy.locator('img')).toHaveAttribute('src', /powerpoint\.webp$/)
    })

    test('another case study opened while PowerPoint is open turns to that deck', async ({ page }) => {
      const win = await openDeck(page, build, EARTH_ECHO)
      await expect(heading(win)).toHaveText('Earth Echo')
      await win.getByRole('button', { name: 'Next slide' }).click()
      await expect(heading(win)).toHaveText('Problem')
      await openWith(page, build, 'powerpoint', 'Case study.pptx', { deck: BOULEVARD })
      await expect(heading(win)).toHaveText('Boulevard Logistics')
      await expect(counter(win)).toHaveText('1 / 6')
      await expect(powerpoint(page)).toHaveCount(1)
    })

    test('runs problem, approach, outcome, metrics, then the desktop and mobile shots', async ({ page }) => {
      const win = await openDeck(page, build, BOULEVARD)
      expect(await headings(win)).toEqual(BOULEVARD_HEADINGS)
      // Earth Echo's outcome has no figures, so it has no metrics slide.
      await openWith(page, build, 'powerpoint', 'Case study.pptx', { deck: EARTH_ECHO })
      await expect(heading(win)).toHaveText('Earth Echo')
      expect(await headings(win)).toEqual(['Earth Echo', 'Problem', 'Approach', 'Outcome', 'Desktop and mobile'])
    })

    test('the buttons, the keys and the counters move through a deck', async ({ page }) => {
      const win = await openDeck(page, build, BOULEVARD)
      const status = win.locator('[data-slide-status]')
      await expect(counter(win)).toHaveText('1 / 6')
      await expect(status).toHaveText('Slide 1 of 6')
      await expect(win.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
      await win.getByRole('button', { name: 'Next slide' }).click()
      await expect(heading(win)).toHaveText('Problem')
      await expect(status).toHaveText('Slide 2 of 6')
      await win.getByRole('button', { name: 'Previous slide' }).click()
      await expect(heading(win)).toHaveText('Boulevard Logistics')

      await win.locator('[data-slide-stage]').click()
      await page.keyboard.press('ArrowRight')
      await expect(heading(win)).toHaveText('Problem')
      await page.keyboard.press('PageDown')
      await expect(heading(win)).toHaveText('Approach')
      await page.keyboard.press('ArrowDown')
      await expect(heading(win)).toHaveText('Outcome')
      await page.keyboard.press('PageUp')
      await expect(heading(win)).toHaveText('Approach')
      await page.keyboard.press('End')
      await expect(heading(win)).toHaveText('Desktop and mobile')
      await expect(counter(win)).toHaveText('6 / 6')
      await expect(win.getByRole('button', { name: 'Next slide' })).toBeDisabled()
      await page.keyboard.press('ArrowRight')
      await expect(counter(win)).toHaveText('6 / 6')
      await page.keyboard.press('Home')
      await expect(heading(win)).toHaveText('Boulevard Logistics')
      await page.keyboard.press('ArrowLeft')
      await expect(counter(win)).toHaveText('1 / 6')
    })

    test('the deck picker lists every project and opens each at its first slide', async ({ page }) => {
      const win = await openDeck(page, build, BOULEVARD)
      const decks = win.getByRole('navigation', { name: 'Case studies' }).getByRole('button')
      await expect(decks).toHaveText(PROJECTS.map((project) => project.title))
      await win.getByRole('button', { name: 'Next slide' }).click()
      await decks.nth(2).click()
      await expect(decks.nth(2)).toHaveAttribute('aria-current', 'true')
      await expect(win.locator('[data-deck][aria-current="true"]')).toHaveCount(1)
      await expect(heading(win)).toHaveText(PROJECTS[2].title)
      await expect(counter(win)).toHaveText(/^1 \/ \d+$/)
    })

    test('Present fills the screen above the taskbar, takes the keys, and Esc leaves it', async ({ page }) => {
      const win = await openDeck(page, build, BOULEVARD)
      await win.getByRole('button', { name: 'Next slide' }).click()
      const present = win.getByRole('button', { name: 'Present' })
      await present.click()

      const slideShow = show(page)
      await expect(slideShow).toBeVisible()
      await expect(slideShow.locator('[data-slide-title]')).toHaveText('Problem')
      const box = await slideShow.boundingBox()
      expect(box).toEqual({ x: 0, y: 0, width: DESKTOP.width, height: DESKTOP.height })
      // The taskbar is underneath it.
      const onTop = await page.evaluate(({ height }) => {
        const hit = document.elementFromPoint(20, height - 10)
        return !!hit?.closest('[data-present]')
      }, DESKTOP)
      expect(onTop).toBe(true)
      // The slide grows to fill the screen, past the size it is drawn at.
      const slide = await slideShow.locator('[data-slide]').boundingBox()
      expect(slide?.width).toBeGreaterThan(1300)

      await page.keyboard.press('ArrowRight')
      await expect(slideShow.locator('[data-slide-title]')).toHaveText('Approach')
      await expect(slideShow.locator('[data-show-counter]')).toHaveText('3 / 6')
      await page.keyboard.press('End')
      await expect(slideShow.locator('[data-slide-title]')).toHaveText('Desktop and mobile')

      await page.keyboard.press('Escape')
      await expect(slideShow).toBeHidden()
      await expect(present).toBeFocused()
      // The window carries on from where the show ended.
      await expect(heading(win)).toHaveText('Desktop and mobile')
      // And its keys work again once the show is over.
      await page.keyboard.press('Home')
      await expect(heading(win)).toHaveText('Boulevard Logistics')
    })

    test('End show ends the show, and the show has its own buttons', async ({ page }) => {
      const win = await openDeck(page, build, BOULEVARD)
      await win.getByRole('button', { name: 'Present' }).click()
      const slideShow = show(page)
      await expect(slideShow.locator('[data-slide-title]')).toHaveText('Boulevard Logistics')
      await slideShow.getByRole('button', { name: 'Next slide' }).click()
      await expect(slideShow.locator('[data-slide-title]')).toHaveText('Problem')
      await slideShow.getByRole('button', { name: 'End show' }).click()
      await expect(slideShow).toBeHidden()
      await expect(heading(win)).toHaveText('Problem')
    })

    test("each slide's words and pictures fit inside it, in every deck", async ({ page }) => {
      test.setTimeout(90_000)
      const win = await openDeck(page, build, PROJECTS[0].id)
      const decks = win.getByRole('navigation', { name: 'Case studies' }).getByRole('button')
      const spills: string[] = []
      for (let d = 0; d < PROJECTS.length; d += 1) {
        await decks.nth(d).click()
        await expect(heading(win)).toHaveText(PROJECTS[d].title)
        const total = Number((await counter(win).textContent())?.split(' / ')[1])
        for (let s = 0; s < total; s += 1) {
          await expect(counter(win)).toHaveText(`${s + 1} / ${total}`)
          const outside = await win.locator('[data-slide-stage] [data-slide]').evaluate(async (slide) => {
            await Promise.allSettled([...slide.querySelectorAll('img')].map((img) => img.decode()))
            const frame = slide.getBoundingClientRect()
            return [...slide.querySelectorAll('.ppt-slide-body *')]
              .filter((el) => {
                const box = el.getBoundingClientRect()
                return box.width && (box.left < frame.left - 1 || box.right > frame.right + 1 || box.top < frame.top - 1 || box.bottom > frame.bottom + 1)
              })
              .map((el) => el.textContent?.slice(0, 40) ?? el.tagName)
          })
          if (outside.length) spills.push(`${PROJECTS[d].title} slide ${s + 1}: ${outside.join(' | ')}`)
          if (s < total - 1) await page.keyboard.press('ArrowRight')
        }
      }
      expect(spills).toEqual([])
    })

    test('says so when the case studies will not load', async ({ page }) => {
      await page.route('**/data/portfolio.json', (route) => route.fulfill({ status: 500, body: 'boom' }))
      await openWith(page, build, 'powerpoint', 'Case study.pptx', { deck: BOULEVARD })
      const win = powerpoint(page)
      await expect(win.locator('.ppt-message')).toHaveText('The case studies could not be loaded.', { timeout: 20_000 })
      await expect(win.getByRole('button', { name: 'Present' })).toBeDisabled()
      await expect(counter(win)).toHaveText('0 / 0')
    })
  })
}

// ---- The two builds side by side ------------------------------------------------

/** Opens a deck in each build at a size, and returns what each saw. */
async function inBothBuilds<T>(
  browser: Browser,
  viewport: { width: number; height: number },
  check: (win: Locator, page: Page, build: Build) => Promise<T>,
) {
  const seen: T[] = []
  for (const build of BUILDS) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await boot(page, build.url)
    const win = await openDeck(page, build, BOULEVARD)
    seen.push(await check(win, page, build))
    await context.close()
  }
  return seen
}

/** Waits until nothing in the window is still loading or moving. */
async function settle(win: Locator, page: Page) {
  await win.evaluate(async (el) => {
    await Promise.allSettled(el.getAnimations({ subtree: true }).map((animation) => animation.finished))
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

test("a deck's slides say the same and sit the same in both builds", async ({ browser }) => {
  test.setTimeout(90_000)
  const decks = await inBothBuilds(browser, DESKTOP, async (win, page) => {
    const slides = []
    await win.locator('[data-slide-stage]').click({ position: { x: 4, y: 4 } })
    for (const heading of BOULEVARD_HEADINGS) {
      await expect(win.locator('[data-slide-stage] [data-slide-title]')).toHaveText(heading)
      await settle(win, page)
      slides.push(
        await win.locator('[data-slide-stage] [data-slide]').evaluate((slide) => {
          const frame = slide.getBoundingClientRect()
          return {
            kind: slide.getAttribute('data-slide-kind'),
            text: (slide as HTMLElement).innerText,
            // Alpine's <template> tags are never drawn, so they are not part of the layout.
            layout: [...slide.querySelectorAll(':not(template)')].map((el) => {
              const box = el.getBoundingClientRect()
              const at = (n: number) => Math.round(n)
              return `${el.tagName.toLowerCase()}.${el.className} ${at(box.left - frame.left)},${at(box.top - frame.top)} ${at(box.width)}x${at(box.height)}`
            }),
          }
        }),
      )
      await page.keyboard.press('ArrowRight')
    }
    return slides
  })
  expect(decks[0].map((slide) => slide.kind)).toEqual(['title', 'points', 'points', 'points', 'metrics', 'shots'])
  expect(decks[1]).toEqual(decks[0])
})

for (const viewport of [DESKTOP, PHONE]) {
  test(`case study slides look the same in both builds at ${viewport.width}px`, async ({ browser }, testInfo) => {
    test.setTimeout(120_000)
    const SLIDES = [
      { at: 0, name: 'title' },
      { at: 2, name: 'approach' },
      { at: 4, name: 'metrics' },
      { at: 5, name: 'shots' },
    ]
    const shots = await inBothBuilds(browser, viewport, async (win, page, build) => {
      const taken: Buffer[] = []
      await win.locator('[data-slide-stage]').click({ position: { x: 4, y: 4 } })
      for (const { at, name } of SLIDES) {
        await page.keyboard.press('Home')
        for (let i = 0; i < at; i += 1) await page.keyboard.press('ArrowRight')
        await expect(win.locator('[data-slide-stage] [data-slide-title]')).toHaveText(BOULEVARD_HEADINGS[at])
        await settle(win, page)
        const shot = await win.locator('.os-window-content').screenshot({ animations: 'disabled', caret: 'hide' })
        await testInfo.attach(`${name}-${build.name}-${viewport.width}.png`, { body: shot, contentType: 'image/png' })
        taken.push(shot)
      }
      // The show covers the whole screen, so the whole screen is compared.
      await win.getByRole('button', { name: 'Present' }).click()
      await expect(page.locator('[data-present] [data-slide-title]')).toHaveText(BOULEVARD_HEADINGS[SLIDES[SLIDES.length - 1].at])
      await settle(page.locator('[data-present]'), page)
      const show = await page.screenshot({ animations: 'disabled', caret: 'hide' })
      await testInfo.attach(`show-${build.name}-${viewport.width}.png`, { body: show, contentType: 'image/png' })
      taken.push(show)
      return taken
    })
    const page = await browser.newPage()
    for (const [i, { name }] of [...SLIDES, { at: -1, name: 'show' }].entries()) {
      const { size, share } = await pixelDifference(page, shots[0][i], shots[1][i])
      expect(size, `${name}: the windows are not the same size`).toBe(true)
      expect(share, `${name}: share of pixels that differ`).toBeLessThan(0.0002)
    }
    await page.close()
  })
}
