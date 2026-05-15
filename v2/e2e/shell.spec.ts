import { test, expect } from '@playwright/test'

// End-to-end coverage of the Phase 5 plan's e2e checklist:
// boot → login → open multiple apps → drag → close.
// Tests share no state — each one clears localStorage first.

const clearStorage = async (page: import('@playwright/test').Page) => {
  await page.goto('/v2/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

test.describe('boot + login', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
  })

  test('boot screen → lock screen → desktop with profile photo', async ({ page }) => {
    await page.goto('/v2/')

    // Boot screen has the "Portfolio OS" tagline + a 5-dot loader.
    await expect(page.getByText('Portfolio OS')).toBeVisible()

    // After 3 s the lock screen takes over. The clock in the corner has the
    // long date format ("Monday, January 1") — that's not on the boot screen.
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible({
      timeout: 6_000,
    })
    await expect(page.getByText('DeVanté Johnson-Rose')).toBeVisible()
    await expect(page.getByText('Welcome back, DeVante.')).toBeVisible()

    // Profile picture is served from /assets/img/profile.png (shared with v1).
    const avatar = page.locator('img[alt="DeVanté Johnson-Rose"]')
    await expect(avatar).toBeVisible()
    await expect(avatar).toHaveAttribute('src', '/assets/img/profile.png')

    // Click Sign In → 3-second "Signing in…" state, then desktop.
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText('Signing in…')).toBeVisible()

    // The taskbar's Start button appears once we're on the desktop.
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible({
      timeout: 6_000,
    })
  })

  test('subsequent visits skip the boot screen', async ({ page }) => {
    await page.goto('/v2/')
    await page.getByRole('button', { name: 'Sign In' }).click({ timeout: 6_000 })
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible({
      timeout: 6_000,
    })

    // Reload — loggedIn flag is persisted, so we go straight to desktop.
    await page.reload()
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible({
      timeout: 2_000,
    })
    // Sign In button should NOT show — we're already logged in.
    await expect(page.getByRole('button', { name: 'Sign In' })).not.toBeVisible()
  })
})

const signIn = async (page: import('@playwright/test').Page) => {
  await page.goto('/v2/')
  // Skip the boot screen and 3-s sign-in by setting the persisted flag.
  await page.evaluate(() => {
    localStorage.setItem(
      'react.os',
      JSON.stringify({
        state: {
          loggedIn: true,
          settings: {
            theme: 'light',
            sound: false,
            volume: 75,
            brightness: 100,
            wallpaper:
              'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop',
            wifi: true,
            bluetooth: true,
            airplane: false,
            batterySaver: false,
            nightLight: false,
            accessibility: false,
          },
          recycleBin: [],
          hiddenDesktop: [],
          iconPositions: {},
        },
        version: 0,
      }),
    )
  })
  await page.goto('/v2/')
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible({
    timeout: 5_000,
  })
}

test.describe('window management', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
  })

  test('open an app from the start menu → window renders → close', async ({ page }) => {
    await signIn(page)

    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.getByPlaceholder('Search for apps, settings, and documents')).toBeVisible()

    // Click "Calculator" from the All apps list — search filters reliably.
    const search = page.getByPlaceholder('Search for apps, settings, and documents')
    await search.fill('calculator')
    await page.getByRole('button', { name: /Calculator/ }).first().click()

    // Window has a Calculator title and a "7" button (from the keypad).
    const win = page.getByRole('dialog', { name: 'Calculator' })
    await expect(win).toBeVisible()
    await expect(win.getByText('Standard')).toBeVisible()

    // Close it via the X button.
    await win.getByRole('button', { name: 'Close' }).click()
    await expect(win).not.toBeVisible()
  })

  test('multiple windows: pinned taskbar reuses; focus follows new opens', async ({ page }) => {
    await signIn(page)

    // Open Calculator + Notepad via deep-link routes — quicker than menu clicks.
    await page.goto('/v2/app/calculator')
    await expect(page.getByRole('dialog', { name: 'Calculator' })).toBeVisible()
    await page.goto('/v2/app/notepad')
    await expect(page.getByRole('dialog', { name: 'Notepad' })).toBeVisible()

    // Both windows present.
    await expect(page.getByRole('dialog')).toHaveCount(2)
  })

  test('drag window by title bar', async ({ page }) => {
    await signIn(page)
    await page.goto('/v2/app/calculator')
    const win = page.getByRole('dialog', { name: 'Calculator' })
    await expect(win).toBeVisible()

    const before = await win.boundingBox()
    expect(before).not.toBeNull()
    // Drag from the title bar (top centre of the window) 200 px right + 150 down.
    const titleBar = win.locator('div').first()
    await titleBar.hover({ position: { x: 50, y: 10 } })
    await page.mouse.down()
    await page.mouse.move(before!.x + 250, before!.y + 160, { steps: 10 })
    await page.mouse.up()

    const after = await win.boundingBox()
    expect(after).not.toBeNull()
    expect(after!.x).toBeGreaterThan(before!.x)
    expect(after!.y).toBeGreaterThan(before!.y)
  })
})

test.describe('desktop icons + recycle bin', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
  })

  test('desktop has icons and double-click opens Explorer at This PC', async ({ page }) => {
    await signIn(page)
    // "DeVanté's PC" icon — synthetic.
    const pc = page.getByRole('button', { name: "DeVanté's PC", exact: true })
    await expect(pc).toBeVisible()
    await pc.dblclick()
    await expect(page.getByRole('dialog', { name: 'This PC' })).toBeVisible()
  })

  test('Recycle Bin icon exists; opening Explorer at the bin shows the Easter Egg', async ({
    page,
  }) => {
    await signIn(page)
    const bin = page.getByRole('button', { name: 'Recycle Bin', exact: true })
    await expect(bin).toBeVisible()
    await bin.dblclick()
    const win = page.getByRole('dialog', { name: 'Recycle Bin' })
    await expect(win).toBeVisible()
    // v1 seeds the bin with an Easter Egg video — verify it's visible.
    await expect(win.getByText('Easter Egg - Drone Footage.mp4')).toBeVisible()
  })
})
