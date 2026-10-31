import { describe, it, expect, beforeEach } from 'vitest'
import appPhp from '../../../api/app.php?raw'
import { appManifest, getManifestEntry, pinnedApps, startPinnedApps } from './manifest'
import { apps, getApp } from './registry'
import { useOsStore } from '../store/osStore'

const ids = Object.keys(appManifest).sort()
const partials = Object.keys(import.meta.glob('../../../partials/apps/*.php'))
const images = new Set(Object.keys(import.meta.glob('../../../assets/img/**/*')))

describe('shared app manifest (data/apps.json)', () => {
  it('lists every app v2 has a component for', () => {
    expect(Object.keys(apps).sort()).toEqual(ids)
  })

  it('lists every app v1 has a partial for', () => {
    const names = partials.map((path) => path.split('/').pop()?.replace('.php', ''))
    expect(names.sort()).toEqual(ids)
  })

  it('matches the allowlist in api/app.php', () => {
    const allowed = appPhp.match(/\$allowed = \[([\s\S]*?)\];/)?.[1] ?? ''
    const names = [...allowed.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort()
    expect(names).toEqual(ids)
  })

  it('points every app at an icon that exists', () => {
    for (const { id, icon } of Object.values(appManifest)) {
      const path = `../../../assets/img/${decodeURIComponent(icon)}`
      expect(images.has(path), `${id}: missing ${icon}`).toBe(true)
    }
  })

  it('gives every app a title and a usable size', () => {
    for (const { id, title, size } of Object.values(appManifest)) {
      expect(title.length, id).toBeGreaterThan(0)
      expect(size.w, id).toBeGreaterThanOrEqual(320)
      expect(size.h, id).toBeGreaterThanOrEqual(320)
    }
  })

  it('only pins real apps', () => {
    expect(pinnedApps.length).toBeGreaterThan(0)
    for (const id of pinnedApps) expect(appManifest[id], id).toBeDefined()
  })

  it('only pins real apps to Start', () => {
    expect(startPinnedApps.length).toBeGreaterThan(0)
    for (const id of startPinnedApps) expect(appManifest[id], id).toBeDefined()
  })

  it('does not pin an app to Start twice', () => {
    expect(new Set(startPinnedApps).size).toBe(startPinnedApps.length)
  })

  it('keeps Admin Console out of the Start pins', () => {
    expect(startPinnedApps).not.toContain('admin')
  })

  it('does not treat object built-ins as apps', () => {
    expect(getManifestEntry('constructor')).toBeUndefined()
    expect(getManifestEntry('does-not-exist')).toBeUndefined()
  })

  it('drives the registry', () => {
    const word = getApp('word')
    expect(word?.title).toBe(appManifest.word.title)
    expect(word?.defaultSize).toEqual(appManifest.word.size)
    expect(word?.icon).toBe(`/assets/img/${appManifest.word.icon}`)
  })
})

describe('openApp defaults', () => {
  beforeEach(() => {
    useOsStore.setState({ windows: [] })
  })

  const opened = () => useOsStore.getState().windows[0]

  it('uses the real title and size when called with only an id', () => {
    useOsStore.getState().openApp('taskmanager')
    expect(opened().title).toBe('Task Manager')
    useOsStore.setState({ windows: [] })
    useOsStore.getState().openApp('calculator')
    expect(opened()).toMatchObject({ title: 'Calculator', width: 320, height: 480 })
  })

  it('lets a caller override the title, as document apps do', () => {
    useOsStore.getState().openApp('notepad', 'notes.txt')
    expect(opened().title).toBe('notes.txt')
  })

  it('lets a caller override the size', () => {
    useOsStore.getState().openApp('calculator', undefined, { size: { w: 500, h: 500 } })
    expect(opened()).toMatchObject({ width: 500, height: 500 })
  })

  it('still opens an app missing from the manifest', () => {
    useOsStore.getState().openApp('mystery')
    expect(opened()).toMatchObject({ title: 'Mystery', width: 800, height: 600 })
  })
})
