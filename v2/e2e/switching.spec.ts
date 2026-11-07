import { test, expect, type Browser, type Page } from '@playwright/test'

// Moving between windows in both builds: Task View, from the taskbar or
// Alt+Shift+T, and the Alt+Q switcher. The order and keys come from
// assets/js/windowing/switcher.js. Phones are covered in phone.spec.ts.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

type Build = (typeof BUILDS)[number]

async function boot(page: Page, build: Build) {
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
  await page.goto(build.url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })
  await page.locator('[data-desktop-item]').first().waitFor()
}

/** Opens an app through the store, as a visitor would from Start, and waits for its window. */
async function open(page: Page, app: string, title: string) {
  await page.evaluate((id) => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { openApp: (a: string) => void } }
      __osStore: { getState: () => { openApp: (a: string) => void } }
    }
    ;(w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()).openApp(id)
  }, app)
  const win = windowOf(page, title)
  await expect(win).toBeVisible()
  return win
}

/** A window by its title, shown or minimised. */
const windowOf = (page: Page, title: string) => page.locator(`.os-window[aria-label="${title}"]`)
const taskView = (page: Page) => page.getByRole('dialog', { name: 'Task view' })
const taskViewButton = (page: Page) => page.locator('[data-task-view-toggle]:visible')
const cards = (page: Page) => taskView(page).locator('.os-task-view-open')
const card = (page: Page, title: string) => taskView(page).getByRole('button', { name: title, exact: true })
const switcher = (page: Page) => page.getByRole('group', { name: 'Switch windows' })
const selected = (page: Page) => switcher(page).locator('[aria-current="true"]')

/** Through the store, as a later window can cover this one's Minimise button. */
async function minimise(page: Page, title: string) {
  const id = Number((await windowOf(page, title).getAttribute('id'))?.replace('win-', ''))
  await page.evaluate((winId) => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { toggleMinimize: (id: number) => void } }
      __osStore: { getState: () => { toggleMinimize: (id: number) => void } }
    }
    ;(w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()).toggleMinimize(winId)
  }, id)
  await expect(windowOf(page, title)).toHaveAttribute('data-state', 'minimized')
}

/** Settings, then Calculator, then Notepad, which leaves Notepad on top. */
async function openThree(page: Page) {
  await open(page, 'settings', 'Settings')
  await open(page, 'calculator', 'Calculator')
  await open(page, 'notepad', 'Notepad')
}

/** Waits for opening animations to end, so that things are measured at rest. */
const settle = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime as number))
      .every((a) => a.playState !== 'running'),
  )

for (const build of BUILDS) {
  test.describe(`${build.name} Task View`, () => {
    test.beforeEach(({ page }) => boot(page, build))

    test('the Task View button opens Task View, not Task Manager', async ({ page }) => {
      const button = taskViewButton(page)
      await expect(button).toHaveCount(1)
      await expect(button).toHaveAttribute('title', 'Task view (Alt+Shift+T)')
      await expect(button).toHaveAttribute('aria-keyshortcuts', 'Alt+Shift+T')
      await expect(button).toHaveAttribute('aria-expanded', 'false')
      await button.click()
      await expect(taskView(page)).toBeVisible()
      await expect(taskView(page)).toHaveAttribute('aria-modal', 'true')
      await expect(button).toHaveAttribute('aria-expanded', 'true')
      await expect(page.locator('.os-window[aria-label="Task Manager"]')).toHaveCount(0)
    })

    test('shows every window, minimised ones too, most recently used first', async ({ page }) => {
      await openThree(page)
      await minimise(page, 'Calculator')
      await taskViewButton(page).click()
      await expect(cards(page)).toHaveText(['Notepad', 'Settings', 'Calculator'])
      // Each card shows the app's icon, drawn, on the window's colour.
      const icons = await taskView(page).evaluate((dialog) =>
        [...dialog.querySelectorAll('.os-switch-thumb img')].map((img) => {
          const image = img as HTMLImageElement
          return image.src.split('/assets/img/').pop()
        }),
      )
      expect(icons).toEqual(['notepad++.webp', 'settings.webp', 'calculator.webp'])
    })

    test('clicking a card brings its window to the front and closes Task View', async ({ page }) => {
      await openThree(page)
      await taskViewButton(page).click()
      await card(page, 'Settings').click()
      await expect(taskView(page)).toHaveCount(0)
      await expect(windowOf(page, 'Settings')).toHaveClass(/window-active/)
      await expect(windowOf(page, 'Settings')).toBeFocused()
    })

    test('a minimised window is restored from its card', async ({ page }) => {
      await openThree(page)
      await minimise(page, 'Calculator')
      await taskViewButton(page).click()
      await card(page, 'Calculator').click()
      await expect(windowOf(page, 'Calculator')).not.toHaveAttribute('data-state', 'minimized')
      await expect(windowOf(page, 'Calculator')).toHaveClass(/window-active/)
      await expect(windowOf(page, 'Calculator')).toBeFocused()
    })

    test('a card closes its window, and Task View stays open', async ({ page }) => {
      await openThree(page)
      await taskViewButton(page).click()
      await taskView(page).getByRole('button', { name: 'Close Calculator' }).click()
      await expect(windowOf(page, 'Calculator')).toHaveCount(0)
      await expect(cards(page)).toHaveText(['Notepad', 'Settings'])
      await expect(taskView(page)).toBeVisible()
      // Focus stays in Task View, rather than falling to a window behind it.
      await expect.poll(() => taskView(page).evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true)
    })

    test('the keyboard moves between cards, opens one and closes one', async ({ page }) => {
      await openThree(page)
      await page.keyboard.press('Alt+Shift+T')
      await expect(taskView(page)).toBeVisible()
      await expect(card(page, 'Notepad')).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(card(page, 'Calculator')).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      await expect(card(page, 'Settings')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('Enter')
      await expect(taskView(page)).toHaveCount(0)
      await expect(windowOf(page, 'Calculator')).toHaveClass(/window-active/)
      await expect(windowOf(page, 'Calculator')).toBeFocused()

      await page.keyboard.press('Alt+Shift+T')
      await expect(card(page, 'Calculator')).toBeFocused()
      await page.keyboard.press('End')
      await expect(card(page, 'Settings')).toBeFocused()
      await page.keyboard.press('Delete')
      await expect(windowOf(page, 'Settings')).toHaveCount(0)
      await expect(cards(page)).toHaveText(['Calculator', 'Notepad'])
      await expect(card(page, 'Notepad')).toBeFocused()
    })

    test('Esc closes Task View and gives focus back to the button', async ({ page }) => {
      await open(page, 'settings', 'Settings')
      await taskViewButton(page).click()
      await expect(card(page, 'Settings')).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(taskView(page)).toHaveCount(0)
      await expect(taskViewButton(page)).toBeFocused()
      await expect(taskViewButton(page)).toHaveAttribute('aria-expanded', 'false')
    })

    test('the shortcut closes it again, and gives focus back to the window', async ({ page }) => {
      await openThree(page)
      await expect(windowOf(page, 'Notepad')).toBeFocused()
      await page.keyboard.press('Alt+Shift+T')
      await expect(taskView(page)).toBeVisible()
      await page.keyboard.press('Alt+Shift+T')
      await expect(taskView(page)).toHaveCount(0)
      await expect(windowOf(page, 'Notepad')).toBeFocused()
    })

    test('says so when no windows are open', async ({ page }) => {
      await taskViewButton(page).click()
      await expect(taskView(page).getByText('No apps are open.')).toBeVisible()
      await expect(cards(page)).toHaveCount(0)
      await expect(taskView(page)).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(taskView(page)).toHaveCount(0)
    })

    test('closing the last window from the keyboard leaves focus in Task View', async ({ page }) => {
      await open(page, 'calculator', 'Calculator')
      await page.keyboard.press('Alt+Shift+T')
      await expect(card(page, 'Calculator')).toBeFocused()
      await page.keyboard.press('Delete')
      await expect(taskView(page).getByText('No apps are open.')).toBeVisible()
      await expect(taskView(page)).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(taskViewButton(page)).toBeFocused()
    })

    test('Tab stays inside Task View', async ({ page }) => {
      await open(page, 'settings', 'Settings')
      await open(page, 'calculator', 'Calculator')
      await taskViewButton(page).click()
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab')
        await page.keyboard.press('Tab')
        expect(await taskView(page).evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true)
      }
    })

    test('keys pressed in Task View do not reach the window behind it', async ({ page }) => {
      const calculator = await open(page, 'calculator', 'Calculator')
      const display = calculator.locator('[data-calc-display]')
      await expect(display).toHaveText('0')
      await page.keyboard.press('7')
      await expect(display).toHaveText('7')
      // Calculator clears on Esc, so a leaked Esc would show as well as a leaked 8.
      await taskViewButton(page).click()
      await expect(card(page, 'Calculator')).toBeFocused()
      await page.keyboard.press('8')
      await page.keyboard.press('Escape')
      await expect(taskView(page)).toHaveCount(0)
      await expect(display).toHaveText('7')
    })

    test('clicking the empty space around the cards closes it', async ({ page }) => {
      await open(page, 'settings', 'Settings')
      await taskViewButton(page).click()
      await page.mouse.click(8, 8)
      await expect(taskView(page)).toHaveCount(0)
      await expect(windowOf(page, 'Settings')).toBeVisible()
    })

    test('opening Start from the taskbar closes it', async ({ page }) => {
      await open(page, 'settings', 'Settings')
      await taskViewButton(page).click()
      await page.locator('[data-start-button]').click()
      await expect(taskView(page)).toHaveCount(0)
      await expect(page.locator('[data-start-menu]')).toBeVisible()
    })

    test('opening it closes Start', async ({ page }) => {
      await page.locator('[data-start-button]').click()
      await expect(page.locator('[data-start-menu]')).toBeVisible()
      await page.keyboard.press('Alt+Shift+T')
      await expect(taskView(page)).toBeVisible()
      await expect(page.locator('[data-start-menu]')).toBeHidden()
    })

    test('stands still with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await open(page, 'settings', 'Settings')
      await taskViewButton(page).click()
      const moving = await taskView(page).evaluate((dialog) =>
        [dialog, ...dialog.querySelectorAll('*')].map((el) => getComputedStyle(el).animationName).filter((name) => name !== 'none'),
      )
      expect(moving).toEqual([])
    })
  })

  test.describe(`${build.name} Alt+Q switcher`, () => {
    test.beforeEach(({ page }) => boot(page, build))

    test('holding Alt and pressing Q steps through the windows, and letting go switches', async ({ page }) => {
      await openThree(page)
      await page.keyboard.down('Alt')
      await page.keyboard.press('q')
      await expect(switcher(page)).toBeVisible()
      await expect(switcher(page).getByRole('button')).toHaveText(['Notepad', 'Calculator', 'Settings'])
      await expect(selected(page)).toHaveText('Calculator')
      await page.keyboard.press('q')
      await expect(selected(page)).toHaveText('Settings')
      await page.keyboard.press('q')
      await expect(selected(page)).toHaveText('Notepad')
      await page.keyboard.press('q')
      await page.keyboard.press('q')
      await page.keyboard.up('Alt')
      await expect(switcher(page)).toHaveCount(0)
      await expect(windowOf(page, 'Settings')).toHaveClass(/window-active/)
      await expect(windowOf(page, 'Settings')).toBeFocused()
    })

    test('Shift+Q moves back, round past the first window', async ({ page }) => {
      await openThree(page)
      await page.keyboard.down('Alt')
      await page.keyboard.press('q')
      await expect(selected(page)).toHaveText('Calculator')
      await page.keyboard.press('Shift+Q')
      await expect(selected(page)).toHaveText('Notepad')
      await page.keyboard.press('Shift+Q')
      await expect(selected(page)).toHaveText('Settings')
      await page.keyboard.up('Alt')
      await expect(windowOf(page, 'Settings')).toHaveClass(/window-active/)
    })

    test('Esc cancels and leaves the window where it was', async ({ page }) => {
      await openThree(page)
      await page.keyboard.down('Alt')
      await page.keyboard.press('q')
      await expect(switcher(page)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(switcher(page)).toHaveCount(0)
      await page.keyboard.up('Alt')
      await expect(windowOf(page, 'Notepad')).toHaveClass(/window-active/)
      await expect(windowOf(page, 'Notepad')).toBeFocused()
    })

    test('switching to a minimised window restores it', async ({ page }) => {
      await open(page, 'settings', 'Settings')
      await open(page, 'calculator', 'Calculator')
      await minimise(page, 'Calculator')
      await page.keyboard.down('Alt')
      await page.keyboard.press('q')
      await expect(switcher(page).getByRole('button')).toHaveText(['Settings', 'Calculator'])
      await expect(selected(page)).toHaveText('Calculator')
      await page.keyboard.up('Alt')
      await expect(windowOf(page, 'Calculator')).toHaveAttribute('data-state', 'floating')
      await expect(windowOf(page, 'Calculator')).toHaveClass(/window-active/)
    })

    test('Alt+Tab works the same when the browser passes it on', async ({ page }) => {
      await openThree(page)
      await page.keyboard.down('Alt')
      await page.keyboard.press('Tab')
      await expect(selected(page)).toHaveText('Calculator')
      await page.keyboard.press('Shift+Tab')
      await expect(selected(page)).toHaveText('Notepad')
      await page.keyboard.press('Tab')
      await page.keyboard.up('Alt')
      await expect(windowOf(page, 'Calculator')).toHaveClass(/window-active/)
    })

    test('a card can be clicked while Alt is held', async ({ page }) => {
      await openThree(page)
      await page.keyboard.down('Alt')
      await page.keyboard.press('q')
      await switcher(page).getByRole('button', { name: 'Settings' }).click()
      await expect(switcher(page)).toHaveCount(0)
      await page.keyboard.up('Alt')
      await expect(windowOf(page, 'Settings')).toHaveClass(/window-active/)
    })

    test('does nothing with no windows open', async ({ page }) => {
      await page.keyboard.down('Alt')
      await page.keyboard.press('q')
      await page.keyboard.up('Alt')
      await expect(switcher(page)).toHaveCount(0)
    })

    test('closes Task View when it starts', async ({ page }) => {
      await openThree(page)
      await taskViewButton(page).click()
      await page.keyboard.down('Alt')
      await page.keyboard.press('q')
      await expect(taskView(page)).toHaveCount(0)
      await page.keyboard.up('Alt')
      await expect(windowOf(page, 'Calculator')).toHaveClass(/window-active/)
    })
  })
}

/** Runs the same steps in both builds and returns what each saw. */
async function inBothBuilds<T>(
  browser: Browser,
  viewport: { width: number; height: number },
  check: (page: Page) => Promise<T>,
) {
  const seen: T[] = []
  for (const build of BUILDS) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await boot(page, build)
    seen.push(await check(page))
    await context.close()
  }
  return seen
}

/** Where everything in an overlay sits, and how it is painted. */
const measure = (page: Page, selector: string) =>
  page.evaluate((root) => {
    const el = document.querySelector(root) as HTMLElement
    const rect = (node: Element) => {
      const { x, y, width, height } = node.getBoundingClientRect()
      return [x, y, width, height].map(Math.round)
    }
    const look = (node: Element) => {
      const style = getComputedStyle(node)
      return [style.backgroundColor, style.color, style.fontSize, style.borderRadius, style.backdropFilter].join(' ')
    }
    return [el, ...el.querySelectorAll('*')]
      .filter((node) => node.getClientRects().length > 0)
      .map((node) => ({
        tag: node.tagName,
        className: typeof node.className === 'string' ? node.className : '',
        text: node.children.length ? '' : (node.textContent ?? '').trim(),
        rect: rect(node),
        look: look(node),
      }))
  }, selector)

for (const viewport of [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`Task View lays out the same in both builds at ${viewport.width}px`, async ({ browser }) => {
    test.setTimeout(60_000)
    const [v1, v2] = await inBothBuilds(browser, viewport, async (page) => {
      await openThree(page)
      await page.keyboard.press('Alt+Shift+T')
      await expect(taskView(page)).toBeVisible()
      await settle(page)
      await page.mouse.move(0, 0)
      const shown = await measure(page, '.os-task-view')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      return { shown, overflow }
    })
    expect(v1.overflow).toBeLessThanOrEqual(0)
    expect(v1.shown.length).toBeGreaterThan(10)
    expect(v1.shown).toEqual(v2.shown)
  })

  test(`the Alt+Q switcher lays out the same in both builds at ${viewport.width}px`, async ({ browser }) => {
    test.setTimeout(60_000)
    const [v1, v2] = await inBothBuilds(browser, viewport, async (page) => {
      await openThree(page)
      await page.keyboard.down('Alt')
      await page.keyboard.press('q')
      await expect(switcher(page)).toBeVisible()
      await settle(page)
      const shown = await measure(page, '.os-switcher')
      await page.keyboard.up('Alt')
      return shown
    })
    expect(v1.length).toBeGreaterThan(6)
    expect(v1).toEqual(v2)
  })
}
