import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The PHP server Vite hands shared files to. Set PHP_ORIGIN to run more than one copy at once.
const PHP_ORIGIN = process.env.PHP_ORIGIN ?? 'http://localhost:8765'

// Local-dev helper: any request that lands on Vite outside the /v2/ base
// gets redirected to the PHP server. This makes the v1↔v2 cross-link
// buttons in the taskbar "just work" without per-host wiring. The PHP server
// also decides which pages under /v2/ are v2's: see the second middleware.
function redirectRootToPhp(): Plugin {
  return {
    name: 'redirect-root-to-php',
    configureServer(server) {
      // In production Apache answers a /v2/ address that is neither v2's desktop
      // nor an app's with v1's 404 page (see .htaccess). PHP's dev server knows
      // the same addresses (v2_address_known in lib/routes.php): it sends v2's
      // back here and answers the rest with that page, which is passed on.
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/'
        const pathname = url.split('?')[0]
        const page = req.method === 'GET' && (req.headers.accept ?? '').includes('text/html')
        if (
          !page ||
          !pathname.startsWith('/v2/') ||
          /^\/v2\/(@|src\/|node_modules\/)/.test(pathname) || // Vite's own files
          /\.\w+$/.test(pathname) // files, such as /v2/manifest.json
        ) {
          next()
          return
        }
        fetch(PHP_ORIGIN + url, { headers: { accept: 'text/html' }, redirect: 'manual' })
          .then(async (php) => {
            if (php.status !== 404) {
              next()
              return
            }
            res.writeHead(404, {
              'Content-Type': php.headers.get('content-type') ?? 'text/html; charset=UTF-8',
              'Content-Security-Policy': php.headers.get('content-security-policy') ?? "default-src 'none'",
            })
            res.end(await php.text())
          })
          // Without the PHP server, the page is v2's, as before.
          .catch(() => next())
      })
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
          (url === '/' || url.startsWith('/?') || url.startsWith('/app/') || url === '/desktop' || url === '/login' || url === '/cv')
        ) {
          res.writeHead(302, { Location: PHP_ORIGIN + url })
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
// API calls use the unprefixed path /api/*.php - proxied to the PHP server in
// dev, and served directly by Apache in production.
export default defineConfig({
  base: '/v2/',
  plugins: [react(), redirectRootToPhp()],
  server: {
    port: 5173,
    // data/apps.json is shared with v1 and sits outside the Vite root.
    fs: { allow: ['..'] },
    proxy: {
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
