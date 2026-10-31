import { test, expect, type Page } from '@playwright/test'

// Security headers and the Content-Security-Policy, against the real stack:
// Apache reading .htaccess, PHP, and the production v2 build. Set SECURE_URL to
// a server like that. Vite and PHP's dev server do not read .htaccess.
const BASE = process.env.SECURE_URL ?? 'http://127.0.0.1:8799'

const APPS = [
  ['edge', 'Chrome'], ['vscode', 'VS Code'], ['explorer', 'File Explorer'], ['terminal', 'Terminal'],
  ['notepad', 'Notepad'], ['word', 'Word'], ['excel', 'Excel'], ['powerpoint', 'PowerPoint'],
  ['outlook', 'Outlook'], ['photoshop', 'Photoshop'], ['flstudio', 'FL Studio 24'], ['docker', 'Docker'],
  ['putty', 'PuTTY'], ['filezilla', 'FileZilla'], ['database', 'SQL Server Management Studio'],
  ['settings', 'Settings'], ['taskmanager', 'Task Manager'], ['eventviewer', 'Event Viewer'],
  ['calculator', 'Calculator'], ['paint', 'Paint'], ['photos', 'Photos'], ['video', 'Movies & TV'],
  ['pdfreader', 'PDF Reader'], ['admin', 'Admin Console'], ['references', 'References'], ['github', 'GitHub'],
] as const

async function prepare(page: Page, violations: string[]) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`CSP-VIOLATION ${e.violatedDirective} ${e.blockedURI} ${e.sample}`)
    })
  })
  page.on('console', (m) => {
    if (m.text().includes('CSP-VIOLATION')) violations.push(m.text())
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.route('**/data/cv.pdf', (route) =>
    route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4' }),
  )
}

test.describe('security headers', () => {
  for (const path of ['/', '/v2/', '/assets/css/app.css', '/api/news.php']) {
    test(`are present on ${path}`, async ({ request }) => {
      const res = await request.get(BASE + path)
      expect(res.status()).toBe(200)
      const headers = res.headers()
      expect(headers['strict-transport-security']).toContain('max-age=31536000')
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
      expect(headers['permissions-policy']).toContain('camera=()')
      expect(headers['x-powered-by']).toBeUndefined()
    })
  }

  test('v1 gets a fresh nonce on every request', async ({ request }) => {
    const nonce = async () => {
      const res = await request.get(`${BASE}/`)
      const csp = res.headers()['content-security-policy']
      const match = csp.match(/'nonce-([^']+)'/)
      expect(match).not.toBeNull()
      expect(await res.text()).toContain(`nonce="${match![1]}"`)
      return match![1]
    }
    expect(await nonce()).not.toBe(await nonce())
  })

  test('v2 is stricter, with no inline scripts or eval', async ({ request }) => {
    const csp = (await request.get(`${BASE}/v2/`)).headers()['content-security-policy']
    const script = csp.split(';').find((part) => part.trim().startsWith('script-src'))!
    expect(script).not.toContain('unsafe-inline')
    expect(script).not.toContain('unsafe-eval')
  })

  test('v2 deep links get the policy too', async ({ request }) => {
    const res = await request.get(`${BASE}/v2/app/word`)
    expect(res.headers()['content-security-policy']).toContain("default-src 'self'")
  })

  test('the parent domain path redirects to the one canonical address', async ({ request }) => {
    const res = await request.get(`${BASE}/app/word?x=1`, {
      headers: { Host: 'johnson-rose.co.uk' },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(301)
    expect(res.headers().location).toBe('https://devante.johnson-rose.co.uk/app/word?x=1')
  })

  for (const [path, status] of [
    ['/lib/security.php', 403],
    ['/tests/php/security_test.php', 403],
    ['/.env', 403],
  ] as const) {
    test(`${path} stays blocked`, async ({ request }) => {
      expect((await request.get(BASE + path)).status()).toBe(status)
    })
  }
})

test.describe('deep link injection', () => {
  const payloads = [
    "/app/'+alert(1)+'",
    '/app/%27+alert(1)+%27',
    "/app/';alert(1);//",
    '/app/</script><script>alert(1)</script>',
    '/app/%3C/script%3E%3Cscript%3Ealert(1)%3C/script%3E',
  ]

  for (const payload of payloads) {
    test(`does not run ${payload}`, async ({ page }) => {
      let dialog = false
      page.on('dialog', (d) => {
        dialog = true
        void d.dismiss()
      })
      await prepare(page, [])
      await page.goto(BASE + payload, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => document.documentElement.dataset.osMode)
      await page.waitForTimeout(300)
      expect(dialog).toBe(false)
      expect(await page.evaluate(() => (window as unknown as { portfolioConfig: { appToOpen: string } }).portfolioConfig.appToOpen)).toBe('')
    })
  }

  test('real deep links now work at the site root', async ({ page }) => {
    await prepare(page, [])
    await page.goto(`${BASE}/app/calculator`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('dialog', { name: 'Calculator', exact: true })).toBeVisible()
  })
})

for (const [build, path] of [['v1', '/'], ['v2', '/v2/']] as const) {
  test.describe(`${build} under its Content-Security-Policy`, () => {
    test('boots and runs every app with no violations', async ({ page }) => {
      test.setTimeout(120_000)
      const violations: string[] = []
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await prepare(page, violations)
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => document.documentElement.dataset.osMode)
      await page.waitForTimeout(1200)

      for (const [app, title] of APPS) {
        await page.locator('.os-taskbar').waitFor()
        if (build === 'v1') {
          await page.evaluate((a) => (window as unknown as { Alpine: { store: (n: string) => { openApp: (x: string) => void } } }).Alpine.store('os').openApp(a), app)
        } else {
          await page.goto(`${BASE}/v2/app/${app}`, { waitUntil: 'domcontentloaded' })
        }
        await expect(page.getByRole('dialog', { name: title, exact: true })).toBeVisible()
        await page.waitForTimeout(350)
      }

      expect(violations).toEqual([])
      const unexpected = errors.filter(
        (e) => !/reading 'note'|education is not defined|referencesVault|refs is not defined/.test(e),
      )
      expect(unexpected).toEqual([])
    })

    test('Google sign-in can load in Admin Console', async ({ page }) => {
      const violations: string[] = []
      let requested = false
      await prepare(page, violations)
      await page.route('https://accounts.google.com/gsi/client', (route) => {
        requested = true
        return route.fulfill({ contentType: 'text/javascript', body: '' })
      })
      await page.route('**/api/admin_me.php', (route) =>
        route.fulfill({ json: { authenticated: false, client_id: 'test-client' } }),
      )
      await page.goto(`${BASE}${build === 'v1' ? '/app/admin' : '/v2/app/admin'}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('dialog', { name: 'Admin Console', exact: true })).toBeVisible()
      await expect.poll(() => requested).toBe(true)
      expect(violations).toEqual([])
    })
  })
}

test('v1 analytics can load once a visitor accepts', async ({ page }) => {
  const violations: string[] = []
  let requested = false
  await prepare(page, violations)
  await page.route('https://www.googletagmanager.com/**', (route) => {
    requested = true
    return route.fulfill({ contentType: 'text/javascript', body: '' })
  })
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.dataset.osMode)
  await page.evaluate(() =>
    (window as unknown as { Alpine: { store: (n: string) => { setCookieConsent: (v: boolean) => void } } }).Alpine
      .store('os')
      .setCookieConsent(true),
  )
  await expect.poll(() => requested).toBe(true)
  expect(violations).toEqual([])
})

test('v1 Admin charts can load', async ({ page }) => {
  const violations: string[] = []
  let requested = false
  await prepare(page, violations)
  await page.route('https://cdn.jsdelivr.net/**', (route) => {
    requested = true
    return route.fulfill({ contentType: 'text/javascript', body: '' })
  })
  await page.route('**/api/admin_me.php', (route) =>
    route.fulfill({ json: { authenticated: true, email: 'owner@example.com', client_id: 'test-client' } }),
  )
  await page.route('**/api/stats.php*', (route) => route.fulfill({ json: {} }))
  await page.goto(`${BASE}/app/admin`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('dialog', { name: 'Admin Console', exact: true })).toBeVisible()
  await expect.poll(() => requested, { timeout: 8000 }).toBe(true)
  expect(violations).toEqual([])
})

test('v1 Notepad escapes what it shows', async ({ page }) => {
  await prepare(page, [])
  let dialog = false
  page.on('dialog', (d) => {
    dialog = true
    void d.dismiss()
  })
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.dataset.osMode)
  await page.evaluate(() =>
    (window as unknown as { Alpine: { store: (n: string) => { openApp: (a: string, t: string, e: object) => void } } }).Alpine
      .store('os')
      .openApp('notepad', 'test.txt', { fileContent: '<img src=x onerror=alert(1)> https://example.com' }),
  )
  const win = page.getByRole('dialog', { name: 'test.txt', exact: true })
  await expect(win.getByText('<img src=x onerror=alert(1)>')).toBeVisible()
  await expect(win.locator('a[href="https://example.com"]')).toBeVisible()
  expect(dialog).toBe(false)
})

test('v2 print keeps the page styled, with no third-party script', async ({ page, context }) => {
  const violations: string[] = []
  await prepare(page, violations)
  await page.goto(`${BASE}/v2/app/word`, { waitUntil: 'domcontentloaded' })
  const win = page.getByRole('dialog', { name: 'Word', exact: true })
  await win.waitFor()
  await page.waitForTimeout(800)
  await context.addInitScript(() => {
    window.print = () => {}
  })

  const popupPromise = page.waitForEvent('popup')
  await win.getByRole('button', { name: /print/i }).first().click()
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')
  expect(await popup.locator('link[rel="stylesheet"], style').count()).toBeGreaterThan(0)
  expect(await popup.locator('script[src*="tailwind"]').count()).toBe(0)
  expect(violations).toEqual([])
})
