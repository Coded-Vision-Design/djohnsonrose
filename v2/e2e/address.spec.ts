import { test, expect, type Page } from '@playwright/test'

// The address bar in both builds: it follows the window in front, Back and
// Forward bring windows back, deep links and reloads open their app, unknown
// addresses are a 404, and a Visit Site file opens its real tab from the click.
// The rules are unit tested in src/windowing/address.test.ts.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

/** Signs in on the first load only, so that a reload keeps what the page saved. */
async function prepare(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('test.seeded')) return
    sessionStorage.setItem('test.seeded', '1')
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  // Never leave the test machine for a project's real site.
  await page.context().route(/^https:\/\/(?!localhost)[^/]*\.(co\.uk|com|co\.za)\//, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>site</title>' }),
  )
}

const waitForShell = (page: Page) =>
  page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })

async function boot(page: Page, url: string) {
  await prepare(page)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForShell(page)
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

/** The open windows, and which app is in front. */
const windows = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { windows: { id: number; app: string; state: string }[]; focusedWindowId: number | null } }
      __osStore: { getState: () => { windows: { id: number; app: string; state: string }[]; focusedWindowId: number | null } }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    const focused = store.windows.find((win) => win.id === store.focusedWindowId)
    return {
      front: focused && focused.state !== 'minimized' ? focused.app : null,
      open: Object.fromEntries(store.windows.map((win) => [win.app, win.state])),
      ids: Object.fromEntries(store.windows.map((win) => [win.app, win.id])),
    }
  })

const path = (page: Page) => new URL(page.url()).pathname
const entries = (page: Page) => page.evaluate(() => history.length)
const dialog = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true })
const taskbarApp = (page: Page, app: string) => page.locator(`[data-taskbar-app="${app}"]`)

/** Opens an app from its taskbar button, as a visitor would. */
async function openFromTaskbar(page: Page, app: string, title: string) {
  await taskbarApp(page, app).click()
  await expect(dialog(page, title)).toBeVisible({ timeout: 15_000 })
}

for (const build of BUILDS) {
  const base = new URL(build.url).pathname
  const addressOf = (app: string | null) => (app ? `${base}app/${app}` : base)

  test.describe(`${build.name} address bar`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    test('opening an app adds an entry with its address, and the title follows', async ({ page }) => {
      const before = await entries(page)
      const siteTitle = await page.title()
      await openFromTaskbar(page, 'edge', 'Chrome')
      await expect.poll(() => path(page)).toBe(addressOf('edge'))
      expect(await entries(page)).toBe(before + 1)
      await expect(page).toHaveTitle(`Chrome - ${siteTitle}`)
    })

    test('focusing another window changes the entry rather than adding one', async ({ page }) => {
      const before = await entries(page)
      await openFromTaskbar(page, 'edge', 'Chrome')
      await openFromTaskbar(page, 'explorer', 'File Explorer')
      await expect.poll(() => path(page)).toBe(addressOf('explorer'))
      // Its taskbar button brings the window behind forward.
      await taskbarApp(page, 'edge').click()
      await expect.poll(() => windows(page).then((w) => w.front)).toBe('edge')
      await expect.poll(() => path(page)).toBe(addressOf('edge'))
      expect(await entries(page)).toBe(before + 2)
    })

    test('minimising and closing hand the address to the next window, then the desktop', async ({ page }) => {
      const siteTitle = await page.title()
      await openFromTaskbar(page, 'edge', 'Chrome')
      await openFromTaskbar(page, 'explorer', 'File Explorer')
      const opened = await entries(page)

      await dialog(page, 'File Explorer').getByRole('button', { name: 'Minimise' }).click()
      await expect.poll(() => path(page)).toBe(addressOf('edge'))
      await expect(page).toHaveTitle(`Chrome - ${siteTitle}`)

      await dialog(page, 'Chrome').getByRole('button', { name: 'Close', exact: true }).click()
      await expect.poll(() => path(page)).toBe(addressOf(null))
      await expect(page).toHaveTitle(siteTitle)
      expect(await entries(page)).toBe(opened)
    })

    test('Back and Forward bring the windows back, and the desktop’s address shows the desktop', async ({ page }) => {
      await openFromTaskbar(page, 'explorer', 'File Explorer')
      await openFromTaskbar(page, 'edge', 'Chrome')

      await page.goBack()
      await expect.poll(() => windows(page).then((w) => w.front)).toBe('explorer')
      expect(path(page)).toBe(addressOf('explorer'))

      await page.goBack()
      await expect.poll(() => windows(page).then((w) => w.front)).toBeNull()
      expect(path(page)).toBe(addressOf(null))
      // Every window is minimised, so that none takes the address over.
      await expect(dialog(page, 'Chrome')).toBeHidden()
      await expect(dialog(page, 'File Explorer')).toBeHidden()

      await page.goForward()
      await expect.poll(() => windows(page).then((w) => w.front)).toBe('explorer')
      await expect(dialog(page, 'File Explorer')).toBeVisible()
      expect(path(page)).toBe(addressOf('explorer'))

      await page.goForward()
      await expect.poll(() => windows(page).then((w) => w.front)).toBe('edge')
      expect(path(page)).toBe(addressOf('edge'))
    })

    test('Back to an app that has been closed opens it again', async ({ page }) => {
      await openFromTaskbar(page, 'explorer', 'File Explorer')
      await openFromTaskbar(page, 'edge', 'Chrome')
      // Closed from behind, so that Chrome stays in front and keeps the address.
      await call(page, 'closeWindow', (await windows(page)).ids.explorer)
      await expect(dialog(page, 'File Explorer')).toHaveCount(0)
      expect(path(page)).toBe(addressOf('edge'))

      await page.goBack()
      await expect(dialog(page, 'File Explorer')).toBeVisible({ timeout: 15_000 })
      await expect.poll(() => windows(page).then((w) => w.front)).toBe('explorer')
      expect(path(page)).toBe(addressOf('explorer'))
    })

    test('restoring a window from the desktop adds an entry, so Back returns to the desktop', async ({ page }) => {
      await openFromTaskbar(page, 'edge', 'Chrome')
      await dialog(page, 'Chrome').getByRole('button', { name: 'Minimise' }).click()
      await expect.poll(() => path(page)).toBe(addressOf(null))
      const minimised = await entries(page)

      await taskbarApp(page, 'edge').click()
      await expect(dialog(page, 'Chrome')).toBeVisible()
      await expect.poll(() => path(page)).toBe(addressOf('edge'))
      expect(await entries(page)).toBe(minimised + 1)

      await page.goBack()
      await expect(dialog(page, 'Chrome')).toBeHidden()
      expect(path(page)).toBe(addressOf(null))
    })

    test('an app opened with a file keeps it, and its address names the app alone', async ({ page }) => {
      const file = 'achievements.txt'
      await page.locator(`[data-desktop-item="${file}"]`).dblclick()
      await expect(dialog(page, file)).toBeVisible({ timeout: 15_000 })
      await expect.poll(() => path(page)).toBe(addressOf('notepad'))
      expect(new URL(page.url()).search + new URL(page.url()).hash).toBe('')

      await page.goBack()
      await expect(dialog(page, file)).toBeHidden()
      await page.goForward()
      // The same window comes back, file and all.
      await expect(dialog(page, file)).toBeVisible()
    })

    test('a deep link opens its app without adding an entry, and a reload opens it again', async ({ page }) => {
      await page.goto(`${build.url}app/calculator`, { waitUntil: 'domcontentloaded' })
      const before = await entries(page)
      await expect(dialog(page, 'Calculator')).toBeVisible({ timeout: 15_000 })
      expect(path(page)).toBe(addressOf('calculator'))
      expect(await entries(page)).toBe(before)

      await openFromTaskbar(page, 'edge', 'Chrome')
      await expect.poll(() => path(page)).toBe(addressOf('edge'))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(dialog(page, 'Chrome')).toBeVisible({ timeout: 15_000 })
      await expect(dialog(page, 'Calculator')).toHaveCount(0)
      expect(path(page)).toBe(addressOf('edge'))
    })

    test('signing out leaves the desktop’s address, so signing in opens no app', async ({ page }) => {
      await openFromTaskbar(page, 'edge', 'Chrome')
      await expect.poll(() => path(page)).toBe(addressOf('edge'))
      await page.evaluate(() => {
        const w = window as unknown as {
          Alpine?: { $data: (el: Element) => { logout: () => void } }
          __osStore?: { getState: () => { logout: () => void } }
        }
        if (w.Alpine) w.Alpine.$data(document.body).logout()
        else w.__osStore!.getState().logout()
      })
      await expect.poll(() => path(page)).toBe(addressOf(null))
      await page.getByRole('button', { name: 'Sign In' }).click({ timeout: 10_000 })
      await expect(taskbarApp(page, 'edge')).toBeVisible({ timeout: 10_000 })
      await page.waitForTimeout(400)
      expect((await windows(page)).open).toEqual({})
    })
  })

  test.describe(`${build.name} Visit Site`, () => {
    test.beforeEach(async ({ page }) => {
      // Notes which event, if any, each new tab was opened inside of.
      await page.addInitScript(() => {
        const opened: { url: string; during: string | null }[] = []
        const open = window.open.bind(window)
        ;(window as unknown as { __opened: typeof opened }).__opened = opened
        window.open = (url?: string | URL, ...rest: string[]) => {
          opened.push({ url: String(url), during: window.event?.type ?? null })
          return open(url, ...rest)
        }
      })
      await boot(page, build.url)
    })

    const opened = (page: Page) => page.evaluate(() => (window as unknown as { __opened: unknown[] }).__opened)
    const chrome = (page: Page) => page.locator('.os-window').filter({ has: page.locator('[data-chrome]') })

    test('opens the real site in a new tab inside the double-click, and still shows it in Chrome', async ({ page }) => {
      const folder = 'C:\\Users\\DeVante\\Projects\\Freelance\\Earth Echo'
      if (build.name === 'v1') await call(page, 'openApp', 'explorer', 'Earth Echo', { initialPath: folder })
      else await call(page, 'openApp', 'explorer', 'Earth Echo', { extra: { initialPath: folder } })
      const file = page.locator('[data-explorer-file="Visit Site.url"]')
      await expect(file).toBeVisible({ timeout: 15_000 })

      const popup = page.waitForEvent('popup')
      await file.dblclick()
      expect((await popup).url()).toBe('https://earthecho.co.uk/')
      await expect(chrome(page).getByRole('link', { name: 'Open earthecho.co.uk in a new tab' })).toBeVisible({
        timeout: 15_000,
      })
      // Chrome has loaded, and opened no second tab of its own.
      await page.waitForTimeout(300)
      expect(await opened(page)).toEqual([{ url: 'https://earthecho.co.uk/', during: 'dblclick' }])
    })

    test('does the same when Chrome is already open', async ({ page }) => {
      await openFromTaskbar(page, 'edge', 'Chrome')
      const folder = 'C:\\Users\\DeVante\\Projects\\Freelance\\Earth Echo'
      if (build.name === 'v1') await call(page, 'openApp', 'explorer', 'Earth Echo', { initialPath: folder })
      else await call(page, 'openApp', 'explorer', 'Earth Echo', { extra: { initialPath: folder } })
      const file = page.locator('[data-explorer-file="Visit Site.url"]')
      await expect(file).toBeVisible({ timeout: 15_000 })

      const popup = page.waitForEvent('popup')
      await file.dblclick()
      expect((await popup).url()).toBe('https://earthecho.co.uk/')
      await expect(chrome(page).getByRole('link', { name: 'Open earthecho.co.uk in a new tab' })).toBeVisible()
      await page.waitForTimeout(300)
      expect(await opened(page)).toEqual([{ url: 'https://earthecho.co.uk/', during: 'dblclick' }])
    })
  })
}

test.describe('unknown addresses', () => {
  const [v1, v2] = BUILDS

  for (const url of [`${v1.url}nonexistent-page`, `${v2.url}nonexistent-page`, `${v2.url}app/nope`, `${v2.url}app/word/extra`]) {
    test(`${new URL(url).pathname} is v1’s 404 page`, async ({ page }) => {
      const res = await page.goto(url)
      expect(res?.status()).toBe(404)
      await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
      await expect(page).toHaveTitle(/Page not found/)
    })
  }

  test('both builds give the same page', async ({ page }) => {
    const text = async (url: string) => {
      await page.goto(url)
      return page.locator('main').innerText()
    }
    expect(await text(`${v2.url}nonexistent-page`)).toBe(await text(`${v1.url}nonexistent-page`))
  })

  for (const address of ['', 'desktop', 'login', 'app/word', 'app/github/']) {
    test(`v2’s /${address} still loads the desktop`, async ({ page }) => {
      await prepare(page)
      const res = await page.goto(`${v2.url}${address}`, { waitUntil: 'domcontentloaded' })
      expect(res?.status()).toBe(200)
      await waitForShell(page)
    })
  }
})
