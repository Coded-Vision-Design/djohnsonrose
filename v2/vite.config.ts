import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The PHP server Vite hands shared files to. Set PHP_ORIGIN to run more than one copy at once.
const PHP_ORIGIN = process.env.PHP_ORIGIN ?? 'http://localhost:8765'

// The React build lives under /v2/ in production (parallel to the PHP version).
// In dev, Vite serves at http://localhost:5173/v2/.
// API calls use the unprefixed path /api/*.php - proxied to the PHP server in
// dev, and served directly by Apache in production.
export default defineConfig({
  base: '/v2/',
  plugins: [react()],
  server: {
    port: 5173,
    // data/apps.json is shared with v1 and sits outside the Vite root.
    fs: { allow: ['..'] },
    proxy: {
      // v1's own pages, so that both builds share one origin in dev as they do
      // on the host. The build switch's hand-off lives in session storage,
      // which only that origin can read (see assets/js/windowing/handoff.js).
      '^/(?:app/[^/?#]+|desktop|login|cv|privacy|manifest\\.json)?/?(?:[?#].*)?$': {
        target: PHP_ORIGIN,
        changeOrigin: true,
      },
      '/api': {
        target: PHP_ORIGIN,
        changeOrigin: true,
      },
      // Share sounds/images/wallpapers with the PHP version in dev.
      // In production Apache serves these from /assets/ directly.
      '/assets': {
        target: PHP_ORIGIN,
        changeOrigin: true,
      },
      // Static data files (projects.json, portfolio.json, cv.pdf, etc.)
      // shared with the PHP version.
      '/data': {
        target: PHP_ORIGIN,
        changeOrigin: true,
      },
      // Portfolio thumbnails live at /portfolio/*.webp on the PHP side.
      '/portfolio': {
        target: PHP_ORIGIN,
        changeOrigin: true,
      },
      // Favicon is shared at root with v1. (v2's manifest is served directly
      // by Vite from public/ at /v2/manifest.json - no proxy needed.)
      '/favicon.ico': {
        target: PHP_ORIGIN,
        changeOrigin: true,
      },
    },
  },
})
