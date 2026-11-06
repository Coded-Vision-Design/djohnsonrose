import { describe, expect, it } from 'vitest'
import shellPhp from '../../../partials/shell.php?raw'
import storeJs from '../../../assets/js/components/os/store.js?raw'
import systemJs from '../../../assets/js/components/apps/system.js?raw'
import settingsTsx from '../apps/settings/Settings.tsx?raw'
import desktopTsx from '../shell/Desktop.tsx?raw'
import lockScreenTsx from '../shell/LockScreen.tsx?raw'
import indexHtml from '../../index.html?raw'
import { useOsStore } from '../store/osStore'

// A file the build only copies is globbed rather than imported.
const raw = (files: Record<string, unknown>) => Object.values(files)[0] as string | undefined
const assetsHtaccess = raw(import.meta.glob('../../public/assets/.htaccess', { query: '?raw', import: 'default', eager: true }))
const images = new Set(Object.keys(import.meta.glob('../../../assets/img/**/*')).map((p) => p.replace('../../../', '/')))

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
