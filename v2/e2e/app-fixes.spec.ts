import { readFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'

// Apps fixed after the review, run for real in both builds. The rules behind
// them are unit tested next to the shared modules in src/windowing/.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

type Build = (typeof BUILDS)[number]

const portfolio = JSON.parse(
  readFileSync(new URL('../../data/portfolio.json', import.meta.url), 'utf8'),
) as { projects: { title: string; url: string; featured?: boolean; tags?: string[] }[] }

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
  await page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })
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

const dialog = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true })

for (const build of BUILDS) {
  test.describe(`${build.name} Calculator`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
      await call(page, 'openApp', 'calculator')
      await expect(dialog(page, 'Calculator').getByRole('button', { name: 'Equals' })).toBeVisible({ timeout: 15_000 })
    })

    const display = (page: Page) => dialog(page, 'Calculator').locator('[data-calc-display]')
    const press = async (page: Page, ...names: string[]) => {
      for (const name of names) await dialog(page, 'Calculator').getByRole('button', { name, exact: true }).click()
    }

    test('a second operator replaces the first: 5 + × 3 = 15', async ({ page }) => {
      await press(page, 'Five', 'Plus', 'Multiply by', 'Three', 'Equals')
      await expect(display(page)).toHaveText('15')
    })

    test('Enter after clicking keys works the sum out', async ({ page }) => {
      await press(page, 'Seven', 'Plus', 'One')
      await page.keyboard.press('Enter')
      await expect(display(page)).toHaveText('8')
    })

    test('typed keys follow Windows: 0.1 + 0.2 = 0.3 and 200 + 10 % = 220', async ({ page }) => {
      await press(page, 'Clear')
      await page.keyboard.type('0.1+0.2')
      await page.keyboard.press('Enter')
      await expect(display(page)).toHaveText('0.3')
      await page.keyboard.press('Escape')
      await page.keyboard.type('200+10%')
      await page.keyboard.press('Enter')
      await expect(display(page)).toHaveText('220')
    })

    test('dividing by zero shows the Windows message, which an operator keeps and Backspace clears', async ({ page }) => {
      await press(page, 'Five', 'Divide by', 'Zero', 'Equals')
      await expect(display(page)).toHaveText('Cannot divide by zero')
      await press(page, 'Plus')
      await expect(display(page)).toHaveText('Cannot divide by zero')
      await page.keyboard.press('Backspace')
      await expect(display(page)).toHaveText('0')
      await press(page, 'Zero', 'Reciprocal')
      await expect(display(page)).toHaveText('Cannot divide by zero')
    })

    test('-5 then Backspace leaves 0', async ({ page }) => {
      await press(page, 'Five', 'Positive negative')
      await expect(display(page)).toHaveText('-5')
      await page.keyboard.press('Backspace')
      await expect(display(page)).toHaveText('0')
    })

    test('digits typed while another window has focus do not reach it', async ({ page }) => {
      await press(page, 'Four')
      await call(page, 'openApp', 'taskmanager')
      await expect(dialog(page, 'Task Manager')).toBeVisible()
      await page.keyboard.type('99')
      await expect(display(page)).toHaveText('4')
    })
  })
}

for (const build of BUILDS) {
  test.describe(`${build.name} Terminal`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
      await call(page, 'openApp', 'terminal')
      await expect(input(page)).toBeVisible({ timeout: 15_000 })
    })

    const terminal = (page: Page) => dialog(page, 'Terminal')
    const input = (page: Page) => terminal(page).getByRole('textbox')
    const typeCommand = async (page: Page, command: string) => {
      await input(page).fill(command)
      await input(page).press('Enter')
    }
    const lastOutput = (page: Page) => terminal(page).locator('[data-terminal-output]').last()

    test('cd .. from C:\\Users reaches C:\\, and quoted paths with spaces work', async ({ page }) => {
      await typeCommand(page, 'cd ..')
      await typeCommand(page, 'cd ..')
      await expect(terminal(page).getByText('PS C:\\>', { exact: true }).last()).toBeVisible()
      await typeCommand(page, 'cd "Program Files"')
      await expect(terminal(page).getByText('PS C:\\Program Files>', { exact: true }).last()).toBeVisible()
    })

    test('ver, dir, projects and contact tell the truth', async ({ page }) => {
      await typeCommand(page, 'ver')
      await expect(lastOutput(page)).toHaveText(/Version 10\.0\.26200\./)
      await typeCommand(page, 'dir')
      await expect(lastOutput(page)).toContainText('Directory of C:\\Users\\DeVante')
      await expect(lastOutput(page)).not.toContainText('01/02/2026')
      await typeCommand(page, 'projects')
      for (const project of portfolio.projects) await expect(lastOutput(page)).toContainText(project.title)
      await typeCommand(page, 'contact')
      await expect(lastOutput(page)).toContainText('github.com/CodedVisionDesign')
    })

    test('the tab close button closes the Terminal', async ({ page }) => {
      await terminal(page).getByRole('button', { name: 'Close tab' }).click()
      await expect(terminal(page)).toHaveCount(0)
    })
  })
}

/** Opens an app with extra data, which v1 takes as the third argument and v2 inside options. */
const openWith = (page: Page, build: Build, app: string, title: string | null, extra: object) =>
  build.name === 'v1'
    ? call(page, 'openApp', app, title, extra)
    : call(page, 'openApp', app, title ?? undefined, { extra })

const featured = portfolio.projects.filter((project) => project.featured)

for (const build of BUILDS) {
  test.describe(`${build.name} Chrome`, () => {
    test.beforeEach(async ({ page }) => {
      // Never leave the test machine for a project's real site.
      await page.context().route(/^https:\/\/(?!localhost)[^/]*\.(co\.uk|com|co\.za)\//, (route) =>
        route.fulfill({ contentType: 'text/html', body: '<title>site</title>' }),
      )
      await boot(page, build.url)
    })

    const chrome = (page: Page) => page.locator('.os-window').filter({ has: page.locator('[data-chrome]') })
    const address = (page: Page) => chrome(page).getByRole('textbox', { name: 'Address bar' })

    test('shows the featured projects from data/portfolio.json', async ({ page }) => {
      await call(page, 'openApp', 'edge')
      const titles = chrome(page).locator('[data-project-title]')
      await expect(titles).toHaveText(featured.map((project) => project.title), { timeout: 15_000 })
    })

    test('a keystroke keeps the projects, and Enter loads the address', async ({ page }) => {
      await call(page, 'openApp', 'edge')
      await expect(chrome(page).locator('[data-project-title]').first()).toBeVisible({ timeout: 15_000 })
      await address(page).click()
      await page.keyboard.type('earthecho.co.uk')
      await expect(chrome(page).locator('[data-project-title]').first()).toBeVisible()
      await page.keyboard.press('Enter')
      const open = chrome(page).getByRole('link', { name: 'Open earthecho.co.uk in a new tab' })
      await expect(open).toHaveAttribute('href', 'https://earthecho.co.uk')
      await expect(open).toHaveAttribute('target', '_blank')
      await chrome(page).getByRole('button', { name: 'Go back', exact: true }).click()
      await expect(chrome(page).locator('[data-project-title]').first()).toBeVisible()
    })

    test('Visit Site on a project opens the real site in a new tab', async ({ page }) => {
      await call(page, 'openApp', 'edge')
      const first = featured[0]
      const visit = chrome(page).getByRole('link', { name: `Visit ${first.title}` })
      await expect(visit).toHaveAttribute('href', first.url, { timeout: 15_000 })
      const popup = page.waitForEvent('popup')
      await visit.click()
      expect((await popup).url()).toBe(first.url)
    })

    test('a Visit Site.url file opens the project in a new tab', async ({ page }) => {
      const folder = 'C:\\Users\\DeVante\\Projects\\Freelance\\Earth Echo'
      await openWith(page, build, 'explorer', 'Earth Echo', { initialPath: folder })
      const file = page.locator('[data-explorer-file="Visit Site.url"]')
      await expect(file).toBeVisible({ timeout: 15_000 })
      const popup = page.waitForEvent('popup')
      await file.dblclick()
      expect((await popup).url()).toBe('https://earthecho.co.uk/')
      await expect(chrome(page).getByRole('link', { name: 'Open earthecho.co.uk in a new tab' })).toBeVisible()
    })
  })
}

test('v2 Chrome copes with a project that has no tags', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/data/portfolio.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        projects: [
          { id: 1, title: 'No Tags Ltd', featured: true, description: 'x', url: 'https://example.com/', thumbnail: 'portfolio/baymotors.webp' },
        ],
      }),
    }),
  )
  await boot(page, BUILDS[1].url)
  await call(page, 'openApp', 'edge')
  await expect(page.locator('[data-project-title]')).toHaveText(['No Tags Ltd'], { timeout: 15_000 })
  expect(errors).toEqual([])
})

const devtools = JSON.parse(readFileSync(new URL('../../data/devtools.json', import.meta.url), 'utf8')) as {
  docker: { containers: { name: string }[] }
  filezilla: { localPath: string; local: { name: string }[] }
}

const CV_ROWS: Record<string, object[]> = {
  experience: [{ id: 1, role: 'Engineer', company: 'Example Ltd', period: '2024', location: 'UK', highlights: 'Built things' }],
  projects: [{ id: 7, title: 'Slow Or Fast Ltd', description: 'x', tags: 'React', url: 'https://example.com/', location: 'UK', country: 'gb' }],
  skills: [
    { id: 1, category: 'languages', name: 'C*' },
    { id: 2, category: 'languages', name: 'Cobol' },
  ],
}

/** Serves CV tables, holding back the ones named in `slow`. */
const serveCv = (page: Page, slow: string[] = []) =>
  page.route('**/api/cv_data.php?*', async (route) => {
    const table = new URL(route.request().url()).searchParams.get('table') ?? ''
    if (slow.includes(table)) await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: CV_ROWS[table] ?? [] }) })
  })

for (const build of BUILDS) {
  test.describe(`${build.name} SQL Server Management Studio`, () => {
    const ssms = (page: Page) => page.locator('.os-window').filter({ has: page.locator('[data-ssms]') })
    const editor = (page: Page) => ssms(page).getByRole('textbox', { name: 'SQL query editor' })
    const run = async (page: Page, sql: string) => {
      await editor(page).fill(sql)
      await editor(page).press('Control+Enter')
    }

    test('the newest query wins, even when an older one answers last', async ({ page }) => {
      await serveCv(page, ['experience'])
      await boot(page, build.url)
      await call(page, 'openApp', 'database')
      await expect(editor(page)).toBeVisible({ timeout: 15_000 })
      await expect(ssms(page).getByRole('cell', { name: 'Engineer' })).toBeVisible({ timeout: 10_000 })
      await run(page, 'SELECT * FROM experience')
      await run(page, 'SELECT title FROM projects')
      await expect(ssms(page).getByRole('cell', { name: 'Slow Or Fast Ltd' })).toBeVisible()
      await page.waitForTimeout(2000)
      await expect(ssms(page).getByRole('cell', { name: 'Slow Or Fast Ltd' })).toBeVisible()
      await expect(ssms(page).getByRole('cell', { name: 'Engineer' })).toHaveCount(0)
    })

    test('LIKE takes * as a plain character', async ({ page }) => {
      await serveCv(page)
      await boot(page, build.url)
      await call(page, 'openApp', 'database')
      await expect(editor(page)).toBeVisible({ timeout: 15_000 })
      await run(page, "SELECT name FROM skills WHERE name LIKE 'C*'")
      await expect(ssms(page).getByRole('cell', { name: 'C*', exact: true })).toBeVisible()
      await expect(ssms(page).getByRole('cell', { name: 'Cobol' })).toHaveCount(0)
    })

    test('on a phone the Object Explorer folds away and leaves room for results', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 740 })
      await serveCv(page)
      await boot(page, build.url)
      await call(page, 'openApp', 'database')
      await expect(editor(page)).toBeVisible({ timeout: 15_000 })
      const tables = ssms(page).getByRole('button', { name: 'dbo.Projects' })
      await expect(tables).toBeHidden()
      expect((await editor(page).boundingBox())!.width).toBeGreaterThan(300)
      await ssms(page).getByRole('button', { name: 'Object Explorer', exact: true }).click()
      await tables.click()
      await expect(tables).toBeHidden()
      await expect(ssms(page).getByRole('cell', { name: 'Slow Or Fast Ltd' })).toBeVisible()
    })
  })

  test.describe(`${build.name} VS Code and Docker on a phone`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 740 })
      await boot(page, build.url)
    })

    test('VS Code has a project picker, and picking stays on the editor', async ({ page }) => {
      await call(page, 'openApp', 'vscode')
      const picker = page.getByRole('combobox', { name: 'Project' })
      await expect(picker).toBeVisible({ timeout: 15_000 })
      const other = portfolio.projects[1].title
      await picker.selectOption({ label: other })
      await expect(page.locator('.os-window h2', { hasText: other })).toBeVisible()
      await expect(page.locator('.os-window').getByText('Building...')).toHaveCount(0)
    })

    test('Docker folds its sidebar away and lists the shared containers', async ({ page }) => {
      await call(page, 'openApp', 'docker')
      const docker = page.locator('.os-window').filter({ has: page.locator('[data-docker]') })
      await expect(docker.getByText(devtools.docker.containers[0].name, { exact: true })).toBeVisible({ timeout: 15_000 })
      const images = docker.getByRole('button', { name: 'Images' })
      await expect(images).toBeHidden()
      await docker.getByRole('button', { name: 'Navigation' }).click()
      await images.click()
      await expect(docker.getByRole('heading', { name: 'Images' })).toBeVisible()
      await expect(images).toBeHidden()
    })
  })

  test.describe(`${build.name} Docker and FileZilla share their lists`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    test('Docker lists every container in data/devtools.json', async ({ page }) => {
      await call(page, 'openApp', 'docker')
      const docker = page.locator('.os-window').filter({ has: page.locator('[data-docker]') })
      const names = docker.locator('[data-container-name]')
      await expect(names).toHaveText(devtools.docker.containers.map((c) => c.name), { timeout: 15_000 })
    })

    test('FileZilla shows the shared local files at a Windows path', async ({ page }) => {
      await call(page, 'openApp', 'filezilla')
      const fz = page.locator('.os-window').filter({ has: page.locator('[data-filezilla]') })
      await expect(fz.getByText(devtools.filezilla.localPath, { exact: true })).toBeVisible({ timeout: 15_000 })
      await expect(fz.getByText('/Applications/XAMPP')).toHaveCount(0)
      await expect(fz.locator('[data-local-file]')).toHaveText(devtools.filezilla.local.map((f) => f.name))
    })
  })
}

// Google sign-in and Chart.js stand-ins, so Admin Console runs without the network.
const GIS_STUB = `window.google = { accounts: { id: {
  initialize() {},
  disableAutoSelect() {},
  renderButton(el) { el.innerHTML = '<button type="button">Sign in with Google</button>' },
} } }`
const CHART_STUB = 'window.chartsDrawn = 0; window.Chart = class { constructor() { window.chartsDrawn++ } destroy() {} }'

const STATS = {
  generated_at: '2026-11-06T12:00:00Z',
  total_events: 3,
  enquiries_count: 0,
  source: { lifetime: [{ source: 'php', total: 3 }], last_30d: [{ source: 'php', total: 3 }] },
  per_app: [{ app: 'notepad', total: 2 }],
  os: [{ os: 'Windows', total: 3 }],
  browser: [{ browser: 'Chrome', total: 3 }],
  country: [{ country: 'United Kingdom', total: 3 }],
  per_day: [{ day: '2026-11-05', source: 'php', sessions: 2 }],
  screen_time: [],
  enquiries: [],
}

/** Serves the admin endpoints: `me` answers each call in turn, then repeats the last. */
async function stubAdmin(page: Page, me: object[], stats: { status: number; body?: object }) {
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: GIS_STUB }),
  )
  await page.route('https://cdn.jsdelivr.net/npm/chart.js@*/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: CHART_STUB }),
  )
  let call = 0
  await page.route('**/api/admin_me.php', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(me[Math.min(call++, me.length - 1)]) }),
  )
  await page.route('**/api/stats.php', (route) =>
    route.fulfill({ status: stats.status, contentType: 'application/json', body: JSON.stringify(stats.body ?? { error: 'x' }) }),
  )
}

const SIGNED_IN = { authenticated: true, email: 'admin@example.com' }
const SIGNED_OUT = { authenticated: false, client_id: 'test-client.apps.googleusercontent.com' }

for (const build of BUILDS) {
  test.describe(`${build.name} Admin Console`, () => {
    const admin = (page: Page) => page.getByRole('dialog', { name: 'Admin Console', exact: true })

    test('shows the Google button on the first open', async ({ page }) => {
      await stubAdmin(page, [SIGNED_OUT], { status: 401 })
      await boot(page, build.url)
      await call(page, 'openApp', 'admin')
      await expect(admin(page).getByRole('button', { name: 'Sign in with Google' })).toBeVisible({ timeout: 15_000 })
    })

    test('an expired session brings the sign-in button back, not a false error', async ({ page }) => {
      await stubAdmin(page, [SIGNED_IN, SIGNED_OUT], { status: 401 })
      await boot(page, build.url)
      await call(page, 'openApp', 'admin')
      await expect(admin(page).getByRole('button', { name: 'Sign in with Google' })).toBeVisible({ timeout: 15_000 })
      await expect(admin(page).getByText("isn't configured")).toHaveCount(0)
    })

    test('says when the stats cannot be loaded', async ({ page }) => {
      await stubAdmin(page, [SIGNED_IN], { status: 500 })
      await boot(page, build.url)
      await call(page, 'openApp', 'admin')
      await expect(admin(page).getByRole('alert')).toContainText('Could not load the stats', { timeout: 15_000 })
    })

    if (build.name === 'v1') {
      test('draws the charts on the first open', async ({ page }) => {
        await stubAdmin(page, [SIGNED_IN], { status: 200, body: STATS })
        await boot(page, build.url)
        await call(page, 'openApp', 'admin')
        await expect(admin(page).getByText('Signed in as admin@example.com')).toBeVisible({ timeout: 15_000 })
        await expect.poll(() => page.evaluate(() => (window as unknown as { chartsDrawn?: number }).chartsDrawn ?? 0)).toBeGreaterThan(0)
      })
    }
  })

  test.describe(`${build.name} References`, () => {
    const LETTERS = [{ from: 'A Manager', role: 'Head of IT', company: 'Example Ltd', body: 'Recommended.' }]
    const references = (page: Page) => page.getByRole('dialog', { name: 'References', exact: true })
    const signOut = (page: Page) =>
      page.evaluate(() => {
        const w = window as unknown as {
          Alpine?: { $data: (el: Element) => { logout: () => void } }
          __osStore?: { getState: () => { logout: () => void } }
        }
        if (w.Alpine) w.Alpine.$data(document.querySelector('[x-data="os"]')!).logout()
        else w.__osStore!.getState().logout()
      })

    test('signing out of the OS forgets the opened letters', async ({ page }) => {
      await boot(page, build.url)
      await page.evaluate((letters) => sessionStorage.setItem('references.session', letters), JSON.stringify(LETTERS))
      await call(page, 'openApp', 'references')
      await expect(references(page).getByRole('heading', { name: 'A Manager' })).toBeVisible({ timeout: 15_000 })
      await signOut(page)
      expect(await page.evaluate(() => sessionStorage.getItem('references.session'))).toBeNull()
    })

    test('an empty vault shows a message, not an error', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await boot(page, build.url)
      await page.evaluate(() => sessionStorage.setItem('references.session', '[]'))
      await call(page, 'openApp', 'references')
      await expect(references(page).locator('[data-references-empty]')).toBeVisible({ timeout: 15_000 })
      expect(errors).toEqual([])
    })
  })
}

for (const build of BUILDS) {
  test(`${build.name} weather calls moderate rain Rain, not Cloudy`, async ({ page }) => {
    await page.route('**/api/weather.php*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ current_weather: { temperature: 11.6, weathercode: 63 }, city: 'Ipswich' }),
      }),
    )
    await boot(page, build.url)
    // The taskbar shows it; the closed widgets panel holds a hidden copy.
    await expect(page.getByText('12°C').filter({ visible: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Rain', { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByText('Cloudy', { exact: true })).toHaveCount(0)
  })
}

for (const build of BUILDS) {
  test.describe(`${build.name} Explorer`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    const file = (page: Page, name: string) => page.locator(`[data-explorer-file="${name}"]`)
    const EMOJI = /\p{Extended_Pictographic}/u

    test('Downloads opens, as every folder now has an entry', async ({ page }) => {
      await openWith(page, build, 'explorer', 'DeVante', { initialPath: 'C:\\Users\\DeVante' })
      await expect(file(page, 'Downloads')).toBeVisible({ timeout: 15_000 })
      await file(page, 'Downloads').dblclick()
      await expect(file(page, 'Documents')).toHaveCount(0)
      await expect(page.locator('[data-explorer-pane] [data-explorer-file]')).toHaveCount(0)
    })

    test('files show Windows pictures, never emoji', async ({ page }) => {
      await openWith(page, build, 'explorer', 'Media', { initialPath: 'C:\\Windows\\Media' })
      const sound = file(page, 'Windows Error.wav')
      await expect(sound).toBeVisible({ timeout: 15_000 })
      const items = page.locator('[data-explorer-pane] [data-explorer-file]')
      for (const item of await items.all()) {
        expect(await item.innerText()).not.toMatch(EMOJI)
        await expect(item.locator('img').first()).toHaveJSProperty('complete', true)
        expect(await item.locator('img').first().evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
      }
    })
  })
}

for (const build of BUILDS) {
  test.describe(`${build.name} Photos`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    const photos = (page: Page) => page.locator('.os-window').filter({ has: page.locator('[data-photos]') })

    test('shows the portfolio screenshots and the competition photos together', async ({ page }) => {
      await call(page, 'openApp', 'photos')
      const strip = photos(page).locator('[data-filmstrip-photo]')
      await expect(strip.first()).toBeVisible({ timeout: 15_000 })
      const names = await strip.evaluateAll((items) => items.map((item) => item.getAttribute('data-filmstrip-photo')))
      expect(names).toContain('baymotors.webp')
      expect(names).toContain('AJP Grand Slam 2024.webp')
    })

    test('an arrow key moves one picture on, and a picture opened from Explorer is shown', async ({ page }) => {
      await openWith(page, build, 'explorer', 'Pictures', { initialPath: 'C:\\Users\\DeVante\\Pictures' })
      const picture = page.locator('[data-explorer-file="IBJJF World Championships 2022.webp"]')
      await expect(picture).toBeVisible({ timeout: 15_000 })
      await picture.dblclick()
      const name = photos(page).locator('[data-photo-name]')
      await expect(name).toHaveText('IBJJF World Championships 2022.webp', { timeout: 15_000 })
      const strip = await photos(page).locator('[data-filmstrip-photo]').evaluateAll((items) =>
        items.map((item) => item.getAttribute('data-filmstrip-photo')),
      )
      const at = strip.indexOf('IBJJF World Championships 2022.webp')
      await page.keyboard.press('ArrowRight')
      await expect(name).toHaveText(strip[(at + 1) % strip.length] as string)
    })
  })
}

for (const build of BUILDS) {
  test(`${build.name} Task Manager shows pictures, never emoji`, async ({ page }) => {
    await boot(page, build.url)
    await call(page, 'openApp', 'calculator')
    await call(page, 'openApp', 'taskmanager')
    const manager = page.getByRole('dialog', { name: 'Task Manager', exact: true })
    await expect(manager.getByText('Calculator', { exact: true })).toBeVisible({ timeout: 15_000 })
    expect(await manager.innerText()).not.toMatch(/\p{Extended_Pictographic}/u)
    const images = manager.locator('img')
    expect(await images.count()).toBeGreaterThan(1)
    await expect
      .poll(() => images.evaluateAll((all) => all.every((img) => (img as HTMLImageElement).naturalWidth > 0)))
      .toBe(true)
  })
}

// The test browser cannot play H.264, so the clip is served as the WebM copy.
const WEBM = new URL('../../data/south-africa-25.webm', import.meta.url)

for (const build of BUILDS) {
  test.describe(`${build.name} Video`, () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/data/south-africa-25.mp4', (route) =>
        route.fulfill({ contentType: 'video/webm', body: readFileSync(WEBM) }),
      )
      await boot(page, build.url)
    })

    const player = (page: Page) => page.locator('.os-window video')

    test('waits for a click to play, then plays', async ({ page }) => {
      await openWith(page, build, 'video', 'South Africa 25.mp4', { videoUrl: 'data/south-africa-25.mp4' })
      await expect(player(page)).toHaveCount(1, { timeout: 15_000 })
      await page.waitForTimeout(1000)
      expect(await player(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
      await page.locator('.os-window').getByRole('button', { name: 'Play', exact: true }).first().click()
      await expect.poll(() => player(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(false)
    })

    test('the seek bar moves the clip without an error', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      // A routed file cannot really be seeked, so record where the player was sent.
      await page.evaluate(() => {
        const time = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')!
        Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
          configurable: true,
          get() {
            return time.get!.call(this)
          },
          set(value: number) {
            ;(window as unknown as { seekedTo: number }).seekedTo = value
            time.set!.call(this, value)
          },
        })
      })
      await openWith(page, build, 'video', 'South Africa 25.mp4', { videoUrl: 'data/south-africa-25.mp4' })
      await expect
        .poll(() => player(page).evaluate((v: HTMLVideoElement) => v.duration || 0), { timeout: 15_000 })
        .toBeGreaterThan(1)
      const bar = page.locator('.os-window [data-seek-bar]')
      const box = await bar.boundingBox()
      if (!box) throw new Error('no seek bar')
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      const duration = await player(page).evaluate((v: HTMLVideoElement) => v.duration)
      await expect
        .poll(() => page.evaluate(() => (window as unknown as { seekedTo?: number }).seekedTo ?? 0))
        .toBeCloseTo(duration / 2, 0)
      expect(errors).toEqual([])
    })
  })

  test.describe(`${build.name} PDF Reader`, () => {
    test.beforeEach(async ({ page }) => {
      // Only the host serves the CV. Dev servers answer with the whole site.
      await page.route('**/data/cv.pdf', (route) => route.fulfill({ contentType: 'application/pdf', body: '' }))
    })

    const reader = (page: Page) => page.locator('.os-window').filter({ has: page.locator('[data-pdf-reader]') })
    const prompt = (page: Page) => reader(page).locator('[data-pdf-prompt]')

    test('on a phone, offers to open or download the CV instead of a blank frame', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 740 })
      await boot(page, build.url)
      await call(page, 'openApp', 'pdfreader')
      await expect(prompt(page)).toBeVisible({ timeout: 15_000 })
      const open = prompt(page).getByRole('link', { name: 'Open the CV' })
      await expect(open).toHaveAttribute('href', /data\/cv\.pdf$/)
      await expect(open).toHaveAttribute('target', '_blank')
      await expect(prompt(page).getByRole('link', { name: 'Download' })).toHaveAttribute('download', /.*/)
      await expect(reader(page).locator('iframe')).toBeHidden()
    })

    test('on a desktop with a PDF viewer, shows the CV in the frame', async ({ page }) => {
      // Headless Chromium has no PDF viewer, so play a desktop browser that has one.
      await page.addInitScript(() => Object.defineProperty(navigator, 'pdfViewerEnabled', { get: () => true }))
      await boot(page, build.url)
      await call(page, 'openApp', 'pdfreader')
      await expect(reader(page).locator('iframe')).toBeVisible({ timeout: 15_000 })
      await expect(prompt(page)).toBeHidden()
    })

    test('a browser with no PDF viewer gets the prompt at any width', async ({ page }) => {
      await page.addInitScript(() => Object.defineProperty(navigator, 'pdfViewerEnabled', { get: () => false }))
      await boot(page, build.url)
      await call(page, 'openApp', 'pdfreader')
      await expect(prompt(page)).toBeVisible({ timeout: 15_000 })
      await expect(reader(page).locator('iframe')).toBeHidden()
    })
  })
}
