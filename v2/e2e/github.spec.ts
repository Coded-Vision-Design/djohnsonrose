import { readFileSync } from 'node:fs'
import { test, expect, type Browser, type Locator, type Page } from '@playwright/test'

// The GitHub app shows this site's repository with DeVanté as its owner, and
// no GitHub account name or link out to github.com: the owner wants none shown,
// for now. Both builds draw it from data/github.json, and the last checks
// compare them. src/data/githubAccount.test.ts reads the source files too.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const profile = readJson('../../data/profile.json') as { name: string; url: string }
const repository = readJson('../../data/github.json') as {
  repo: string
  latestCommit: { message: string }
  files: { name: string; message: string }[]
  languages: { name: string }[]
}

/**
 * The GitHub account names, and any github.com link but the font a stylesheet
 * cites. The studio's own site, codedvisiondesign.co.uk, is not an account.
 */
const ACCOUNT = [/CodedVisionDesign|Coded-Vision-Design/, /github\.com\/(?!microsoft\/Selawik)/i]
const accountIn = (text: string) => ACCOUNT.flatMap((pattern) => text.match(pattern)?.[0] ?? [])

async function boot(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
    // Anything that tries to leave for another site is recorded, not opened.
    const opened: unknown[] = []
    ;(window as unknown as { opened: unknown[] }).opened = opened
    window.open = (...args: unknown[]) => {
      opened.push(args[0])
      return null
    }
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
      return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
    },
    undefined,
    { timeout: 20_000 },
  )
}

/** Opens GitHub and waits for its own content. A cold dev server can take a while to compile it. */
async function openGitHub(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { openApp: (a: string) => void } }
      __osStore: { getState: () => { openApp: (a: string) => void } }
    }
    const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
    store.openApp('github')
  })
  const win = page.getByRole('dialog', { name: 'GitHub', exact: true })
  await expect(win.locator('[data-github-repo]')).toBeVisible({ timeout: 20_000 })
  return win.locator('.os-window-content')
}

for (const build of BUILDS) {
  test.describe(`${build.name} GitHub`, () => {
    test('shows the repository under DeVanté’s name', async ({ page }) => {
      await boot(page, build.url)
      const app = await openGitHub(page)
      await expect(app.locator('[data-github-owner]')).toHaveText(profile.name)
      await expect(app.locator('[data-github-repo]')).toHaveText(repository.repo)
      await expect(app.locator('[data-github-commit] span').first()).toHaveText(profile.name)
      await expect(app.locator('[data-github-commit]')).toContainText(repository.latestCommit.message)
      await expect(app.locator('[data-github-contributor]')).toHaveText(profile.name)
      expect(await app.locator('[data-github-file]').allInnerTexts()).toEqual(
        repository.files.map((file) => expect.stringContaining(file.name)),
      )
      await expect(app.getByText('README.md', { exact: true }).last()).toBeVisible()
      await expect(app.getByRole('heading', { name: 'Portfolio OS - DeVanté Johnson-Rose' })).toBeVisible()
      await expect(app.locator('[data-github-language]')).toHaveCount(repository.languages.length)
    })

    test('names no GitHub account, and nothing in it leads to github.com', async ({ page }) => {
      await boot(page, build.url)
      const app = await openGitHub(page)
      expect(accountIn(await app.innerHTML())).toEqual([])
      await expect(app.getByText(/open on github|on github/i)).toHaveCount(0)
      // The only links are to this site, and nothing else in it is a control.
      const links = await app.locator('a').evaluateAll((all) => all.map((a) => (a as HTMLAnchorElement).href))
      expect(links.length).toBeGreaterThan(0)
      for (const href of links) expect(href.startsWith(profile.url.replace(/\/$/, ''))).toBe(true)
      await expect(app.locator('button, [role="button"], [onclick], [\\@click], [x-on\\:click]')).toHaveCount(0)
      // Clicking around the page opens nothing.
      const url = page.url()
      for (const target of [
        app.locator('[data-github-owner]'),
        app.locator('[data-github-repo]'),
        app.locator('[data-github-file]').first(),
        app.locator('[data-github-file]').last(),
        app.locator('[data-github-contributor]'),
      ]) {
        await target.click()
      }
      expect(await page.evaluate(() => (window as unknown as { opened: unknown[] }).opened)).toEqual([])
      expect(page.url()).toBe(url)
      expect(page.context().pages()).toHaveLength(1)
    })
  })
}

test('the pages and files the site serves name no GitHub account', async ({ request }) => {
  const v1 = BUILDS[0].url
  for (const path of ['', 'cv', 'privacy', 'llms.txt', 'llm.txt', 'manifest.json', 'sitemap.xml', 'robots.txt', 'data/portfolio.json', 'data/cv.php']) {
    const response = await request.get(new URL(path, v1).href)
    expect(response.status(), path).toBe(200)
    expect(accountIn(await response.text()), path || '/').toEqual([])
  }
  const v2 = await request.get(BUILDS[1].url)
  expect(v2.status()).toBe(200)
  expect(accountIn(await v2.text())).toEqual([])
})

// ---- The two builds side by side ----------------------------------------------

type Box = [tag: string, text: string, x: number, y: number, width: number, height: number]

/** Every visible element in the app: its tag, its own text, and where it sits. */
const layout = (app: Locator) =>
  app.evaluate((root) => {
    const origin = root.getBoundingClientRect()
    const boxes: Box[] = []
    for (const el of root.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height || !(el as HTMLElement).checkVisibility?.()) continue
      const text = [...el.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
      boxes.push([
        el.tagName.toLowerCase(),
        text,
        Math.round(rect.x - origin.x),
        Math.round(rect.y - origin.y),
        Math.round(rect.width),
        Math.round(rect.height),
      ])
    }
    return boxes
  })

async function inBothBuilds(browser: Browser, viewport: { width: number; height: number }) {
  const seen: Box[][] = []
  for (const build of BUILDS) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await boot(page, build.url)
    const app = await openGitHub(page)
    await app.evaluate(async (el) => {
      await Promise.allSettled(el.getAnimations({ subtree: true }).map((animation) => animation.finished))
      await Promise.allSettled([...el.querySelectorAll('img')].map((img) => img.decode()))
      await document.fonts.ready
    })
    await page.waitForTimeout(300)
    seen.push(await layout(app.locator('[data-github-app]')))
    await context.close()
  }
  return seen
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`GitHub lays out the same in both builds at ${viewport.width}px`, async ({ browser }) => {
    test.setTimeout(90_000) // Boots both builds.
    const [v1, v2] = await inBothBuilds(browser, viewport)
    expect(v1.length).toBeGreaterThan(100)
    expect(v2).toEqual(v1)
  })
}
