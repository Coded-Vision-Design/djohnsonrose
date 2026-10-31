import { describe, it, expect, vi } from 'vitest'
import {
  buildMenu,
  placeMenu,
  prepareFileSystem,
  searchOs,
} from '../../../assets/js/windowing/shell-core.js'
import menus from '../../../data/menus.json'
import fileSystem from '../../../data/filesystem.json'
import { filesystem } from '../data/filesystem'

const IMG = '/assets/img/'

describe('prepareFileSystem', () => {
  const options = {
    imgPath: IMG,
    basePath: '/',
    otherBuild: { name: 'PHP Build', url: '/', icon: 'php.webp' },
  }

  it('adds this build’s paths to icons and files', () => {
    const out = prepareFileSystem(
      { 'C:\\': [{ name: 'a.webp', type: 'image', icon: 'win11/image.webp', url: 'portfolio/a.webp' }] },
      options,
    )
    expect(out['C:\\'][0]).toMatchObject({ icon: '/assets/img/win11/image.webp', url: '/portfolio/a.webp' })
  })

  it('leaves emoji icons and web addresses alone', () => {
    const out = prepareFileSystem(
      { 'C:\\': [{ name: 'a', type: 'file', icon: '🖼️', url: 'https://example.com/a.webp' }] },
      options,
    )
    expect(out['C:\\'][0]).toMatchObject({ icon: '🖼️', url: 'https://example.com/a.webp' })
  })

  it('turns the build switch into a link to the other build', () => {
    const out = prepareFileSystem({ 'C:\\': [{ type: 'buildSwitch' }] }, options)
    expect(out['C:\\'][0]).toEqual({ name: 'PHP Build', type: 'link', url: '/', icon: '/assets/img/php.webp' })
  })

  it('does not change the data it was given', () => {
    const data = { 'C:\\': [{ name: 'a', type: 'file', icon: 'a.webp' }] }
    prepareFileSystem(data, options)
    expect(data['C:\\'][0].icon).toBe('a.webp')
  })

  it('reaches every item in data/filesystem.json', () => {
    const items = Object.values(fileSystem).flat()
    expect(Object.values(filesystem).flat()).toHaveLength(items.length)
    expect(items.length).toBeGreaterThan(200)
  })
})

describe('searchOs', () => {
  const apps = [
    { id: 'edge', title: 'Chrome', icon: '/chrome.webp' },
    { id: 'paint', title: 'Paint', icon: '/paint.webp' },
    { id: 'pdfreader', title: 'PDF Reader', icon: '/pdf.webp' },
  ]
  const files = {
    'C:\\Desktop': [
      { name: 'Chrome', type: 'app', app: 'edge', icon: '/chrome.webp' },
      { name: 'CV.pdf', type: 'app', app: 'pdfreader', icon: '/pdf.webp' },
      { name: 'paint notes.txt', type: 'file', icon: '/txt.webp' },
    ],
    'C:\\Program Files': [{ name: 'chrome.exe', type: 'app', app: 'edge', icon: '/chrome.webp' }],
    'C:\\Recycle Bin': [{ name: 'painted.txt', type: 'file', icon: '/txt.webp' }],
  }

  it('finds apps first, then files, ignoring case', () => {
    expect(searchOs('PAINT', apps, files).map((r) => r.name)).toEqual(['Paint', 'paint notes.txt'])
  })

  it('finds nothing for an empty search or an unknown name', () => {
    expect(searchOs('', apps, files)).toEqual([])
    expect(searchOs('no such thing', apps, files)).toEqual([])
  })

  it('lists an app once when a shortcut to it has the same name', () => {
    expect(searchOs('chrome', apps, files).map((r) => r.name)).toEqual(['Chrome', 'chrome.exe'])
  })

  it('keeps a document that opens in a listed app', () => {
    expect(searchOs('pdf', apps, files).map((r) => r.name)).toEqual(['PDF Reader', 'CV.pdf'])
  })

  it('leaves out what is in the Recycle Bin', () => {
    expect(searchOs('painted', apps, files)).toEqual([])
  })

  it('stops at the limit and says where each file is', () => {
    const many = { 'C:\\Stuff': Array.from({ length: 30 }, (_, i) => ({ name: `a${i}`, type: 'file', icon: '' })) }
    const results = searchOs('a', [], many)
    expect(results).toHaveLength(10)
    expect(results[0].fullPath).toBe('C:\\Stuff')
  })
})

describe('buildMenu', () => {
  const menu = {
    actions: [{ id: 'delete', label: 'Delete', icon: 'win11/delete.svg' }],
    items: [
      { id: 'open', label: 'Open', icon: 'win11/open.svg' },
      { separator: true },
      { id: 'extra', label: 'Extra', icon: 'win11/open.svg' },
      { separator: true },
      { id: 'more', label: 'More', icon: 'win11/more.svg', disabled: true },
    ],
  }

  it('adds this build’s image path and handlers', () => {
    const open = vi.fn()
    const built = buildMenu(menu, IMG, { open })
    expect(built.items[0]).toMatchObject({ label: 'Open', icon: '/assets/img/win11/open.svg' })
    built.items[0].action?.()
    expect(open).toHaveBeenCalledOnce()
    expect(built.actions[0].icon).toBe('/assets/img/win11/delete.svg')
  })

  it('gives an item with no handler an action that does nothing', () => {
    expect(() => buildMenu(menu, IMG).items[2].action?.()).not.toThrow()
  })

  it('applies changes for one item, such as a new label', () => {
    const built = buildMenu(menu, IMG, {}, { open: { label: 'Open it', disabled: true } })
    expect(built.items[0]).toMatchObject({ label: 'Open it', disabled: true })
  })

  it('drops a hidden item and the separator it leaves behind', () => {
    const built = buildMenu(menu, IMG, {}, { extra: { hidden: true } })
    expect(built.items.map((item) => item.label ?? 'line')).toEqual(['Open', 'line', 'More'])
  })

  it('defaults to the modern style', () => {
    expect(buildMenu(menu, IMG).variant).toBe('modern')
    expect(buildMenu({ variant: 'classic', items: [] }, IMG).variant).toBe('classic')
  })
})

describe('data/menus.json', () => {
  const all = Object.entries(menus).flatMap(([name, menu]) =>
    [...menu.items, ...(('actions' in menu && menu.actions) || [])].map((item) => ({ name, item })),
  )
  const images = new Set(Object.keys(import.meta.glob('../../../assets/img/**/*')))

  it('gives every item an image that exists', () => {
    for (const { name, item } of all) {
      if ('separator' in item) continue
      expect(images.has(`../../../assets/img/${item.icon}`), `${name}: ${item.id} ${item.icon}`).toBe(true)
    }
  })

  it('gives every item an id and a label', () => {
    for (const { name, item } of all) {
      if ('separator' in item) continue
      expect(item.id, name).toBeTruthy()
      expect(item.label, name).toBeTruthy()
    }
  })

  it('keeps Show more options off the classic menu', () => {
    expect(menus.desktopClassic.items.some((item) => 'id' in item && item.id === 'classic')).toBe(false)
  })
})

describe('placeMenu', () => {
  const viewport = { width: 1000, height: 800 }
  const menu = { variant: 'modern', actions: [], items: [{ label: 'A' }, { label: 'B' }] }

  it('opens at the pointer when there is room', () => {
    expect(placeMenu(100, 100, menu, viewport)).toEqual({ x: 100, y: 100 })
  })

  it('stays on screen near the far corner', () => {
    const { x, y } = placeMenu(995, 795, menu, viewport)
    expect(x).toBeLessThan(760)
    expect(y).toBeLessThan(795)
  })

  it('stays on screen near the top left', () => {
    expect(placeMenu(0, 0, menu, viewport)).toEqual({ x: 8, y: 8 })
  })

  it('opens above the pointer from the taskbar', () => {
    expect(placeMenu(100, 780, menu, viewport, true).y).toBeLessThan(780)
  })
})
