import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import storeJs from '../../../assets/js/components/os/store.js?raw'
import { playSound, type SoundType } from './sounds'
import { useOsStore } from '../store/osStore'

// Both builds play the same files from assets/sounds/. They are AAC in .m4a,
// which every browser plays, at a fraction of the size of the old WAVs.
const files = new Set(
  Object.keys(import.meta.glob('../../../assets/sounds/**/*')).map((p) => p.replace('../../../', '/')),
)
// Windows has no click, open or minimise sounds, so neither build plays them.
const TYPES: SoundType[] = ['startup', 'error', 'notify', 'recycle', 'uac']

const played: string[] = []
class RecordingAudio {
  volume = 1
  src: string
  constructor(src: string) {
    this.src = src
    played.push(src)
  }
  play() {
    return Promise.resolve()
  }
}

function setSettings(patch: Partial<ReturnType<typeof useOsStore.getState>['settings']>) {
  useOsStore.setState((s) => ({ settings: { ...s.settings, ...patch } }))
}

describe('playSound', () => {
  beforeEach(() => {
    played.length = 0
    vi.stubGlobal('Audio', RecordingAudio)
    setSettings({ sound: true, theme: 'light', volume: 50 })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('plays the sign-in sound as AAC', () => {
    playSound('startup')
    expect(played).toEqual(['/assets/sounds/Windows Logon.m4a'])
  })

  it('uses the dark-mode copy only for the sounds that have one', () => {
    setSettings({ theme: 'dark' })
    playSound('notify')
    playSound('error')
    expect(played).toEqual(['/assets/sounds/dm/Windows Notify.m4a', '/assets/sounds/Windows Error.m4a'])
  })

  it('plays nothing when sound is off', () => {
    setSettings({ sound: false })
    playSound('startup')
    expect(played).toEqual([])
  })

  it('only ever asks for an .m4a file that exists, in either theme', () => {
    for (const theme of ['light', 'dark'] as const) {
      setSettings({ theme })
      for (const type of TYPES) playSound(type)
    }
    expect(played).toHaveLength(TYPES.length * 2)
    for (const src of played) {
      expect(src, src).toMatch(/\.m4a$/)
      expect(files.has(src), `missing ${src}`).toBe(true)
    }
  })
})

describe('v1 sound player (assets/js/components/os/store.js)', () => {
  it('points every sound at an .m4a file that exists', () => {
    const paths = [...storeJs.matchAll(/'assets\/sounds\/([^']+)'/g)].map((m) => `/assets/sounds/${m[1]}`)
    expect(paths.length).toBeGreaterThanOrEqual(TYPES.length)
    for (const path of paths) {
      if (path.endsWith('/')) continue // the folder swap for dark mode
      expect(path, path).toMatch(/\.m4a$/)
      expect(files.has(path), `missing ${path}`).toBe(true)
    }
  })

  it('has a dark-mode copy of every sound it swaps in dark mode', () => {
    const list = storeJs.match(/const dmVariants = \[([^\]]*)\]/)?.[1] ?? ''
    const names = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) expect(files.has(`/assets/sounds/dm/${name}`), name).toBe(true)
  })

  it('keeps no WAV file that nothing plays', () => {
    expect([...files].filter((f) => f.endsWith('.wav'))).toEqual([])
  })
})
