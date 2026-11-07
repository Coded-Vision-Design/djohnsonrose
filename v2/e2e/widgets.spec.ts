import { readFileSync } from 'node:fs'
import { test, expect, type Browser, type Page, type Route } from '@playwright/test'

// Recent changes to this site and Testimonials in the Widgets panel, in both
// builds, with api/activity.php and api/testimonials.php stubbed so nothing
// here reaches GitHub. The testimonials come from e2e/fixtures/testimonials.json:
// data/testimonials.json is empty until there are real ones.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

type Build = (typeof BUILDS)[number]

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

/** Five changes, each far enough from where the wording changes that a slow test cannot cross it. */
const commits = () => [
  { message: 'fix: the first change', sha: 'a1b2c3d', date: ago(2 * HOUR + 10 * 60_000) },
  { message: 'feat: the second change', sha: 'b2c3d4e', date: ago(30 * HOUR) },
  { message: 'test: the third change', sha: 'c3d4e5f', date: ago(3 * DAY + 2 * HOUR) },
  { message: 'docs: the fourth change', sha: 'd4e5f6a', date: ago(15 * DAY) },
  { message: 'perf: the fifth change', sha: 'e5f6a7b', date: ago(100 * DAY) },
]
const AGES = ['2 hours ago', 'yesterday', '3 days ago', '2 weeks ago', '3 months ago']

const FIXTURE = readFileSync(new URL('./fixtures/testimonials.json', import.meta.url), 'utf8')
const fixture = JSON.parse(FIXTURE) as { testimonials: { quote: string; name: string; role: string; company: string; link?: string }[] }

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: typeof body === 'string' ? body : JSON.stringify(body) })

interface Stubs {
  activity?: (route: Route) => Promise<void>
  testimonials?: string
}

/** Boots signed in, with the endpoints stubbed. Returns the changes the default stub sends. */
async function boot(page: Page, build: Build, stubs: Stubs = {}) {
  const sent = commits()
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  // A fixed forecast, so that the panel above the new widgets is the same every time.
  await page.route('**/api/weather.php*', (route) =>
    json(route, 200, { current_weather: { temperature: 11, weathercode: 3 }, city: 'Essex' }),
  )
  await page.route('**/api/activity.php*', stubs.activity ?? ((route) => json(route, 200, { commits: sent })))
  await page.route('**/api/testimonials.php*', (route) => json(route, 200, stubs.testimonials ?? { testimonials: [] }))
  await page.goto(build.url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })
  return sent
}

/** Opens Widgets from code, as the weather button that opens it is hidden on a phone. */
const toggleWidgets = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as {
      Alpine?: { $data: (el: Element) => { toggleWidgets: () => void } }
      __osStore?: { getState: () => { toggleWidgets: () => void } }
    }
    if (w.Alpine) w.Alpine.$data(document.body).toggleWidgets()
    else w.__osStore!.getState().toggleWidgets()
  })

const widgets = (page: Page) => page.locator('[data-widgets]')
const activity = (page: Page) => page.locator('[data-activity]')
const testimonials = (page: Page) => page.locator('[data-testimonials]')

/** Waits for opening animations to end, so that the panel is measured at rest. */
const settle = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime as number))
      .every((a) => a.playState !== 'running'),
  )

for (const build of BUILDS) {
  test.describe(`${build.name} Widgets recent changes`, () => {
    test('list the five latest changes to this site, with how long ago in words', async ({ page }) => {
      const shown = await boot(page, build)
      await page.locator('[data-widgets-toggle]').click()
      const items = activity(page).locator('[data-activity-item]')
      await expect(items).toHaveCount(5)
      await expect(activity(page).getByRole('heading', { name: 'Recent changes to this site' })).toBeVisible()

      for (const [i, item] of (await items.all()).entries()) {
        await expect(item).toContainText(shown[i].message)
        await expect(item).toContainText(shown[i].sha)
        const time = item.locator('time')
        await expect(time).toHaveText(AGES[i])
        await expect(time).toHaveAttribute('datetime', shown[i].date)
        // The full date, day first, is there on hover.
        await expect(time).toHaveAttribute('title', /^\d{1,2} [A-Z][a-z]+ \d{4}$/)
      }
    })

    test('never show a link, an author or the account behind the code', async ({ page }) => {
      await boot(page, build, {
        activity: (route) =>
          json(route, 200, {
            commits: [{ ...commits()[0], author: 'Someone', url: 'https://github.com/someone/repo', html_url: 'https://github.com/x' }],
          }),
      })
      await page.locator('[data-widgets-toggle]').click()
      await expect(activity(page).locator('[data-activity-item]')).toHaveCount(1)
      await expect(activity(page).locator('a')).toHaveCount(0)
      await expect(activity(page)).not.toContainText(/github|someone/i)
    })

    test('say so quietly when the changes cannot be loaded', async ({ page }) => {
      await boot(page, build, { activity: (route) => json(route, 503, { error: 'Recent changes unavailable' }) })
      await page.locator('[data-widgets-toggle]').click()
      await expect(activity(page).locator('[data-activity-failed]')).toHaveText(
        'Recent changes cannot be shown right now.',
      )
      await expect(activity(page).locator('[data-activity-item]')).toHaveCount(0)
      await expect(activity(page).getByRole('status')).toHaveCount(0)
    })

    test('try again on the next opening after a failure', async ({ page }) => {
      let calls = 0
      await boot(page, build, {
        activity: (route) => (++calls === 1 ? json(route, 503, {}) : json(route, 200, { commits: commits() })),
      })
      await page.locator('[data-widgets-toggle]').click()
      await expect(activity(page).locator('[data-activity-failed]')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(widgets(page)).toBeHidden()
      await page.locator('[data-widgets-toggle]').click()
      await expect(activity(page).locator('[data-activity-item]')).toHaveCount(5)
      await expect(activity(page).locator('[data-activity-failed]')).toHaveCount(0)
    })

    test('ask once, then keep the list for later openings', async ({ page }) => {
      let calls = 0
      await boot(page, build, {
        activity: (route) => {
          calls++
          return json(route, 200, { commits: commits() })
        },
      })
      await page.locator('[data-widgets-toggle]').click()
      await expect(activity(page).locator('[data-activity-item]')).toHaveCount(5)
      await page.keyboard.press('Escape')
      await page.locator('[data-widgets-toggle]').click()
      await expect(activity(page).locator('[data-activity-item]')).toHaveCount(5)
      expect(calls).toBe(1)
    })
  })

  test.describe(`${build.name} Widgets testimonials`, () => {
    test('stay hidden while there are none', async ({ page }) => {
      await boot(page, build)
      await page.locator('[data-widgets-toggle]').click()
      await expect(activity(page).locator('[data-activity-item]')).toHaveCount(5)
      await expect(testimonials(page)).toHaveCount(0)
      await expect(widgets(page)).not.toContainText('Testimonials')
    })

    test('stay hidden when they cannot be loaded', async ({ page }) => {
      await boot(page, build)
      await page.route('**/api/testimonials.php*', (route) => route.fulfill({ status: 500, body: 'error' }))
      await page.locator('[data-widgets-toggle]').click()
      await expect(activity(page).locator('[data-activity-item]')).toHaveCount(5)
      await expect(testimonials(page)).toHaveCount(0)
    })

    test('show one at a time, with previous and next going round', async ({ page }) => {
      await boot(page, build, { testimonials: FIXTURE })
      await page.locator('[data-widgets-toggle]').click()
      const section = testimonials(page)
      await expect(section.getByRole('heading', { name: 'Testimonials' })).toBeVisible()
      const [one, two, three] = fixture.testimonials

      const shown = section.locator('[data-testimonial]')
      await expect(shown).toHaveCount(1)
      await expect(shown.locator('blockquote')).toHaveText(one.quote)
      await expect(shown.locator('figcaption')).toContainText('Test Role, Example Ltd')
      await expect(section.locator('[data-testimonial-position]')).toHaveText('1 of 3')

      const next = section.getByRole('button', { name: 'Next testimonial' })
      const previous = section.getByRole('button', { name: 'Previous testimonial' })
      await next.click()
      await expect(shown.locator('blockquote')).toHaveText(two.quote)
      await expect(shown.locator('figcaption')).toContainText('Example Ltd')
      await expect(shown.locator('figcaption')).not.toContainText(',')
      await expect(section.locator('[data-testimonial-position]')).toHaveText('2 of 3')
      await previous.click()
      await previous.click()
      await expect(shown.locator('blockquote')).toHaveText(three.quote)
      await expect(section.locator('[data-testimonial-position]')).toHaveText('3 of 3')
      await next.click()
      await expect(shown.locator('blockquote')).toHaveText(one.quote)
    })

    test('work from the keyboard, and announce the change', async ({ page }) => {
      await boot(page, build, { testimonials: FIXTURE })
      await page.locator('[data-widgets-toggle]').click()
      const section = testimonials(page)
      await expect(section.locator('[data-testimonial]')).toHaveAttribute('aria-live', 'polite')
      const next = section.getByRole('button', { name: 'Next testimonial' })
      await next.focus()
      await page.keyboard.press('Enter')
      await expect(section.locator('blockquote')).toHaveText(fixture.testimonials[1].quote)
      await page.keyboard.press('Space')
      await expect(section.locator('blockquote')).toHaveText(fixture.testimonials[2].quote)
      // The focus ring shows.
      expect(await next.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
    })

    test('link a name only to its https address, in a new tab', async ({ page }) => {
      await boot(page, build, { testimonials: FIXTURE })
      await page.locator('[data-widgets-toggle]').click()
      const caption = testimonials(page).locator('figcaption')
      const link = caption.getByRole('link', { name: fixture.testimonials[0].name })
      await expect(link).toHaveAttribute('href', 'https://example.com/one')
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
      await testimonials(page).getByRole('button', { name: 'Next testimonial' }).click()
      await expect(caption).toContainText(fixture.testimonials[1].name)
      await expect(caption.getByRole('link')).toHaveCount(0)
    })

    test('have no previous or next with only one', async ({ page }) => {
      await boot(page, build, { testimonials: JSON.stringify({ testimonials: [fixture.testimonials[0]] }) })
      await page.locator('[data-widgets-toggle]').click()
      await expect(testimonials(page).locator('blockquote')).toHaveText(fixture.testimonials[0].quote)
      await expect(testimonials(page).getByRole('button')).toHaveCount(0)
      await expect(testimonials(page).locator('[data-testimonial-position]')).toHaveCount(0)
    })
  })

  test.describe(`${build.name} Widgets on a phone`, () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('give previous and next a finger-sized target', async ({ page }) => {
      await boot(page, build, { testimonials: FIXTURE })
      await toggleWidgets(page)
      await expect(testimonials(page)).toBeVisible()
      await settle(page)
      for (const name of ['Previous testimonial', 'Next testimonial']) {
        const box = (await testimonials(page).getByRole('button', { name }).boundingBox())!
        expect(box.width, name).toBeGreaterThanOrEqual(44)
        expect(box.height, name).toBeGreaterThanOrEqual(44)
      }
      const panel = (await widgets(page).boundingBox())!
      const section = (await testimonials(page).boundingBox())!
      expect(section.x).toBeGreaterThanOrEqual(panel.x)
      expect(section.x + section.width).toBeLessThanOrEqual(panel.x + panel.width)
    })
  })
}

/** Where everything new in the panel sits, measured from the top of the panel's scrolling content. */
const layout = (page: Page) =>
  page.evaluate(() => {
    const panel = document.querySelector('[data-widgets]') as HTMLElement
    const scroller = panel.querySelector('[data-testimonials]')?.parentElement as HTMLElement
    const origin = scroller.getBoundingClientRect()
    const rect = (el: Element) => {
      const { x, y, width, height } = el.getBoundingClientRect()
      return [x - origin.x, y - origin.y + scroller.scrollTop, width, height].map(Math.round)
    }
    const all = (selector: string) => [...panel.querySelectorAll(selector)].map(rect)
    const style = (selector: string) => {
      const el = panel.querySelector(selector) as HTMLElement
      const css = getComputedStyle(el)
      return [css.fontSize, css.fontWeight, css.color, css.backgroundColor, css.textTransform].join(' ')
    }
    const box = panel.getBoundingClientRect()
    return {
      panel: [box.x, box.y, box.width, box.height].map(Math.round),
      testimonials: all('[data-testimonials]'),
      quote: all('[data-testimonials] blockquote'),
      caption: all('[data-testimonials] figcaption'),
      buttons: all('[data-testimonials] button'),
      activity: all('[data-activity]'),
      items: all('[data-activity-item]'),
      times: all('[data-activity-item] time'),
      text: [...panel.querySelectorAll<HTMLElement>('[data-testimonials], [data-activity]')].map((el) =>
        el.innerText.replace(/\s+/g, ' ').trim(),
      ),
      styles: [
        style('[data-testimonials] h3'),
        style('[data-testimonials] blockquote'),
        style('[data-activity] h3'),
        style('[data-activity-item]'),
        style('[data-activity-item] code'),
        style('[data-activity-item] time'),
      ],
    }
  })

async function measure(browser: Browser, build: Build, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await boot(page, build, { testimonials: FIXTURE })
  await toggleWidgets(page)
  await expect(activity(page).locator('[data-activity-item]')).toHaveCount(5)
  await expect(testimonials(page)).toBeVisible()
  await settle(page)
  const seen = await layout(page)
  // For a person to look at: the top of the panel, then its end.
  await page.screenshot({ path: test.info().outputPath(`widgets-${build.name}-${viewport.width}-top.png`) })
  await activity(page).evaluate((el) => el.scrollIntoView({ block: 'end' }))
  await page.screenshot({ path: test.info().outputPath(`widgets-${build.name}-${viewport.width}-end.png`) })
  await context.close()
  return seen
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 375, height: 667 },
]) {
  test(`the new widgets are the same in both builds at ${viewport.width}px`, async ({ browser }) => {
    test.setTimeout(60_000) // Boots both builds.
    const [v1, v2] = [await measure(browser, BUILDS[0], viewport), await measure(browser, BUILDS[1], viewport)]
    const [x, , width] = v1.panel
    expect(x, 'Widgets starts off the screen').toBeGreaterThanOrEqual(0)
    expect(x + width, 'Widgets runs off the screen').toBeLessThanOrEqual(viewport.width)
    expect(v1.items).toHaveLength(5)
    expect(v1).toEqual(v2)
  })
}
