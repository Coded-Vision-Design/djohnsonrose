import { readFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'

// Every place that lists apps, in both builds, checked against data/apps.json
// so that a hand-written list cannot creep back in. v1 needs the PHP server
// (V1_URL) and v2 the Vite dev server, which exposes the store.

interface App {
  id: string
  title: string
  icon: string
}

const manifest = JSON.parse(
  readFileSync(new URL('../../data/apps.json', import.meta.url), 'utf8'),
) as { startPinned: string[]; apps: App[] }

const portfolio = JSON.parse(
  readFileSync(new URL('../../data/portfolio.json', import.meta.url), 'utf8'),
) as { education: { title: string; issuer: string }[] }

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

const DESKTOP = 'C:\\Users\\DeVante\\Desktop'
const appById = (id: string) => manifest.apps.find((app) => app.id === id) as App

async function boot(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForShell(page)
}

const waitForShell = (page: Page) =>
  page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })

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

/** What is on screen for an attribute, and whether each icon really drew. */
const entries = (page: Page, attr: string) =>
  page.evaluate(
    (name) =>
      [...document.querySelectorAll<HTMLElement>(`[${name}]`)]
        .filter((el) => el.offsetParent !== null)
        .map((el) => {
          const img = el.querySelector('img')
          return {
            id: el.getAttribute(name) as string,
            text: el.innerText.trim(),
            title: el.title,
            icon: img?.src.split('/assets/img/').pop() ?? null,
            drawn: !!img && img.complete && img.naturalWidth > 0,
          }
        }),
    attr,
  )

const undrawn = async (page: Page, attr: string) =>
  (await entries(page, attr)).filter((entry) => !entry.drawn).map((entry) => entry.id)

const searchBox = (page: Page) => page.getByPlaceholder('Search for apps, settings, and documents')

async function openStart(page: Page) {
  await page.locator('.os-taskbar-apps button').first().click()
  await expect(searchBox(page)).toBeVisible()
}

for (const build of BUILDS) {
  test.describe(build.name, () => {
    test('Start shows the shared pins, in order', async ({ page }) => {
      await boot(page, build.url)
      await openStart(page)
      await expect.poll(() => undrawn(page, 'data-pinned-app')).toEqual([])

      const tiles = await entries(page, 'data-pinned-app')
      expect(tiles.map((tile) => tile.id)).toEqual(manifest.startPinned)
      for (const tile of tiles) {
        expect(tile.text, tile.id).toBe(appById(tile.id).title)
        expect(tile.icon, tile.id).toBe(appById(tile.id).icon)
      }
    })

    test('All apps lists every app, in order', async ({ page }) => {
      await boot(page, build.url)
      await openStart(page)
      await page.getByRole('button', { name: /All apps/ }).click()
      await expect.poll(() => undrawn(page, 'data-all-app')).toEqual([])

      const rows = await entries(page, 'data-all-app')
      const sorted = [...manifest.apps].sort((a, b) => a.title.localeCompare(b.title))
      expect(rows.map((row) => row.id)).toEqual(sorted.map((app) => app.id))
      for (const row of rows) {
        expect(row.text, row.id).toBe(appById(row.id).title)
        expect(row.icon, row.id).toBe(appById(row.id).icon)
      }
    })

    test('the taskbar shows the real icon and name of every app', async ({ page }) => {
      await boot(page, build.url)
      for (const app of manifest.apps) await call(page, 'openApp', app.id)

      const all = manifest.apps.map((app) => app.id).sort()
      await expect
        .poll(async () => (await entries(page, 'data-taskbar-app')).map((entry) => entry.id).sort())
        .toEqual(all)
      await expect.poll(() => undrawn(page, 'data-taskbar-app')).toEqual([])

      for (const button of await entries(page, 'data-taskbar-app')) {
        expect(button.title, button.id).toBe(appById(button.id).title)
        expect(button.icon, button.id).toBe(appById(button.id).icon)
        expect(button.text, `${button.id} has a letter instead of an icon`).toBe('')
      }
    })

    test('Start search finds an app that is not pinned, and opens it', async ({ page }) => {
      await boot(page, build.url)
      await openStart(page)
      await searchBox(page).fill('paint')
      await expect.poll(() => undrawn(page, 'data-search-app')).toEqual([])

      const [result, ...rest] = await entries(page, 'data-search-app')
      expect(rest).toEqual([])
      expect(result).toMatchObject({ id: 'paint', icon: appById('paint').icon })
      await page.locator('[data-search-app="paint"]').click()
      await expect(page.getByRole('dialog', { name: 'Paint', exact: true })).toBeVisible()
    })

    test('Start search lists an app with a desktop shortcut once', async ({ page }) => {
      await boot(page, build.url)
      await openStart(page)
      await searchBox(page).fill('chrome')
      await expect
        .poll(async () =>
          (await entries(page, 'data-search-app')).filter((row) => row.text.split('\n')[0] === 'Chrome').length,
        )
        .toBe(1)
    })

    test('Start search says nothing for an unknown name', async ({ page }) => {
      await boot(page, build.url)
      await openStart(page)
      await searchBox(page).fill('no such app')
      await expect(page.locator('[data-search-app]')).toHaveCount(0)
    })

    test('Start shows the account name with its accent', async ({ page }) => {
      await boot(page, build.url)
      await openStart(page)
      await expect(
        page.getByText('DeVanté Johnson-Rose', { exact: true }).filter({ visible: true }),
      ).toHaveCount(1)
    })

    test('the desktop GitHub icon opens GitHub', async ({ page }) => {
      await boot(page, build.url)
      const icon = page.locator('[data-desktop-item="GitHub"]')
      await expect(icon).toBeVisible()
      await expect(icon.locator('img')).toHaveAttribute('src', /github\.webp$/)
      // v1 opens on one click and v2 on a double click, as each always has.
      if (build.name === 'v1') await icon.click()
      else await icon.dblclick()
      await expect(page.getByRole('dialog', { name: 'GitHub', exact: true })).toBeVisible()
    })
  })
}

// A window can open with nothing working inside it, so each app gets a fresh
// page: a window opening is not enough, the app itself has to run.
for (const build of BUILDS) {
  test.describe(`${build.name} apps`, () => {
    for (const app of manifest.apps) {
      test(`${app.title} runs without an error`, async ({ page }) => {
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        // Only the host serves this. Dev servers answer with the whole site,
        // which then fails inside PDF Reader's frame.
        await page.route('**/data/cv.pdf', (route) =>
          route.fulfill({ contentType: 'application/pdf', body: '' }),
        )
        await boot(page, build.url)
        await call(page, 'openApp', app.id)
        await expect(page.getByRole('dialog', { name: app.title, exact: true })).toBeVisible()
        await page.waitForTimeout(1000)
        expect(errors).toEqual([])
      })
    }

    test('References turns away a wrong password', async ({ page }) => {
      await boot(page, build.url)
      await call(page, 'openApp', 'references')
      const win = page.getByRole('dialog', { name: 'References', exact: true })
      await win.getByPlaceholder('Password').fill('not the password')
      await expect(win.getByRole('button', { name: 'Unlock' })).toBeEnabled()
      await win.getByRole('button', { name: 'Unlock' }).click()
      await expect(win.getByText('Incorrect password.')).toBeVisible()
    })

    test('Settings lists every qualification', async ({ page }) => {
      await boot(page, build.url)
      await call(page, 'openApp', 'settings')
      const win = page.getByRole('dialog', { name: 'Settings', exact: true })
      await win.getByText('Qualifications', { exact: false }).first().click()
      for (const { title, issuer } of portfolio.education) {
        await expect(win.getByText(title, { exact: true })).toBeVisible()
        await expect(win.getByText(issuer, { exact: true })).toBeVisible()
      }
    })
  })
}

test('every app icon has a picture in it', async ({ page }) => {
  await boot(page, BUILDS[0].url)
  const blank = await page.evaluate(async (icons) => {
    const size = 32
    const flat: string[] = []
    for (const icon of new Set(icons)) {
      const image = new Image()
      image.src = `/assets/img/${icon}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const context = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
      context.drawImage(image, 0, 0, size, size)
      const { data } = context.getImageData(0, 0, size, size)
      const colours = new Map<string, number>()
      let visible = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] <= 32) continue
        visible++
        const colour = `${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`
        colours.set(colour, (colours.get(colour) ?? 0) + 1)
      }
      // Real icons top out near 60% one colour. A blank one is nearer 90%.
      if (Math.max(...colours.values()) / visible > 0.8) flat.push(icon)
    }
    return flat
  }, manifest.apps.map((app) => app.icon))
  expect(blank).toEqual([])
})

// The screenshots of each build should match, tile for tile, at every size.
for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`Start is the same in both builds at ${viewport.width}px`, async ({ browser }) => {
    test.setTimeout(60_000) // Boots both builds.
    const seen = []
    for (const build of BUILDS) {
      const page = await browser.newPage({ viewport })
      await boot(page, build.url)
      await openStart(page)
      await page.evaluate(async () => {
        const panel = document.querySelector('[data-pinned-app]')?.closest('.glass') as Element
        await Promise.allSettled(panel.getAnimations().map((animation) => animation.finished))
      })
      seen.push(
        await page.evaluate(() => {
          const rect = (el: Element) => {
            const { x, y, width, height } = el.getBoundingClientRect()
            return [x, y, width, height].map(Math.round)
          }
          const panel = document.querySelector('[data-pinned-app]')?.closest('.glass') as Element
          const taskbar = document.querySelector('.os-taskbar') as Element
          return {
            panel: rect(panel),
            tiles: [...document.querySelectorAll('[data-pinned-app]')].map(rect),
            background: getComputedStyle(panel).backgroundColor,
            blur: getComputedStyle(panel).backdropFilter,
            taskbar: getComputedStyle(taskbar).backgroundColor,
          }
        }),
      )
      await page.close()
    }
    const [x, , width] = seen[0].panel
    expect(x, 'Start starts off the screen').toBeGreaterThanOrEqual(0)
    expect(x + width, 'Start runs off the screen').toBeLessThanOrEqual(viewport.width)
    expect(seen[0]).toEqual(seen[1])
  })
}

test('both builds show the same desktop icons, in order', async ({ browser }) => {
  const lists: string[][] = []
  for (const build of BUILDS) {
    const page = await browser.newPage()
    await boot(page, build.url)
    await page.locator('[data-desktop-item]').first().waitFor()
    const names = await page
      .locator('[data-desktop-item]')
      .evaluateAll((icons) => icons.map((icon) => icon.getAttribute('data-desktop-item') as string))
    // Each build links to the other, so that one icon differs on purpose.
    lists.push(names.map((name) => (/^(React|PHP) Build$/.test(name) ? 'Other build' : name)))
    await page.close()
  }
  expect(lists[0].length).toBeGreaterThan(0)
  expect(lists[0]).toEqual(lists[1])
})

test('v1 Start search still finds a document that opens in a listed app', async ({ page }) => {
  await boot(page, BUILDS[0].url)
  await openStart(page)
  await searchBox(page).fill('pdf')
  await expect(page.getByText('PDF Reader', { exact: true }).filter({ visible: true })).toHaveCount(1)
  await expect(page.getByText('CV - DeVanté Johnson-Rose.pdf').filter({ visible: true }).first()).toBeVisible()
})

// v2 keeps only what a visitor changed, so new defaults reach everyone. v1 keeps
// a whole copy of the file system after any change, so it has to upgrade it.
test.describe('v1 saved file system', () => {
  const v1 = BUILDS[0].url

  const desktopNames = (page: Page) =>
    page.evaluate((path) => {
      const store = (window as unknown as {
        Alpine: { store: (n: string) => { fileSystem: Record<string, { name: string }[]> } }
      }).Alpine.store('os')
      return store.fileSystem[path].map((item) => item.name)
    }, DESKTOP)

  const reboot = async (page: Page) => {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForShell(page)
  }

  /** Saves the file system as an older visit left it, with one change of theirs. */
  const saveOldCopy = (page: Page) =>
    page.evaluate((path) => {
      const store = (window as unknown as {
        Alpine: { store: (n: string) => { fileSystem: Record<string, { name: string }[]> } }
      }).Alpine.store('os')
      const saved = JSON.parse(JSON.stringify(store.fileSystem)) as Record<string, { name: string }[]>
      saved[path] = saved[path].filter((item) => item.name !== 'GitHub')
      saved[path].unshift({ name: 'my notes.txt' })
      localStorage.setItem('os.fileSystem', JSON.stringify(saved))
      localStorage.removeItem('os.fileSystem.version')
    }, DESKTOP)

  test('gains a new desktop icon and keeps the visitor’s changes', async ({ page }) => {
    await boot(page, v1)
    await saveOldCopy(page)
    await reboot(page)

    const names = await desktopNames(page)
    expect(names).toContain('my notes.txt')
    expect(names.indexOf('GitHub')).toBe(names.indexOf('Recycle Bin') - 1)
    expect(names.filter((name) => name === 'GitHub')).toHaveLength(1)
  })

  test('keeps a new desktop icon deleted once the visitor deletes it', async ({ page }) => {
    await boot(page, v1)
    expect(await desktopNames(page)).toContain('GitHub')

    await page.evaluate((path) => {
      const store = (window as unknown as {
        Alpine: {
          store: (n: string) => {
            fileSystem: Record<string, { name: string }[]>
            saveFileSystem: () => void
          }
        }
      }).Alpine.store('os')
      store.fileSystem[path] = store.fileSystem[path].filter((item) => item.name !== 'GitHub')
      store.saveFileSystem()
    }, DESKTOP)
    await reboot(page)

    expect(await desktopNames(page)).not.toContain('GitHub')
  })

  test('falls back to the defaults when the saved copy is damaged', async ({ page }) => {
    await boot(page, v1)
    await page.evaluate(() => localStorage.setItem('os.fileSystem', '{not json'))
    await reboot(page)

    expect(await desktopNames(page)).toContain('Recycle Bin')
  })
})
