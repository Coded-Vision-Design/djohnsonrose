import { mkdirSync, readFileSync } from 'node:fs'
import { test, expect, type Browser, type Locator, type Page } from '@playwright/test'

// The Terminal and VS Code, run for real in both builds and compared. The rules
// behind them are unit tested beside assets/js/windowing/terminal.js and
// source-viewer.js, in src/windowing/.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

type Build = (typeof BUILDS)[number]

const repoFile = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const profile = JSON.parse(repoFile('data/profile.json')) as { headline: string; location: string }
const achievements = (
  JSON.parse(repoFile('data/filesystem.json')) as Record<string, { name?: string; content?: string }[]>
)['C:\\Users\\DeVante\\Desktop'].find((entry) => entry.name === 'achievements.txt')!.content!

/** The files VS Code lists, read from the shared module itself. */
const SOURCE_FILES = [...repoFile('assets/js/windowing/source-viewer.js').match(/SOURCE_FILES = \[([\s\S]*?)\];/)![1].matchAll(/'([^']+)'/g)].map(
  (m) => m[1],
)
const START = 'assets/js/windowing/windowing.js'
const lineCount = (path: string) => repoFile(path).replace(/\r\n?/g, '\n').split('\n').length

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

const terminal = (page: Page) => dialog(page, 'Terminal')
const prompt = (page: Page) => terminal(page).getByRole('textbox', { name: 'Terminal input' })
const lastOutput = (page: Page) => terminal(page).locator('[data-terminal-output]').last()

async function openTerminal(page: Page) {
  await call(page, 'openApp', 'terminal')
  await expect(prompt(page)).toBeVisible({ timeout: 15_000 })
}

async function run(page: Page, command: string) {
  await prompt(page).fill(command)
  await prompt(page).press('Enter')
}

const vscode = (page: Page) => dialog(page, 'VS Code')
const editor = (page: Page) => vscode(page).locator('[data-vscode-editor]')
const activeTab = (page: Page) => vscode(page).locator('[data-source-tab][data-active]')

async function openVsCode(page: Page) {
  await call(page, 'openApp', 'vscode')
  await expect(editor(page)).toBeVisible({ timeout: 15_000 })
}

/** Opens every folder in the explorer, however deep. */
async function expandAll(page: Page) {
  const closed = vscode(page).locator('[data-source-folder][aria-expanded="false"]')
  while (await closed.count()) await closed.first().click()
}

const origin = (build: Build) => new URL(build.url).origin

for (const build of BUILDS) {
  test.describe(`${build.name} Terminal`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
      await openTerminal(page)
    })

    test('cv and skills print the shared CV, and say where the full CV is', async ({ page }) => {
      await run(page, 'cv')
      await expect(lastOutput(page)).toContainText(profile.headline)
      await expect(lastOutput(page)).toContainText(profile.location)
      await expect(lastOutput(page)).toContainText('Applications Support Engineer, Killik & Co (Apr 2025 - Present)')
      await expect(lastOutput(page)).toContainText('The full CV is at /cv.')
      await run(page, 'skills')
      await expect(lastOutput(page)).toContainText('Languages and frameworks: HTML, CSS')
    })

    test('Tab completes a folder, then a file, and cat prints it', async ({ page }) => {
      await prompt(page).pressSequentially('cat desk')
      await prompt(page).press('Tab')
      await expect(prompt(page)).toHaveValue('cat Desktop\\')
      await prompt(page).pressSequentially('ach')
      await prompt(page).press('Tab')
      await expect(prompt(page)).toHaveValue('cat Desktop\\achievements.txt')
      await prompt(page).press('Enter')
      await expect(lastOutput(page)).toHaveText(achievements)
    })

    test('Tab cycles through commands and Shift+Tab goes back', async ({ page }) => {
      await prompt(page).pressSequentially('c')
      await prompt(page).press('Tab')
      await expect(prompt(page)).toHaveValue('cat')
      await prompt(page).press('Tab')
      await expect(prompt(page)).toHaveValue('cd')
      await prompt(page).press('Shift+Tab')
      await expect(prompt(page)).toHaveValue('cat')
    })

    test('Tab on an empty line moves on, and Esc clears the line', async ({ page }) => {
      await prompt(page).fill('dir')
      await prompt(page).press('Escape')
      await expect(prompt(page)).toHaveValue('')
      await prompt(page).press('Tab')
      await expect(prompt(page)).not.toBeFocused()
    })

    test('type explains a folder and a missing file', async ({ page }) => {
      await run(page, 'type Documents')
      await expect(lastOutput(page)).toHaveText('Documents is a folder. Type "dir Documents" to list it.')
      await run(page, 'cat nowhere.txt')
      await expect(lastOutput(page)).toHaveText('The system cannot find the file specified: nowhere.txt')
    })

    test('the tour suggests things to try and opens nothing', async ({ page }) => {
      const windows = await page.getByRole('dialog').count()
      for (let step = 1; step <= 4; step++) {
        await run(page, step === 1 ? 'tour' : `tour ${step}`)
        await expect(lastOutput(page)).toContainText(`Step ${step} of 4`)
      }
      await expect(lastOutput(page)).toContainText('/cv')
      await page.waitForTimeout(300)
      expect(await page.getByRole('dialog').count()).toBe(windows)
    })

    test('man devante is a manual page from the shared data, with no GitHub account', async ({ page }) => {
      await run(page, 'man devante')
      for (const heading of ['NAME', 'SYNOPSIS', 'DESCRIPTION', 'EXPERIENCE', 'SKILLS', 'SEE ALSO']) {
        await expect(lastOutput(page)).toContainText(`\n${heading}\n`)
      }
      await expect(lastOutput(page)).toContainText('Desk Side Engineer, Shawbrook Bank')
      await expect(lastOutput(page)).not.toContainText(/github/i)
      await run(page, 'man nothing')
      await expect(lastOutput(page)).toHaveText('No manual entry for nothing')
    })

    test('help lists the new commands', async ({ page }) => {
      await run(page, 'help')
      for (const line of ['cat <file>', 'tour', 'cv', 'skills', 'man <page>', 'Tab']) {
        await expect(lastOutput(page)).toContainText(line)
      }
    })
  })

  test.describe(`${build.name} VS Code`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    test('opens the shared window manager as the site serves it, numbered and coloured', async ({ page }) => {
      await openVsCode(page)
      await expect(activeTab(page)).toHaveAttribute('data-source-tab', START)
      const first = repoFile(START).split('\n')[0].trim()
      await expect(editor(page).locator('.vsc-row').first()).toContainText(first)
      await expect(editor(page).locator('.vsc-row')).toHaveCount(lineCount(START))
      const status = vscode(page).locator('[data-vscode-status]')
      for (const part of ['Read-only', `${lineCount(START)} lines`, 'UTF-8', 'JavaScript']) await expect(status).toContainText(part)
      await expect(editor(page).locator('.tok-keyword').first()).toHaveCSS('color', 'rgb(86, 156, 214)')
      await expect(editor(page).locator('.tok-comment').first()).toHaveCSS('color', 'rgb(106, 153, 85)')
    })

    test('the explorer lists exactly the public source files, and nothing from the server', async ({ page }) => {
      await openVsCode(page)
      await expandAll(page)
      const listed = await vscode(page).locator('[data-source-file]').evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-source-file')),
      )
      expect([...listed].sort()).toEqual([...SOURCE_FILES].sort())
      for (const path of listed) expect(path).not.toMatch(/\.php$|^lib\/|^api\/|\.env|config/)
    })

    test('a file opens in a new tab, and closing it goes back', async ({ page }) => {
      await openVsCode(page)
      await vscode(page).locator('[data-source-folder="assets/css"]').click()
      await vscode(page).locator('[data-source-file="assets/css/windowing.css"]').click()
      await expect(activeTab(page)).toHaveAttribute('data-source-tab', 'assets/css/windowing.css')
      await expect(vscode(page).locator('[data-source-tab]')).toHaveCount(2)
      await expect(editor(page).locator('.vsc-row').first()).toContainText('/* assets/css/windowing.css')
      await expect(vscode(page).locator('[data-vscode-status]')).toContainText('CSS')
      await expect(vscode(page).locator('.vsc-crumbs')).toHaveText('assets › css › windowing.css')
      await vscode(page).getByRole('button', { name: 'Close windowing.css' }).click()
      await expect(vscode(page).locator('[data-source-tab]')).toHaveCount(1)
      await expect(activeTab(page)).toHaveAttribute('data-source-tab', START)
    })

    test('every listed file is already public at this origin, byte for byte', async ({ page }) => {
      for (const path of SOURCE_FILES) {
        const res = await page.request.get(`${origin(build)}/${path}`)
        expect(res.status(), path).toBe(200)
        expect((await res.text()).replace(/\r\n?/g, '\n'), path).toBe(repoFile(path).replace(/\r\n?/g, '\n'))
      }
    })

    test('a file can only ever show as text', async ({ page }) => {
      await page.route('**/data/client_wins.json', (route) =>
        route.fulfill({ contentType: 'application/json', body: '<img src=x onerror="window.__hacked = 1"> & </code>' }),
      )
      await openVsCode(page)
      await vscode(page).locator('[data-source-folder="data"]').click()
      await vscode(page).locator('[data-source-file="data/client_wins.json"]').click()
      await expect(editor(page)).toContainText('<img src=x onerror="window.__hacked = 1"> & </code>')
      await expect(editor(page).locator('img')).toHaveCount(0)
      expect(await page.evaluate(() => (window as unknown as { __hacked?: number }).__hacked)).toBeUndefined()
    })

    test('a file that fails to load says so, and loads on a second try', async ({ page }) => {
      let failed = false
      await page.route('**/data/portfolio.json', async (route) => {
        if (failed || route.request().resourceType() !== 'fetch') return route.continue()
        failed = true
        return route.fulfill({ status: 500, body: '' })
      })
      await openVsCode(page)
      await vscode(page).locator('[data-source-folder="data"]').click()
      await vscode(page).locator('[data-source-file="data/portfolio.json"]').click()
      await expect(vscode(page).getByText('Could not load portfolio.json.')).toBeVisible()
      await vscode(page).getByRole('button', { name: 'Try again' }).click()
      await expect(editor(page).locator('.tok-property').first()).toHaveText('"projects"')
    })

    test('on a phone a picker takes the explorer\'s place, with finger-sized controls', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 740 })
      await openVsCode(page)
      await expect(vscode(page).getByRole('navigation', { name: 'Explorer' })).toBeHidden()
      const picker = vscode(page).getByRole('combobox', { name: 'File' })
      await picker.selectOption('assets/js/windowing/terminal.js')
      await expect(activeTab(page)).toHaveAttribute('data-source-tab', 'assets/js/windowing/terminal.js')
      await expect(editor(page).locator('.vsc-row').first()).toContainText("// The Terminal's commands")
      for (const control of [picker, vscode(page).getByRole('button', { name: 'Close terminal.js' })]) {
        const box = (await control.boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.width).toBeGreaterThanOrEqual(44)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  })
}

/** Opens a page for each build, runs a check on it, and returns what each saw. */
async function inBothBuilds<T>(browser: Browser, viewport: { width: number; height: number }, check: (page: Page) => Promise<T>) {
  const seen: T[] = []
  for (const build of BUILDS) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await boot(page, build.url)
    seen.push(await check(page))
    await context.close()
  }
  return seen
}

/** Where each part sits inside its window, rounded, and what it says. */
const layout = (win: Locator, selectors: string[]) =>
  win.evaluate((root, list) => {
    const frame = root.getBoundingClientRect()
    const place = (el: Element) => {
      const { x, y, width, height } = el.getBoundingClientRect()
      return [x - frame.x, y - frame.y, width, height].map(Math.round)
    }
    return list.map((selector) =>
      [...root.querySelectorAll(selector)]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .slice(0, 12)
        .map((el) => ({ at: place(el), text: (el as HTMLElement).innerText.trim().slice(0, 200), colour: getComputedStyle(el).color })),
    )
  }, selectors)

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 375, height: 740 },
]) {
  test(`VS Code is the same in both builds at ${viewport.width}px`, async ({ browser }) => {
    test.setTimeout(60_000)
    const [v1, v2] = await inBothBuilds(browser, viewport, async (page) => {
      await openVsCode(page)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(400) // Past the window's opening animation.
      return {
        parts: await layout(vscode(page), [
          '.vsc-activity',
          '.vsc-explorer',
          '.vsc-tree-row',
          '.vsc-picker',
          '.vsc-tab',
          '.vsc-crumbs',
          '[data-vscode-editor]',
          '.vsc-row',
          '.tok-keyword',
          '.tok-string',
          '[data-vscode-status]',
        ]),
        code: await editor(page).locator('code').evaluate((el) => el.innerHTML.slice(0, 4000)),
      }
    })
    expect(v1.parts[6].length, 'the editor shows').toBe(1)
    expect(v1).toEqual(v2)
  })

  test(`Terminal is the same in both builds at ${viewport.width}px`, async ({ browser }) => {
    test.setTimeout(60_000)
    const commands = ['help', 'cv', 'skills', 'tour', 'man devante', 'man cat', 'cat Desktop\\achievements.txt', 'type Documents']
    const [v1, v2] = await inBothBuilds(browser, viewport, async (page) => {
      await openTerminal(page)
      for (const command of commands) await run(page, command)
      await expect(terminal(page).locator('[data-terminal-output]')).toHaveCount(commands.length)
      const outputs = await terminal(page).locator('[data-terminal-output]').allInnerTexts()
      await run(page, 'cls')
      await prompt(page).pressSequentially('cd doc')
      await prompt(page).press('Tab')
      return {
        outputs,
        completed: await prompt(page).inputValue(),
        parts: await layout(terminal(page), ['input', '.text-green-400']),
      }
    })
    expect(v1.completed).toBe('cd Documents\\')
    expect(v1).toEqual(v2)
  })
}

// Pictures of both apps in both builds, for a person to look at. Set SHOT_DIR to take them.
test('screenshots of the Terminal and VS Code', async ({ browser }) => {
  test.skip(!process.env.SHOT_DIR, 'set SHOT_DIR to take screenshots')
  test.setTimeout(120_000)
  const dir = process.env.SHOT_DIR as string
  mkdirSync(dir, { recursive: true })
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 375, height: 740 },
  ]) {
    for (const build of BUILDS) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      await boot(page, build.url)
      await openVsCode(page)
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${dir}/vscode-${build.name}-${viewport.width}.png` })
      await openTerminal(page)
      await run(page, 'tour')
      await run(page, 'cv')
      await prompt(page).pressSequentially('cat desk')
      await prompt(page).press('Tab')
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${dir}/terminal-${build.name}-${viewport.width}.png` })
      await context.close()
    }
  }
})
