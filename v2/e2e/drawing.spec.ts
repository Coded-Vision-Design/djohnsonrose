import { readFileSync } from 'node:fs'
import { test, expect, type Browser, type Locator, type Page } from '@playwright/test'

// Paint and Photoshop in both builds. Both run assets/js/windowing/drawing.js
// on the same markup, so every check runs against each, the same strokes
// must leave the same pixels, and screenshots of the two must match. The
// drawing rules themselves are unit tested in src/windowing/drawing.test.ts.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const
type Build = (typeof BUILDS)[number]

const RED = [237, 28, 36, 255]
const WHITE = [255, 255, 255, 255]

async function boot(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    if (!localStorage.getItem('react.os')) {
      localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
    }
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-desktop-item="achievements.txt"]').waitFor()
}

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

const darkTheme = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { settings: { theme: string } } }
      __osStore: { getState: () => { updateSetting: (k: string, v: string) => void } }
    }
    if (w.Alpine) w.Alpine.store('os').settings.theme = 'dark'
    else w.__osStore.getState().updateSetting('theme', 'dark')
  })

async function openPaint(page: Page) {
  await call(page, 'openApp', 'paint')
  const app = page.locator('.pt-app')
  await expect(app).toBeVisible({ timeout: 20_000 })
  const canvas = app.locator('[data-paint-canvas]')
  await expect.poll(() => canvas.evaluate((el: HTMLCanvasElement) => el.width)).toBe(800)
  return { app, canvas }
}

async function openPhotoshop(page: Page) {
  await call(page, 'openApp', 'photoshop')
  const app = page.locator('.ps-app')
  await expect(app).toBeVisible({ timeout: 20_000 })
  await expect(app.locator('[data-ps-layer]')).toHaveCount(3)
  return { app, stack: app.locator('[data-ps-stack]') }
}

/** Where a canvas pixel's centre is on the page, at any zoom. */
const spot = (target: Locator, x: number, y: number, width = 800, height = 600) =>
  target.evaluate(
    (el, [x, y, w, h]) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + ((x + 0.5) * r.width) / w, y: r.top + ((y + 0.5) * r.height) / h }
    },
    [x, y, width, height] as const,
  )

const pixel = (canvas: Locator, x: number, y: number) =>
  canvas.evaluate(
    (el: HTMLCanvasElement, [x, y]) => Array.from(el.getContext('2d')!.getImageData(x, y, 1, 1).data),
    [x, y] as const,
  )

/** How many pixels in a box are not white. */
const inked = (canvas: Locator, x: number, y: number, w: number, h: number) =>
  canvas.evaluate(
    (el: HTMLCanvasElement, [x, y, w, h]) => {
      const { data } = el.getContext('2d')!.getImageData(x, y, w, h)
      let count = 0
      for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] < 600) count++
      return count
    },
    [x, y, w, h] as const,
  )

/**
 * Scrolls the canvas until these pixels are on screen, as a person would
 * before pointing at them. A pointer aimed off screen would land on
 * whatever is there instead.
 */
const show = (target: Locator, points: [number, number][], width = 800, height = 600) =>
  target.evaluate(
    (el, [points, w, h]) => {
      const view = el.closest('[data-paint-viewport], [data-ps-viewport]') as HTMLElement | null
      if (!view) return
      const r = el.getBoundingClientRect()
      const v = view.getBoundingClientRect()
      const xs = points.map(([x]) => r.left + ((x + 0.5) * r.width) / w)
      const ys = points.map(([, y]) => r.top + ((y + 0.5) * r.height) / h)
      const inside = (value: number, start: number, size: number) => value >= start + 4 && value <= start + size - 4
      if (xs.every((x) => inside(x, v.left, view.clientWidth)) && ys.every((y) => inside(y, v.top, view.clientHeight))) return
      view.scrollLeft += (Math.min(...xs) + Math.max(...xs)) / 2 - (v.left + view.clientWidth / 2)
      view.scrollTop += (Math.min(...ys) + Math.max(...ys)) / 2 - (v.top + view.clientHeight / 2)
    },
    [points, width, height] as const,
  )

async function drag(page: Page, target: Locator, from: [number, number], to: [number, number], size?: [number, number]) {
  await show(target, [from, to], ...(size ?? []))
  const a = await spot(target, from[0], from[1], ...(size ?? []))
  const b = await spot(target, to[0], to[1], ...(size ?? []))
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 8 })
  await page.mouse.up()
}

async function clickAt(page: Page, target: Locator, x: number, y: number, size?: [number, number], button: 'left' | 'right' = 'left') {
  await show(target, [[x, y]], ...(size ?? []))
  const p = await spot(target, x, y, ...(size ?? []))
  await page.mouse.click(p.x, p.y, { button })
}

/** Moves a range input as a person would, which both builds hear as input. */
const slide = (input: Locator, value: number) =>
  input.evaluate((el: HTMLInputElement, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)

/** A finger drag, through Chrome's own touch input. */
async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
  for (let i = 1; i <= 10; i++) {
    const point = { x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10 }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

/** The start and end of a scrollable area, and where the canvas sits in it at each. */
const reach = (viewport: Locator, target: string) =>
  viewport.evaluate((view, selector) => {
    const canvas = view.querySelector(selector) as Element
    const place = () => {
      const v = view.getBoundingClientRect()
      const c = canvas.getBoundingClientRect()
      return {
        left: c.left - v.left,
        top: c.top - v.top,
        right: v.left + view.clientWidth - c.right,
        bottom: v.top + view.clientHeight - c.bottom,
      }
    }
    view.scrollTo(0, 0)
    const start = place()
    view.scrollTo(view.scrollWidth, view.scrollHeight)
    const end = place()
    view.scrollTo(0, 0)
    return { start, end }
  }, target)

for (const build of BUILDS) {
  test.describe(`${build.name} Paint`, () => {
    // Generous, as each test boots a whole desktop. A hung fill still fails.
    test.describe.configure({ timeout: 90_000 })
    test.beforeEach(({ page }) => boot(page, build.url))

    test('the pencil and the brush draw, and undo and redo work', async ({ page }) => {
      const { app, canvas } = await openPaint(page)
      await app.locator('[data-paint-colour="#ed1c24"]').click()
      await drag(page, canvas, [40, 50], [200, 50])
      expect(await pixel(canvas, 120, 50)).toEqual(RED)
      await app.locator('[data-paint-tool="brush"]').click()
      await slide(app.locator('[data-paint-size]'), 12)
      await app.locator('[data-paint-colour="#3f48cc"]').click()
      await drag(page, canvas, [40, 150], [200, 150])
      expect(await pixel(canvas, 120, 150)).toEqual([63, 72, 204, 255])
      expect(await pixel(canvas, 120, 145)).toEqual([63, 72, 204, 255])

      await app.locator('[data-paint-command="undo"]').click()
      expect(await pixel(canvas, 120, 150)).toEqual(WHITE)
      expect(await pixel(canvas, 120, 50)).toEqual(RED)
      await page.keyboard.press('Control+z')
      expect(await pixel(canvas, 120, 50)).toEqual(WHITE)
      await expect(app.locator('[data-paint-command="undo"]')).toBeDisabled()
      await page.keyboard.press('Control+y')
      expect(await pixel(canvas, 120, 50)).toEqual(RED)
      await app.locator('[data-paint-command="redo"]').click()
      expect(await pixel(canvas, 120, 150)).toEqual([63, 72, 204, 255])
      await expect(app.locator('[data-paint-command="redo"]')).toBeDisabled()
    })

    test('the fill reaches every edge and corner without hanging', async ({ page }) => {
      const { app, canvas } = await openPaint(page)
      await app.locator('[data-paint-tool="fill"]').click()
      await app.locator('[data-paint-colour="#ed1c24"]').click()
      // The last pixel, where rounding used to give the width and the height.
      await clickAt(page, canvas, 799, 599)
      for (const [x, y] of [[0, 0], [799, 0], [0, 599], [799, 599]]) expect(await pixel(canvas, x, y)).toEqual(RED)

      // A press on the very edge, and a hair past it, as touch and pens report them.
      const colours = ['#22b14c', '#00a2e8', '#fff200', '#a349a4']
      const edges: [number, number][] = [[1, 1], [1, 0.5], [0.5, 1], [0, 0]]
      for (const [i, [fx, fy]] of edges.entries()) {
        await app.locator(`[data-paint-colour="${colours[i]}"]`).click()
        const done = await canvas.evaluate((el, [fx, fy]) => {
          const r = el.getBoundingClientRect()
          const at = { clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, button: 0, pointerId: 7, bubbles: true }
          el.dispatchEvent(new PointerEvent('pointerdown', at))
          el.dispatchEvent(new PointerEvent('pointerup', at))
          return true
        }, [fx, fy] as const)
        expect(done).toBe(true)
        expect(await pixel(canvas, 400, 300)).toEqual(await pixel(canvas, 799, 599))
      }
      expect(await pixel(canvas, 0, 0)).toEqual([163, 73, 164, 255])
    })

    test('zoom works from the magnifier, the View tab, the status bar and the keyboard', async ({ page }) => {
      const { app, canvas } = await openPaint(page)
      const zoom = app.locator('[data-paint-zoom]')
      const width = () => canvas.evaluate((el) => el.getBoundingClientRect().width)
      await expect(zoom).toHaveText('100%')

      await app.locator('[data-paint-tool="zoom"]').click()
      await clickAt(page, canvas, 100, 100)
      await expect(zoom).toHaveText('150%')
      expect(await width()).toBeCloseTo(1200, 0)
      await clickAt(page, canvas, 100, 100, undefined, 'right')
      await expect(zoom).toHaveText('100%')

      await app.locator('[data-paint-tab="view"]').click()
      await app.locator('[data-paint-command="zoomIn"]').click()
      await expect(zoom).toHaveText('150%')
      await app.locator('[data-paint-command="zoomReset"]').click()
      await expect(zoom).toHaveText('100%')
      await app.locator('.pt-zoom [aria-label="Zoom in"]').click()
      await expect(zoom).toHaveText('150%')
      await page.keyboard.press('Control+=')
      await expect(zoom).toHaveText('200%')
      expect(await width()).toBeCloseTo(1600, 0)
      await page.keyboard.press('Control+-')
      await expect(zoom).toHaveText('150%')
      await page.keyboard.press('Control+0')
      await expect(zoom).toHaveText('100%')

      // Drawing at 400% lands on the pixel under the pointer.
      await slide(app.locator('.pt-zoom input'), 7)
      await expect(zoom).toHaveText('400%')
      await app.locator('[data-paint-tab="home"]').click()
      await app.locator('[data-paint-tool="pencil"]').click()
      await app.locator('[data-paint-viewport]').evaluate((el) => el.scrollTo(0, 0))
      await clickAt(page, canvas, 10, 12)
      expect(await pixel(canvas, 10, 12)).toEqual([0, 0, 0, 255])
      expect(await pixel(canvas, 20, 12)).toEqual(WHITE)
    })

    test('the whole canvas can be scrolled to, at any zoom', async ({ page }) => {
      const { app } = await openPaint(page)
      const viewport = app.locator('[data-paint-viewport]')
      for (const level of [3, 9]) {
        await slide(app.locator('.pt-zoom input'), level)
        const { start, end } = await reach(viewport, '[data-paint-canvas]')
        expect(start.left, `left edge at level ${level}`).toBeGreaterThanOrEqual(0)
        expect(start.top, `top edge at level ${level}`).toBeGreaterThanOrEqual(0)
        expect(end.right, `right edge at level ${level}`).toBeGreaterThanOrEqual(0)
        expect(end.bottom, `bottom edge at level ${level}`).toBeGreaterThanOrEqual(0)
      }
    })

    test('text, the colour picker, the eraser, shapes and clear', async ({ page }) => {
      const { app, canvas } = await openPaint(page)
      await app.locator('[data-paint-colour="#ed1c24"]').click()
      await drag(page, canvas, [40, 50], [200, 50])

      // The picker takes the colour under it, then hands back the pencil.
      await app.locator('[data-paint-colour="#000000"]').click()
      await app.locator('[data-paint-tool="picker"]').click()
      await clickAt(page, canvas, 100, 50)
      await expect(app.locator('[data-paint-custom]')).toHaveValue('#ed1c24')
      await expect(app.locator('[data-paint-tool="pencil"]')).toHaveAttribute('aria-pressed', 'true')

      await app.locator('[data-paint-tool="eraser"]').click()
      await drag(page, canvas, [90, 50], [130, 50])
      expect(await pixel(canvas, 110, 50)).toEqual(WHITE)
      expect(await pixel(canvas, 60, 50)).toEqual(RED)

      await app.locator('[data-paint-shape="rectangle"]').click()
      await drag(page, canvas, [300, 300], [400, 360])
      expect(await pixel(canvas, 300, 330)).toEqual(RED)
      expect(await pixel(canvas, 350, 330)).toEqual(WHITE)
      await app.locator('[data-paint-shape="ellipse"]').click()
      await drag(page, canvas, [500, 300], [600, 400])
      expect(await pixel(canvas, 550, 300)).toEqual(RED)
      expect(await pixel(canvas, 500, 300)).toEqual(WHITE)

      await app.locator('[data-paint-tool="text"]').click()
      await clickAt(page, canvas, 100, 450)
      const box = app.locator('[data-paint-text]')
      await expect(box).toBeVisible()
      await expect(box).toBeFocused()
      await page.keyboard.type('Hello')
      await page.keyboard.press('Enter')
      await expect(box).toBeHidden()
      expect(await inked(canvas, 95, 445, 80, 30)).toBeGreaterThan(20)

      await app.locator('[data-paint-command="clear"]').click()
      expect(await inked(canvas, 0, 0, 800, 600)).toBe(0)
      await app.locator('[data-paint-command="undo"]').click()
      expect(await pixel(canvas, 60, 50)).toEqual(RED)
    })

    test('the handles resize the canvas, and undo puts it back', async ({ page }) => {
      const { app } = await openPaint(page)
      await slide(app.locator('.pt-zoom input'), 1)
      const handle = app.locator('[data-paint-resize="xy"]')
      const box = (await handle.boundingBox())!
      await page.mouse.move(box.x + 4, box.y + 4)
      await page.mouse.down()
      await page.mouse.move(box.x + 54, box.y + 29, { steps: 5 })
      await page.mouse.up()
      // At 50%, 50 by 25 pixels on screen is 100 by 50 on the canvas.
      await expect(app.locator('[data-paint-dimensions]')).toHaveText('900 × 650px')
      await page.keyboard.press('Control+z')
      await expect(app.locator('[data-paint-dimensions]')).toHaveText('800 × 600px')
    })

    test('Save downloads the picture as a PNG', async ({ page }, testInfo) => {
      const { app, canvas } = await openPaint(page)
      await drag(page, canvas, [10, 10], [50, 50])
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        app.locator('.pt-actions [data-paint-command="save"]').click(),
      ])
      expect(download.suggestedFilename()).toBe('painting.png')
      const path = testInfo.outputPath('painting.png')
      await download.saveAs(path)
      const bytes = readFileSync(path)
      expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG')
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([800, 600])
    })

    test.describe('by touch and pen', () => {
      test.use({ hasTouch: true })

      test('a finger draws, and the page does not scroll', async ({ page }) => {
        const { app, canvas } = await openPaint(page)
        const viewport = app.locator('[data-paint-viewport]')
        const scroll = () => viewport.evaluate((el) => [el.scrollTop, el.scrollLeft, window.scrollY])
        const before = await scroll()
        await touchDrag(page, await spot(canvas, 100, 120), await spot(canvas, 300, 220))
        expect(await pixel(canvas, 200, 170)).toEqual([0, 0, 0, 255])
        expect(await scroll()).toEqual(before)
        expect(await canvas.evaluate((el) => getComputedStyle(el).touchAction)).toBe('none')
      })

      test('a pen draws', async ({ page }) => {
        const { canvas } = await openPaint(page)
        await canvas.evaluate((el) => {
          const seen: string[] = []
          el.addEventListener('pointerdown', (e) => seen.push((e as PointerEvent).pointerType))
          ;(window as unknown as { penKinds: string[] }).penKinds = seen
        })
        const a = await spot(canvas, 100, 300)
        const b = await spot(canvas, 300, 300)
        const cdp = await page.context().newCDPSession(page)
        const send = (type: string, p: { x: number; y: number }, buttons: number) =>
          cdp.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons, clickCount: 1, pointerType: 'pen' } as never)
        await send('mousePressed', a, 1)
        for (let i = 1; i <= 8; i++) await send('mouseMoved', { x: a.x + ((b.x - a.x) * i) / 8, y: a.y }, 1)
        await send('mouseReleased', b, 0)
        expect(await page.evaluate(() => (window as unknown as { penKinds: string[] }).penKinds)).toEqual(['pen'])
        expect(await pixel(canvas, 200, 300)).toEqual([0, 0, 0, 255])
      })
    })

    test('on a phone the canvas starts in view and nothing scrolls sideways', async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
      const page = await context.newPage()
      await boot(page, build.url)
      const { app } = await openPaint(page)
      const { start } = await reach(app.locator('[data-paint-viewport]'), '[data-paint-canvas]')
      expect(start.left).toBeGreaterThanOrEqual(0)
      expect(start.top).toBeGreaterThanOrEqual(0)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      const small = await app.locator('[data-paint-tool], [data-paint-colour], .pt-zoom button').evaluateAll((els) =>
        els.filter((el) => el.getBoundingClientRect().width < 44 || el.getBoundingClientRect().height < 44).length,
      )
      expect(small).toBe(0)
      await context.close()
    })
  })

  test.describe(`${build.name} Photoshop`, () => {
    test.describe.configure({ timeout: 90_000 })
    test.beforeEach(({ page }) => boot(page, build.url))

    const PS: [number, number] = [720, 480]
    const layer = (app: Locator, id: string) => app.locator(`[data-ps-layer="${id}"]`)

    test('the brush paints on the selected layer, and hiding a layer hides it', async ({ page }) => {
      const { app, stack } = await openPhotoshop(page)
      await expect(app.locator('[data-ps-select="l2"]')).toHaveAttribute('aria-pressed', 'true')
      await app.locator('[data-ps-colour="#cc2927"]').click()
      await drag(page, stack, [20, 20], [200, 20], PS)
      expect(await pixel(layer(app, 'l2'), 100, 20)).toEqual([204, 41, 39, 255])
      expect(await pixel(layer(app, 'l1'), 100, 20)).not.toEqual([204, 41, 39, 255])

      await app.locator('[data-ps-eye="l2"]').click()
      await expect(layer(app, 'l2')).toBeHidden()
      await expect(app.locator('[data-ps-eye="l2"]')).toHaveAttribute('aria-pressed', 'false')
      await app.locator('[data-ps-eye="l2"]').click()
      await expect(layer(app, 'l2')).toBeVisible()
      await slide(app.locator('[data-ps-opacity="l2"]'), 40)
      await expect(layer(app, 'l2')).toHaveCSS('opacity', '0.4')
    })

    test('bucket, move, eraser and type work on layers, with undo and redo', async ({ page }) => {
      const { app, stack } = await openPhotoshop(page)
      await app.locator('[data-ps-command="newLayer"]').click()
      await expect(app.locator('[data-ps-layer]')).toHaveCount(4)
      await expect(app.locator('[data-ps-layer-row="l4"]')).toHaveAttribute('data-active', 'true')
      const l4 = layer(app, 'l4')

      await page.keyboard.press('g')
      await expect(app.locator('[data-ps-tool="bucket"]')).toHaveAttribute('aria-pressed', 'true')
      await clickAt(page, stack, 10, 10, PS)
      expect((await pixel(l4, 719, 479))[3]).toBe(255)
      await page.keyboard.press('Control+z')
      expect((await pixel(l4, 719, 479))[3]).toBe(0)
      await page.keyboard.press('Control+Shift+z')
      expect((await pixel(l4, 719, 479))[3]).toBe(255)
      await page.keyboard.press('Delete')
      expect((await pixel(l4, 719, 479))[3]).toBe(0)

      // A dot, then the move tool carries it 40 right and 20 down.
      await app.locator('[data-ps-tool="brush"]').click()
      await clickAt(page, stack, 100, 100, PS)
      await app.locator('[data-ps-tool="move"]').click()
      await drag(page, stack, [300, 300], [340, 320], PS)
      expect((await pixel(l4, 140, 120))[3]).toBe(255)
      expect((await pixel(l4, 100, 100))[3]).toBe(0)

      await app.locator('[data-ps-select="l1"]').click()
      await app.locator('[data-ps-tool="eraser"]').click()
      await drag(page, stack, [600, 50], [650, 50], PS)
      expect((await pixel(layer(app, 'l1'), 620, 50))[3]).toBe(0)

      await app.locator('[data-ps-select="l4"]').click()
      await app.locator('[data-ps-tool="text"]').click()
      await clickAt(page, stack, 40, 380, PS)
      const box = app.locator('[data-ps-text]')
      await expect(box).toBeFocused()
      await page.keyboard.type('PS')
      await page.keyboard.press('Enter')
      await expect(box).toBeHidden()
      const typed = await l4.evaluate((el: HTMLCanvasElement) => {
        const { data } = el.getContext('2d')!.getImageData(30, 370, 100, 60)
        return data.filter((_, i) => i % 4 === 3 && data[i] > 0).length
      })
      expect(typed).toBeGreaterThan(20)
    })

    test('the menus run their commands and grey out what cannot be done', async ({ page }, testInfo) => {
      const { app } = await openPhotoshop(page)
      await app.locator('[data-ps-menu="Edit"]').click()
      await expect(app.locator('[data-ps-command="undo"]')).toBeDisabled()
      await app.locator('[data-ps-menu="View"]').click()
      await app.locator('[data-ps-command="zoomIn"]').click()
      await expect(app.locator('[data-ps-zoom-value]')).toHaveText('150%')
      await expect(app.locator('.ps-title')).toContainText('@ 150% (Logo, RGB/8)')
      await expect(app.locator('.ps-menu-list')).toHaveCount(0)

      await app.locator('[data-ps-menu="Layer"]').click()
      await app.locator('.ps-menu-list [data-ps-command="deleteLayer"]').click()
      await expect(app.locator('[data-ps-layer]')).toHaveCount(2)
      for (let i = 0; i < 6; i++) await app.locator('.ps-head-button[data-ps-command="newLayer"]').click()
      await expect(app.locator('[data-ps-layer]')).toHaveCount(8)
      await expect(app.locator('.ps-head-button[data-ps-command="newLayer"]')).toBeDisabled()

      await app.locator('[data-ps-menu="File"]').click()
      const [download] = await Promise.all([page.waitForEvent('download'), app.locator('.ps-menu-list [data-ps-command="save"]').click()])
      expect(download.suggestedFilename()).toBe('untitled-1.png')
      const path = testInfo.outputPath('untitled-1.png')
      await download.saveAs(path)
      const bytes = readFileSync(path)
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([720, 480])
      await expect(app.locator('.ps-menu-list')).toHaveCount(0)
    })

    test('the whole document can be scrolled to when zoomed in', async ({ page }) => {
      const { app } = await openPhotoshop(page)
      await slide(app.locator('[data-ps-zoom]'), 9)
      await expect(app.locator('[data-ps-zoom-value]')).toHaveText('800%')
      const { start, end } = await reach(app.locator('[data-ps-viewport]'), '[data-ps-stack]')
      expect(start.left).toBeGreaterThanOrEqual(0)
      expect(start.top).toBeGreaterThanOrEqual(0)
      expect(end.right).toBeGreaterThanOrEqual(0)
      expect(end.bottom).toBeGreaterThanOrEqual(0)
    })

    test.describe('by touch', () => {
      test.use({ hasTouch: true })

      test('a finger paints', async ({ page }) => {
        const { app, stack } = await openPhotoshop(page)
        await touchDrag(page, await spot(stack, 100, 300, ...PS), await spot(stack, 400, 300, ...PS))
        expect(await pixel(layer(app, 'l2'), 250, 300)).toEqual([0, 120, 212, 255])
      })
    })

    test('on a phone the document starts in view and nothing scrolls sideways', async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
      const page = await context.newPage()
      await boot(page, build.url)
      const { app } = await openPhotoshop(page)
      const { start } = await reach(app.locator('[data-ps-viewport]'), '[data-ps-stack]')
      expect(start.left).toBeGreaterThanOrEqual(0)
      expect(start.top).toBeGreaterThanOrEqual(0)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      await context.close()
    })
  })
}

// ---- The two builds against each other ---------------------------------------------

/** Runs the same steps in each build, in a fresh page, and returns what each saw. */
async function inBothBuilds<T>(
  browser: Browser,
  check: (page: Page, build: Build) => Promise<T>,
  options: { viewport?: { width: number; height: number }; phone?: boolean } = {},
) {
  const seen: T[] = []
  for (const build of BUILDS) {
    const context = await browser.newContext({
      viewport: options.viewport ?? { width: 1440, height: 900 },
      hasTouch: options.phone,
      isMobile: options.phone,
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await boot(page, build.url)
    seen.push(await check(page, build))
    await context.close()
  }
  return seen
}

const digest = (canvas: Locator) =>
  canvas.evaluate(async (el: HTMLCanvasElement) => {
    const { data } = el.getContext('2d')!.getImageData(0, 0, el.width, el.height)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
  })

/** Photoshop's visible layers flattened, as its export does, then hashed. */
const flattened = (stack: Locator) =>
  stack.evaluate(async (el) => {
    const out = document.createElement('canvas')
    out.width = 720
    out.height = 480
    const ctx = out.getContext('2d')!
    for (const layer of el.querySelectorAll<HTMLCanvasElement>('canvas')) {
      if (layer.hidden) continue
      ctx.globalAlpha = Number(layer.style.opacity || 1)
      ctx.drawImage(layer, 0, 0)
    }
    const hash = await crypto.subtle.digest('SHA-256', ctx.getImageData(0, 0, 720, 480).data)
    return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
  })

const paintWindowId = (page: Page) =>
  page.evaluate(() => {
    type Win = { id: number; app: string }
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { windows: Win[] } }
      __osStore: { getState: () => { windows: Win[] } }
    }
    const windows = w.Alpine ? w.Alpine.store('os').windows : w.__osStore.getState().windows
    return windows.find((win) => win.app === 'paint')!.id
  })

/** The share of pixels that differ visibly between two PNG screenshots. */
async function difference(browser: Browser, one: Buffer, two: Buffer) {
  const page = await browser.newPage()
  const result = await page.evaluate(
    async ([a, b]) => {
      const load = async (data: string) => {
        const image = new Image()
        image.src = `data:image/png;base64,${data}`
        await image.decode()
        const canvas = new OffscreenCanvas(image.width, image.height)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(image, 0, 0)
        return ctx.getImageData(0, 0, image.width, image.height)
      }
      const [p, q] = await Promise.all([load(a), load(b)])
      if (p.width !== q.width || p.height !== q.height) return { size: `${p.width}x${p.height} against ${q.width}x${q.height}`, share: 1 }
      let differ = 0
      for (let i = 0; i < p.data.length; i += 4) {
        const gap = Math.abs(p.data[i] - q.data[i]) + Math.abs(p.data[i + 1] - q.data[i + 1]) + Math.abs(p.data[i + 2] - q.data[i + 2])
        if (gap > 30) differ++
      }
      return { size: '', share: differ / (p.width * p.height) }
    },
    [one.toString('base64'), two.toString('base64')] as const,
  )
  await page.close()
  return result
}

test.describe('Paint and Photoshop in both builds', () => {
  // Each test boots both builds and repeats every step in each.
  test.describe.configure({ timeout: 240_000 })

  test('the same strokes leave the same pixels in Paint', async ({ browser }) => {
    const [v1, v2] = await inBothBuilds(browser, async (page) => {
      const { app, canvas } = await openPaint(page)
      const blank = await digest(canvas)
      await app.locator('[data-paint-colour="#ed1c24"]').click()
      await drag(page, canvas, [40, 40], [200, 90])
      await app.locator('[data-paint-tool="brush"]').click()
      await slide(app.locator('[data-paint-size]'), 12)
      await app.locator('[data-paint-colour="#3f48cc"]').click()
      await drag(page, canvas, [60, 150], [300, 220])
      for (const [shape, from, to] of [
        ['rectangle', [350, 60], [500, 160]],
        ['ellipse', [520, 60], [700, 200]],
        ['star', [600, 300], [760, 450]],
        ['line', [50, 500], [400, 560]],
      ] as const) {
        await app.locator(`[data-paint-shape="${shape}"]`).click()
        await drag(page, canvas, [...from], [...to])
      }
      await app.locator('[data-paint-tool="fill"]').click()
      await app.locator('[data-paint-colour="#ffc90e"]').click()
      await clickAt(page, canvas, 420, 100)
      await app.locator('[data-paint-tool="text"]').click()
      await clickAt(page, canvas, 100, 300)
      await page.keyboard.type('Same in both')
      await page.keyboard.press('Enter')
      await app.locator('[data-paint-tool="eraser"]').click()
      await drag(page, canvas, [100, 60], [140, 70])
      return { blank, drawn: await digest(canvas) }
    })
    expect(v1.drawn).not.toBe(v1.blank)
    expect(v1).toEqual(v2)
  })

  test('the same strokes leave the same pixels in Photoshop', async ({ browser }) => {
    const PS: [number, number] = [720, 480]
    const [v1, v2] = await inBothBuilds(browser, async (page) => {
      const { app, stack } = await openPhotoshop(page)
      const opened = await flattened(stack)
      await app.locator('[data-ps-colour="#ec1ea0"]').click()
      await drag(page, stack, [40, 40], [300, 120], PS)
      await app.locator('[data-ps-command="newLayer"]').click()
      await app.locator('[data-ps-tool="bucket"]').click()
      await app.locator('[data-ps-colour="#00d68f"]').click()
      await clickAt(page, stack, 5, 5, PS)
      await slide(app.locator('[data-ps-opacity="l4"]'), 30)
      await app.locator('[data-ps-select="l1"]').click()
      await app.locator('[data-ps-tool="eraser"]').click()
      await drag(page, stack, [500, 300], [700, 420], PS)
      await app.locator('[data-ps-eye="l3"]').click()
      return { opened, drawn: await flattened(stack) }
    })
    expect(v1.drawn).not.toBe(v1.opened)
    expect(v1).toEqual(v2)
  })

  for (const [name, viewport, phone, dark] of [
    ['a desktop', { width: 1440, height: 900 }, false, false],
    ['a desktop in the dark theme', { width: 1440, height: 900 }, false, true],
    ['a phone', { width: 390, height: 844 }, true, false],
  ] as const) {
    test(`screenshots of each app match on ${name}`, async ({ browser }) => {
      const [v1, v2] = await inBothBuilds(
        browser,
        async (page) => {
          if (dark) await darkTheme(page)
          const shots: Buffer[] = []
          const { app: paint } = await openPaint(page)
          await page.mouse.move(0, 0)
          shots.push(await paint.screenshot({ animations: 'disabled', caret: 'hide' }))
          await call(page, 'closeWindow', await paintWindowId(page))
          const { app: ps } = await openPhotoshop(page)
          await page.mouse.move(0, 0)
          // The layer thumbnails draw on the next frame.
          await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
          shots.push(await ps.screenshot({ animations: 'disabled', caret: 'hide' }))
          return shots
        },
        { viewport, phone },
      )
      for (const [i, app] of ['Paint', 'Photoshop'].entries()) {
        const { size, share } = await difference(browser, v1[i], v2[i])
        expect(size, `${app} is the same size in both builds`).toBe('')
        expect(share, `${app} differs in ${(share * 100).toFixed(2)}% of its pixels`).toBeLessThan(0.005)
      }
    })
  }
})
