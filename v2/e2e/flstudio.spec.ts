import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// FL Studio in both builds: it plays, edits, saves, opens from Explorer and
// exports real audio. Both builds drive the same engine in
// assets/js/windowing/fl-studio.js, so every check runs against each.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const
type Build = (typeof BUILDS)[number]

const FL_FOLDER = 'C:\\Users\\DeVante\\Documents\\FL Studio'

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
  await page.locator('[data-desktop-item="achievements.txt"]').waitFor()
}

/** Opens FL Studio from the taskbar. A cold dev server can take a while to compile it. */
async function openFl(page: Page) {
  await page.locator('[data-taskbar-app="flstudio"]').click()
  const app = page.locator('.fl-app')
  await expect(app).toBeVisible({ timeout: 20_000 })
  return app
}

const level = (page: Page, id = 'master') =>
  page.locator(`[data-fl-meter="${id}"]`).evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--level')))

function openExplorer(page: Page, build: Build, path: string, title: string) {
  const options = build.name === 'v1' ? { initialPath: path } : { extra: { initialPath: path } }
  return page.evaluate(
    ([a, b]) => {
      const w = window as unknown as {
        Alpine?: { store: (n: string) => { openApp: (...x: unknown[]) => void } }
        __osStore: { getState: () => { openApp: (...x: unknown[]) => void } }
      }
      const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
      store.openApp('explorer', a, b)
    },
    [title, options] as const,
  )
}

for (const build of BUILDS) {
  test.describe(`${build.name} FL Studio`, () => {
    test.beforeEach(({ page }) => boot(page, build.url))

    test('plays the demo song: the position moves and the meters show sound', async ({ page }) => {
      const app = await openFl(page)
      await app.locator('[data-fl-play]').click()
      await expect(app.locator('[data-fl-play]')).toHaveAttribute('aria-pressed', 'true')
      await expect.poll(() => app.locator('[data-fl-position]').textContent(), { timeout: 5000 }).not.toBe('1:1:1')
      await expect.poll(() => level(page), { timeout: 5000 }).toBeGreaterThan(0.01)
      await app.locator('[data-fl-stop]').click()
      await expect(app.locator('[data-fl-position]')).toHaveText('1:1:1')
      await expect(app.locator('[data-fl-play]')).toHaveAttribute('aria-pressed', 'false')
    })

    test('a muted channel stays silent while the others play', async ({ page }) => {
      const app = await openFl(page)
      await app.locator('[data-fl-view="mixer"]').click()
      await app.getByRole('button', { name: 'Mute Kick' }).click()
      // Every frame from the moment play is pressed until the others have played
      // for a while, however slowly the audio starts: the first kick must not leak either.
      const heard = page.evaluate(
        () =>
          new Promise<{ muted: number; others: boolean }>((resolve) => {
            const meter = (id: string) =>
              Number(getComputedStyle(document.querySelector(`[data-fl-meter="${id}"]`)!).getPropertyValue('--level')) || 0
            const giveUp = performance.now() + 12_000
            let othersFrom = 0
            let muted = 0
            const read = () => {
              const now = performance.now()
              muted = Math.max(muted, meter('c1'))
              if (!othersFrom && meter('c3') > 0.01) othersFrom = now
              if ((othersFrom && now - othersFrom > 1500) || now > giveUp) resolve({ muted, others: othersFrom > 0 })
              else requestAnimationFrame(read)
            }
            requestAnimationFrame(read)
          }),
      )
      await app.locator('[data-fl-play]').click()
      const { muted, others } = await heard
      expect(others).toBe(true)
      // Below -60 dB.
      expect(muted).toBeLessThan(0.002)
      await app.locator('[data-fl-stop]').click()
    })

    test('steps switch on and off, and undo and redo work', async ({ page }) => {
      const app = await openFl(page)
      const step = app.locator('[data-fl-channel="c1"] [data-fl-step="1"]')
      await expect(step).toHaveAttribute('aria-pressed', 'false')
      await step.click()
      await expect(step).toHaveAttribute('aria-pressed', 'true')
      await page.keyboard.press('Control+z')
      await expect(step).toHaveAttribute('aria-pressed', 'false')
      await page.keyboard.press('Control+y')
      await expect(step).toHaveAttribute('aria-pressed', 'true')
    })

    test('the piano roll adds, lengthens and removes notes', async ({ page }) => {
      const app = await openFl(page)
      await app.locator('[data-fl-pattern]').selectOption({ label: 'Melody' })
      await app.locator('[data-fl-channel-name="c7"]').click()
      const notes = app.locator('[data-fl-note]')
      await expect(notes).toHaveCount(16)
      // Bring G6 (MIDI 79) into view, then press at step 2 and drag across three more steps.
      const body = app.locator('.fl-piano-body')
      const row = await body.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--fl-row-h')))
      const step = await body.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--fl-note-w')))
      await body.evaluate((el, top) => (el.scrollTop = top), (96 - 79) * row - 40)
      const box = await app.locator('[data-fl-grid]').boundingBox()
      if (!box) throw new Error('no grid')
      const y = box.y + (96 - 79) * row + row / 2
      await page.mouse.move(box.x + step * 1 + 4, y)
      await page.mouse.down()
      await page.mouse.move(box.x + step * 4 + 4, y, { steps: 6 })
      await page.mouse.up()
      await expect(notes).toHaveCount(17)
      const added = app.locator('[data-fl-note="1:79"]')
      await expect(added).toBeVisible()
      expect((await added.evaluate((el) => getComputedStyle(el).getPropertyValue('--l'))).trim()).toBe('4')
      // Clicking a note removes it.
      await added.click({ position: { x: 4, y: 4 } })
      await expect(notes).toHaveCount(16)
    })

    test('the playlist places a pattern where you click, and a click removes it', async ({ page }) => {
      const app = await openFl(page)
      const clips = app.locator('[data-fl-clip]')
      await expect(clips).toHaveCount(13)
      const lanes = await app.locator('[data-fl-lanes]').boundingBox()
      if (!lanes) throw new Error('no lanes')
      await page.mouse.click(lanes.x + 64 * 8 + 30, lanes.y + 17)
      await expect(clips).toHaveCount(14)
      await clips.last().click()
      await expect(clips).toHaveCount(13)
    })

    test('a saved project appears in Explorer and opens back into FL Studio', async ({ page }) => {
      const app = await openFl(page)
      await app.locator('[data-fl-channel="c1"] [data-fl-step="1"]').click()
      await app.locator('[data-fl-menu="File"]').click()
      await app.locator('[data-fl-command="saveAs"]').click()
      await app.getByLabel('File name').fill('My Beat')
      await app.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(app.locator('.fl-hint')).toHaveText('Saved My Beat.flp to Documents\\FL Studio')

      // A new project, then open the saved one from Explorer.
      await app.locator('[data-fl-menu="File"]').click()
      await app.locator('[data-fl-command="newProject"]').click()
      await expect(app.locator('[data-fl-clip]')).toHaveCount(0)
      await openExplorer(page, build, FL_FOLDER, 'FL Studio')
      const saved = page.locator('[data-explorer-file="My Beat.flp"]')
      await expect(saved).toBeVisible({ timeout: 15_000 })
      await saved.dblclick()
      await expect(app.locator('[data-fl-clip]')).toHaveCount(13)
      await expect(app.locator('.fl-project-name')).toHaveValue('My Beat')
      await expect(app.locator('[data-fl-channel="c1"] [data-fl-step="1"]')).toHaveAttribute('aria-pressed', 'true')
    })

    test('the project survives a reload', async ({ page }) => {
      const app = await openFl(page)
      await app.locator('[data-fl-channel="c2"] [data-fl-step="3"]').click()
      await page.waitForTimeout(700)
      await page.reload()
      await page.locator('[data-desktop-item="achievements.txt"]').waitFor()
      const again = await openFl(page)
      await expect(again.locator('[data-fl-channel="c2"] [data-fl-step="3"]')).toHaveAttribute('aria-pressed', 'true')
    })

    test('exports the song as a real WAV file with sound in it', async ({ page }, testInfo) => {
      const app = await openFl(page)
      await app.locator('[data-fl-menu="File"]').click()
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 60_000 }),
        app.locator('[data-fl-command="exportWav"]').click(),
      ])
      expect(download.suggestedFilename()).toBe('Demo.wav')
      const path = testInfo.outputPath('song.wav')
      await download.saveAs(path)
      const bytes = readFileSync(path)
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
      expect(bytes.toString('ascii', 8, 12)).toBe('WAVE')
      const samples = new Int16Array(bytes.buffer, bytes.byteOffset + 44, Math.floor((bytes.length - 44) / 2))
      let peak = 0
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
      expect(peak).toBeGreaterThan(1000)
    })

    test('menus tick what is open and grey out what cannot be done', async ({ page }) => {
      const app = await openFl(page)
      await app.locator('[data-fl-menu="Edit"]').click()
      await expect(app.locator('[data-fl-command="undo"]')).toBeDisabled()
      await app.locator('[data-fl-menu="View"]').click()
      await expect(app.locator('[data-fl-command="view:rack"]')).toHaveAttribute('aria-checked', 'true')
      await expect(app.locator('[data-fl-command="view:mixer"]')).toHaveAttribute('aria-checked', 'false')
      await app.locator('[data-fl-command="view:mixer"]').click()
      await expect(app.locator('[data-fl-panel="mixer"]')).toBeVisible()
      await app.locator('[data-fl-menu="Help"]').click()
      await app.locator('[data-fl-command="help"]').click()
      await expect(app.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
    })

    test('Space plays and pauses while FL Studio has focus', async ({ page }) => {
      const app = await openFl(page)
      await app.locator('.fl-panel-head').first().click()
      await page.keyboard.press('Space')
      await expect(app.locator('[data-fl-play]')).toHaveAttribute('aria-pressed', 'true')
      await page.keyboard.press('Space')
      await expect(app.locator('[data-fl-play]')).toHaveAttribute('aria-pressed', 'false')
    })

    test('on a phone each window gets a tab, and nothing scrolls sideways', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      const app = await openFl(page)
      await expect(app.locator('.fl-tabs')).toBeVisible()
      for (const panel of ['playlist', 'mixer', 'browser', 'piano', 'rack']) {
        await app.locator(`[data-fl-tab-button="${panel}"]`).click()
        await expect(app.locator(`[data-fl-panel="${panel}"]`)).toBeVisible()
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  })
}
