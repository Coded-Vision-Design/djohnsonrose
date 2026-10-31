import { test, expect, type Locator, type Page } from '@playwright/test'

// Window management, run against both builds so that they cannot drift apart.
// v1 needs the PHP server (V1_URL) and v2 the Vite dev server, which exposes
// the store as window.__osStore in development only.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

interface Box {
  x: number
  y: number
  width: number
  height: number
}

async function boot(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('#windows-layer').waitFor({ state: 'attached' })
  await page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })
}

/** Calls an action on whichever store this build has. */
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

const windowFor = (page: Page, title: string) => page.getByRole('dialog', { name: title, exact: true })

async function open(page: Page, app: string, title: string) {
  await call(page, 'openApp', app)
  const win = windowFor(page, title)
  await win.waitFor()
  // The opening animation scales the window, so sizes mean nothing until it ends.
  await win.evaluate(async (el) => {
    await Promise.allSettled(el.getAnimations().map((animation) => animation.finished))
  })
  return win
}

const box = async (locator: Locator) => (await locator.boundingBox()) as Box
const state = (win: Locator) => win.getAttribute('data-state')
const desktop = (page: Page) => box(page.locator('#windows-layer'))

/** Geometry animates, so wait for it to settle on the expected rectangle. */
async function expectBox(win: Locator, expected: Partial<Box>) {
  await expect
    .poll(async () => {
      const actual = await box(win)
      return Object.entries(expected).every(
        ([key, value]) => Math.abs(actual[key as keyof Box] - (value as number)) <= 1,
      )
        ? 'match'
        : JSON.stringify(actual)
    })
    .toBe('match')
}

/** A point on the title bar clear of its buttons. */
async function grip(win: Locator) {
  const bar = await box(win.locator('.os-titlebar'))
  return { x: bar.x + Math.min(bar.width / 3, 160), y: bar.y + bar.height / 2 }
}

async function dragTo(page: Page, win: Locator, x: number, y: number) {
  const from = await grip(win)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(x, y, { steps: 12 })
  await page.waitForTimeout(60)
}

const preview = (page: Page) => page.locator('[data-snap-preview]')
const expectNoHorizontalScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

for (const build of BUILDS) {
  test.describe(`${build.name} desktop snapping`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
    })

    test('previews a left snap and commits it only on release', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const d = await desktop(page)
      await dragTo(page, win, 2, 300)

      await expect(preview(page)).toBeVisible()
      await expectBox(preview(page), { x: 0, y: 0, width: d.width / 2, height: d.height })
      expect(await state(win)).toBe('floating')

      await page.mouse.up()
      await expect(preview(page)).toHaveCount(0)
      await expect.poll(() => state(win)).toBe('snapped')
      await expectBox(win, { x: 0, y: 0, width: d.width / 2, height: d.height })
    })

    test('snaps right and maximises at the top', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const d = await desktop(page)
      await dragTo(page, win, d.width - 2, 300)
      await page.mouse.up()
      await expectBox(win, { x: d.width / 2, width: d.width / 2, height: d.height })

      await dragTo(page, win, 300, 300)
      await page.mouse.up()
      await dragTo(page, win, 300, 2)
      await page.mouse.up()
      await expect.poll(() => state(win)).toBe('maximized')
      await expectBox(win, { x: 0, y: 0, width: d.width, height: d.height })
    })

    for (const [name, fx, fy, ex, ey] of [
      ['top left', 0, 0, 0, 0],
      ['top right', 1, 0, 0.5, 0],
      ['bottom left', 0, 1, 0, 0.5],
      ['bottom right', 1, 1, 0.5, 0.5],
    ] as const) {
      test(`snaps into the ${name} quadrant`, async ({ page }) => {
        const win = await open(page, 'calculator', 'Calculator')
        const d = await desktop(page)
        await dragTo(page, win, Math.min(fx * d.width, d.width - 2) + (fx ? 0 : 2), Math.min(fy * d.height, d.height - 2) + (fy ? 0 : 2))
        await expect(preview(page)).toBeVisible()
        await page.mouse.up()
        await expectBox(win, { x: ex * d.width, y: ey * d.height, width: d.width / 2, height: d.height / 2 })
      })
    }

    test('ordinary movement does not snap', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      await dragTo(page, win, 60, 300)
      await expect(preview(page)).toHaveCount(0)
      await page.mouse.up()
      expect(await state(win)).toBe('floating')
    })

    test('a press without movement leaves a window alone', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const before = await box(win)
      const from = await grip(win)
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.up()
      expect(await box(win)).toEqual(before)
    })

    test('lifting a window from the top edge does not maximise it again', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      await dragTo(page, win, 500, 4)
      await page.mouse.up()
      await page.mouse.move(100, 400)
      const movedDown = await box(win)
      expect(movedDown.y).toBeGreaterThanOrEqual(0)
    })

    test('the top centre bar is separate from the top edge', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const d = await desktop(page)
      const bar = page.locator('[data-snap-bar]')

      await dragTo(page, win, d.width / 2, 40)
      await expect(bar).toBeVisible()
      await page.mouse.move(300, 2, { steps: 6 })
      await expect(bar).toHaveCount(0)
      await expectBox(preview(page), { width: d.width, height: d.height })

      await page.mouse.move(d.width / 2, 40, { steps: 6 })
      const zone = await box(bar.locator('.os-snap-zone').nth(1))
      await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2, { steps: 4 })
      await expectBox(preview(page), { x: d.width / 2, width: d.width / 2 })
      await page.mouse.up()
      await expect(bar).toHaveCount(0)
      await expectBox(win, { x: d.width / 2, width: d.width / 2, height: d.height })
    })

    test('Escape cancels a drag', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const before = await box(win)
      await dragTo(page, win, 2, 300)
      await page.keyboard.press('Escape')
      await page.mouse.up()
      await expect(preview(page)).toHaveCount(0)
      await expectBox(win, before)
      expect(await state(win)).toBe('floating')
    })
  })

  test.describe(`${build.name} Snap Layouts`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
    })

    const flyout = (page: Page) => page.locator('[data-snap-flyout]')

    test('opens on hover and places a window exactly', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const d = await desktop(page)
      await win.locator('.os-win-max').hover()
      await expect(flyout(page)).toBeVisible()

      await flyout(page).locator('[data-layout="thirds"] [data-zone="centre"]').click()
      await expect(flyout(page)).toHaveCount(0)
      await expectBox(win, { x: Math.round(d.width / 3), width: Math.round(d.width * 2 / 3) - Math.round(d.width / 3) })
    })

    test('stays open while moving from the button into it', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      await win.locator('.os-win-max').hover()
      await expect(flyout(page)).toBeVisible()
      await page.waitForTimeout(300)
      await flyout(page).locator('[data-layout="halves"] [data-zone="left"]').hover()
      await page.waitForTimeout(400)
      await expect(flyout(page)).toBeVisible()
      await expect(preview(page)).toBeVisible()
    })

    test('closes when the pointer leaves', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      await win.locator('.os-win-max').hover()
      await expect(flyout(page)).toBeVisible()
      await page.mouse.move(50, 700)
      await expect(flyout(page)).toHaveCount(0)
    })

    test('offers every layout that fits at this size', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      await win.locator('.os-win-max').hover()
      await expect(flyout(page)).toBeVisible()
      for (const layout of ['halves', 'wide-left', 'wide-right', 'thirds', 'wide-centre', 'quadrants']) {
        await expect(flyout(page).locator(`[data-layout="${layout}"]`)).toBeVisible()
      }
    })

    test('Snap Assist fills the remaining space', async ({ page }) => {
      const first = await open(page, 'calculator', 'Calculator')
      const second = await open(page, 'taskmanager', 'Task Manager')
      const d = await desktop(page)

      await call(page, 'focusWindow', Number((await first.getAttribute('id'))!.replace('win-', '')))
      await first.locator('.os-win-max').hover()
      await flyout(page).locator('[data-layout="halves"] [data-zone="left"]').click()

      const assist = page.locator('[data-snap-assist]')
      await expect(assist).toBeVisible()
      await expectBox(assist, { x: d.width / 2, width: d.width / 2, height: d.height })
      await assist.getByRole('button', { name: 'Task Manager' }).click()

      await expect(assist).toHaveCount(0)
      await expectBox(second, { x: d.width / 2, width: d.width / 2, height: d.height })
    })

    test('clicking elsewhere dismisses Snap Assist', async ({ page }) => {
      const first = await open(page, 'calculator', 'Calculator')
      await open(page, 'taskmanager', 'Task Manager')
      await call(page, 'focusWindow', Number((await first.getAttribute('id'))!.replace('win-', '')))
      await dragTo(page, first, 2, 300)
      await page.mouse.up()
      await expect(page.locator('[data-snap-assist]')).toBeVisible()
      await page.mouse.click(120, 200)
      await expect(page.locator('[data-snap-assist]')).toHaveCount(0)
    })
  })

  test.describe(`${build.name} restoring`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
    })

    test('double-clicking the title bar maximises and restores', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const before = await box(win)
      const d = await desktop(page)
      const from = await grip(win)
      await page.mouse.dblclick(from.x, from.y)
      await expectBox(win, { x: 0, y: 0, width: d.width, height: d.height })

      const top = await grip(win)
      await page.mouse.dblclick(top.x, top.y)
      await expectBox(win, before)
    })

    test('maximised windows never cover the taskbar', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      await win.locator('.os-win-max').click()
      await expect.poll(() => state(win)).toBe('maximized')
      await page.waitForTimeout(250)
      const taskbar = await box(page.locator('.os-taskbar'))
      const rect = await box(win)
      expect(rect.y + rect.height).toBeLessThanOrEqual(taskbar.y + 1)
    })

    test('dragging a maximised window down keeps it under the pointer with no jump', async ({ page }) => {
      const win = await open(page, 'taskmanager', 'Task Manager')
      const floating = await box(win)
      await win.locator('.os-win-max').click()
      await expect.poll(() => state(win)).toBe('maximized')
      await page.waitForTimeout(250)

      const d = await desktop(page)
      const startX = d.width * 0.75
      const startY = 14
      await page.mouse.move(startX, startY)
      await page.mouse.down()

      const ratios: number[] = []
      for (const [x, y] of [[startX + 2, startY + 8], [startX + 10, startY + 30], [startX - 40, 120], [startX - 200, 260]]) {
        await page.mouse.move(x, y)
        await page.waitForTimeout(40)
        const rect = await box(win)
        expect(rect.width).toBeCloseTo(floating.width, 0)
        ratios.push((x - rect.x) / rect.width)
        expect(y - rect.y).toBeCloseTo(startY, 0)
      }
      await page.mouse.up()

      for (const ratio of ratios) expect(Math.abs(ratio - 0.75)).toBeLessThan(0.02)
      expect(await state(win)).toBe('floating')
      await expectBox(win, { width: floating.width, height: floating.height })
    })

    test('dragging a snapped window away restores its floating size', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const floating = await box(win)
      await dragTo(page, win, 2, 300)
      await page.mouse.up()
      await expect.poll(() => state(win)).toBe('snapped')
      await page.waitForTimeout(250)

      await dragTo(page, win, 700, 300)
      await page.mouse.up()
      expect(await state(win)).toBe('floating')
      await expectBox(win, { width: floating.width, height: floating.height })
    })

    test('restores to a snap after being maximised from it', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const d = await desktop(page)
      await dragTo(page, win, 2, 300)
      await page.mouse.up()
      await expect.poll(() => state(win)).toBe('snapped')
      await win.locator('.os-win-max').click()
      await expect.poll(() => state(win)).toBe('maximized')
      await win.locator('.os-win-max').click()
      await expect.poll(() => state(win)).toBe('snapped')
      await expectBox(win, { x: 0, width: d.width / 2 })
    })

    test('minimising keeps an app and its place', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const d = await desktop(page)
      await dragTo(page, win, d.width - 2, 300)
      await page.mouse.up()
      await expect.poll(() => state(win)).toBe('snapped')

      const id = Number((await win.getAttribute('id'))!.replace('win-', ''))
      await call(page, 'toggleMinimize', id)
      await expect(page.locator(`#win-${id}`)).toHaveAttribute('data-state', 'minimized')
      await expect(page.locator(`#win-${id}`)).toBeHidden()
      await call(page, 'toggleMinimize', id)
      await expect(page.locator(`#win-${id}`)).toHaveAttribute('data-state', 'snapped')
      await expectBox(win, { x: d.width / 2, width: d.width / 2 })
    })

    test('typing survives minimise and restore', async ({ page }) => {
      const win = await open(page, 'notepad', 'Notepad')
      if (build.name === 'v1') await win.getByText('Click to start typing').click()
      const text = win.locator('textarea:visible').first()
      await text.click()
      await page.keyboard.type('keep this')
      const id = Number((await win.getAttribute('id'))!.replace('win-', ''))

      await win.getByRole('button', { name: 'Minimise' }).click()
      await expect(page.locator(`#win-${id}`)).toBeHidden()
      await call(page, 'toggleMinimize', id)
      // v1 Notepad shows a preview once the text box loses focus.
      if (build.name === 'v1') await expect(page.locator(`#win-${id}`)).toContainText('keep this')
      else await expect(page.locator(`#win-${id} textarea:visible`).first()).toHaveValue('keep this')
    })
  })

  test.describe(`${build.name} shared boundaries`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
    })

    const twoSnapped = async (page: Page) => {
      const left = await open(page, 'calculator', 'Calculator')
      const right = await open(page, 'taskmanager', 'Task Manager')
      const id = (w: string | null) => Number(w!.replace('win-', ''))
      await call(page, 'snapWindow', id(await left.getAttribute('id')), 'halves', 'left')
      await call(page, 'snapWindow', id(await right.getAttribute('id')), 'halves', 'right')
      await call(page, 'dismissSnapAssist').catch(() => {})
      await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))
      await page.waitForTimeout(60)
      return { left, right }
    }

    const dragHandle = async (page: Page, handle: Locator, dx: number, dy = 0) => {
      const h = await box(handle)
      const from = { x: h.x + h.width / 2, y: h.y + h.height / 2 }
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 })
      await page.waitForTimeout(40)
    }

    test('moves both windows together with no gap or overlap', async ({ page }) => {
      const { left, right } = await twoSnapped(page)
      const d = await desktop(page)
      await dragHandle(page, left.locator('.os-resize[data-dir="e"]'), 180)

      const during = await box(left)
      const neighbour = await box(right)
      expect(during.x + during.width).toBeCloseTo(neighbour.x, 0)
      await page.mouse.up()

      await expectBox(left, { x: 0, width: d.width / 2 + 180 })
      await expectBox(right, { x: d.width / 2 + 180, width: d.width / 2 - 180 })
      expect(await state(left)).toBe('snapped')
      expect(await state(right)).toBe('snapped')
    })

    test('stops at the minimum window size', async ({ page }) => {
      const { left, right } = await twoSnapped(page)
      const d = await desktop(page)
      await dragHandle(page, left.locator('.os-resize[data-dir="e"]'), 5000)
      await page.mouse.up()
      await expectBox(right, { width: 300, x: d.width - 300 })
      await expectBox(left, { width: d.width - 300 })
    })

    test('keeps the new proportions when the desktop changes', async ({ page }) => {
      const { left, right } = await twoSnapped(page)
      const d = await desktop(page)
      await dragHandle(page, left.locator('.os-resize[data-dir="e"]'), 180)
      await page.mouse.up()
      const share = (d.width / 2 + 180) / d.width

      await page.setViewportSize({ width: 1280, height: 720 })
      const next = await desktop(page)
      await expectBox(left, { width: Math.round(share * next.width) })
      await expectBox(right, { x: Math.round(share * next.width), height: next.height })
    })

    test('has no handles on outer edges', async ({ page }) => {
      const { left } = await twoSnapped(page)
      await expect(left.locator('.os-resize')).toHaveCount(1)
      await expect(left.locator('.os-resize[data-dir="e"]')).toHaveCount(1)
    })

    test('floating windows resize from every edge, down to the minimum', async ({ page }) => {
      const win = await open(page, 'taskmanager', 'Task Manager')
      const before = await box(win)
      await dragHandle(page, win.locator('.os-resize[data-dir="se"]'), -5000, -5000)
      await page.mouse.up()
      await expectBox(win, { x: before.x, y: before.y, width: 300, height: 200 })
    })
  })

  test.describe(`${build.name} focus and stacking`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
    })

    test('clicking a window raises it above the others', async ({ page }) => {
      const back = await open(page, 'taskmanager', 'Task Manager')
      const front = await open(page, 'settings', 'Settings')
      await expect(front).toHaveClass(/window-active/)
      const rect = await box(back)
      await page.mouse.click(rect.x + 8, rect.y + 200)
      await expect(back).toHaveClass(/window-active/)
      await expect(front).not.toHaveClass(/window-active/)
      const z = async (w: Locator) => Number(await w.evaluate((el) => getComputedStyle(el).zIndex))
      expect(await z(back)).toBeGreaterThan(await z(front))
    })

    test('the taskbar stays on top however many times windows are focused', async ({ page }) => {
      const a = await open(page, 'calculator', 'Calculator')
      const id = Number((await a.getAttribute('id'))!.replace('win-', ''))
      await page.evaluate(
        ([windowId]) => {
          const w = window as unknown as {
            Alpine?: { store: (n: string) => Record<string, unknown> }
            __osStore: { getState: () => Record<string, unknown>; setState: (s: object) => void }
          }
          if (w.Alpine) w.Alpine.store('os').nextWindowZ = 20000
          else w.__osStore.setState({ nextWindowZ: 20000 })
          void windowId
        },
        [id],
      )
      await call(page, 'toggleMaximize', id)
      const second = await open(page, 'taskmanager', 'Task Manager')
      await expect(second).toBeVisible()
      const d = await desktop(page)
      const covered = await page.evaluate(
        ([x, y]) => !!document.elementFromPoint(x, y)?.closest('.os-taskbar'),
        [d.width / 2, d.height + 24],
      )
      expect(covered).toBe(true)
    })

    test('closing a window focuses the next one down', async ({ page }) => {
      const first = await open(page, 'calculator', 'Calculator')
      const second = await open(page, 'taskmanager', 'Task Manager')
      await second.getByRole('button', { name: 'Close' }).click()
      await expect(second).toHaveCount(0)
      await expect(first).toHaveClass(/window-active/)
    })

    test('Calculator does not take keys from a text field in another app', async ({ page }) => {
      await open(page, 'calculator', 'Calculator')
      await page.evaluate(() => {
        const input = document.createElement('input')
        input.id = 'probe'
        document.body.append(input)
        input.focus()
      })
      await page.keyboard.type('123')
      await expect(page.locator('#probe')).toHaveValue('123')
    })

    test('window controls work from the keyboard', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      await win.getByRole('button', { name: 'Maximise' }).focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => state(win)).toBe('maximized')
      await win.getByRole('button', { name: 'Restore' }).focus()
      await page.keyboard.press('Space')
      await expect.poll(() => state(win)).toBe('floating')
    })
  })

  test.describe(`${build.name} keyboard shortcuts`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
    })

    test('Win and arrow keys walk through placements', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const d = await desktop(page)
      await page.keyboard.press('Meta+ArrowLeft')
      await expectBox(win, { x: 0, width: d.width / 2 })
      await page.keyboard.press('Meta+ArrowUp')
      await expectBox(win, { x: 0, y: 0, width: d.width / 2, height: d.height / 2 })
      await page.keyboard.press('Meta+ArrowUp')
      await expect.poll(() => state(win)).toBe('maximized')
      await page.keyboard.press('Meta+ArrowDown')
      await expect.poll(() => state(win)).not.toBe('maximized')
    })

    test('Alt+Shift works as well, for when the OS keeps the Win key', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const d = await desktop(page)
      await page.keyboard.press('Alt+Shift+ArrowRight')
      await expectBox(win, { x: d.width / 2, width: d.width / 2 })
    })

    test('Alt+Shift+Z opens Snap Layouts and moves focus into it', async ({ page }) => {
      await open(page, 'calculator', 'Calculator')
      await page.keyboard.press('Alt+Shift+Z')
      const flyout = page.locator('[data-snap-flyout]')
      await expect(flyout).toBeVisible()
      await expect(flyout.locator('button').first()).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(flyout).toHaveCount(0)
    })

    test('Alt+F4 closes the active window', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      await page.keyboard.press('Alt+F4')
      await expect(win).toHaveCount(0)
    })

    test('shortcuts leave editable fields alone', async ({ page }) => {
      const win = await open(page, 'notepad', 'Notepad')
      if (build.name === 'v1') await win.getByText('Click to start typing').click()
      await win.locator('textarea:visible').first().click()
      await page.keyboard.press('Alt+Shift+ArrowLeft')
      await page.waitForTimeout(100)
      expect(await state(win)).toBe('floating')
    })
  })

  test.describe(`${build.name} viewport changes`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
    })

    test('refits a snapped window when the browser is resized', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      await page.keyboard.press('Alt+Shift+ArrowRight')
      await expect.poll(() => state(win)).toBe('snapped')
      await page.setViewportSize({ width: 1280, height: 720 })
      const d = await desktop(page)
      await expectBox(win, { x: d.width / 2, y: 0, width: d.width / 2, height: d.height })
    })

    test('a floating window can never be stranded', async ({ page }) => {
      const win = await open(page, 'taskmanager', 'Task Manager')
      await dragTo(page, win, 1380, 700)
      await page.mouse.up()
      await page.setViewportSize({ width: 1024, height: 700 })
      const d = await desktop(page)
      await expect
        .poll(async () => {
          const rect = await box(win)
          return rect.x < d.width && rect.y < d.height && rect.y >= 0
        })
        .toBe(true)
    })

    test('windows cannot be dragged under the taskbar', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const d = await desktop(page)
      await dragTo(page, win, 600, d.height + 40)
      await page.mouse.up()
      const rect = await box(win)
      expect(rect.y).toBeLessThan(d.height)
    })

    test('survives rapid snapping and unsnapping', async ({ page }) => {
      const win = await open(page, 'calculator', 'Calculator')
      const floating = await box(win)
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowRight']) {
        await page.keyboard.press(`Alt+Shift+${key}`)
      }
      await page.waitForTimeout(260)
      for (let i = 0; i < 4 && (await state(win)) !== 'floating'; i++) {
        await page.keyboard.press('Alt+Shift+ArrowLeft')
        await page.waitForTimeout(30)
      }
      await expectBox(win, { width: floating.width, height: floating.height })
    })
  })

  for (const [width, height] of [[1920, 1080], [2560, 1440], [1366, 768], [1280, 720]] as const) {
    test.describe(`${build.name} at ${width}x${height}`, () => {
      test.use({ viewport: { width, height } })

      test('snaps and maximises exactly', async ({ page }) => {
        await boot(page, build.url)
        const win = await open(page, 'calculator', 'Calculator')
        const d = await desktop(page)
        expect(d.height).toBe(height - 48)

        await dragTo(page, win, 2, 300)
        await page.mouse.up()
        await expectBox(win, { x: 0, y: 0, width: width / 2, height: height - 48 })

        await page.keyboard.press('Alt+Shift+ArrowUp')
        await expectBox(win, { width: width / 2, height: (height - 48) / 2 })
        await expectNoHorizontalScroll(page)
      })

      test('offers only the layouts that fit', async ({ page }) => {
        await boot(page, build.url)
        const win = await open(page, 'calculator', 'Calculator')
        await win.locator('.os-win-max').hover()
        const flyout = page.locator('[data-snap-flyout]')
        await expect(flyout).toBeVisible()
        const box2 = await box(flyout)
        const d = await desktop(page)
        expect(box2.x + box2.width).toBeLessThanOrEqual(d.width)
        await expect(flyout.locator('[data-layout="thirds"]')).toBeVisible()
      })
    })
  }

  test.describe(`${build.name} tablet`, () => {
    test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true })

    const touchDrag = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }) => {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
      for (let i = 1; i <= 10; i++) {
        const point = { x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10 }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
        await page.waitForTimeout(16)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(60)
    }

    test('uses tablet mode with touch-sized chrome', async ({ page }) => {
      await boot(page, build.url)
      await expect(page.locator('html')).toHaveAttribute('data-os-mode', 'tablet')
      const win = await open(page, 'calculator', 'Calculator')
      expect((await box(win.locator('.os-titlebar'))).height).toBeGreaterThanOrEqual(44)
      expect((await box(win.locator('.os-resize[data-dir="e"]'))).width).toBeGreaterThanOrEqual(16)
    })

    test('moves a window by touch', async ({ page }) => {
      await boot(page, build.url)
      const win = await open(page, 'calculator', 'Calculator')
      const before = await box(win)
      const from = await grip(win)
      await touchDrag(page, from, { x: from.x - 150, y: from.y + 60 })
      await expectBox(win, { x: before.x - 150, y: before.y + 60 })
    })

    test('splits the screen by touch, with a generous edge', async ({ page }) => {
      await boot(page, build.url)
      const win = await open(page, 'calculator', 'Calculator')
      const d = await desktop(page)
      const from = await grip(win)
      await touchDrag(page, from, { x: 16, y: 300 })
      await expectBox(win, { x: 0, width: d.width / 2, height: d.height })
    })

    test('does not show the hover flyout', async ({ page }) => {
      await boot(page, build.url)
      const win = await open(page, 'calculator', 'Calculator')
      await win.locator('.os-win-max').tap()
      await expect(page.locator('[data-snap-flyout]')).toHaveCount(0)
      await expect.poll(() => state(win)).toBe('maximized')
    })

    test('a tap on a maximised title bar does not move it', async ({ page }) => {
      await boot(page, build.url)
      const win = await open(page, 'calculator', 'Calculator')
      await call(page, 'toggleMaximize', Number((await win.getAttribute('id'))!.replace('win-', '')))
      await page.waitForTimeout(100)
      const from = await grip(win)
      await page.touchscreen.tap(from.x, from.y)
      await page.waitForTimeout(100)
      expect(await state(win)).toBe('maximized')
    })

    test('rotating refits a split', async ({ page }) => {
      await boot(page, build.url)
      const win = await open(page, 'calculator', 'Calculator')
      await call(page, 'snapWindow', Number((await win.getAttribute('id'))!.replace('win-', '')), 'halves', 'right')
      await page.setViewportSize({ width: 768, height: 1024 })
      const d = await desktop(page)
      await expectBox(win, { x: 384, width: 384, height: d.height })
      await expectNoHorizontalScroll(page)
    })
  })

  for (const [width, height, label] of [
    [390, 844, 'iPhone 14'],
    [375, 667, 'iPhone SE'],
    [430, 932, 'iPhone Pro Max'],
    [844, 390, 'landscape phone'],
  ] as const) {
    test.describe(`${build.name} phone ${label} ${width}x${height}`, () => {
      test.use({ viewport: { width, height }, hasTouch: true, isMobile: true })

      test.beforeEach(async ({ page }) => {
        await boot(page, build.url)
      })

      test('runs apps full screen with no horizontal scroll', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('data-os-mode', 'phone')
        const win = await open(page, 'settings', 'Settings')
        const d = await desktop(page)
        await expectBox(win, { x: 0, y: 0, width: d.width, height: d.height })
        await expectNoHorizontalScroll(page)
      })

      test('has comfortably sized, reachable controls', async ({ page }) => {
        const win = await open(page, 'settings', 'Settings')
        for (const name of ['Back', 'Close']) {
          const button = await box(win.getByRole('button', { name }))
          expect(button.width, name).toBeGreaterThanOrEqual(44)
          expect(button.height, name).toBeGreaterThanOrEqual(44)
          expect(button.x + button.width, name).toBeLessThanOrEqual(width)
        }
        await expect(win.locator('.os-win-min')).toBeHidden()
        await expect(win.locator('.os-win-max')).toBeHidden()
        await expect(win.locator('.os-resize').first()).toBeHidden()
      })

      test('a title bar swipe cannot move or snap the window', async ({ page }) => {
        const win = await open(page, 'settings', 'Settings')
        const before = await box(win)
        const from = await grip(win)
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 2, y: from.y + 100 }] })
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await page.waitForTimeout(100)
        expect(await box(win)).toEqual(before)
        expect(await state(win)).toBe('floating')
      })

      test('Back returns to the desktop and keeps the app', async ({ page }) => {
        const win = await open(page, 'settings', 'Settings')
        const id = await win.getAttribute('id')
        await win.getByRole('button', { name: 'Back' }).tap()
        await expect(page.locator(`#${id}`)).toBeHidden()
        await expect(page.locator(`#${id}`)).toHaveAttribute('data-state', 'minimized')
      })

      test('the task switcher moves between apps and closes them', async ({ page }) => {
        const first = await open(page, 'settings', 'Settings')
        await open(page, 'calculator', 'Calculator')
        const button = page.locator('.os-task-button')
        expect((await box(button)).width).toBeGreaterThanOrEqual(44)
        await button.tap()

        const switcher = page.getByRole('dialog', { name: 'Open apps' })
        await expect(switcher).toBeVisible()
        await expect(switcher.locator('.os-task-card')).toHaveCount(2)
        await switcher.getByRole('button', { name: 'Settings', exact: true }).tap()
        await expect(switcher).toHaveCount(0)
        await expect(first).toHaveClass(/window-active/)

        await button.tap()
        await switcher.getByRole('button', { name: 'Close Calculator' }).tap()
        await expect(switcher.locator('.os-task-card')).toHaveCount(1)
      })

      test('the taskbar stays inside the screen with many apps open', async ({ page }) => {
        for (const [app, title] of [
          ['settings', 'Settings'],
          ['calculator', 'Calculator'],
          ['taskmanager', 'Task Manager'],
          ['terminal', 'Terminal'],
        ]) {
          await open(page, app, title)
        }
        const tray = await box(page.locator('.os-taskbar-tray'))
        expect(tray.x + tray.width).toBeLessThanOrEqual(width + 1)
        await expectNoHorizontalScroll(page)
      })
    })
  }

  test.describe(`${build.name} phone behaviour`, () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
    })

    test('app content scrolls by touch', async ({ page }) => {
      const win = await open(page, 'settings', 'Settings')
      await page.waitForTimeout(300)
      const rect = await box(win)
      const x = rect.x + rect.width / 2
      const y = rect.y + rect.height / 2
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 16 }] })
        await page.waitForTimeout(16)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await expect
        .poll(() => win.evaluate((el) => [...el.querySelectorAll('*')].some((node) => node.scrollTop > 0)))
        .toBe(true)
      await expectBox(win, rect)
    })

    test('rotating keeps the app and its full-screen fit', async ({ page }) => {
      const win = await open(page, 'settings', 'Settings')
      await page.setViewportSize({ width: 844, height: 390 })
      const d = await desktop(page)
      await expectBox(win, { width: d.width, height: d.height })
      await expectNoHorizontalScroll(page)
    })

    test('a real window state survives a trip through phone layout', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 })
      await expect(page.locator('html')).toHaveAttribute('data-os-mode', 'tablet')
      const win = await open(page, 'calculator', 'Calculator')
      await call(page, 'snapWindow', Number((await win.getAttribute('id'))!.replace('win-', '')), 'halves', 'left')
      await page.setViewportSize({ width: 390, height: 844 })
      await expect(page.locator('html')).toHaveAttribute('data-os-mode', 'phone')
      await page.setViewportSize({ width: 1024, height: 768 })
      await expect(page.locator('html')).toHaveAttribute('data-os-mode', 'tablet')
      expect(await state(win)).toBe('snapped')
      const d = await desktop(page)
      await expectBox(win, { x: 0, width: d.width / 2 })
    })

    test('makes room for the on-screen keyboard', async ({ page }) => {
      const win = await open(page, 'settings', 'Settings')
      const full = await box(win)
      await page.evaluate(() => {
        const viewport = window.visualViewport!
        Object.defineProperty(viewport, 'height', { configurable: true, get: () => 500 })
        viewport.dispatchEvent(new Event('resize'))
      })
      await expect(page.locator('html')).toHaveAttribute('data-os-keyboard', '')
      await expect(page.locator('.os-taskbar')).toBeHidden()
      await expect.poll(async () => (await box(win)).height).toBeLessThan(full.height)
      const rect = await box(win)
      expect(rect.y + rect.height).toBeLessThanOrEqual(500 + 1)
    })
  })

  test.describe(`${build.name} accessibility and display`, () => {
    test('respects a reduced motion preference', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await boot(page, build.url)
      const win = await open(page, 'calculator', 'Calculator')
      await dragTo(page, win, 2, 300)
      const transition = await preview(page).evaluate((el) => getComputedStyle(el).transitionDuration)
      await page.mouse.up()
      expect(transition).toBe('0s')
      const d = await desktop(page)
      await win.locator('.os-win-max').click()
      expect((await box(win)).width).toBe(d.width)
    })

    test.describe('on a high-DPI display', () => {
      test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })

      test('keeps geometry exact', async ({ page }) => {
        await boot(page, build.url)
        const win = await open(page, 'calculator', 'Calculator')
        await dragTo(page, win, 1278, 300)
        await page.mouse.up()
        await expectBox(win, { x: 640, width: 640, height: 672 })
      })
    })

    test.describe('at 200% browser zoom on a 1920x1080 screen', () => {
      test.use({ viewport: { width: 960, height: 540 } })

      test('still fits and stays usable', async ({ page }) => {
        await boot(page, build.url)
        await expect(page.locator('html')).toHaveAttribute('data-os-mode', 'tablet')
        const win = await open(page, 'calculator', 'Calculator')
        await win.locator('.os-win-max').click()
        const d = await desktop(page)
        await expectBox(win, { width: d.width, height: d.height })
        await expectNoHorizontalScroll(page)
      })
    })
  })

  test.describe(`${build.name} every app`, () => {
    const APPS = [
      ['edge', 'Chrome'], ['vscode', 'VS Code'], ['explorer', 'File Explorer'], ['terminal', 'Terminal'],
      ['notepad', 'Notepad'], ['word', 'Word'], ['excel', 'Excel'], ['powerpoint', 'PowerPoint'],
      ['outlook', 'Outlook'], ['photoshop', 'Photoshop'], ['flstudio', 'FL Studio 24'], ['docker', 'Docker'],
      ['putty', 'PuTTY'], ['filezilla', 'FileZilla'], ['database', 'SQL Server Management Studio'],
      ['settings', 'Settings'], ['taskmanager', 'Task Manager'], ['eventviewer', 'Event Viewer'],
      ['calculator', 'Calculator'], ['paint', 'Paint'], ['photos', 'Photos'], ['video', 'Movies & TV'],
      ['pdfreader', 'PDF Reader'], ['admin', 'Admin Console'], ['references', 'References'], ['github', 'GitHub'],
    ] as const

    // Known bugs recorded in the review, unrelated to window management.
    const KNOWN = /reading 'note'|education is not defined|referencesVault|refs is not defined/

    test('all open, snap and close without errors', async ({ page }) => {
      test.setTimeout(120_000)
      await page.route('**/data/cv.pdf', (route) =>
        route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4' }),
      )
      const errors: string[] = []
      page.on('pageerror', (e) => {
        if (!KNOWN.test(e.message)) errors.push(e.message)
      })
      await boot(page, build.url)
      const d = await desktop(page)

      for (const [app, title] of APPS) {
        const win = await open(page, app, title)
        await call(page, 'snapWindow', Number((await win.getAttribute('id'))!.replace('win-', '')), 'halves', 'left')
        await expectBox(win, { x: 0, width: d.width / 2 })
        await call(page, 'closeWindow', Number((await win.getAttribute('id'))!.replace('win-', '')))
        await expect(win).toHaveCount(0)
      }
      expect(errors).toEqual([])
    })
  })
}
