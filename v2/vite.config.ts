import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Local-dev helper: any request that lands on Vite outside the /v2/ base
// gets redirected to the PHP server. This makes the v1↔v2 cross-link
// buttons in the taskbar "just work" without per-host wiring.
function redirectRootToPhp(): Plugin {
  return {
    name: 'redirect-root-to-php',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/'
        if (
          !url.startsWith('/v2/') &&
          url !== '/v2' &&
          !url.startsWith('/@') && // Vite's internal HMR routes
          !url.startsWith('/node_modules/') &&
          !url.startsWith('/api/') &&
          !url.startsWith('/assets/') &&
          !url.startsWith('/data/') &&
          !url.startsWith('/portfolio/') &&
          url !== '/favicon.ico' &&
          (url === '/' || url.startsWith('/?') || url.startsWith('/app/') || url === '/desktop' || url === '/login')
        ) {
          res.writeHead(302, { Location: 'http://localhost:8765' + url })
          res.end()
          return
        }
        next()
      })
    },
  }
}

// The React build lives under /v2/ in production (parallel to the PHP version).
// In dev, Vite serves at http://localhost:5173/v2/.
// API calls use the unprefixed path /api/*.php — proxied to the PHP server in
// dev, and served directly by Apache in production.
export default defineConfig({
  base: '/v2/',
  plugins: [react(), redirectRootToPhp()],
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
