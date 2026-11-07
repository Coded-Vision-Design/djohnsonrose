import { test, expect, type Browser, type Page } from '@playwright/test'
import * as metrics from '../../assets/js/windowing/metrics.js'

// Task Manager in both builds. Every figure it shows has to come from the page:
// the store's windows, the browser's Web Vitals, Resource Timing and heap, or
// build.json. Each test reads the same thing from the page itself and checks
// that the window shows exactly that, and that nothing made up is left.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'
const BUILD_JSON = {
  schema: 1,
  commit: SHA,
  shortCommit: SHA.slice(0, 7),
  deployedAt: '2026-11-07T08:30:00Z',
  checks: {
    state: 'read',
    ranOn: 'pull-request',
    results: [
      { name: 'browser-tests', result: 'failure' },
      { name: 'ios-safari', result: 'pending' },
      { name: 'site-tests', result: 'success' },
      { name: 'verify', result: 'skipped' },
    ],
  },
}

/** What /build.json answers: a body, 'missing' for a 404, or nothing to leave the server alone. */
type BuildReply = object | string | 'missing' | undefined

async function boot(page: Page, url: string, build?: BuildReply) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  if (build === 'missing') {
    await page.route('**/build.json', (route) => route.fulfill({ status: 404, contentType: 'text/html', body: 'Not found' }))
  } else if (build !== undefined) {
    const body = typeof build === 'string' ? build : JSON.stringify(build)
    await page.route('**/build.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body }))
  }
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })
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

interface Win {
  id: number
  app: string
  title: string
  state: string
}

const openWindows = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { windows: Win[] } }
      __osStore: { getState: () => { windows: Win[] } }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    return store.windows.map(({ id, app, title, state }) => ({ id, app, title, state }))
  })

/** The page's own Resource Timing entries, as plain objects. */
const resources = (page: Page) =>
  page.evaluate(() =>
    (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      contentType: (entry as PerformanceResourceTiming & { contentType?: string }).contentType ?? '',
      deliveryType: (entry as PerformanceResourceTiming & { deliveryType?: string }).deliveryType ?? '',
    })),
  )

const manager = (page: Page) => page.getByRole('dialog', { name: 'Task Manager', exact: true })
const tab = (page: Page, name: string) => manager(page).getByRole('tab', { name, exact: true })
const panel = (page: Page, id: string) => manager(page).locator(`[data-tm-panel="${id}"]`)

async function openTaskManager(page: Page) {
  await call(page, 'openApp', 'taskmanager')
  await expect(manager(page).locator('[data-task-manager]')).toBeVisible({ timeout: 15_000 })
}

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

for (const build of BUILDS) {
  test.describe(`${build.name} Task Manager`, () => {
    test('Processes lists the open windows from the store, and nothing made up', async ({ page }) => {
      await boot(page, build.url)
      await call(page, 'openApp', 'calculator')
      await openTaskManager(page)
      await expect(tab(page, 'Processes')).toHaveAttribute('aria-selected', 'true')

      const windows = await openWindows(page)
      expect(windows.map((win) => win.app).sort()).toEqual(['calculator', 'taskmanager'])
      const rows = manager(page).locator('[data-tm-process]')
      await expect(rows).toHaveCount(windows.length)
      await expect(rows.locator('[data-tm-name]')).toHaveText(windows.map((win) => win.title))
      await expect(rows.locator('[data-tm-status]')).toHaveText(windows.map((win) => metrics.windowStatusLabel(win.state)))
      await expect(manager(page).locator('[data-tm-count]')).toHaveText('2 windows open')

      // Each app's own files, from the page's Resource Timing.
      await expect(async () => {
        const entries = await resources(page)
        const shown = await rows.locator('[data-tm-files]').allInnerTexts()
        expect(shown).toEqual(windows.map((win) => metrics.appFiles(win.app, entries).text))
      }).toPass({ timeout: 10_000 })
      const calculator = windows.find((win) => win.app === 'calculator')!
      expect(await rows.filter({ hasText: 'Calculator' }).locator('[data-tm-files]').innerText()).not.toBe('None found')

      // No CPU, network or invented system processes are left.
      const text = await manager(page).innerText()
      expect(text).not.toMatch(/CPU|Mbps|GHz|%|System Idle|Desktop Window Manager|Windows Explorer|Uptime/)

      // The rows follow the store.
      await call(page, 'toggleMinimize', calculator.id)
      await expect(manager(page).locator(`[data-tm-process="${calculator.id}"] [data-tm-status]`)).toHaveText('Minimised')
      await manager(page).getByRole('button', { name: 'End task: Calculator' }).click()
      await expect(manager(page).locator(`[data-tm-process="${calculator.id}"]`)).toHaveCount(0)
      expect((await openWindows(page)).map((win) => win.app)).toEqual(['taskmanager'])
      await expect(manager(page).locator('[data-tm-count]')).toHaveText('1 window open')
    })

    test("shows the page's JS heap exactly as the browser gives it", async ({ page }) => {
      const memory = { usedJSHeapSize: 12_345_678, totalJSHeapSize: 23_456_789, jsHeapSizeLimit: 4_294_705_152 }
      await page.addInitScript((value) => {
        Object.defineProperty(performance, 'memory', { configurable: true, get: () => value })
      }, memory)
      await boot(page, build.url)
      await openTaskManager(page)
      await expect(manager(page).locator('[data-tm-heap-value]')).toHaveText(metrics.jsHeap({ memory })!.text)
    })

    test('leaves the heap out where the browser does not give it', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(performance, 'memory', { configurable: true, get: () => undefined })
      })
      await boot(page, build.url)
      await openTaskManager(page)
      await expect(manager(page).locator('[data-tm-process]').first()).toBeVisible()
      await expect(manager(page).locator('[data-tm-heap]')).toHaveCount(0)
    })

    test("Performance shows this page load's Web Vitals as the browser measured them", async ({ page }) => {
      await boot(page, build.url)
      await openTaskManager(page)
      await tab(page, 'Performance').click()
      const vitals = panel(page, 'performance').locator('[data-tm-vital]')
      await expect(vitals).toHaveCount(5)
      expect(await vitals.evaluateAll((all) => all.map((el) => el.getAttribute('data-tm-vital')))).toEqual(['LCP', 'CLS', 'INP', 'FCP', 'TTFB'])

      await expect(async () => {
        const seen = await page.evaluate(async () => {
          const buffered = (type: string) =>
            new Promise<PerformanceEntry[]>((resolve) => {
              const observer = new PerformanceObserver((list) => {
                observer.disconnect()
                resolve(list.getEntries())
              })
              observer.observe({ type, buffered: true })
              setTimeout(() => {
                observer.disconnect()
                resolve([])
              }, 300)
            })
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming & { activationStart?: number }
          const lcp = await buffered('largest-contentful-paint')
          const shifts = (await buffered('layout-shift')) as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]
          return {
            TTFB: nav.responseStart - (nav.activationStart ?? 0),
            FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
            LCP: lcp.length ? lcp[lcp.length - 1].startTime : null,
            shifts: shifts.map((shift) => ({ value: shift.value, startTime: shift.startTime, hadRecentInput: shift.hadRecentInput })),
          }
        })
        const values: Record<string, number | null> = { ...seen, CLS: metrics.clsFromShifts(seen.shifts) }
        for (const id of ['LCP', 'CLS', 'FCP', 'TTFB'] as const) {
          const value = values[id]
          expect(value, id).not.toBeNull()
          const card = panel(page, 'performance').locator(`[data-tm-vital="${id}"]`)
          expect(await card.locator('[data-tm-value]').innerText(), id).toBe(metrics.formatVitalValue(id, value!))
          const rating = metrics.rateVital(id, value!)!
          const badge = card.locator('[data-tm-rating]')
          expect(await badge.innerText(), id).toBe(metrics.RATING_LABELS[rating])
          expect(await badge.evaluate((el) => getComputedStyle(el).backgroundColor), id).toBe(rgb(metrics.RATING_COLOURS[rating]))
          expect(await card.locator('[data-tm-scale]').innerText(), id).toBe(metrics.vitalThresholdText(id))
        }
      }).toPass({ timeout: 15_000 })
    })

    test('INP follows a slow interaction, as the browser timed it', async ({ page }) => {
      await boot(page, build.url)
      await openTaskManager(page)
      await tab(page, 'Performance').click()
      // A button that keeps the page busy for 300 ms when pressed.
      await page.evaluate(() => {
        const button = document.createElement('button')
        button.id = 'slow-button'
        button.textContent = 'Slow'
        Object.assign(button.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647' })
        button.addEventListener('click', () => {
          const end = performance.now() + 300
          while (performance.now() < end) {
            // Busy on purpose.
          }
        })
        document.body.append(button)
      })
      await page.click('#slow-button')
      const card = panel(page, 'performance').locator('[data-tm-vital="INP"]')
      await expect(async () => {
        const worst = await page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              const observer = new PerformanceObserver((list) => {
                observer.disconnect()
                const longest = new Map<number, number>()
                for (const entry of list.getEntries() as (PerformanceEntry & { interactionId: number })[]) {
                  if (entry.interactionId) longest.set(entry.interactionId, Math.max(longest.get(entry.interactionId) ?? 0, entry.duration))
                }
                resolve(Math.max(0, ...longest.values()))
              })
              observer.observe({ type: 'event', buffered: true } as PerformanceObserverInit)
            }),
        )
        expect(worst).toBeGreaterThanOrEqual(300)
        expect(await card.locator('[data-tm-value]').innerText()).toBe(metrics.formatVitalValue('INP', worst))
        expect(await card.locator('[data-tm-rating]').innerText()).toBe(metrics.RATING_LABELS[metrics.rateVital('INP', worst)!])
      }).toPass({ timeout: 10_000 })
    })

    test('the downloads add up to what the page downloaded', async ({ page }) => {
      await boot(page, build.url)
      await page.waitForLoadState('networkidle')
      await openTaskManager(page)
      await tab(page, 'Performance').click()
      const downloads = panel(page, 'performance')
      await expect(downloads.locator('tbody [data-tm-group]')).toHaveCount(6)

      await expect(async () => {
        const seen = await page.evaluate(() => {
          const all = [
            ...(performance.getEntriesByType('navigation') as PerformanceResourceTiming[]),
            ...(performance.getEntriesByType('resource') as PerformanceResourceTiming[]),
          ]
          const sizes: Record<string, number[]> = {}
          for (const entry of all) (sizes[entry.name] ??= []).push(entry.decodedBodySize)
          return {
            requests: all.length,
            transferred: all.reduce((sum, entry) => sum + entry.transferSize, 0),
            size: all.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
            cached: all.filter(
              (entry) => entry.transferSize === 0 && (entry.decodedBodySize > 0 || (entry as PerformanceResourceTiming & { deliveryType?: string }).deliveryType === 'cache'),
            ).length,
            sizes,
          }
        })
        const total = downloads.locator('[data-tm-group="total"]')
        expect(await total.locator('[data-tm-requests]').innerText()).toBe(String(seen.requests))
        expect(await total.locator('[data-tm-transferred]').innerText()).toBe(metrics.formatBytes(seen.transferred))
        expect(await total.locator('[data-tm-size]').innerText()).toBe(metrics.formatBytes(seen.size))
        // The groups add up to the total.
        const counts = (await downloads.locator('tbody [data-tm-requests]').allInnerTexts()).map(Number)
        expect(counts.reduce((sum, count) => sum + count, 0)).toBe(seen.requests)
        // Every largest file is a real download, at its real size, biggest first.
        const files = await downloads.locator('[data-tm-file]').evaluateAll((all) =>
          all.map((el) => ({ url: el.getAttribute('data-tm-url') ?? '', size: el.querySelector('[data-tm-file-size]')?.textContent ?? '' })),
        )
        expect(files).toHaveLength(5)
        for (const file of files) {
          expect(seen.sizes[file.url], file.url).toBeDefined()
          expect(seen.sizes[file.url].map((size) => metrics.formatBytes(size)), file.url).toContain(file.size.replace(' (from cache)', ''))
        }
        const biggest = Math.max(...Object.values(seen.sizes).flat())
        expect(files[0].size.replace(' (from cache)', '')).toBe(metrics.formatBytes(biggest))
        // Cache hits are named only when there were some.
        const note = downloads.locator('[data-tm-note="cache"]')
        if (seen.cached) expect(await note.innerText()).toContain(`${seen.cached} request`)
        else expect(await note.count()).toBe(0)
      }).toPass({ timeout: 15_000 })
    })

    test('the tabs work from the keyboard', async ({ page }) => {
      await boot(page, build.url)
      await openTaskManager(page)
      await tab(page, 'Processes').focus()
      const selected = async (name: string) => {
        await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true')
        await expect(tab(page, name)).toBeFocused()
        const id = name.toLowerCase()
        await expect(panel(page, id)).toBeVisible()
        expect(await manager(page).locator('[data-tm-panel]:visible').count()).toBe(1)
      }
      await page.keyboard.press('ArrowRight')
      await selected('Performance')
      await page.keyboard.press('End')
      await selected('Build')
      await page.keyboard.press('ArrowRight')
      await selected('Processes')
      await page.keyboard.press('ArrowLeft')
      await selected('Build')
      await page.keyboard.press('Home')
      await selected('Processes')
      // Only the chosen tab is in the tab order.
      expect(await manager(page).locator('[role="tab"][tabindex="0"]').count()).toBe(1)
    })
  })

  test.describe(`${build.name} Task Manager build`, () => {
    test.use({ timezoneId: 'UTC' })

    test('shows the deployed commit, when, and what each check concluded', async ({ page }) => {
      await boot(page, build.url, BUILD_JSON)
      await openTaskManager(page)
      await tab(page, 'Build').click()
      const info = panel(page, 'build')
      await expect(info.locator('[data-tm-build-state]')).toHaveText('Deployed build')
      await expect(info.locator('[data-tm-commit]')).toHaveText(SHA.slice(0, 7))
      await expect(info.locator('[data-tm-deployed]')).toHaveText('7 Nov 2026, 08:30 UTC')
      await expect(info.locator('[data-tm-checks-title]')).toHaveText('Checks on the merged pull request')
      await expect(info.locator('[data-tm-checks-summary]')).toHaveText('1 failed, 1 not finished at deploy, 1 passed, 1 skipped')
      await expect(info.locator('[data-tm-check-name]')).toHaveText(['browser-tests', 'ios-safari', 'site-tests', 'verify'])
      await expect(info.locator('[data-tm-check] [data-tm-tone]')).toHaveText(['Failed', 'Not finished at deploy', 'Passed', 'Skipped'])
      const tones = await info.locator('[data-tm-check] [data-tm-tone]').evaluateAll((all) =>
        all.map((el) => [el.getAttribute('data-tm-tone'), getComputedStyle(el).backgroundColor]),
      )
      expect(tones).toEqual(
        (['poor', 'warn', 'good', 'neutral'] as const).map((tone) => [tone, rgb(metrics.TONE_COLOURS[tone])]),
      )
      // The owner's decision: no account, repository or link to GitHub, and no full SHA.
      await expect(manager(page).locator('a')).toHaveCount(0)
      const text = await info.innerText()
      expect(text).not.toMatch(/github/i)
      expect(text).not.toContain(SHA)
    })

    test('says plainly when the checks could not be read', async ({ page }) => {
      await boot(page, build.url, { ...BUILD_JSON, checks: { state: 'unreadable', results: [] } })
      await openTaskManager(page)
      await tab(page, 'Build').click()
      const info = panel(page, 'build')
      await expect(info.locator('[data-tm-commit]')).toHaveText(SHA.slice(0, 7))
      await expect(info.locator('[data-tm-checks-summary]')).toHaveText('The check results could not be read when this was deployed.')
      await expect(info.locator('[data-tm-check]')).toHaveCount(0)
    })

    for (const [what, reply] of [
      ['answered 404', 'missing'],
      ['not there at all', undefined],
    ] as const) {
      test(`calls a copy whose build.json is ${what} a local build`, async ({ page }) => {
        await boot(page, build.url, reply)
        await openTaskManager(page)
        await tab(page, 'Build').click()
        const info = panel(page, 'build')
        await expect(info.locator('[data-tm-build-state]')).toHaveText('Local build')
        await expect(info.locator('[data-tm-commit]')).toHaveCount(0)
        await expect(info.locator('[data-tm-check]')).toHaveCount(0)
      })
    }

    for (const [what, reply] of [
      ['not JSON', '<!doctype html><title>Oops</title>'],
      ['the wrong shape', { schema: 1, commit: 'main', deployedAt: 'today' }],
    ] as const) {
      test(`shows nothing from a build.json that is ${what}`, async ({ page }) => {
        await boot(page, build.url, reply)
        await openTaskManager(page)
        await tab(page, 'Build').click()
        const info = panel(page, 'build')
        await expect(info.locator('[data-tm-build-state]')).toHaveText('Build information could not be read')
        await expect(info.locator('[data-tm-commit]')).toHaveCount(0)
        await expect(info.locator('[data-tm-deployed]')).toHaveCount(0)
      })
    }
  })
}

// ── Both builds side by side ────────────────────────────────────────────────

const TABS = ['Processes', 'Performance', 'Build'] as const

/** Where each part of Task Manager sits, relative to its own top-left corner. */
const layoutOf = (page: Page) =>
  page.evaluate(() => {
    const root = document.querySelector('[data-task-manager]') as HTMLElement
    const base = root.getBoundingClientRect()
    const rect = (el: Element) => {
      const { x, y, width, height } = el.getBoundingClientRect()
      return [x - base.x, y - base.y, width, height].map(Math.round)
    }
    const shown = (selector: string) => [...root.querySelectorAll(selector)].filter((el) => el.getClientRects().length > 0).map(rect)
    const style = getComputedStyle(root)
    return {
      size: [base.width, base.height].map(Math.round),
      font: style.fontFamily,
      colour: style.color,
      background: style.backgroundColor,
      parts: Object.fromEntries(
        [
          '.tm-head',
          '.tm-tab',
          '[data-tm-panel]',
          '.tm-heading',
          '.tm-subheading',
          'th',
          '[data-tm-process]',
          '[data-tm-heap]',
          '[data-tm-vital]',
          '[data-tm-group]',
          '[data-tm-file]',
          '.tm-build > div',
          '[data-tm-check]',
          '.tm-foot',
        ].map((selector) => [selector, shown(selector)]),
      ),
    }
  })

async function seeTab(browser: Browser, build: (typeof BUILDS)[number], viewport: { width: number; height: number }, name: (typeof TABS)[number]) {
  const context = await browser.newContext({ viewport, timezoneId: 'UTC' })
  const page = await context.newPage()
  await boot(page, build.url, BUILD_JSON)
  await openTaskManager(page)
  await tab(page, name).click()
  await expect(panel(page, name.toLowerCase())).toBeVisible()
  if (name === 'Build') await expect(panel(page, 'build').locator('[data-tm-check]')).toHaveCount(4)
  if (name === 'Performance') {
    await expect(panel(page, 'performance').locator('[data-tm-file]')).toHaveCount(5)
    // One slow key press, so that both builds have an INP to show, whatever their clicks took.
    await page.evaluate(() => {
      document.addEventListener(
        'keydown',
        () => {
          const end = performance.now() + 120
          while (performance.now() < end) {
            // Busy on purpose.
          }
        },
        { once: true },
      )
    })
    await page.keyboard.press('Shift')
    await expect(panel(page, 'performance').locator('[data-tm-vital="INP"]')).toHaveAttribute('data-state', 'measured')
    await expect(panel(page, 'performance').locator('[data-tm-vital="INP"] [data-tm-value]')).not.toHaveText('Under 16 ms')
  }
  // The window's opening animation has ended (the loading dots never do).
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime as number))
      .every((animation) => animation.playState !== 'running'),
  )
  const layout = await layoutOf(page)
  if (process.env.TM_SHOTS) {
    await page.screenshot({ path: `${process.env.TM_SHOTS}/${build.name}-${name.toLowerCase()}-${viewport.width}.png` })
  }
  await context.close()
  return layout
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
]) {
  test(`Task Manager lays out the same in both builds at ${viewport.width}px`, async ({ browser }) => {
    test.setTimeout(150_000) // Boots each build once per tab.
    for (const name of TABS) {
      const [v1, v2] = [await seeTab(browser, BUILDS[0], viewport, name), await seeTab(browser, BUILDS[1], viewport, name)]
      expect(v1.size[0], 'Task Manager runs off the screen').toBeLessThanOrEqual(viewport.width)
      expect(v1, name).toEqual(v2)
    }
  })
}

test('Task Manager is finger-sized on a phone, in both builds', async ({ browser }) => {
  for (const build of BUILDS) {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true })
    const page = await context.newPage()
    await boot(page, build.url)
    await openTaskManager(page)
    const small = await manager(page)
      .locator('[role="tab"], [data-tm-process] button')
      .evaluateAll((all) => all.filter((el) => el.getBoundingClientRect().height < 44).length)
    expect(small, build.name).toBe(0)
    // Nothing runs off the side of the screen.
    const overflow = await manager(page).locator('[data-task-manager]').evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(overflow, build.name).toBeLessThanOrEqual(0)
    await context.close()
  }
})
