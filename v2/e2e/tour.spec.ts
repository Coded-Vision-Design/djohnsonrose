import { test, expect, type Browser, type Page } from '@playwright/test'

// The guided tour in both builds: the offer after a first sign-in, the steps
// with Next, moving on by itself, Skip, Esc, replaying it from Start, and that
// each toast says the same and sits in the same place in both builds. Its rules
// are in assets/js/windowing/tour.js, which both builds share.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

type Build = (typeof BUILDS)[number]

const STEPS = [
  { id: 'start', title: 'Start and search', anchor: '[data-start-button]' },
  { id: 'cv', title: 'The CV', anchor: '[data-desktop-item="CV - DeVanté Johnson-Rose.pdf"]' },
  { id: 'work', title: 'The work', anchor: '[data-taskbar-app="explorer"]' },
  { id: 'terminal', title: 'Terminal', anchor: '[data-desktop-item="Terminal"]' },
  { id: 'build', title: 'Two builds', anchor: '[data-tray-item="build"]' },
  { id: 'done', title: "That's the tour", anchor: '[data-start-button]' },
]

interface Seed {
  signedIn?: boolean
  consent?: 'true' | 'false' | null
  storage?: Record<string, string>
}

/** Seeds storage on the first load only, so a reload keeps what the page saved. */
async function prepare(page: Page, { signedIn = true, consent = 'false', storage = {} }: Seed = {}) {
  await page.addInitScript(
    ([signed, given, extra]) => {
      if (sessionStorage.getItem('test.seeded')) return
      sessionStorage.setItem('test.seeded', '1')
      localStorage.clear()
      if (signed) {
        localStorage.setItem('auth.loggedIn', 'true')
        localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
      }
      if (given !== null) {
        localStorage.setItem('cookie.consent', given)
        localStorage.setItem('react.cookie.consent', given)
      }
      for (const [key, value] of Object.entries(extra)) localStorage.setItem(key, value)
    },
    [signedIn, consent, storage] as const,
  )
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
}

const waitForShell = (page: Page) =>
  page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })

async function boot(page: Page, build: Build, seed: Seed = {}) {
  await prepare(page, seed)
  await page.goto(build.url, { waitUntil: 'domcontentloaded' })
  await waitForShell(page)
  await page.locator('[data-desktop-item]').first().waitFor()
}

async function signIn(page: Page) {
  await page.getByRole('button', { name: 'Sign In' }).click({ timeout: 15_000 })
  await expect(page.locator('[data-start-button]')).toBeVisible({ timeout: 15_000 })
}

const toast = (page: Page) => page.locator('[data-tour-toast]')
const ring = (page: Page) => page.locator('[data-tour-ring]')
const button = (page: Page, name: string) => toast(page).getByRole('button', { name, exact: true })

/** Starts the tour from Start's Recommended list. */
async function replayFromStart(page: Page) {
  await page.locator('[data-start-button]').click()
  await page.locator('[data-recommended="tour"]').click()
  await expect(toast(page)).toHaveAttribute('data-tour-step', 'start')
}

const box = async (page: Page, selector: string) => {
  const found = await page.locator(selector).first().boundingBox()
  if (!found) throw new Error(`not on screen: ${selector}`)
  return found
}

/** Whether the ring goes round the element, a little outside it. */
async function ringsRound(page: Page, selector: string) {
  const outer = await box(page, '[data-tour-ring]')
  const inner = await box(page, selector)
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height &&
    outer.width - inner.width <= 12
  )
}

/** Opens an app through the store, as each build's own openApp takes it. */
const openApp = (page: Page, build: Build, app: string) =>
  page.evaluate(
    ([id, name]) => {
      const w = window as unknown as {
        Alpine?: { store: (n: string) => { openApp: (...x: unknown[]) => void } }
        __osStore?: { getState: () => { openApp: (...x: unknown[]) => void } }
      }
      if (name === 'v1') w.Alpine?.store('os').openApp(id, null, {})
      else w.__osStore?.getState().openApp(id)
    },
    [app, build.name] as const,
  )

const pauseClock = async (page: Page) => page.clock.pauseAt(await page.evaluate(() => Date.now() + 50))

for (const build of BUILDS) {
  test.describe(`${build.name} guided tour`, () => {
    test('offers the tour after a first sign-in, without taking focus, and only once', async ({ page }) => {
      await prepare(page, { signedIn: false })
      await page.goto(build.url)
      await signIn(page)

      await expect(toast(page)).toHaveAttribute('data-tour-step', 'offer')
      await expect(toast(page)).toContainText('New here?')
      await expect(toast(page)).toContainText('Take a 60-second tour.')
      await expect(button(page, 'Start tour')).toBeVisible()
      await expect(button(page, 'No thanks')).toBeVisible()
      await expect(page.locator('[data-tour-live]')).toHaveText('New here? Take a 60-second tour.')
      await expect(page.locator('[data-tour-live]')).toHaveAttribute('aria-live', 'polite')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[data-tour-toast]'))).toBe(false)
      await expect(ring(page)).toBeHidden()

      await button(page, 'No thanks').click()
      await expect(toast(page)).toBeHidden()

      // Signing out and in again, or coming back later, does not offer it again.
      await page.locator('[data-start-button]').click()
      await page.getByRole('button', { name: 'Sign out' }).click()
      await signIn(page)
      await page.waitForTimeout(500)
      await expect(toast(page)).toBeHidden()
      await page.reload()
      await waitForShell(page)
      await page.waitForTimeout(500)
      await expect(toast(page)).toBeHidden()
    })

    test('waits for the cookie question before offering the tour', async ({ page }) => {
      await prepare(page, { signedIn: false, consent: null })
      await page.goto(build.url)
      await signIn(page)
      await expect(page.locator('[data-cookie-banner]')).toBeVisible()
      await page.waitForTimeout(300)
      await expect(toast(page)).toBeHidden()
      await page.locator('[data-cookie-banner]').getByRole('button', { name: 'Decline' }).click()
      await expect(toast(page)).toHaveAttribute('data-tour-step', 'offer')
    })

    test('a visitor who is already signed in is not offered it', async ({ page }) => {
      await boot(page, build)
      await page.waitForTimeout(500)
      await expect(toast(page)).toBeHidden()
    })

    test('runs every step with Next, pointing at each part, then hands focus to Start', async ({ page }) => {
      await prepare(page, { signedIn: false })
      await page.goto(build.url)
      await signIn(page)
      await button(page, 'Start tour').click()

      for (const [index, step] of STEPS.entries()) {
        await expect(toast(page)).toHaveAttribute('data-tour-step', step.id)
        await expect(toast(page).locator('[data-tour-count]')).toHaveText(`${index + 1} of 6`)
        await expect(toast(page).locator('#os-tour-title')).toHaveText(step.title)
        await expect(ring(page)).toBeVisible()
        // An icon still loading its picture grows, and the ring follows it.
        await expect.poll(() => ringsRound(page, step.anchor), { message: step.id }).toBe(true)
        // The highlighted part is not covered: what is under its centre is itself.
        const target = await box(page, step.anchor)
        const under = await page.evaluate(
          ([x, y, selector]) => !!document.elementFromPoint(x as number, y as number)?.closest(selector as string),
          [target.x + target.width / 2, target.y + target.height / 2, step.anchor] as const,
        )
        expect(under, `${step.id} is covered`).toBe(true)
        if (index === 0) await expect(button(page, 'Next')).toBeFocused()
        const last = index === STEPS.length - 1
        await expect(button(page, 'Skip tour')).toHaveCount(last ? 0 : 1)
        await button(page, last ? 'Done' : 'Next').click()
      }
      await expect(toast(page)).toBeHidden()
      await expect(ring(page)).toBeHidden()
      await expect(page.locator('[data-start-button]')).toBeFocused()
    })

    test('moves on by itself every ten seconds, but not while hovered', async ({ page }) => {
      await page.clock.install()
      await boot(page, build)
      await replayFromStart(page)
      await page.mouse.move(700, 300)
      await pauseClock(page)

      await page.clock.runFor(9_000)
      await expect(toast(page)).toHaveAttribute('data-tour-step', 'start')
      await page.clock.runFor(1_100)
      await expect(toast(page)).toHaveAttribute('data-tour-step', 'cv')

      await toast(page).hover()
      await page.clock.runFor(30_000)
      await expect(toast(page)).toHaveAttribute('data-tour-step', 'cv')
      await page.mouse.move(700, 300)
      await page.clock.runFor(10_100)
      await expect(toast(page)).toHaveAttribute('data-tour-step', 'work')

      await page.clock.runFor(40_500)
      await expect(toast(page)).toBeHidden()
    })

    test('waits for a keyboard user, whose focus moves into the toast', async ({ page }) => {
      await page.clock.install()
      await boot(page, build)
      await page.locator('[data-start-button]').click()
      await page.locator('[data-recommended="tour"]').focus()
      await page.keyboard.press('Enter')
      await expect(button(page, 'Next')).toBeFocused()
      await pauseClock(page)
      await page.clock.runFor(30_000)
      await expect(toast(page)).toHaveAttribute('data-tour-step', 'start')
      await page.keyboard.press('Enter')
      await expect(toast(page)).toHaveAttribute('data-tour-step', 'cv')
      await expect(button(page, 'Next')).toBeFocused()
    })

    test('Skip tour ends it at once', async ({ page }) => {
      await boot(page, build)
      await replayFromStart(page)
      await button(page, 'Next').click()
      await button(page, 'Skip tour').click()
      await expect(toast(page)).toBeHidden()
      await expect(ring(page)).toBeHidden()
      await expect(page.locator('[data-tour-live]')).toHaveText('')
    })

    test('Esc closes Start first, then skips the tour', async ({ page }) => {
      await boot(page, build)
      await replayFromStart(page)
      await page.locator('[data-start-button]').click()
      await expect(page.locator('[data-start-menu]')).toBeVisible()
      // Start covers the toast, and the tour waits behind it.
      await expect(toast(page)).toBeHidden()
      await expect(ring(page)).toBeHidden()
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-start-menu]')).toBeHidden()
      await expect(toast(page)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(toast(page)).toBeHidden()
    })

    test('waits behind the calendar and Task View too, as behind Start', async ({ page }) => {
      await boot(page, build)
      await replayFromStart(page)
      await page.locator('[data-tray-item="clock"]').click()
      await expect(toast(page)).toBeHidden()
      await page.keyboard.press('Escape')
      await expect(toast(page)).toBeVisible()
      await page.keyboard.press('Alt+Shift+T')
      await expect(page.locator('.os-task-view')).toBeVisible()
      await expect(toast(page)).toBeHidden()
      await page.keyboard.press('Escape')
      await expect(toast(page)).toBeVisible()
      await expect(toast(page)).toHaveAttribute('data-tour-step', 'start')
    })

    test('replays from Start, clearing the desktop, and the highlighted part still works', async ({ page }) => {
      await boot(page, build)
      await openApp(page, build, 'calculator')
      await expect(page.locator('.os-window')).toHaveCount(1)
      await replayFromStart(page)
      await expect(page.locator('[data-start-menu]')).toBeHidden()
      await expect(page.locator('.os-window')).toBeHidden()
      await expect(page.locator('[data-tour-live]')).toContainText('Start and search, 1 of 6.')

      // The ring lets clicks through, so Start opens under it.
      await page.locator('[data-start-button]').click()
      await expect(page.locator('[data-start-menu]')).toBeVisible()
      await expect(toast(page)).toHaveAttribute('data-tour-step', 'start')
    })

    test('stands still with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await boot(page, build)
      await replayFromStart(page)
      const motion = await page.evaluate(() =>
        ['[data-tour-toast]', '[data-tour-ring]'].map((selector) => {
          const style = getComputedStyle(document.querySelector(selector) as Element)
          return [style.animationName, style.transitionDuration]
        }),
      )
      expect(motion).toEqual([
        ['none', '0s'],
        ['none', '0s'],
      ])
    })
  })
}

/** What each step's toast says and where it and its ring sit, in one build. */
async function tourLayout(browser: Browser, build: Build, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await boot(page, build)
  // The clock and the taskbar settle, and every picture has drawn, so that each icon has its size.
  await page.waitForTimeout(800)
  await page.waitForFunction(() => [...document.images].every((img) => img.complete))
  await replayFromStart(page)
  const seen = []
  for (;;) {
    seen.push(
      await page.evaluate(() => {
        const rect = (el: Element | null) => {
          if (!el || (el as HTMLElement).hidden) return null
          const { x, y, width, height } = el.getBoundingClientRect()
          return [x, y, width, height].map(Math.round)
        }
        const toastEl = document.querySelector('[data-tour-toast]') as HTMLElement
        return {
          step: toastEl.dataset.tourStep,
          text: toastEl.innerText.replace(/\s+/g, ' ').trim(),
          toast: rect(toastEl),
          ring: rect(document.querySelector('[data-tour-ring]')),
          buttons: [...toastEl.querySelectorAll('button')]
            .filter((el) => el.offsetParent !== null)
            .map((el) => [el.textContent?.trim(), Math.round(el.getBoundingClientRect().height)]),
        }
      }),
    )
    const done = await page.locator('[data-tour-next]').innerText()
    await page.locator('[data-tour-next]').click()
    if (done === 'Done') break
  }
  await context.close()
  return seen
}

test.describe('the tour in both builds', () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 375, height: 812 },
  ]) {
    test(`says the same and sits in the same place at ${viewport.width}px`, async ({ browser }) => {
      test.setTimeout(90_000)
      const [v1, v2] = [await tourLayout(browser, BUILDS[0], viewport), await tourLayout(browser, BUILDS[1], viewport)]
      expect(v1.map((step) => step.step)).toEqual(STEPS.map((step) => step.id))
      for (const step of v1) {
        expect(step.toast, step.step).not.toBeNull()
        const [x, y, width, height] = step.toast as number[]
        expect(x, `${step.step} starts off the screen`).toBeGreaterThanOrEqual(0)
        expect(y, `${step.step} starts off the screen`).toBeGreaterThanOrEqual(0)
        expect(x + width, `${step.step} runs off the screen`).toBeLessThanOrEqual(viewport.width)
        expect(y + height, `${step.step} runs off the screen`).toBeLessThanOrEqual(viewport.height)
      }
      expect(v2).toEqual(v1)
    })
  }
})
