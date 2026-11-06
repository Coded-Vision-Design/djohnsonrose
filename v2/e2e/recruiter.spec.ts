import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// The way in for a recruiter: a plain /cv page that needs no JavaScript, and a
// "Recruiter" account on the lock screen of both builds that opens it. The
// helpers behind /cv are unit tested in tests/php/cv_test.php.

const V1 = process.env.V1_URL ?? 'http://localhost:8765/'
const CV = new URL('cv', V1).href
const BUILDS = [
  { name: 'v1', url: V1 },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const profile = readJson('../../data/profile.json')
const portfolio = readJson('../../data/portfolio.json')
const featured: { title: string; url: string }[] = portfolio.projects.filter((p: { featured?: boolean }) => p.featured)

/** A small PDF, as the real one is kept out of git and lives on the server only. */
const fakePdf = (page: Page) =>
  page.route('**/data/cv.pdf', (route) => route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' }))

/** Elements wider than the viewport, which would give a sideways scroll. */
const overflow = (page: Page) =>
  page.evaluate(() => {
    const width = document.documentElement.clientWidth
    const wide = [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > width + 1)
      .map((el) => el.tagName.toLowerCase() + (el.className ? `.${el.className}` : ''))
    // A reserved scrollbar gutter can make this negative, which is no overflow.
    return { scroll: Math.max(0, document.documentElement.scrollWidth - width), wide }
  })

test.describe('/cv', () => {
  test('shows the whole CV without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    const response = await page.goto(CV)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(profile.name)
    await expect(page.locator('[data-cv-headline]')).toHaveText(profile.headline)
    await expect(page.getByText(portfolio.summary.slice(0, 60))).toBeVisible()
    for (const stat of portfolio.stats) await expect(page.getByText(stat.value, { exact: true })).toBeVisible()
    for (const heading of ['Experience', 'Featured projects', 'Education', 'Certificates']) {
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible()
    }
    await expect(page.getByText('Killik & Co').first()).toBeVisible()
    await expect(page.getByText('University of East Anglia').first()).toBeVisible()
    await expect(page.locator('[data-certificate]')).toHaveCount(portfolio.certifications.length)

    // Each featured project links to its real site.
    const projects = page.locator('[data-project-link]')
    await expect(projects).toHaveCount(4)
    expect(await projects.evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href))).toEqual(
      featured.map((p) => p.url),
    )

    // The email is plain text a recruiter can select and copy.
    const email = page.locator('[data-email]')
    await expect(email).toHaveText('devante@johnson-rose.co.uk')
    expect(await email.evaluate((el) => el.closest('a'))).toBeNull()
    expect(await email.evaluate((el) => getComputedStyle(el).userSelect)).not.toBe('none')
    await expect(page.locator('a[href="mailto:devante@johnson-rose.co.uk"]')).toBeVisible()
    await expect(page.locator(`a[href="${profile.github}"]`)).toBeVisible()
    if (!profile.linkedin) await expect(page.locator('a[href*="linkedin.com"]')).toHaveCount(0)

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${profile.url}cv`)
    await expect(page.locator('script:not([type="application/ld+json"])')).toHaveCount(0)
    await context.close()
  })

  test('allows no scripts, and its own styles keep to the policy', async ({ page }) => {
    const violations: string[] = []
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP-VIOLATION ${e.violatedDirective}`))
    })
    page.on('console', (m) => {
      if (m.text().includes('CSP-VIOLATION')) violations.push(m.text())
    })
    const response = await page.goto(CV)
    const policy = response!.headers()['content-security-policy']
    expect(policy).toContain("default-src 'none'")
    expect(policy).not.toContain('script-src')
    // The styles apply: the header is sticky only if the nonce matched.
    expect(await page.locator('header').first().evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
    expect(violations).toEqual([])
  })

  for (const width of [375, 768, 1280]) {
    test(`has no sideways scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto(CV)
      expect(await overflow(page)).toEqual({ scroll: 0, wide: [] })
    })
  }

  test('keeps the header at the top, with a way back to the desktop', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(CV)
    const header = page.locator('header').first()
    expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(64)
    await page.mouse.wheel(0, 3000)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)
    expect((await header.boundingBox())!.y).toBe(0)
    await header.getByRole('link', { name: /desktop/i }).click()
    await expect(page).toHaveURL(V1)
  })

  test('has a skip link to the main content', async ({ page }) => {
    await page.goto(CV)
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    // The focus ring is drawn, not left to the browser default.
    expect(await skip.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#main-content$/)
  })

  test('reads at 16px and meets AA contrast', async ({ page }) => {
    await page.goto(CV)
    const result = await page.evaluate(() => {
      const channel = (c: number) => {
        const s = c / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number)
      const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
      const background = (el: Element | null): number[] => {
        for (let node = el; node; node = node.parentElement) {
          const [r, g, b, a = 1] = rgb(getComputedStyle(node).backgroundColor)
          if (a > 0.5) return [r, g, b]
        }
        return [255, 255, 255]
      }
      const failures: string[] = []
      const small: string[] = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        const el = text.parentElement!
        if (!text.textContent!.trim() || !el.checkVisibility()) continue
        const style = getComputedStyle(el)
        const size = parseFloat(style.fontSize)
        const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700)
        const [l1, l2] = [luminance(rgb(style.color)), luminance(background(el))].sort((a, b) => b - a)
        const ratio = (l1 + 0.05) / (l2 + 0.05)
        if (ratio < (large ? 3 : 4.5)) failures.push(`${text.textContent!.trim().slice(0, 30)} ${ratio.toFixed(2)}`)
        if (el.closest('p, li, dd') && !el.closest('[data-tag]') && size < 16) small.push(text.textContent!.trim().slice(0, 30))
      }
      return { failures, small, body: getComputedStyle(document.body).fontSize }
    })
    expect(result).toEqual({ failures: [], small: [], body: '16px' })
  })

  test('downloads the PDF', async ({ page }) => {
    await fakePdf(page)
    await page.goto(CV)
    const link = page.getByRole('link', { name: /download.*pdf/i }).first()
    await expect(link).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()])
    expect(download.url()).toBe(new URL('data/cv.pdf', V1).href)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })

  test('opens project and profile links in a new tab', async ({ page, context }) => {
    // Stand in for the real sites, so the test never leaves this machine.
    await context.route(/^https:\/\/(?!localhost)/, (route) => route.fulfill({ contentType: 'text/html', body: '<title>stub</title>' }))
    await page.goto(CV)
    const external = page.locator('main a[href^="http"]')
    expect(await external.count()).toBeGreaterThanOrEqual(5)
    for (const link of await external.all()) {
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('[data-project-link]').first().click()])
    await expect(popup).toHaveURL(featured[0].url)
    expect(page.url()).toBe(CV)
  })

  test('prints without the navigation', async ({ page }) => {
    await page.goto(CV)
    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('header nav')).toBeHidden()
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeHidden()
    expect(await page.locator('header').first().evaluate((el) => getComputedStyle(el).position)).toBe('static')
  })
})

for (const build of BUILDS) {
  test.describe(`${build.name} lock screen`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        if (sessionStorage.getItem('test.started')) return
        sessionStorage.setItem('test.started', '1')
        localStorage.clear()
        localStorage.setItem('cookie.consent', 'false')
        localStorage.setItem('react.cookie.consent', 'false')
      })
      await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
      await page.goto(build.url)
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible({ timeout: 15_000 })
    })

    test('shows the role under the name', async ({ page }) => {
      await expect(page.locator('[data-lock-role]')).toHaveText(profile.headline)
      const [name, role] = await Promise.all([
        page.getByRole('heading', { name: profile.name }).boundingBox(),
        page.locator('[data-lock-role]').boundingBox(),
      ])
      expect(role!.y).toBeGreaterThan(name!.y)
    })

    test('lists the two accounts at the bottom left', async ({ page }) => {
      const picker = page.getByRole('navigation', { name: 'Accounts' })
      await expect(picker.getByRole('button', { name: profile.name })).toBeVisible()
      await expect(picker.getByRole('link', { name: /^Recruiter/ })).toBeVisible()
      const box = (await picker.boundingBox())!
      const viewport = page.viewportSize()!
      expect(box.x).toBeLessThan(64)
      expect(box.y + box.height).toBeGreaterThan(viewport.height - 64)
    })

    test('the Recruiter account opens the CV', async ({ page }) => {
      await page.getByRole('navigation', { name: 'Accounts' }).getByRole('link', { name: /^Recruiter/ }).click()
      // In development Vite hands /cv to its PHP server, which CI runs apart from V1_URL.
      await expect(page).toHaveURL(/\/cv$/)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(profile.name)
    })

    test('the owner account signs in to the desktop', async ({ page }) => {
      await page.getByRole('navigation', { name: 'Accounts' }).getByRole('button', { name: profile.name }).click()
      await expect(page.locator('[data-desktop-item="Recycle Bin"]')).toBeVisible({ timeout: 10_000 })
    })

    test('fits a phone without overlapping the clock', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      const picker = (await page.getByRole('navigation', { name: 'Accounts' }).boundingBox())!
      const clock = (await page.locator('[data-lock-clock]').boundingBox())!
      const apart =
        picker.x + picker.width <= clock.x ||
        clock.x + clock.width <= picker.x ||
        picker.y + picker.height <= clock.y ||
        clock.y + clock.height <= picker.y
      expect(apart).toBe(true)
      expect(await overflow(page)).toEqual({ scroll: 0, wide: [] })
    })
  })
}

type Box = { x: number; y: number; width: number; height: number } | null

test.describe('lock screen parity', () => {
  test('the account picker is laid out the same in both builds', async ({ browser }) => {
    test.setTimeout(60_000) // Two cold boots, one after the other.
    const boxes: Box[][] = []
    for (const build of BUILDS) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
      await page.addInitScript(() => {
        localStorage.setItem('cookie.consent', 'false')
        localStorage.setItem('react.cookie.consent', 'false')
      })
      await page.goto(build.url)
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible({ timeout: 15_000 })
      const picker = page.getByRole('navigation', { name: 'Accounts' })
      boxes.push(
        await Promise.all([
          picker.boundingBox(),
          picker.getByRole('button').boundingBox(),
          picker.getByRole('link').boundingBox(),
          page.locator('[data-lock-role]').boundingBox(),
        ]),
      )
      await page.close()
    }
    const round = (b: Box) => b && [b.x, b.y, b.width, b.height].map(Math.round)
    expect(boxes[1].map(round)).toEqual(boxes[0].map(round))
  })
})

test.describe('shared metadata', () => {
  const ldPerson = (page: Page) =>
    page.evaluate(() => {
      const block = document.querySelector('script[type="application/ld+json"]')
      const graph = JSON.parse(block?.textContent ?? '{}')['@graph'] ?? []
      return graph.find((n: { '@type': string }) => n['@type'] === 'Person')
    })

  test('both desktops and /cv describe one person, with their own canonicals', async ({ page, request }) => {
    const people: Record<string, unknown>[] = []
    for (const [url, canonical] of [
      [BUILDS[0].url, profile.url],
      [BUILDS[1].url, profile.url],
      [CV, `${profile.url}cv`],
    ]) {
      await page.goto(url)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical)
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        `${profile.url}assets/img/share-card.png`,
      )
      people.push(await ldPerson(page))
    }
    // The job title is the one difference: the desktops keep their meta wording
    // and /cv uses the CV's headline, until the owner settles on one.
    const shared = (person: Record<string, unknown>) => {
      const copy = { ...person }
      delete copy.jobTitle
      return copy
    }
    expect(shared(people[1])).toEqual(shared(people[0]))
    expect(shared(people[2])).toEqual(shared(people[0]))
    expect(people[2].jobTitle).toBe(profile.headline)

    const image = await request.get(new URL('assets/img/share-card.png', V1).href)
    expect(image.status()).toBe(200)
    expect(image.headers()['content-type']).toContain('image/png')
  })

  test('/llms.txt is a text file that points at the CV', async ({ request }) => {
    const response = await request.get(new URL('llms.txt', V1).href)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/plain')
    const text = await response.text()
    expect(text.startsWith(`# ${profile.name}`)).toBe(true)
    expect(text).toContain(`${profile.url}cv`)
    expect(text).toContain(`${profile.url}data/cv.pdf`)
  })
})
