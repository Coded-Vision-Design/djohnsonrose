import { test, expect } from '@playwright/test'

// Cache headers, against the real stack like security.spec.ts: Apache reading
// .htaccess and the production v2 build. Set SECURE_URL to a server like that.
const BASE = process.env.SECURE_URL ?? 'http://127.0.0.1:8799'

test.describe('cache headers', () => {
  test("keep v2's hashed files for a year", async ({ request }) => {
    const html = await (await request.get(`${BASE}/v2/`)).text()
    const files = [...html.matchAll(/\/v2\/assets\/[\w.-]+\.(?:js|css)/g)].map((m) => m[0])
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const res = await request.get(BASE + file)
      expect(res.status(), file).toBe(200)
      expect(res.headers()['cache-control'], file).toBe('public, max-age=31536000, immutable')
    }
  })

  test('leave the pages and unhashed files alone', async ({ request }) => {
    for (const path of ['/v2/', '/assets/css/app.css', '/assets/img/favicon.webp']) {
      const res = await request.get(BASE + path)
      expect(res.status(), path).toBe(200)
      expect(res.headers()['cache-control'] ?? '', path).not.toContain('immutable')
    }
  })
})
