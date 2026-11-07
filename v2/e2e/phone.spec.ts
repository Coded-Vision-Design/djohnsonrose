import { test, expect, type Page } from '@playwright/test'

// Both builds on a phone. This runs twice, as an iPhone on WebKit, Safari's own
// engine, and as a Pixel on Chromium. Chromium takes real gestures through its
// input pipeline. WebKit has no such door, so touches there are raised on the
// page, which still exercises Safari's own event handling.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

const FILE = 'achievements.txt'

const icon = (page: Page, name: string) => page.locator(`[data-desktop-item="${name}"]`)
const item = (page: Page, label: string) => page.locator(`[data-menu-item="${label}"]`)

async function boot(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await icon(page, FILE).waitFor({ timeout: 20_000 })
  await page.waitForTimeout(600)
}

/**
 * Raises a touch on whatever is at a point, as WebKit has no gesture API here,
 * and its desktop port will not build Touch objects, so these stand in for them.
 */
const touch = (page: Page, type: string, points: { x: number; y: number }[]) =>
  page.evaluate(
    ([kind, fingers]) => {
      const { x, y } = fingers[0]
      const target = window.__touchTarget ?? document.elementFromPoint(x, y)
      window.__touchTarget = target
      const ended = kind === 'touchend'
      const touches = ended ? [] : fingers.map((finger) => ({ target, clientX: finger.x, clientY: finger.y }))
      const event = new Event(kind, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', { value: touches })
      target?.dispatchEvent(event)
      if (ended) window.__touchTarget = undefined
    },
    [type, points] as const,
  )

declare global {
  interface Window {
    __touchTarget?: Element | null
  }
}

async function longPress(page: Page, browserName: string, x: number, y: number) {
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.synthesizeTapGesture', { x, y, duration: 900, gestureSourceType: 'touch' })
  } else {
    await touch(page, 'touchstart', [{ x, y }])
    await page.waitForTimeout(800)
    await touch(page, 'touchend', [{ x, y }])
  }
}

async function pinchOpen(page: Page, browserName: string, x: number, y: number) {
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.synthesizePinchGesture', { x, y, scaleFactor: 1.6, gestureSourceType: 'touch' })
    return
  }
  const fingers = (gap: number) => [
    { x: x - gap, y },
    { x: x + gap, y },
  ]
  await touch(page, 'touchstart', fingers(30))
  for (let gap = 40; gap <= 130; gap += 10) await touch(page, 'touchmove', fingers(gap))
  await touch(page, 'touchend', fingers(130))
}

const middle = async (page: Page, name: string) => {
  const box = await icon(page, name).boundingBox()
  if (!box) throw new Error(`no icon: ${name}`)
  return [box.x + box.width / 2, box.y + box.height / 2] as const
}

for (const build of BUILDS) {
  test.describe(`${build.name} on a phone`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    test('fits the screen, with nothing to scroll sideways', async ({ page }) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      const taskbar = await page.locator('.os-taskbar').boundingBox()
      const viewport = page.viewportSize()
      expect(Math.round((taskbar?.y ?? 0) + (taskbar?.height ?? 0))).toBe(viewport?.height)
    })

    test('a tap opens a file', async ({ page }) => {
      await icon(page, FILE).tap()
      await expect(page.getByRole('dialog', { name: FILE, exact: true })).toBeVisible()
    })

    test('a long press on an icon opens its menu, not the file', async ({ page, browserName }) => {
      const [x, y] = await middle(page, FILE)
      await longPress(page, browserName, x, y)
      await expect(item(page, 'Copy as path')).toBeVisible()
      await expect(page.getByRole('dialog', { name: FILE, exact: true })).toHaveCount(0)
    })

    test('a finger held on a file cannot start a drag, which would cancel its menu', async ({ page }) => {
      await icon(page, 'Projects').tap()
      const file = page.locator('[data-explorer-file]').first()
      await file.waitFor({ timeout: 20_000 })
      const dragged = await file.evaluate((el) => {
        const lift = (type: string, touches: unknown[]) => {
          const event = new Event(type, { bubbles: true, cancelable: true })
          Object.defineProperty(event, 'touches', { value: touches })
          el.dispatchEvent(event)
        }
        lift('touchstart', [{ target: el, clientX: 40, clientY: 200 }])
        const started = el.dispatchEvent(
          new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }),
        )
        lift('touchend', [])
        return started
      })
      expect(dragged).toBe(false)
    })

    test('a finger can carry a file from Explorer to the Recycle Bin', async ({ page, browserName }) => {
      await icon(page, 'Projects').tap()
      const file = page.locator('[data-explorer-file="Freelance"]')
      await file.waitFor({ timeout: 20_000 })
      // The phone's place chips; the Recycle Bin starts scrolled out of sight.
      const bin = page.locator('[data-place-pill="Recycle Bin"]')
      const from = await file.boundingBox()
      if (!from) throw new Error('no file')
      const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
      const nudge = { x: start.x + 20, y: start.y - 20 }
      // Chrome's own touch input on Android; WebKit has no such door, so the page gets the events.
      const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null
      const send = async (type: 'touchStart' | 'touchMove' | 'touchEnd', point: { x: number; y: number }) => {
        if (cdp) await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [point] })
        else await touch(page, type.toLowerCase(), [point])
        await page.waitForTimeout(30)
      }
      await send('touchStart', start)
      await page.waitForTimeout(800)
      await send('touchMove', nudge)
      // Starting the drag brings the bin into view.
      await expect(page.locator('[data-touch-drag]')).toHaveCount(1)
      await expect(bin).toBeInViewport()
      const to = await bin.boundingBox()
      if (!to) throw new Error('no bin')
      const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
      for (let i = 1; i <= 6; i += 1) {
        await send('touchMove', { x: nudge.x + ((end.x - nudge.x) * i) / 6, y: nudge.y + ((end.y - nudge.y) * i) / 6 })
      }
      await send('touchEnd', end)
      await expect(file).toHaveCount(0)
      await expect(page.locator('[data-touch-drag]')).toHaveCount(0)
      await bin.click()
      await expect(page.locator('[data-explorer-file="Freelance"]')).toBeVisible()
    })

    test('a long press on the wallpaper opens the desktop menu', async ({ page, browserName }) => {
      const viewport = page.viewportSize()
      await longPress(page, browserName, (viewport?.width ?? 390) - 40, (viewport?.height ?? 800) - 200)
      await expect(item(page, 'Refresh')).toBeVisible()
    })

    test('a long press on a taskbar button opens its menu, not the app', async ({ page, browserName }) => {
      const box = await page.locator('[data-taskbar-app="edge"]').boundingBox()
      if (!box) throw new Error('no button')
      await longPress(page, browserName, box.x + box.width / 2, box.y + box.height / 2)
      await expect(item(page, 'Unpin from taskbar')).toBeVisible()
      await expect(page.getByRole('dialog')).toHaveCount(0)
    })

    test('a tap on a text box still focuses it after a long press', async ({ page, browserName }) => {
      const viewport = page.viewportSize()
      await longPress(page, browserName, (viewport?.width ?? 390) - 40, (viewport?.height ?? 800) - 200)
      await expect(item(page, 'Refresh')).toBeVisible()
      await page.keyboard.press('Escape')
      await page.locator('.os-taskbar-apps button').first().tap()
      const search = page.getByPlaceholder('Search for apps, settings, and documents')
      await search.tap()
      await expect(search).toBeFocused()
    })

    test('the menu stays on screen', async ({ page, browserName }) => {
      const viewport = page.viewportSize()
      const [x, y] = await middle(page, 'Recycle Bin')
      await longPress(page, browserName, x, y)
      const box = await page.locator('[data-context-menu]').filter({ visible: true }).boundingBox()
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0)
    })

    const scale = (page: Page) => page.locator('[data-icon-size]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)

    test('a pinch zooms the desktop icons and not the page', async ({ page, browserName }) => {
      const viewport = page.viewportSize()
      await pinchOpen(page, browserName, (viewport?.width ?? 390) - 90, (viewport?.height ?? 800) - 220)
      await expect.poll(() => scale(page)).toBeCloseTo(1.3, 2)
      expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1)
    })

    test('a pinch inside an open window leaves the desktop icons alone', async ({ page, browserName }) => {
      test.skip(browserName === 'chromium', 'Needs fingers placed on one exact element.')
      await icon(page, FILE).tap()
      const win = page.getByRole('dialog', { name: FILE, exact: true })
      await win.waitFor()
      const box = await win.boundingBox()
      if (!box) throw new Error('no window')
      await pinchOpen(page, browserName, box.x + box.width / 2, box.y + box.height / 2)
      expect(await scale(page)).toBe(1)
    })

    test('the stylesheets turn off Safari’s long-press callout', async ({ page }) => {
      const css = await page.evaluate(async () => {
        const sheets = [...document.styleSheets].map((sheet) =>
          sheet.href
            ? fetch(sheet.href).then((reply) => reply.text()).catch(() => '')
            : (sheet.ownerNode?.textContent ?? ''),
        )
        return (await Promise.all(sheets)).join('')
      })
      expect(css).toMatch(/touch-callout:\s*none/)
    })

    test('the desktop tells the browser it handles its own gestures', async ({ page }) => {
      const action = await icon(page, FILE).evaluate((el) => {
        const root = el.closest('[data-os-desktop]') ?? el.closest('.wallpaper-bg')
        return root ? getComputedStyle(root).touchAction : 'missing'
      })
      expect(action).toBe('none')
    })

    test('the battery matches what this browser reports', async ({ page }) => {
      const reported = await page.evaluate(async () => {
        const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> }
        if (!nav.getBattery) return null
        const { level, charging } = await nav.getBattery()
        return { level, charging }
      })
      const battery = page.locator('[data-tray-battery]')
      const expected = reported
        ? `${Math.round(reported.level * 100)}%${reported.charging ? ' (Charging)' : ''}`
        : '85%'
      await expect.poll(async () => (await battery.getAttribute('title'))?.trim()).toBe(expected)
      await expect(battery.locator('img')).toHaveAttribute(
        'src',
        reported?.charging ? /energy\.svg$/ : /battery\.svg$/,
      )
    })

    test('a tap on Notepad’s text lets you type', async ({ page }) => {
      await icon(page, FILE).tap()
      const win = page.getByRole('dialog', { name: FILE, exact: true })
      await win.locator('[data-notepad-view]').waitFor({ timeout: 20_000 })
      // The heading, as a tap on one of the file's links would follow it instead.
      await win.locator('[data-notepad-view]').tap({ position: { x: 20, y: 10 } })
      const box = win.locator('[data-notepad-text]')
      await expect(box).toBeFocused()
      await page.keyboard.type('typed by hand')
      await expect(box).toHaveValue(/typed by hand/)
    })

    test('Notepad works by touch, and its menus fit', async ({ page }) => {
      await icon(page, FILE).tap()
      const win = page.getByRole('dialog', { name: FILE, exact: true })
      await win.locator('[data-notepad-menu="Edit"]').waitFor({ timeout: 20_000 })
      await win.locator('[data-notepad-menu="Edit"]').tap()
      await expect(win.locator('[data-notepad-item="Find..."]')).toBeVisible()
      await win.locator('[data-notepad-item="Find..."]').tap()
      await page.getByLabel('Find', { exact: true }).fill('World')
      await win.getByRole('button', { name: 'Find Next' }).tap()
      await expect(win.locator('[data-notepad-mark]')).toHaveText('World')
    })
  })
}

// The guided tour on a phone: its toast docks above the taskbar, full width,
// with finger-sized buttons, and its build step points at the desktop icon, as
// the tray's build chip is hidden here. See assets/js/windowing/tour.js.
for (const build of BUILDS) {
  test.describe(`${build.name} tour on a phone`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
    })

    test('docks above the taskbar, full width, and runs every step by touch', async ({ page }) => {
      const toast = page.locator('[data-tour-toast]')
      await page.locator('[data-start-button]').tap()
      await page.locator('[data-recommended="tour"]').tap()
      await expect(toast).toHaveAttribute('data-tour-step', 'start')
      await expect(page.locator('[data-start-menu]')).toBeHidden()

      const viewport = page.viewportSize() as { width: number; height: number }
      // Measured once it has finished sliding in.
      await toast.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)))
      const docked = await toast.boundingBox()
      const taskbar = await page.locator('.os-taskbar').boundingBox()
      expect(Math.round(docked?.x ?? -1)).toBe(0)
      expect(Math.round(docked?.width ?? 0)).toBe(viewport.width)
      expect(Math.round((docked?.y ?? 0) + (docked?.height ?? 0))).toBe(Math.round(taskbar?.y ?? -1))

      // What each step points at here. The build chip is hidden, so the desktop icon stands in.
      const steps = [
        ['start', '[data-start-button]'],
        ['cv', '[data-desktop-item="CV - DeVanté Johnson-Rose.pdf"]'],
        ['work', '[data-taskbar-app="explorer"]'],
        ['terminal', '[data-desktop-item="Terminal"]'],
        ['build', '[data-desktop-item$=" Build"]'],
        ['done', '[data-start-button]'],
      ]
      await expect(page.locator('[data-tray-item="build"]')).toBeHidden()
      for (const [index, [step, anchor]] of steps.entries()) {
        await expect(toast).toHaveAttribute('data-tour-step', step)
        await expect(toast.locator('[data-tour-count]')).toHaveText(`${index + 1} of 6`)
        for (const height of await toast.locator('button:visible').evaluateAll((all) => all.map((el) => el.getBoundingClientRect().height))) {
          expect(height).toBeGreaterThanOrEqual(44)
        }
        // The ring goes round the part, and the toast never covers it, docking at the top if it must.
        await expect
          .poll(
            () =>
              page.evaluate((selector) => {
                const part = (document.querySelector(selector) as Element).getBoundingClientRect()
                const ring = (document.querySelector('[data-tour-ring]') as Element).getBoundingClientRect()
                const card = (document.querySelector('[data-tour-toast]') as Element).getBoundingClientRect()
                const rings = ring.left <= part.left && ring.top <= part.top && ring.right >= part.right && ring.bottom >= part.bottom
                const clear = part.bottom <= card.top || part.top >= card.bottom
                return rings && clear
              }, anchor),
            { message: step },
          )
          .toBe(true)
        await toast.locator('[data-tour-next]').tap()
      }
      await expect(toast).toBeHidden()
    })
  })
}
