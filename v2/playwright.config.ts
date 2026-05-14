import { defineConfig, devices } from '@playwright/test'

// Playwright assumes a Vite dev server is already running on :5173 with PHP
// on :8765 (the /api and /assets proxies need that). We don't start servers
// from the config — the npm script runs them, fails fast if missing.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    // Disable animations so the boot screen + sign-in animation tests are
    // less timing-sensitive.
    actionTimeout: 8_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
})
