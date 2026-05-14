import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Playwright owns e2e — keep them out of the Vitest run.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
