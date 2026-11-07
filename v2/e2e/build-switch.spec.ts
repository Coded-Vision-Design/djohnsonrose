import { writeFile } from 'node:fs/promises'
import { test, expect, type Browser, type Locator, type Page } from '@playwright/test'

// The build chip swaps v1 for v2, or back, with nothing on screen changing: the
// same windows in the same places, stacked and focused the same way, the same
// theme and wallpaper, and no boot or lock screen. The hand-off between them
// lives in session storage, so both builds are reached on one origin, as on
// the host: Vite serves v2 and hands v1's pages to PHP (see vite.config.ts).

const ORIGIN = process.env.V2_ORIGIN ?? 'http://localhost:5173'

const BUILDS = [
  { name: 'v1', url: `${ORIGIN}/`, other: 'v2', shortcut: 'React Build' },
  { name: 'v2', url: `${ORIGIN}/v2/`, other: 'v1', shortcut: 'PHP Build' },
] as const

type Build = (typeof BUILDS)[number]
type BuildName = Build['name']

/** The same moment in both builds, so that the clocks read the same. */
const FROZEN = new Date('2026-11-07T12:34:00')

const DESKTOP = 'C:\\Users\\DeVante\\Desktop'
const ACHIEVEMENTS = 'achievements.txt'

/** Seeds the first load only, so that the build switched to keeps what the switch left. */
async function prepare(page: Page, { signedIn = true } = {}) {
  await page.clock.setFixedTime(FROZEN)
  await page.addInitScript((signed) => {
    if (sessionStorage.getItem('test.seeded')) return
    sessionStorage.setItem('test.seeded', '1')
    localStorage.clear()
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    if (signed) {
      localStorage.setItem('auth.loggedIn', 'true')
      localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
    }
  }, signedIn)
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.route('**/api/weather.php', (route) =>
    route.fulfill({ json: { city: 'Essex', current_weather: { temperature: 12, weathercode: 3 } } }),
  )
  await page.route('**/api/news.php*', (route) => route.fulfill({ json: { news: [] } }))
}

/**
 * Waits for a build's shell, telling the two apart by their stores, and for
 * its desktop to be measured, unless the visitor is signed out.
 */
const waitForBuild = (page: Page, build: BuildName, { desktop = true } = {}) =>
  page.waitForFunction(
    ([name, measured]) => {
      const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
      const ready = !measured || !!document.documentElement.dataset.osMode
      return ready && (name === 'v1' ? !!w.Alpine?.store('os') : !!w.__osStore && !w.Alpine)
    },
    [build, desktop] as const,
  )

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

const openApp = (page: Page, build: Build, app: string, title?: string, extra?: Record<string, unknown>) =>
  build.name === 'v1'
    ? call(page, 'openApp', app, title ?? null, extra ?? {})
    : call(page, 'openApp', app, title, extra ? { extra } : undefined)

/** The id of an app's window. */
const windowId = (page: Page, app: string) =>
  page.evaluate((id) => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { windows: { id: number; app: string }[] } }
      __osStore: { getState: () => { windows: { id: number; app: string }[] } }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    return store.windows.find((win) => win.app === id)!.id
  }, app)

const windowOf = (page: Page, title: string) => page.getByRole('dialog', { name: title, exact: true, includeHidden: true })

/** A window's place, as its build's store has it. */
const placeOf = (page: Page, app: string) =>
  page.evaluate((id) => {
    interface Win {
      app: string
      x: number
      y: number
      width: number
      height: number
    }
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { windows: Win[] } }
      __osStore: { getState: () => { windows: Win[] } }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    const { x, y, width, height } = store.windows.find((win) => win.app === id)!
    return [x, y, width, height]
  }, app)

/**
 * Waits for every window's app to load, every picture on screen to arrive and
 * draw, and every animation to end. Word and Excel fill in once their
 * documents arrive, and a busy server can send an icon late.
 */
const settle = async (page: Page) => {
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(
    () => {
      const loading = [...document.querySelectorAll('.os-window .win-loader')].some((el) => (el as HTMLElement).offsetParent !== null)
      const pictures = [...document.images]
        .filter((img) => img.getAttribute('src') && img.checkVisibility())
        .every((img) => img.complete && img.naturalWidth > 0)
      const moving = document
        .getAnimations()
        .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime as number))
        .some((a) => a.playState === 'running')
      return !loading && pictures && !moving
    },
    undefined,
    { timeout: 20_000 },
  )
  await page.evaluate(() => document.fonts.ready)
}

/** A screenshot once the screen has stopped changing, as toHaveScreenshot waits for. */
async function stillScreenshot(page: Page, mask: Locator[]) {
  let last = await page.screenshot({ mask })
  for (let tries = 0; tries < 20; tries++) {
    await page.waitForTimeout(250)
    const next = await page.screenshot({ mask })
    if (next.equals(last)) return next
    last = next
  }
  return last
}

/** Everything about the screen the switch must keep, read from the store and the page. */
const screenOf = (page: Page) =>
  page.evaluate(() => {
    interface Win {
      id: number
      app: string
      title: string
      state: string
      x: number
      y: number
      width: number
      height: number
      z: number
    }
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { windows: Win[]; focusedWindowId: number | null; desktopZoom: number } }
      __osStore: { getState: () => { windows: Win[]; focusedWindowId: number | null; desktopZoom: number } }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    const stack = [...store.windows].sort((a, b) => a.z - b.z).map((win) => win.id)
    const shown = (el: Element) => {
      const { x, y, width, height } = el.getBoundingClientRect()
      return [x, y, width, height].map(Math.round)
    }
    return {
      windows: store.windows.map((win) => {
        const el = document.getElementById(`win-${win.id}`)!
        return {
          app: win.app,
          title: win.title,
          state: win.state,
          place: [win.x, win.y, win.width, win.height],
          onScreen: win.state === 'minimized' ? null : shown(el),
          stack: stack.indexOf(win.id),
          focused: store.focusedWindowId === win.id,
          active: el.classList.contains('window-active'),
        }
      }),
      taskbar: [...document.querySelectorAll('[data-taskbar-app]')].map((el) => el.getAttribute('data-taskbar-app')),
      dark: document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'),
      wallpaper: getComputedStyle(document.querySelector('[data-os-desktop]')!).backgroundImage,
      filter: getComputedStyle(document.body).filter,
      clock: (document.querySelector('[data-tray-item="clock"]') as HTMLElement).innerText,
      zoom: store.desktopZoom,
      bootScreen: !!document.querySelector('[data-boot-screen]')?.checkVisibility(),
      signIn: [...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Sign In' && b.checkVisibility()),
    }
  })

/**
 * Drags with the mouse from a point by a distance, as a visitor would, by whole
 * pixels, so that each build draws the window on the same pixel grid.
 */
async function drag(page: Page, from: { x: number; y: number }, by: { x: number; y: number }) {
  const start = { x: Math.round(from.x), y: Math.round(from.y) }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + by.x, start.y + by.y, { steps: 12 })
  await page.mouse.up()
}

/**
 * Lays out a desktop with a window of every kind: Word maximised at the bottom,
 * Excel snapped, Explorer moved on to another folder and minimised, Notepad
 * with a file open and resized, and PuTTY moved and focused on top. The theme
 * is dark, as the visitor chose in Settings, with night light on.
 *
 * These apps already look the same in both builds, pixel for pixel, so the
 * screenshots compare the switch alone. Calculator, Explorer's toolbar,
 * Settings, Outlook and VS Code still differ a little between the builds.
 */
async function layOut(page: Page, build: Build) {
  await openApp(page, build, 'settings')
  await windowOf(page, 'Settings').locator('[data-setting-toggle="theme"]').click()
  await windowOf(page, 'Settings').getByRole('button', { name: 'Close' }).click()
  await expect(windowOf(page, 'Settings')).toHaveCount(0)

  await openApp(page, build, 'word')
  await call(page, 'toggleMaximize', await windowId(page, 'word'))

  await openApp(page, build, 'excel')
  await call(page, 'snapWindow', await windowId(page, 'excel'), 'halves', 'right')
  // Snap Assist offers Word for the other half; the visitor turns it down.
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-snap-assist]')).toBeHidden()

  await openApp(page, build, 'explorer')
  const explorer = windowOf(page, 'File Explorer')
  await explorer.locator('[data-explorer-file="Documents"]').dblclick()
  await expect(explorer.locator('[data-explorer-file="Career"]')).toBeVisible()
  await explorer.getByRole('button', { name: 'Minimise' }).click()

  const content = await page.evaluate(
    ([path, name]) => {
      const w = window as unknown as {
        Alpine?: { store: (n: string) => { fileSystem: Record<string, { name: string; content?: string }[]> } }
        __osStore: { getState: () => { fileSystem: Record<string, { name: string; content?: string }[]> } }
      }
      const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
      return store.fileSystem[path].find((file) => file.name === name)!.content
    },
    [DESKTOP, ACHIEVEMENTS],
  )
  await openApp(
    page,
    build,
    'notepad',
    ACHIEVEMENTS,
    build.name === 'v1' ? { fileContent: content, filePath: DESKTOP } : { content, filePath: DESKTOP },
  )
  const notepad = windowOf(page, ACHIEVEMENTS)
  await expect(notepad).toContainText('World #1')
  await settle(page)
  const [, , width, height] = await placeOf(page, 'notepad')
  const corner = (await notepad.locator('.os-resize[data-dir="se"]').boundingBox())!
  await drag(page, { x: corner.x + corner.width / 2, y: corner.y + corner.height / 2 }, { x: -90, y: -60 })
  await expect.poll(async () => (await placeOf(page, 'notepad')).slice(2)).toEqual([width - 90, height - 60])

  await openApp(page, build, 'putty')
  await expect(windowOf(page, 'PuTTY')).toContainText('PuTTY Configuration')
  await settle(page)
  const [x, y] = await placeOf(page, 'putty')
  const title = (await windowOf(page, 'PuTTY').locator('.os-titlebar').boundingBox())!
  await drag(page, { x: title.x + 40, y: title.y + title.height / 2 }, { x: -260, y: 70 })
  await expect.poll(async () => (await placeOf(page, 'putty')).slice(0, 2)).toEqual([x - 260, y + 70])

  await page.locator('[data-tray-item="status"]').click()
  await page.locator('[data-quick-toggle="nightLight"]').click()
  await page.locator('[data-tray-item="status"]').click()
  await expect(page.locator('[data-quick-settings]')).toBeHidden()
}

/**
 * How many pixels differ by more than anti-aliasing could make them, and a
 * picture of where, worked out in a blank page, which no site policy restricts.
 */
async function differingPixels(browser: Browser, before: Buffer, after: Buffer) {
  const page = await browser.newPage()
  const result = await page.evaluate(
    async ([one, two]) => {
      const decode = async (b64: string) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
        return createImageBitmap(new Blob([bytes], { type: 'image/png' }))
      }
      const pixels = (image: ImageBitmap) => {
        const canvas = new OffscreenCanvas(image.width, image.height)
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, image.width, image.height)
      }
      const [a, b] = await Promise.all([decode(one), decode(two)])
      if (a.width !== b.width || a.height !== b.height) return { differing: -1, total: 0, picture: '' }
      const shown = pixels(a)
      const p = shown.data
      const q = pixels(b).data
      let differing = 0
      for (let i = 0; i < p.length; i += 4) {
        const delta = Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]))
        const differs = delta > 40
        if (differs) differing++
        // The picture of the difference: the screen faded, each differing pixel red.
        p[i] = differs ? 255 : 128 + p[i] / 2
        p[i + 1] = differs ? 0 : 128 + p[i + 1] / 2
        p[i + 2] = differs ? 0 : 128 + p[i + 2] / 2
      }
      const canvas = new OffscreenCanvas(a.width, a.height)
      canvas.getContext('2d')!.putImageData(shown, 0, 0)
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return { differing, total: p.length / 4, picture: btoa(binary) }
    },
    [before.toString('base64'), after.toString('base64')] as const,
  )
  await page.close()
  return { ...result, picture: Buffer.from(result.picture, 'base64') }
}

for (const build of BUILDS) {
  test.describe(`${build.name} to ${build.other}`, () => {
    test('the screen stays as it was: every window, its place, state, stacking and focus, and the display', async ({ page, browser }, testInfo) => {
      // Lays out five windows and waits for two builds to settle, on a busy runner too.
      test.setTimeout(120_000)
      await prepare(page)
      await page.goto(build.url)
      await waitForBuild(page, build.name)
      await layOut(page, build)
      // The pointer rests on the chip, where the click leaves it in either build.
      await page.locator('[data-tray-item="build"]').hover()
      await settle(page)
      const before = await screenOf(page)
      // The chip names the other build, so its label is the one thing meant to change.
      const chip = page.locator('[data-tray-item="build"]')
      const picture = await stillScreenshot(page, [chip])

      await chip.click()
      await waitForBuild(page, build.other)
      await settle(page)
      const after = await screenOf(page)
      const afterPicture = await stillScreenshot(page, [chip])

      expect(before.windows.map((w) => [w.app, w.state])).toEqual([
        ['word', 'maximized'],
        ['excel', 'snapped'],
        ['explorer', 'minimized'],
        ['notepad', 'floating'],
        ['putty', 'floating'],
      ])
      expect(before.windows.find((w) => w.focused)?.app).toBe('putty')
      expect(before.dark).toBe(true)
      expect(before.filter).toContain('sepia')
      expect(after.bootScreen).toBe(false)
      expect(after.signIn).toBe(false)
      expect(after).toEqual(before)

      // Notepad still has its file, and Explorer comes back in the folder the visitor moved it to.
      await expect(windowOf(page, ACHIEVEMENTS)).toContainText('World #1')
      await page.locator('[data-taskbar-app="explorer"]').click()
      await expect(windowOf(page, 'File Explorer').locator('[data-explorer-file="Career"]')).toBeVisible()

      const { differing, total, picture: difference } = await differingPixels(browser, picture, afterPicture)
      // Kept beside the results, to look at when this fails.
      for (const [name, body] of [
        [`${build.name}-before.png`, picture],
        [`${build.other}-after.png`, afterPicture],
        ['difference.png', difference],
      ] as const) {
        await writeFile(testInfo.outputPath(name), body)
        await testInfo.attach(name, { path: testInfo.outputPath(name), contentType: 'image/png' })
      }
      testInfo.annotations.push({ type: 'differing pixels', description: `${differing} of ${total}` })
      expect(total).toBe(1440 * 900)
      // Anti-aliasing can move a few pixels at the edges of text: a few hundred
      // at most, where a window one pixel out would move thousands.
      expect(differing).toBeLessThan(400)
    })

    test('a visitor who is signed out lands on the lock screen, as before', async ({ page }) => {
      await prepare(page, { signedIn: false })
      await page.goto(build.url)
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible({ timeout: 15_000 })
      await waitForBuild(page, build.name, { desktop: false })
      // Signed out, the chip is not on screen, so the switch is started as the chip starts it.
      await page.evaluate((url) => {
        const w = window as unknown as {
          Alpine?: { $data: (el: Element) => { switchBuild: (to: string, name: string) => void } }
          __osStore?: { getState: () => { switchBuild: (to: string, name: string) => void } }
        }
        if (w.Alpine) w.Alpine.$data(document.body).switchBuild(url, 'React Build')
        else w.__osStore!.getState().switchBuild(url, 'PHP Build')
      }, build.name === 'v1' ? '/v2/' : '/')
      await waitForBuild(page, build.other, { desktop: false })
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
      await expect(page.locator('[data-boot-screen]')).toBeHidden()
      await expect(page.locator('.os-window')).toHaveCount(0)
    })

    test('a click that opens a new tab leaves this desktop as it is', async ({ page, context }) => {
      await prepare(page)
      await page.goto(build.url)
      await waitForBuild(page, build.name)
      await openApp(page, build, 'calculator')
      const opened = context.waitForEvent('page')
      await page.locator('[data-tray-item="build"]').click({ modifiers: ['ControlOrMeta'] })
      const tab = await opened
      await tab.close()
      await expect(windowOf(page, 'Calculator')).toBeVisible()
      expect(page.url()).toBe(build.url)
    })
  })
}
