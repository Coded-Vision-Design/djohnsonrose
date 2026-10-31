import { test, expect, type Page } from '@playwright/test'

// v1 (PHP + Alpine) regression coverage. These run against the PHP dev server
// rather than Vite: set V1_URL if it is not on the default port.
const V1 = process.env.V1_URL ?? 'http://localhost:8765'

const CV_ROWS = {
  data: [
    { id: 1, role: 'Engineer', company: 'Example Ltd', period: '2024', location: 'UK', highlights: 'Built things' },
    { id: 2, role: 'Developer', company: 'Sample Co', period: '2023', location: 'UK', highlights: 'Shipped things' },
  ],
}

async function signIn(page: Page) {
  await page.goto(V1, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /sign in/i }).first().click({ timeout: 20_000 })
  await expect(page.locator('#windows-layer, main').first()).toBeVisible()
  await page.waitForFunction(() => {
    const os = (window as unknown as { Alpine?: { store: (n: string) => unknown } }).Alpine?.store('os')
    return !!os
  })
  await page.waitForTimeout(3_800)
}

const open = (page: Page, app: string, title: string | null = null, extra: object = {}) =>
  page.evaluate(([a, t, e]) => {
    // @ts-expect-error Alpine is a page global in v1
    Alpine.store('os').openApp(a, t, e)
  }, [app, title, extra] as const)

const win = (page: Page, app: string) =>
  page.evaluate((a) => {
    // @ts-expect-error Alpine is a page global in v1
    const w = Alpine.store('os').windows.find((x) => x.app === a)
    return w ? { title: w.title, width: w.width, height: w.height, imageName: w.imageName } : null
  }, app)

test.describe('v1 window content', () => {
  test('Notepad keeps its textarea while typing', async ({ page }) => {
    await signIn(page)
    await open(page, 'notepad')
    await page.getByText('Click to start typing').click()
    await page.keyboard.type('hello world', { delay: 30 })
    await expect(page.locator('textarea:visible')).toHaveValue('hello world')
  })

  test('moving focus does not overwrite text typed into an opened file', async ({ page }) => {
    await signIn(page)
    await open(page, 'notepad', 'notes.txt', { fileContent: 'original' })
    await page.getByText('original').click()
    await page.keyboard.press('End')
    await page.keyboard.type(' plus edits')
    await open(page, 'calculator')
    await page.waitForTimeout(600)
    // The new window takes focus, so Notepad is back to showing its preview.
    await expect(page.locator('[x-data="notepadApp()"]').first()).toContainText('original plus edits')
  })

  test('opening a second file replaces the first in Notepad', async ({ page }) => {
    await signIn(page)
    await open(page, 'notepad', 'a.txt', { fileContent: 'first file' })
    await expect(page.getByText('first file')).toBeVisible()
    await open(page, 'notepad', 'b.txt', { fileContent: 'second file' })
    await expect(page.getByText('second file')).toBeVisible()
    expect((await win(page, 'notepad'))?.title).toBe('b.txt')
  })

  test('Database runs its query once and shows rows', async ({ page }) => {
    let requests = 0
    await page.route('**/api/cv_data.php*', (route) => {
      requests++
      return route.fulfill({ json: CV_ROWS })
    })
    await signIn(page)
    await open(page, 'database')
    await expect(page.getByText('Example Ltd')).toBeVisible({ timeout: 8_000 })
    await page.waitForTimeout(2_000)
    expect(requests).toBeLessThanOrEqual(2)
  })

  test('Photos next button moves on and stays there', async ({ page }) => {
    await signIn(page)
    await open(page, 'photos')
    await expect.poll(() => win(page, 'photos').then((w) => !!w)).toBe(true)
    const before = await page.evaluate(() => {
      // @ts-expect-error Alpine is a page global in v1
      return Alpine.$data(document.querySelector('[x-data="photosApp()"]')).currentIndex
    })
    await page.locator('[x-data="photosApp()"] button').filter({ has: page.locator('svg') }).last().click()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)
    const after = await page.evaluate(() => {
      // @ts-expect-error Alpine is a page global in v1
      return Alpine.$data(document.querySelector('[x-data="photosApp()"]')).currentIndex
    })
    expect(after).not.toBe(before)
  })

  test('opening another image in an open Photos window shows it', async ({ page }) => {
    await signIn(page)
    const names = await page.evaluate(() => {
      // @ts-expect-error Alpine is a page global in v1
      const fs = Alpine.store('os').fileSystem
      return fs['C:\\Users\\DeVante\\Pictures'].filter((f: { type: string }) => f.type === 'image').map((f: { name: string }) => f.name)
    })
    await open(page, 'photos', names[0], { imageName: names[0] })
    await page.waitForSelector('[x-data="photosApp()"]')
    await open(page, 'photos', names[1], { imageName: names[1] })
    await page.waitForTimeout(400)
    const shown = await page.evaluate(() => {
      // @ts-expect-error Alpine is a page global in v1
      return Alpine.$data(document.querySelector('[x-data="photosApp()"]')).currentImage?.name
    })
    expect(shown).toBe(names[1])
  })

  test('Task Manager is not rebuilt and stops its timers on close', async ({ page }) => {
    await page.addInitScript(() => {
      const live = new Set<number>()
      const set = window.setInterval.bind(window)
      const clear = window.clearInterval.bind(window)
      window.setInterval = ((fn: TimerHandler, ms?: number) => {
        const id = set(fn, ms)
        live.add(id)
        return id
      }) as typeof window.setInterval
      window.clearInterval = ((id?: number) => {
        if (id !== undefined) live.delete(id)
        clear(id)
      }) as typeof window.clearInterval
      ;(window as unknown as { liveTimers: () => number }).liveTimers = () => live.size
    })
    const timers = () => page.evaluate(() => (window as unknown as { liveTimers: () => number }).liveTimers())
    await signIn(page)
    const baseline = await timers()
    await open(page, 'taskmanager')
    const root = page.locator('[x-data="taskManagerApp()"]').first()
    await root.waitFor()
    await root.evaluate((el) => el.setAttribute('data-original', '1'))
    await page.waitForTimeout(2_600)
    await expect(page.locator('[data-original="1"]')).toHaveCount(1)
    await page.evaluate(() => {
      // @ts-expect-error Alpine is a page global in v1
      const os = Alpine.store('os')
      os.closeWindow(os.windows.find((w: { app: string }) => w.app === 'taskmanager').id)
    })
    await page.waitForTimeout(400)
    expect(await timers()).toBe(baseline)
  })

  test('Event Viewer keeps its filter', async ({ page }) => {
    await signIn(page)
    await open(page, 'eventviewer')
    const root = page.locator('[x-data="eventViewerApp()"]').first()
    await root.waitFor()
    await root.evaluate((el) => {
      // @ts-expect-error Alpine is a page global in v1
      Alpine.$data(el).filter = 'Error'
    })
    await open(page, 'calculator')
    await page.waitForTimeout(500)
    const filter = await root.evaluate((el) => {
      // @ts-expect-error Alpine is a page global in v1
      return Alpine.$data(el).filter
    })
    expect(filter).toBe('Error')
  })

  test('Video is not rebuilt when another window opens', async ({ page }) => {
    await signIn(page)
    await open(page, 'video')
    const root = page.locator('[x-data="videoApp()"]').first()
    await root.waitFor()
    await root.evaluate((el) => el.setAttribute('data-original', '1'))
    await open(page, 'calculator')
    await page.waitForTimeout(500)
    await expect(page.locator('[data-original="1"]')).toHaveCount(1)
  })

  test('Settings opens on the requested tab when already open', async ({ page }) => {
    await signIn(page)
    await open(page, 'settings')
    await page.waitForSelector('[x-data="settingsApp()"]')
    await open(page, 'settings', 'Settings', { currentTab: 'personalization' })
    await page.waitForTimeout(300)
    const tab = await page.evaluate(() => {
      // @ts-expect-error Alpine is a page global in v1
      return Alpine.$data(document.querySelector('[x-data="settingsApp()"]')).currentTab
    })
    expect(tab).toBe('personalization')
  })

  test('a failed app load shows an error, not an endless spinner', async ({ page }) => {
    await page.route('**/api/app.php?name=word', (route) => route.fulfill({ status: 500, body: 'boom' }))
    await signIn(page)
    await open(page, 'word')
    await expect(page.getByText(/could not be opened/i)).toBeVisible()
    await expect(page.getByText('boom')).toHaveCount(0)
  })
})

test.describe('v1 Outlook', () => {
  test('asks for an email address before sending', async ({ page }) => {
    await signIn(page)
    await open(page, 'outlook')
    await page.getByRole('button', { name: /^.*Send$/ }).click()
    await expect(page.getByRole('status')).toHaveText(/email address/i)
  })

  test('sends the reply address and reports success inline', async ({ page }) => {
    let posted = ''
    await page.route('**/api/send_email.php', (route) => {
      posted = route.request().postData() ?? ''
      return route.fulfill({ json: { success: true, message: 'Your message has been sent.' } })
    })
    await signIn(page)
    await open(page, 'outlook')
    await page.getByLabel('From').fill('jo@example.com')
    await page.getByRole('button', { name: /^.*Send$/ }).click()
    await expect(page.getByRole('status')).toHaveText('Your message has been sent.')
    expect(posted).toContain('jo@example.com')
    expect(posted).not.toContain('name="recipient"')
  })
})

test.describe('v1 shared app list', () => {
  test('windows use the real title and size', async ({ page }) => {
    await signIn(page)
    await open(page, 'taskmanager')
    await open(page, 'calculator')
    expect((await win(page, 'taskmanager'))?.title).toBe('Task Manager')
    const calculator = await win(page, 'calculator')
    expect(calculator).toMatchObject({ title: 'Calculator', width: 320, height: 480 })
  })
})
