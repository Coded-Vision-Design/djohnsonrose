import { statSync } from 'node:fs'
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

function openVideo(page: Page, build: Build) {
  return page.evaluate((v1) => {
    const w = window as unknown as {
      Alpine?: { store: (n: string) => { openApp: (...x: unknown[]) => void } }
      __osStore: { getState: () => { openApp: (...x: unknown[]) => void } }
    }
    if (v1) w.Alpine!.store('os').openApp('video', 'Clip', { videoUrl: 'data/south-africa-25.mp4' })
    else w.__osStore.getState().openApp('video', 'Clip', { extra: { videoUrl: '/data/south-africa-25.mp4' } })
  }, build.name === 'v1')
}

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

    test('can load Selawik for systems without Segoe UI', async ({ page }) => {
      await boot(page, build.url)
      const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
      expect(family).toMatch(/^"Segoe UI Variable", "Segoe UI", Selawik,/)
      // check() also passes for a face that failed, so count the faces that really loaded.
      const loaded = await page.evaluate(async () => {
        await document.fonts.load('16px Selawik').catch(() => [])
        return [...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'Selawik' && f.status === 'loaded').length
      })
      expect(loaded).toBeGreaterThan(0)
    })

    test('plays sounds from small AAC files', async ({ page }) => {
      await page.addInitScript(() => {
        const played: string[] = []
        ;(window as unknown as { __played: string[] }).__played = played
        const Real = window.Audio
        window.Audio = function (src?: string) {
          played.push(src ?? '')
          const audio = new Real(src)
          audio.play = () => Promise.resolve()
          return audio
        } as unknown as typeof Audio
      })
      await boot(page, build.url)
      await page.locator('button:has(img[src$="startmenu.webp"])').first().click()
      const played = await page.evaluate(() => (window as unknown as { __played: string[] }).__played)
      expect(played.at(-1)).toMatch(/\/assets\/sounds\/click\.m4a$/)
      for (const name of ['click', 'Windows Logon']) {
        const res = await page.request.get(new URL(`/assets/sounds/${name}.m4a`, page.url()).href)
        expect(res.ok(), name).toBe(true)
        const body = await res.body()
        expect(body.subarray(4, 8).toString('latin1'), name).toBe('ftyp')
        expect(body.length, name).toBeLessThan(40_000)
      }
    })

    test('loads only the video metadata, with a poster, until it plays', async ({ page }) => {
      await boot(page, build.url)
      await openVideo(page, build)
      const video = page.locator('video')
      await expect(video).toHaveAttribute('preload', 'metadata', { timeout: 15_000 })
      const poster = await video.evaluate((v: HTMLVideoElement) => v.poster)
      expect(poster).toMatch(/\/assets\/img\/posters\/south-africa-25\.webp$/)
      const image = await page.request.get(poster)
      expect(image.ok()).toBe(true)
      expect((await image.body()).subarray(8, 12).toString('latin1')).toBe('WEBP')
      const clip = await page.request.head(new URL('/data/south-africa-25.mp4', page.url()).href)
      expect(Number(clip.headers()['content-length'])).toBeLessThan(8 * 1024 * 1024)
    })
  })
}

test('v2 fetches the likeliest apps once the desktop is idle', async ({ page }) => {
  const wanted = ['Explorer', 'Notepad', 'Word', 'Terminal']
  const seen = new Set<string>()
  page.on('request', (req) => {
    const match = new URL(req.url()).pathname.match(/\/(Explorer|Notepad|Word|Terminal)(-[\w-]+)?\.(js|tsx)$/)
    if (match) seen.add(match[1])
  })
  await boot(page, BUILDS[1].url)
  await expect.poll(() => [...seen].sort(), { timeout: 10_000 }).toEqual([...wanted].sort())
  await expect(page.locator('.os-window')).toHaveCount(0)
})

test('v1 versions its scripts by file time, so they stay cached between visits', async ({ request }) => {
  const html = await (await request.get(BUILDS[0].url)).text()
  const scripts = [...html.matchAll(/assets\/js\/components\/([\w/-]+)\.js\?v=(\d+)/g)]
  expect(scripts.length).toBeGreaterThanOrEqual(17)
  for (const [, name, version] of scripts) {
    const mtime = Math.floor(statSync(new URL(`../../assets/js/components/${name}.js`, import.meta.url)).mtimeMs / 1000)
    expect(Number(version), name).toBe(mtime)
  }
})
