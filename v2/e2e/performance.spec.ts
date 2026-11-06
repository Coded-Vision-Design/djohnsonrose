import { test, expect, type Page } from '@playwright/test'

// What a visitor downloads, run for real in both builds. The rules the source
// files must follow are unit tested in src/test/performance.test.ts.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

type Build = (typeof BUILDS)[number]

// Matches the background-color both builds put behind the wallpaper.
const FALLBACK = 'rgb(56, 23, 89)'

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
  // A cold dev server can take a while to compile the desktop.
  await page.locator('[data-desktop-item="Recycle Bin"]').waitFor({ timeout: 20_000 })
}

const desktop = (page: Page, build: Build) => page.locator(build.name === 'v1' ? '#os-root' : '[data-os-desktop]')

for (const build of BUILDS) {
  test.describe(`${build.name} performance`, () => {
    test('loads the default wallpaper from this site, never from Unsplash', async ({ page }) => {
      const hosts: string[] = []
      page.on('request', (req) => hosts.push(new URL(req.url()).host))
      const wallpaper = page.waitForResponse((res) => res.url().endsWith('/assets/img/wallpaper-bloom.webp'))
      await boot(page, build.url)
      expect((await wallpaper).ok()).toBe(true)
      await expect(desktop(page, build)).toHaveCSS('background-image', /wallpaper-bloom\.webp/)
      expect(hosts).not.toContain('images.unsplash.com')
    })

    test('shows a matching colour while the wallpaper is missing', async ({ page }) => {
      await page.route('**/wallpaper-bloom.webp', (route) => route.abort())
      await boot(page, build.url)
      await expect(desktop(page, build)).toHaveCSS('background-color', FALLBACK)
    })
  })
}
