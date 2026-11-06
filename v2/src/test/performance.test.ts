import { describe, expect, it } from 'vitest'
import shellPhp from '../../../partials/shell.php?raw'
import storeJs from '../../../assets/js/components/os/store.js?raw'
import systemJs from '../../../assets/js/components/apps/system.js?raw'
import settingsTsx from '../apps/settings/Settings.tsx?raw'
import desktopTsx from '../shell/Desktop.tsx?raw'
import lockScreenTsx from '../shell/LockScreen.tsx?raw'
import indexHtml from '../../index.html?raw'
import { useOsStore } from '../store/osStore'

// Vitest hands back CSS imported with ?raw as an empty string, so stylesheets are read from disk.
const { readFileSync } = (
  globalThis as unknown as {
    process: { getBuiltinModule(id: 'node:fs'): { readFileSync(path: URL, encoding: 'utf8'): string } }
  }
).process.getBuiltinModule('node:fs')
const css = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const inputCss = css('../../../assets/css/input.css')
const globalsCss = css('../styles/globals.css')
const fontsCss = css('../../../assets/css/fonts.css')

// A file the build only copies is globbed rather than imported.
const raw = (files: Record<string, unknown>) => Object.values(files)[0] as string | undefined
const assetsHtaccess = raw(import.meta.glob('../../public/assets/.htaccess', { query: '?raw', import: 'default', eager: true }))
const images = new Set(Object.keys(import.meta.glob('../../../assets/img/**/*')).map((p) => p.replace('../../../', '/')))
const fonts = new Set(Object.keys(import.meta.glob('../../../assets/fonts/**/*')).map((p) => p.replace('../../../', '/')))

const WALLPAPER = 'wallpaper-bloom.webp'

describe('default wallpaper', () => {
  it('is a local file in both builds, not a hot-linked one', () => {
    expect(images.has(`/assets/img/${WALLPAPER}`)).toBe(true)
    expect(useOsStore.getState().settings.wallpaper).toBe(`/assets/img/${WALLPAPER}`)
    const v1Default = storeJs.match(/wallpaper: localStorage\.getItem\('settings\.wallpaper'\) \|\| (.+),$/m)?.[1]
    expect(v1Default).toBe(`window.portfolioConfig.imgPath + '${WALLPAPER}'`)
  })

  it('is the Bloom choice in Settings in both builds, so it shows as selected', () => {
    expect(systemJs).toMatch(new RegExp(`\\{ id: 'Bloom', url: window\\.portfolioConfig\\.imgPath \\+ '${WALLPAPER}' \\}`))
    expect(settingsTsx).toMatch(new RegExp(`\\{ id: 'Bloom', url: '/assets/img/${WALLPAPER}' \\}`))
  })

  it('is preloaded by both pages', () => {
    expect(shellPhp).toMatch(new RegExp(`<link rel="preload" as="image" href="<\\?php echo IMG_PATH; \\?>${WALLPAPER}"`))
    expect(indexHtml).toMatch(new RegExp(`<link rel="preload" as="image" href="/assets/img/${WALLPAPER}"`))
  })

  it('has the same fallback colour behind it in both builds', () => {
    const v1 = shellPhp.match(/\.wallpaper-bg \{[^}]*background-color: (#[0-9a-f]{6});/)?.[1]
    expect(v1).toMatch(/^#[0-9a-f]{6}$/)
    expect(desktopTsx).toContain(`bg-[${v1}]`)
    expect(lockScreenTsx).toContain(`bg-[${v1}]`)
  })
})

describe('self-hosted Selawik', () => {
  it('is declared once in a stylesheet both builds import', () => {
    expect(inputCss).toContain("@import './fonts.css';")
    expect(globalsCss).toContain("@import '../../../assets/css/fonts.css';")
  })

  it('swaps in when ready and points at woff2 files that exist', () => {
    const faces = fontsCss.match(/@font-face \{[^}]*\}/g) ?? []
    expect(faces.length).toBeGreaterThanOrEqual(4)
    for (const face of faces) {
      expect(face).toContain("font-family: 'Selawik';")
      expect(face).toContain('font-display: swap;')
      // From the site root: v2's build does not rebase relative URLs in this shared file.
      const url = face.match(/url\('\/assets\/fonts\/([^']+)'\) format\('woff2'\)/)?.[1]
      expect(fonts.has(`/assets/fonts/${url}`), `missing ${url}`).toBe(true)
    }
  })

  it('ships its licence', () => {
    expect(fonts.has('/assets/fonts/selawik/LICENSE.txt')).toBe(true)
  })

  it('comes after Segoe UI Variable and Segoe UI in the same stack in both builds', () => {
    const stack = (css: string) => css.match(/body \{\s*font-family: ([^;]+);/)?.[1]
    expect(stack(inputCss)).toBe("'Segoe UI Variable', 'Segoe UI', Selawik, Tahoma, Geneva, Verdana, sans-serif")
    expect(stack(globalsCss)).toBe(stack(inputCss))
  })
})

describe('caching', () => {
  it('versions every v1 script by its file time, not the request time', () => {
    const loop = shellPhp.match(/foreach \(\$components as \$component\) \{([\s\S]*?)\}/)?.[1] ?? ''
    expect(loop).toContain("assets/js/components/'")
    expect(loop).toContain('filemtime(')
    expect(loop).not.toMatch(/'\?v=' \. time\(\)/)
  })

  it("marks v2's hashed files immutable for a year", () => {
    expect(assetsHtaccess).toMatch(/Header set Cache-Control "public, max-age=31536000, immutable"/)
  })
})
