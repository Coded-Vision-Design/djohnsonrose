import { test, expect, type Page } from '@playwright/test'

// The build switch on a phone, as an iPhone on WebKit and a Pixel on Chromium.
// Phones have no build chip in the tray, so the Desktop's build shortcut does
// the same job, and the switch must keep the windows the visitor left behind
// it. Both builds are reached on one origin, as on the host: Vite serves v2 and
// hands v1's pages to PHP (see vite.config.ts). build-switch.spec.ts has the rest.

const ORIGIN = process.env.V2_ORIGIN ?? 'http://localhost:5173'

const BUILDS = [
  { name: 'v1', url: `${ORIGIN}/`, other: 'v2', shortcut: 'React Build' },
  { name: 'v2', url: `${ORIGIN}/v2/`, other: 'v1', shortcut: 'PHP Build' },
] as const

const FILE = 'achievements.txt'

async function prepare(page: Page) {
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
}

const waitForBuild = (page: Page, build: 'v1' | 'v2') =>
  page.waitForFunction((name) => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    const ready = !!document.documentElement.dataset.osMode
    return ready && (name === 'v1' ? !!w.Alpine?.store('os') : !!w.__osStore && !w.Alpine)
  }, build)

/** The windows as the store has them, and how the desktop looks. */
const screenOf = (page: Page) =>
  page.evaluate(() => {
    interface Win {
      id: number
      app: string
      title: string
      state: string
      resumeState?: string | null
      x: number
      y: number
      width: number
      height: number
      z: number
    }
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { windows: Win[]; focusedWindowId: number | null } }
      __osStore: { getState: () => { windows: Win[]; focusedWindowId: number | null } }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    const stack = [...store.windows].sort((a, b) => a.z - b.z).map((win) => win.id)
    return {
      mode: document.documentElement.dataset.osMode,
      windows: store.windows.map((win) => ({
        app: win.app,
        title: win.title,
        state: win.state,
        resumeState: win.resumeState ?? null,
        place: [win.x, win.y, win.width, win.height],
        stack: stack.indexOf(win.id),
        focused: store.focusedWindowId === win.id,
      })),
      openApps: (document.querySelector('.os-task-button') as HTMLElement).getAttribute('aria-label'),
      wallpaper: getComputedStyle(document.querySelector('[data-os-desktop]')!).backgroundImage,
    }
  })

/** Brings a minimised app back, as its taskbar or task switcher entry does. */
const restore = (page: Page, app: string) =>
  page.evaluate((id) => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { windows: { id: number; app: string }[]; toggleMinimize: (id: number) => void } }
      __osStore: { getState: () => { windows: { id: number; app: string }[]; toggleMinimize: (id: number) => void } }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    store.toggleMinimize(store.windows.find((win) => win.app === id)!.id)
  }, app)

const icon = (page: Page, name: string) => page.locator(`[data-desktop-item="${name}"]`)
const windowOf = (page: Page, title: string) => page.getByRole('dialog', { name: title, exact: true })

for (const build of BUILDS) {
  test(`${build.name} on a phone: the Desktop's build shortcut takes the open apps to ${build.other}`, async ({ page }) => {
    test.setTimeout(90_000)
    await prepare(page)
    await page.goto(build.url)
    await waitForBuild(page, build.name)
    await icon(page, FILE).waitFor({ timeout: 20_000 })

    // Two apps, each sent back to the desktop with the phone's Back button.
    await icon(page, FILE).tap()
    await expect(windowOf(page, FILE)).toContainText('World #1', { timeout: 20_000 })
    await windowOf(page, FILE).locator('.os-win-back').tap()
    await icon(page, 'Projects').tap()
    await expect(windowOf(page, 'Projects')).toBeVisible({ timeout: 20_000 })
    await windowOf(page, 'Projects').locator('.os-win-back').tap()
    await expect(page.locator('.os-window:not([data-state="minimized"])')).toHaveCount(0)

    const before = await screenOf(page)
    expect(before.mode).toBe('phone')
    expect(before.windows.map((w) => [w.app, w.state])).toEqual([
      ['notepad', 'minimized'],
      ['explorer', 'minimized'],
    ])

    await icon(page, build.shortcut).tap()
    await waitForBuild(page, build.other)
    await expect(page.locator('[data-boot-screen]')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeHidden()
    expect(await screenOf(page)).toEqual(before)

    // Each app comes back as the visitor left it.
    await restore(page, 'notepad')
    await expect(windowOf(page, FILE)).toContainText('World #1', { timeout: 20_000 })
    await windowOf(page, FILE).locator('.os-win-back').tap()
    await restore(page, 'explorer')
    await expect(windowOf(page, 'Projects').locator('[data-explorer-file="Freelance"]')).toBeVisible({ timeout: 20_000 })
  })
}
