import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The React build lives under /v2/ in production (parallel to the PHP version).
// In dev, Vite serves at http://localhost:5173/v2/.
// API calls use the unprefixed path /api/*.php — proxied to the PHP server in
// dev, and served directly by Apache in production.
export default defineConfig({
  base: '/v2/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8765',
        changeOrigin: true,
      },
      // Share sounds/images/wallpapers with the PHP version in dev.
      // In production Apache serves these from /assets/ directly.
      '/assets': {
        target: 'http://localhost:8765',
        changeOrigin: true,
      },
      // Static data files (projects.json, portfolio.json, cv.pdf, etc.)
      // shared with the PHP version.
      '/data': {
        target: 'http://localhost:8765',
        changeOrigin: true,
      },
      // Portfolio thumbnails live at /portfolio/*.webp on the PHP side.
      '/portfolio': {
        target: 'http://localhost:8765',
        changeOrigin: true,
      },
      // Favicon is shared at root with v1. (v2's manifest is served directly
      // by Vite from public/ at /v2/manifest.json — no proxy needed.)
      '/favicon.ico': {
        target: 'http://localhost:8765',
        changeOrigin: true,
      },
    },
  },
})
