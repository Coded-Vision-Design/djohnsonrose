import { test, expect, type Browser, type Page } from '@playwright/test'

// The clock's flyout in both builds: notifications above a calendar, as in
// Windows 11. The date is frozen on Saturday 7 November 2026 at noon, so that
// every run sees the same month.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

const NOON = new Date('2026-11-07T12:00:00Z')

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

async function boot(page: Page, url: string) {
  await page.clock.setFixedTime(NOON)
  await page.addInitScript(() => {
    if (sessionStorage.getItem('test.seeded')) return
    sessionStorage.setItem('test.seeded', '1')
    localStorage.clear()
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })
  await expect(clock(page)).toContainText('12:00')
}

/** Calls a method on the shell store, v1's Alpine store or v2's Zustand store. */
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

const clock = (page: Page) => page.locator('[data-tray-item="clock"]')
const flyout = (page: Page) => page.locator('[data-calendar-flyout]')
const title = (page: Page) => page.locator('[data-calendar-title]')
const day = (page: Page, iso: string) => page.locator(`[data-calendar-day="${iso}"]`)
const notifications = (page: Page) => page.locator('[data-notification]')
const startMenu = (page: Page) => page.locator('[data-start-menu]')
const quickSettings = (page: Page) => page.locator('[data-quick-settings]')
const widgets = (page: Page) => page.locator('[data-widgets]')

/** Waits for opening animations to end, so that the flyout is measured at rest. */
const settle = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime as number))
      .every((a) => a.playState !== 'running'),
  )

async function open(page: Page) {
  await clock(page).click()
  await expect(flyout(page)).toBeVisible()
}

for (const build of BUILDS) {
  test.describe(`${build.name} clock flyout`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    test('opens above the clock with today, the month and no made-up notifications', async ({ page }) => {
      await expect(flyout(page)).toBeHidden()
      await expect(clock(page)).toHaveAttribute('aria-expanded', 'false')
      await open(page)
      await expect(clock(page)).toHaveAttribute('aria-expanded', 'true')
      await settle(page)

      await expect(page.locator('[data-calendar-date]')).toHaveText('Saturday 7 November')
      await expect(title(page)).toHaveText('November 2026')
      await expect(flyout(page)).toContainText('No new notifications')
      await expect(notifications(page)).toHaveCount(0)
      await expect(flyout(page).getByRole('button', { name: 'Clear all' })).toHaveCount(0)

      await expect(page.locator('[data-calendar-day]')).toHaveCount(42)
      await expect(page.locator('[data-calendar-day][data-outside]')).toHaveCount(12)
      await expect(day(page, '2026-10-26')).toHaveAttribute('data-outside', '')
      await expect(day(page, '2026-11-07')).toHaveAttribute('aria-current', 'date')
      await expect(page.locator('[aria-current="date"]')).toHaveCount(1)

      // Anchored above the clock, at the right, as in Windows 11.
      const box = (await flyout(page).boundingBox())!
      const at = (await clock(page).boundingBox())!
      const viewport = page.viewportSize()!
      expect(box.y + box.height).toBeLessThanOrEqual(at.y)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.x + box.width).toBeGreaterThan(at.x + at.width - 24)
    })

    test('the clock closes it again', async ({ page }) => {
      await open(page)
      await clock(page).click()
      await expect(flyout(page)).toBeHidden()
      await expect(clock(page)).toHaveAttribute('aria-expanded', 'false')
    })

    test('lists the toasts shown this session, newest first, and clears them', async ({ page }) => {
      await call(page, 'showToast', 'Link copied')
      await call(page, 'showToast', 'Press Ctrl+V to paste')
      await open(page)
      await expect(notifications(page)).toHaveCount(2)
      await expect(notifications(page).nth(0)).toContainText('Press Ctrl+V to paste')
      await expect(notifications(page).nth(1)).toContainText('Link copied')
      await expect(notifications(page).nth(0)).toContainText('12:00')
      await expect(flyout(page)).not.toContainText('No new notifications')

      await flyout(page).getByRole('button', { name: 'Clear all' }).focus()
      await page.keyboard.press('Enter')
      await expect(notifications(page)).toHaveCount(0)
      await expect(flyout(page)).toContainText('No new notifications')
      await expect(flyout(page)).toBeVisible()
      // The button goes with them, so focus moves on to the calendar rather than off the page.
      await expect(day(page, '2026-11-07')).toBeFocused()
    })

    test('moves between months with the buttons, and back to today', async ({ page }) => {
      await open(page)
      const next = flyout(page).getByRole('button', { name: 'Next month' })
      const previous = flyout(page).getByRole('button', { name: 'Previous month' })
      await next.click()
      await expect(title(page)).toHaveText('December 2026')
      await expect(page.locator('[aria-current="date"]')).toHaveCount(0)
      await next.click()
      await expect(title(page)).toHaveText('January 2027')
      await previous.click()
      await previous.click()
      await previous.click()
      await expect(title(page)).toHaveText('October 2026')
      // Today shows dimmed at the end of October, and stays today.
      await expect(day(page, '2026-11-07')).toHaveAttribute('data-outside', '')
      await expect(day(page, '2026-11-07')).toHaveAttribute('aria-current', 'date')

      await flyout(page).getByRole('button', { name: 'Today' }).click()
      await expect(title(page)).toHaveText('November 2026')
      await expect(day(page, '2026-11-07')).toHaveAttribute('aria-selected', 'true')
      // The header always names today.
      await expect(page.locator('[data-calendar-date]')).toHaveText('Saturday 7 November')
    })

    test('a day from the next month opens that month', async ({ page }) => {
      await open(page)
      await day(page, '2026-12-03').click()
      await expect(title(page)).toHaveText('December 2026')
      await expect(day(page, '2026-12-03')).toHaveAttribute('aria-selected', 'true')
      await expect(day(page, '2026-12-03')).not.toHaveAttribute('data-outside')
    })

    test('the grid works from the keyboard, with roles and names for screen readers', async ({ page }) => {
      await clock(page).focus()
      await page.keyboard.press('Enter')
      await expect(flyout(page)).toBeVisible()
      await expect(day(page, '2026-11-07')).toBeFocused()

      const grid = page.getByRole('grid', { name: 'November 2026' })
      await expect(grid).toBeVisible()
      await expect(grid.getByRole('columnheader')).toHaveCount(7)
      await expect(grid.getByRole('columnheader').first()).toHaveAccessibleName('Monday')
      await expect(grid.getByRole('row')).toHaveCount(7)
      await expect(grid.getByRole('gridcell')).toHaveCount(42)
      await expect(grid.getByRole('gridcell', { name: 'Saturday 7 November 2026' })).toHaveAttribute('tabindex', '0')
      // One stop in the tab order for the whole grid.
      await expect(grid.locator('[tabindex="0"]')).toHaveCount(1)

      await page.keyboard.press('ArrowRight')
      await expect(day(page, '2026-11-08')).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(day(page, '2026-11-15')).toBeFocused()
      await page.keyboard.press('Home')
      await expect(day(page, '2026-11-09')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(day(page, '2026-11-08')).toBeFocused()
      await expect(day(page, '2026-11-08')).toHaveAttribute('aria-selected', 'true')

      await page.keyboard.press('PageDown')
      await expect(title(page)).toHaveText('December 2026')
      await expect(day(page, '2026-12-08')).toBeFocused()
      await expect(page.getByRole('grid', { name: 'December 2026' })).toBeVisible()

      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await expect(title(page)).toHaveText('November 2026')
      await expect(day(page, '2026-11-24')).toBeFocused()

      await page.keyboard.press('PageUp')
      await page.keyboard.press('PageUp')
      await expect(title(page)).toHaveText('September 2026')
      await expect(day(page, '2026-09-24')).toBeFocused()

      await page.keyboard.press('Shift+PageDown')
      await expect(title(page)).toHaveText('September 2027')
    })

    test('Esc closes it and gives focus back to the clock', async ({ page }) => {
      await open(page)
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Escape')
      await expect(flyout(page)).toBeHidden()
      await expect(clock(page)).toBeFocused()
    })

    test('a click outside closes it', async ({ page }) => {
      await open(page)
      await page.mouse.click(700, 300)
      await expect(flyout(page)).toBeHidden()
    })

    test('opens fresh on today after browsing other months', async ({ page }) => {
      await open(page)
      await flyout(page).getByRole('button', { name: 'Next month' }).click()
      await page.keyboard.press('Escape')
      await open(page)
      await expect(title(page)).toHaveText('November 2026')
    })

    test('shares the screen with Start, Quick Settings and Widgets one at a time', async ({ page }) => {
      await open(page)
      await page.locator('[data-start-button]').click()
      await expect(startMenu(page)).toBeVisible()
      await expect(flyout(page)).toBeHidden()

      await clock(page).click()
      await expect(flyout(page)).toBeVisible()
      await expect(startMenu(page)).toBeHidden()

      await page.locator('[data-tray-item="status"]').click()
      await expect(quickSettings(page)).toBeVisible()
      await expect(flyout(page)).toBeHidden()

      await clock(page).click()
      await expect(flyout(page)).toBeVisible()
      await expect(quickSettings(page)).toBeHidden()

      await page.locator('[data-widgets-toggle]').click()
      await expect(widgets(page)).toBeVisible()
      await expect(flyout(page)).toBeHidden()

      await clock(page).click()
      await expect(flyout(page)).toBeVisible()
      await expect(widgets(page)).toBeHidden()
    })

    test('stands still with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await open(page)
      const moving = await flyout(page).evaluate((root) =>
        [root, ...root.querySelectorAll('*')]
          .filter((el) => el.getAnimations().some((a) => (a.effect?.getTiming().duration as number) > 1))
          .map((el) => el.className),
      )
      expect(moving).toEqual([])
    })
  })

  test.describe(`${build.name} clock flyout on a phone`, () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
    test.beforeEach(({ page }) => boot(page, build.url))

    test('is a full-width panel above the taskbar, with finger-sized targets', async ({ page }) => {
      await call(page, 'showToast', 'Link copied')
      await clock(page).tap()
      await expect(flyout(page)).toBeVisible()
      await settle(page)

      const box = (await flyout(page).boundingBox())!
      const taskbar = (await page.locator('.os-taskbar').boundingBox())!
      expect(box.x).toBe(0)
      expect(box.width).toBe(375)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(Math.round(box.y + box.height)).toBe(Math.round(taskbar.y))

      const small = await flyout(page).evaluate((root) =>
        [...root.querySelectorAll<HTMLElement>('button, [data-calendar-day]')]
          .map((el) => ({ el, rect: el.getBoundingClientRect() }))
          .filter(({ rect }) => rect.width < 44 || rect.height < 44)
          .map(({ el, rect }) => `${el.textContent?.trim()} ${rect.width}x${rect.height}`),
      )
      expect(small).toEqual([])
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)

      await day(page, '2026-11-12').tap()
      await expect(day(page, '2026-11-12')).toHaveAttribute('aria-selected', 'true')
    })
  })
}

/** What the open flyout looks like: where each part sits, and its colours. */
const readFlyout = (page: Page) =>
  page.evaluate(() => {
    const rect = (el: Element | null) => {
      if (!el) return null
      const { x, y, width, height } = el.getBoundingClientRect()
      return [x, y, width, height].map(Math.round)
    }
    const root = document.querySelector('[data-calendar-flyout]')!
    const style = (el: Element | null) => {
      if (!el) return null
      const s = getComputedStyle(el)
      return { colour: s.color, background: s.backgroundColor, font: `${s.fontSize} ${s.fontWeight}`, radius: s.borderRadius }
    }
    const today = document.querySelector('[data-calendar-day="2026-11-07"]')
    const outside = document.querySelector('[data-calendar-day="2026-10-26"]')
    return {
      flyout: rect(root),
      panels: [...root.querySelectorAll('[data-notification-centre], [data-calendar-panel]')].map((panel) => ({
        rect: rect(panel),
        ...style(panel),
        blur: getComputedStyle(panel).backdropFilter,
      })),
      text: (root as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
      header: rect(document.querySelector('[data-calendar-date]')),
      title: rect(document.querySelector('[data-calendar-title]')),
      buttons: [...root.querySelectorAll('button')].map((button) => ({ name: button.textContent?.trim() || button.getAttribute('aria-label'), rect: rect(button) })),
      notifications: [...root.querySelectorAll('[data-notification]')].map(rect),
      headings: [...root.querySelectorAll('[role="columnheader"]')].map(rect),
      days: [...root.querySelectorAll('[data-calendar-day]')].map(rect),
      today: { cell: style(today), mark: style(today?.firstElementChild ?? null) },
      outside: style(outside),
    }
  })

async function flyoutInBothBuilds(browser: Browser, viewport: { width: number; height: number }) {
  const seen = []
  for (const build of BUILDS) {
    const context = await browser.newContext({ viewport, timezoneId: 'Europe/London', locale: 'en-GB' })
    const page = await context.newPage()
    await boot(page, build.url)
    await call(page, 'showToast', 'Link copied')
    await call(page, 'showToast', 'Press Ctrl+V to paste')
    await page.evaluate(() => document.fonts.ready)
    await open(page)
    await settle(page)
    // Off the grid, so that no focus ring differs between the two.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    seen.push(await readFlyout(page))
    await context.close()
  }
  return seen
}

test.describe('the clock flyout in both builds', () => {
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`lays out the same at ${viewport.width}px`, async ({ browser }) => {
      test.setTimeout(60_000)
      const [v1, v2] = await flyoutInBothBuilds(browser, viewport)
      expect(v1.days).toHaveLength(42)
      expect(v1.notifications).toHaveLength(2)
      expect(v1.flyout![0]).toBeGreaterThanOrEqual(0)
      expect(v1.flyout![0] + v1.flyout![2]).toBeLessThanOrEqual(viewport.width)
      expect(v1).toEqual(v2)
    })
  }

  test('marks today in the accent colour, and dims the days of other months', async ({ browser }) => {
    const [v1, v2] = await flyoutInBothBuilds(browser, { width: 1440, height: 900 })
    expect(v1.today.mark?.background).toBe('rgb(0, 120, 212)')
    expect(v1.today.mark?.colour).toBe('rgb(255, 255, 255)')
    expect(v1.outside?.colour).not.toBe(v1.today.cell?.colour)
    expect(v1).toEqual(v2)
  })
})
