import { test, expect, type Page } from '@playwright/test'

// The desktop shell around the windows, in both builds: the cookie banner,
// accessibility, Start, Quick Settings, Widgets, Settings, keys, telemetry,
// boot and the window chrome. Each test runs the same steps on v1 and v2.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

type Build = (typeof BUILDS)[number]

interface Seed {
  signedIn?: boolean
  consent?: 'true' | 'false' | null
  storage?: Record<string, string>
}

interface LogBody {
  action: string
  details: Record<string, unknown>
  deviceInfo: Record<string, string>
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
  const logs: LogBody[] = []
  await page.route('**/api/log.php', async (route) => {
    logs.push(route.request().postDataJSON() as LogBody)
    await route.fulfill({ status: 204, body: '' })
  })
  await page.route('**/googletagmanager.com/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: '' }),
  )
  return logs
}

const waitForShell = (page: Page) =>
  page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })

async function boot(page: Page, build: Build, seed: Seed = {}) {
  const logs = await prepare(page, seed)
  await page.goto(build.url, { waitUntil: 'domcontentloaded' })
  await waitForShell(page)
  return logs
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

/** Reads a value from the shell store. */
const read = (page: Page, path: string) =>
  page.evaluate((p) => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => Record<string, unknown> }
      __osStore: { getState: () => Record<string, unknown> }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    return p.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown>)?.[key], store)
  }, path)

const openApp = (page: Page, build: Build, app: string, title?: string, extra?: Record<string, unknown>) =>
  build.name === 'v1'
    ? call(page, 'openApp', app, title ?? null, extra ?? {})
    : call(page, 'openApp', app, title, extra ? { extra } : undefined)

const windowOf = (page: Page, title: string) => page.getByRole('dialog', { name: title, exact: true })
const startButton = (page: Page) => page.locator('[data-start-button]')
const startMenu = (page: Page) => page.locator('[data-start-menu]')
const quickSettings = (page: Page) => page.locator('[data-quick-settings]')
const widgets = (page: Page) => page.locator('[data-widgets]')
const banner = (page: Page) => page.locator('[data-cookie-banner]')

const BANNER_TEXT =
  'If you accept, the site records which apps you open and a shortened IP address, and may load Google Analytics. Records are kept for 90 days.'

/** Waits for opening animations to end, so that a panel is measured at its real size. */
const settle = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime as number))
      .every((a) => a.playState !== 'running'),
  )

const isDark = (page: Page) =>
  page.evaluate(
    () => document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'),
  )

for (const build of BUILDS) {
  test.describe(`${build.name} cookie banner`, () => {
    test('a new visitor sees the truthful banner straight after signing in', async ({ page }) => {
      await prepare(page, { signedIn: false, consent: null })
      await page.goto(build.url)
      await page.getByRole('button', { name: 'Sign In' }).click({ timeout: 10_000 })
      await expect(startButton(page)).toBeVisible({ timeout: 10_000 })

      await expect(banner(page)).toBeVisible()
      await expect(banner(page)).toContainText(BANNER_TEXT)
      await expect(banner(page)).not.toContainText('No personal data')
      await expect(banner(page).getByRole('link', { name: /privacy/i })).toHaveAttribute('href', /\/privacy$/)
    })

    test('withdrawing consent in Settings stops telemetry', async ({ page }) => {
      const logs = await boot(page, build, { consent: null })
      await banner(page).getByRole('button', { name: 'Accept' }).click()
      await openApp(page, build, 'calculator')
      await expect.poll(() => logs.some((l) => l.details.app === 'calculator')).toBe(true)

      await openApp(page, build, 'settings')
      const toggle = page.locator('[data-setting-toggle="consent"]')
      await expect(toggle).toHaveAttribute('aria-pressed', 'true')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-pressed', 'false')
      await expect(windowOf(page, 'Settings')).toContainText('Declined')

      const before = logs.length
      await openApp(page, build, 'notepad')
      await expect(windowOf(page, 'Notepad')).toBeVisible()
      await page.waitForTimeout(300)
      expect(logs.length).toBe(before)

      if (build.name === 'v1') {
        // Google Analytics stops sending, and its script and cookies go.
        const ga = await page.evaluate(() => ({
          disabled: (window as unknown as Record<string, unknown>)['ga-disable-G-64PRMY8EKD'],
          script: !!document.querySelector('script[src*="googletagmanager"]'),
        }))
        expect(ga).toEqual({ disabled: true, script: false })
      }
    })

    test('Settings shows a choice made in the banner at once', async ({ page }) => {
      await boot(page, build, { consent: null })
      await openApp(page, build, 'settings')
      await expect(windowOf(page, 'Settings')).toContainText('Declined')
      await banner(page).getByRole('button', { name: 'Accept' }).click()
      await expect(page.locator('[data-setting-toggle="consent"]')).toHaveAttribute('aria-pressed', 'true')
      await expect(windowOf(page, 'Settings')).toContainText('Accepted')
    })
  })

  test.describe(`${build.name} cookie banner on a phone`, () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

    test('is a slim bar at the bottom that never covers the open app', async ({ page }) => {
      await boot(page, build, { consent: null })
      await openApp(page, build, 'notepad')
      const win = windowOf(page, 'Notepad')
      await expect(win).toBeVisible()
      await expect(banner(page)).toBeVisible()
      // v2's banner scales in, so measure it once the animation is over.
      await banner(page).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))

      const bar = (await banner(page).boundingBox())!
      const taskbar = (await page.locator('.os-taskbar').boundingBox())!
      expect(bar.x).toBeLessThanOrEqual(1)
      expect(bar.width).toBeGreaterThanOrEqual(373)
      expect(Math.round(bar.y + bar.height)).toBeLessThanOrEqual(Math.round(taskbar.y) + 1)
      expect(bar.height).toBeLessThan(200)
      await expect.poll(async () => {
        const box = (await win.boundingBox())!
        return Math.round(box.y + box.height) <= Math.round(bar.y) + 1
      }).toBe(true)
    })
  })

  test.describe(`${build.name} with JavaScript off`, () => {
    test.use({ javaScriptEnabled: false })

    test('says the desktop needs JavaScript, and points to the CV, which does not', async ({ page }) => {
      await page.goto(build.url)
      const notice = page.locator('[data-noscript]')
      await expect(notice).toBeVisible()
      await expect(notice).toContainText('This desktop needs JavaScript.')
      await expect(notice.getByRole('link', { name: 'Read the CV' })).toHaveAttribute('href', '/cv')
    })
  })

  test.describe(`${build.name} accessibility`, () => {
    test('the page is in British English, with a skip link to the main content', async ({ page }) => {
      await boot(page, build)
      expect(await page.evaluate(() => document.documentElement.lang)).toBe('en-GB')
      await expect(page.locator('main#main-content')).toHaveCount(1)

      await page.keyboard.press('Tab')
      const skip = page.getByRole('link', { name: 'Skip to main content' })
      await expect(skip).toBeFocused()
      await expect(skip).toBeInViewport()
      await page.keyboard.press('Enter')
      await expect(page.locator('main#main-content')).toBeFocused()
    })

    test('Esc closes Start, Quick Settings and Widgets', async ({ page }) => {
      await boot(page, build)
      await startButton(page).click()
      await expect(startMenu(page)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(startMenu(page)).toBeHidden()

      await page.locator('[data-tray-item="status"]').click()
      await expect(quickSettings(page)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(quickSettings(page)).toBeHidden()

      await page.locator('[data-widgets-toggle]').click()
      await expect(widgets(page)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(widgets(page)).toBeHidden()
    })

    test('keyboard focus shows a visible ring', async ({ page }) => {
      await boot(page, build)
      await startButton(page).focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      await expect(startButton(page)).toBeFocused()
      const outline = await startButton(page).evaluate((el) => {
        const style = getComputedStyle(el)
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) }
      })
      expect(outline.style).not.toBe('none')
      expect(outline.width).toBeGreaterThanOrEqual(2)
    })

    test('closing a window moves focus to the next one, then to the taskbar', async ({ page }) => {
      await boot(page, build)
      await openApp(page, build, 'explorer', 'File Explorer')
      await openApp(page, build, 'calculator')
      const calculator = windowOf(page, 'Calculator')
      await calculator.getByRole('button', { name: 'Close' }).focus()
      await page.keyboard.press('Enter')
      await expect(calculator).toHaveCount(0)
      await expect(windowOf(page, 'File Explorer')).toBeFocused()

      await windowOf(page, 'File Explorer').getByRole('button', { name: 'Close' }).focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-taskbar-app="explorer"]')).toBeFocused()
    })

    test('every shell image has alt text', async ({ page }) => {
      await boot(page, build)
      await openApp(page, build, 'settings')
      await expect(windowOf(page, 'Settings')).toBeVisible()
      await startButton(page).click()
      await expect(startMenu(page)).toBeVisible()
      const missing = await page.evaluate(() =>
        [...document.querySelectorAll('img:not([alt])')].map((img) => img.getAttribute('src')),
      )
      expect(missing).toEqual([])
    })

    test('reduced motion stops the shell animations', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await boot(page, build)
      await startButton(page).click()
      await expect(startMenu(page)).toBeVisible()
      await openApp(page, build, 'calculator')
      await expect(windowOf(page, 'Calculator')).toBeVisible()
      const moving = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-start-menu], .os-window, .os-taskbar *')]
          .filter((el) => el.getAnimations().some((a) => (a.effect?.getTiming().duration as number) > 1))
          .map((el) => el.className),
      )
      expect(moving).toEqual([])
    })

    test('text in a window can be selected, the shell around it cannot', async ({ page }) => {
      await boot(page, build)
      await openApp(page, build, 'settings')
      const win = windowOf(page, 'Settings')
      await expect(win).toContainText('System Sounds')
      await win.getByText('System Sounds').dblclick()
      expect(await page.evaluate(() => window.getSelection()?.toString().trim())).not.toBe('')
      const select = await page.evaluate(() => ({
        content: getComputedStyle(document.querySelector('.os-window-content')!).userSelect,
        taskbar: getComputedStyle(document.querySelector('.os-taskbar')!).userSelect,
        title: getComputedStyle(document.querySelector('.os-titlebar')!).userSelect,
      }))
      expect(select).toEqual({ content: 'text', taskbar: 'none', title: 'none' })
    })

    test('shell text is at least 12px', async ({ page }) => {
      await boot(page, build)
      await openApp(page, build, 'settings')
      await expect(windowOf(page, 'Settings')).toBeVisible()
      for (const tab of ['system', 'personalisation', 'qualifications', 'about']) {
        await page.locator(`[data-settings-nav="${tab}"]`).click()
        await page.waitForTimeout(250)
      }
      await startButton(page).click()
      await expect(startMenu(page)).toBeVisible()
      const small = await page.evaluate(() => {
        const roots = document.querySelectorAll('[data-start-menu], .os-taskbar, .os-window, [data-desktop-item]')
        const out: string[] = []
        for (const root of roots) {
          for (const el of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
            const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
            if (own && (el as HTMLElement).offsetParent && parseFloat(getComputedStyle(el).fontSize) < 12) {
              out.push(`${el.textContent!.trim().slice(0, 30)} (${getComputedStyle(el).fontSize})`)
            }
          }
        }
        return out
      })
      expect(small).toEqual([])
    })
  })

  test.describe(`${build.name} touch targets on a phone`, () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

    test('Start and Quick Settings controls are at least 44px', async ({ page }) => {
      await boot(page, build)
      const tooSmall = (selector: string) =>
        page.evaluate(
          (sel) =>
            [...document.querySelectorAll<HTMLElement>(sel)]
              .filter((el) => el.offsetParent)
              .map((el) => ({ el, box: el.getBoundingClientRect() }))
              .filter(({ el, box }) => box.height < 44 || (el.tagName === 'BUTTON' && box.width < 44))
              .map(({ el, box }) => `${el.tagName} ${el.textContent?.trim().slice(0, 20)} ${box.width}x${box.height}`),
          selector,
        )
      await startButton(page).click()
      await expect(startMenu(page)).toBeVisible()
      await settle(page)
      expect(await tooSmall('[data-start-menu] button, [data-start-menu] input, [data-start-menu] [data-pinned-app]')).toEqual([])
      await page.keyboard.press('Escape')
      await page.locator('[data-tray-item="status"]').click()
      await expect(quickSettings(page)).toBeVisible()
      await settle(page)
      expect(await tooSmall('[data-quick-settings] button, [data-quick-settings] input')).toEqual([])
    })
  })

  test.describe(`${build.name} Settings`, () => {
    test('Reset puts the saved wallpaper back on the desktop', async ({ page }) => {
      await boot(page, build)
      const wallpaper = () =>
        page.evaluate(() => getComputedStyle(document.querySelector('[data-os-desktop]')!).backgroundImage)
      const saved = await wallpaper()
      await openApp(page, build, 'settings', 'Settings', { currentTab: 'personalisation' })
      await page.locator('[data-wallpaper="Nature"]').click()
      await expect.poll(wallpaper).toContain('photo-1441974231531')
      await windowOf(page, 'Settings').getByRole('button', { name: 'Reset' }).click()
      await expect.poll(wallpaper).toBe(saved)
    })

    test('the navigation uses icons, not emoji', async ({ page }) => {
      await boot(page, build)
      await openApp(page, build, 'settings')
      const nav = page.locator('[data-settings-nav]')
      await expect(nav).toHaveCount(5)
      for (const item of await nav.all()) {
        await expect(item.locator('img')).toHaveAttribute('src', /assets\/img\/win11\//)
        expect(await item.innerText()).not.toMatch(/\p{Extended_Pictographic}/u)
      }
    })

    test('certifications show how many there are, and each one has its year', async ({ page }) => {
      await boot(page, build)
      await openApp(page, build, 'settings')
      const settings = windowOf(page, 'Settings')
      await settings.locator('[data-settings-nav="qualifications"]').click()
      const cards = settings.locator('[data-cert]')
      await expect(cards.first()).toBeVisible()
      const count = await cards.count()
      expect(count).toBeGreaterThan(0)
      await expect(settings.getByText(`(${count} credentials)`)).toBeVisible()
      for (const card of await cards.all()) expect(await card.innerText()).toMatch(/\b(19|20)\d{2}\b/)
    })

    test('every page uses icons, not emoji', async ({ page }) => {
      await boot(page, build)
      await openApp(page, build, 'settings')
      const settings = windowOf(page, 'Settings')
      for (const tab of ['system', 'personalisation', 'experience', 'qualifications', 'about']) {
        await settings.locator(`[data-settings-nav="${tab}"]`).click()
        await expect(settings.locator(`[data-settings-nav="${tab}"]`)).toHaveAttribute('aria-current', 'page')
        const emoji = (await settings.innerText()).match(/[\p{Extended_Pictographic}✔]/gu) ?? []
        expect(emoji, tab).toEqual([])
      }
    })
  })

  test.describe(`${build.name} Quick Settings`, () => {
    test('every toggle and the brightness slider changes the screen', async ({ page }) => {
      await boot(page, build)
      const filter = () => page.evaluate(() => getComputedStyle(document.body).filter)
      expect(await filter()).toBe('none')
      await page.locator('[data-tray-item="status"]').click()

      await page.locator('[data-quick-toggle="nightLight"]').click()
      await expect.poll(filter).toContain('sepia')
      await page.locator('[data-quick-toggle="accessibility"]').click()
      await expect.poll(filter).toContain('contrast')
      await quickSettings(page).locator('input[type="range"]').first().fill('60')
      await expect.poll(filter).toMatch(/brightness\((0\.6|60%)\)/)

      await page.locator('[data-quick-toggle="airplane"]').click()
      await expect.poll(() => read(page, 'settings.wifi')).toBe(false)
      expect(await read(page, 'settings.bluetooth')).toBe(false)
      await page.locator('[data-quick-toggle="wifi"]').click()
      await expect.poll(() => read(page, 'settings.airplane')).toBe(false)
    })
  })

  test.describe(`${build.name} settings that persist`, () => {
    test('taskbar pins and a volume of zero survive a reload', async ({ page }) => {
      await boot(page, build)
      await openApp(page, build, 'calculator')
      await page.locator('[data-taskbar-app="calculator"]').click({ button: 'right' })
      await page.locator('[data-menu-item="Pin to taskbar"]').click()
      await page.locator('[data-tray-item="status"]').click()
      await quickSettings(page).locator('input[type="range"]').nth(1).fill('0')
      await expect.poll(() => read(page, 'settings.volume').then(Number)).toBe(0)

      await page.reload()
      await waitForShell(page)
      await expect(page.locator('[data-taskbar-app="calculator"]')).toBeVisible()
      expect(Number(await read(page, 'settings.volume'))).toBe(0)
    })
  })

  test.describe(`${build.name} keys`, () => {
    test('Ctrl+S saves in Notepad and does not open Start', async ({ page }) => {
      await boot(page, build)
      await openApp(page, build, 'notepad')
      const win = windowOf(page, 'Notepad')
      await win.locator('[data-notepad-view]').click()
      await win.locator('[data-notepad-text]').fill('hello')
      await win.locator('[data-notepad-text]').press('Control+s')
      await expect(win.getByText('Save As', { exact: true })).toBeVisible()
      await expect(startMenu(page)).toBeHidden()
    })

    test('Ctrl+Shift+Esc opens Task Manager', async ({ page }) => {
      await boot(page, build)
      await page.keyboard.press('Control+Shift+Escape')
      await expect(windowOf(page, 'Task Manager')).toBeVisible()
    })
  })

  test.describe(`${build.name} desktop`, () => {
    test('icons are laid out again when the screen shrinks', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await boot(page, build)
      const icon = page.locator('[data-desktop-item="Recycle Bin"]')
      await expect(icon).toBeVisible()
      const box = (await icon.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + 20)
      await page.mouse.down()
      await page.mouse.move(1100, 650, { steps: 8 })
      await page.mouse.up()

      await page.setViewportSize({ width: 800, height: 450 })
      await expect.poll(async () => {
        const after = (await icon.boundingBox())!
        return after.x + after.width <= 800 && after.y + after.height <= 450 - 48
      }).toBe(true)
      for (const item of await page.locator('[data-desktop-item]').all()) {
        const b = (await item.boundingBox())!
        expect(b.y + b.height, await item.getAttribute('data-desktop-item')).toBeLessThanOrEqual(450 - 48 + 1)
      }
    })

    test('the loading dots show on a light window', async ({ page }) => {
      await boot(page, build)
      let release!: () => void
      const held = new Promise<void>((resolve) => (release = resolve))
      await page.route(/api\/app\.php\?name=calculator|apps\/calculator\/Calculator\.tsx/, async (route) => {
        await held
        await route.continue()
      })
      await openApp(page, build, 'calculator')
      const dot = windowOf(page, 'Calculator').locator('.win-loader .dot').first()
      await expect(dot).toBeAttached()
      const colour = await dot.evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(colour).not.toBe('rgb(255, 255, 255)')
      release()
    })
  })

  test.describe(`${build.name} Widgets`, () => {
    test('say so when the weather and news cannot load', async ({ page }) => {
      await page.route('**/api/weather.php', (route) => route.fulfill({ status: 500, body: 'error' }))
      await page.route('**/api/news.php*', (route) => route.fulfill({ status: 500, body: 'error' }))
      await boot(page, build)
      await page.locator('[data-widgets-toggle]').click()
      await expect(widgets(page)).toContainText('Weather unavailable')
      await expect(widgets(page)).toContainText('Headlines unavailable')
      await expect(widgets(page)).not.toContainText('NaN')
      await expect(widgets(page).locator('.animate-spin')).toHaveCount(0)
    })
  })

  test.describe(`${build.name} Widgets on a phone`, () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('fit the screen', async ({ page }) => {
      await boot(page, build)
      // The weather button is hidden on a phone, so Widgets opens from code here.
      await page.evaluate(() => {
        const w = window as unknown as {
          Alpine?: { $data: (el: Element) => { toggleWidgets: () => void } }
          __osStore?: { getState: () => { toggleWidgets: () => void } }
        }
        if (w.Alpine) w.Alpine.$data(document.body).toggleWidgets()
        else w.__osStore!.getState().toggleWidgets()
      })
      await expect(widgets(page)).toBeVisible()
      await settle(page)
      const box = (await widgets(page).boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(375)
    })
  })

  test.describe(`${build.name} telemetry`, () => {
    test('sends the app, a real browser name and the right system', async ({ page }) => {
      const logs = await boot(page, build, { consent: 'true' })
      await openApp(page, build, 'calculator')
      await expect.poll(() => logs.find((l) => l.details.app === 'calculator')).toBeTruthy()
      const event = logs.find((l) => l.details.app === 'calculator')!
      expect(event.deviceInfo.browser).toMatch(/^(Chrome|Edge) \d+$/)
      expect(event.deviceInfo.os).toBe('Windows')
    })
  })

  test.describe(`${build.name} Start`, () => {
    test('pins thirteen apps and gives Recommended a real time', async ({ page }) => {
      await boot(page, build)
      await startButton(page).click()
      await expect(page.locator('[data-pinned-app]')).toHaveCount(13)
      await expect(startMenu(page)).not.toContainText('2h ago')
      await page.locator('[data-recommended="cv"]').click()
      await expect(page.locator('.os-window')).toHaveCount(1)
      await startButton(page).click()
      await expect(page.locator('[data-recommended="cv"]')).toContainText('Just now')
    })
  })

  test.describe(`${build.name} windows`, () => {
    test('opened in the same moment each get their own window', async ({ page }) => {
      await boot(page, build)
      // As the build switch does when it brings several windows back at once.
      await page.evaluate(() => {
        const w = window as unknown as {
          Alpine?: { store: (n: string) => { openApp: (app: string) => void } }
          __osStore?: { getState: () => { openApp: (app: string) => void } }
        }
        const store = w.Alpine ? w.Alpine.store('os') : w.__osStore!.getState()
        store.openApp('calculator')
        store.openApp('notepad')
        store.openApp('settings')
      })
      await expect(windowOf(page, 'Calculator')).toBeVisible()
      await expect(windowOf(page, 'Notepad')).toBeVisible()
      await expect(windowOf(page, 'Settings')).toBeVisible()
      const ids = await page.locator('.os-window').evaluateAll((all) => all.map((el) => el.id))
      expect(new Set(ids).size).toBe(3)
    })

    test('have an app icon in the title bar and animate as they close and minimise', async ({ page }) => {
      // The animation lasts a fifth of a second, so the page notes each one as it starts.
      await page.addInitScript(() => {
        const leaving: string[] = []
        ;(window as unknown as { leaving: string[] }).leaving = leaving
        document.addEventListener('DOMContentLoaded', () =>
          new MutationObserver((changes) => {
            for (const change of changes) {
              for (const node of change.addedNodes) {
                const kind = (node as HTMLElement).dataset?.leaving
                if (kind) leaving.push(kind)
              }
            }
          }).observe(document.body, { childList: true, subtree: true }),
        )
      })
      const leaving = () => page.evaluate(() => (window as unknown as { leaving: string[] }).leaving)
      await boot(page, build)
      await openApp(page, build, 'notepad')
      const win = windowOf(page, 'Notepad')
      await expect(win.locator('.os-window-icon')).toHaveAttribute('src', /notepad%2B%2B\.webp|notepad\+\+\.webp/)
      await expect(win.locator('.os-window-icon')).toHaveAttribute('alt', '')

      await win.getByRole('button', { name: 'Minimise' }).click()
      await expect.poll(leaving).toEqual(['minimise'])
      await page.locator('[data-taskbar-app="notepad"]').click()
      await expect(win).toBeVisible()
      await win.getByRole('button', { name: 'Close' }).click()
      await expect.poll(leaving).toEqual(['minimise', 'close'])
      // The copies go once they have played.
      await expect(page.locator('[data-leaving]')).toHaveCount(0)
    })

    test('make no click or opening sound, but still play the sign-in sound', async ({ page }) => {
      await page.addInitScript(() => {
        const played: string[] = []
        ;(window as unknown as { played: string[] }).played = played
        ;(window as unknown as { Audio: unknown }).Audio = function (src: string) {
          played.push(decodeURIComponent(String(src)))
          return { volume: 1, play: () => Promise.resolve() }
        }
      })
      await prepare(page, { signedIn: false })
      await page.goto(build.url)
      await page.getByRole('button', { name: 'Sign In' }).click({ timeout: 10_000 })
      await expect(startButton(page)).toBeVisible({ timeout: 10_000 })
      await startButton(page).click()
      await page.keyboard.press('Escape')
      await page.locator('[data-tray-item="status"]').click()
      await page.locator('[data-quick-toggle="nightLight"]').click()
      await openApp(page, build, 'calculator')
      await expect(windowOf(page, 'Calculator')).toBeVisible()
      const played = await page.evaluate(() => (window as unknown as { played: string[] }).played)
      expect(played.some((src) => src.includes('Windows Logon.m4a'))).toBe(true)
      expect(played.filter((src) => /click|Windows Restore|Windows Minimize/.test(src))).toEqual([])
    })
  })

  test.describe(`${build.name} theme`, () => {
    test('follows the system on a first visit, until the visitor chooses', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' })
      await boot(page, build)
      expect(await isDark(page)).toBe(true)

      await openApp(page, build, 'settings')
      await page.locator('[data-setting-toggle="theme"]').click()
      await expect.poll(() => isDark(page)).toBe(false)
      await page.reload()
      await waitForShell(page)
      expect(await isDark(page)).toBe(false)
    })

    test('stays light for a light system', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' })
      await boot(page, build)
      expect(await isDark(page)).toBe(false)
    })
  })

  test.describe(`${build.name} boot and sign-in`, () => {
    test('show the Windows logo and wait only as long as needed', async ({ page }) => {
      // Each build's own flags, timed in the page: boot was a fixed 3 s, and so was sign-in.
      await page.addInitScript(() => {
        const marks: Record<string, number> = {}
        ;(window as unknown as { marks: Record<string, number> }).marks = marks
        const tick = () => {
          const w = window as unknown as {
            Alpine?: { $data: (el: Element) => { isBooting: boolean; loggedIn: boolean } }
            __osStore?: { getState: () => { isBooting: boolean; loggedIn: boolean } }
          }
          const body = document.body
          const state = w.Alpine && body?.hasAttribute('x-data') ? w.Alpine.$data(body) : w.__osStore?.getState()
          if (state?.isBooting === true && marks.booting === undefined) marks.booting = performance.now()
          if (state?.isBooting === false && marks.booting !== undefined) marks.booted ??= performance.now()
          if (state?.loggedIn === true) marks.signedIn ??= performance.now()
          if (document.querySelector('[data-boot-screen] img[src*="startmenu.webp"]')?.checkVisibility()) {
            marks.logo ??= performance.now()
          }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      await prepare(page, { signedIn: false })
      await page.goto(build.url)
      const signIn = page.getByRole('button', { name: 'Sign In' })
      await expect(signIn).toBeVisible({ timeout: 10_000 })
      await page.waitForLoadState('networkidle')

      await page.evaluate(() => ((window as unknown as { marks: Record<string, number> }).marks.clicked = performance.now()))
      await signIn.click()
      await expect(startButton(page)).toBeVisible({ timeout: 10_000 })
      const marks = await page.evaluate(() => (window as unknown as { marks: Record<string, number> }).marks)
      // Both builds boot with v1's Windows logo.
      expect(marks.logo).toBeGreaterThan(0)
      expect(marks.booted - marks.booting).toBeLessThan(2500)
      expect(marks.signedIn - marks.clicked).toBeLessThan(2500)
      // Never a flash: each still shows for its short minimum.
      expect(marks.signedIn - marks.clicked).toBeGreaterThanOrEqual(900)
    })
  })
}

test.describe('v2 routing', () => {
  // As at v1's root. See e2e/address.spec.ts for the rest of the addresses.
  test('an unknown address is v1’s 404 page', async ({ page }) => {
    await prepare(page)
    const res = await page.goto(`${BUILDS[1].url}no-such-page`)
    expect(res?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  })
})
