import { describe, it, expect } from 'vitest'
import {
  VITAL_THRESHOLDS,
  RATING_COLOURS,
  TASK_MANAGER_TABS,
  rateVital,
  formatDuration,
  formatBytes,
  formatVitalValue,
  vitalThresholdText,
  clsFromShifts,
  inpFromEvents,
  createVitalsCollector,
  vitalCards,
  resourceGroup,
  resourceName,
  summariseDownloads,
  appOwnsFile,
  appFiles,
  windowStatusLabel,
  windowCountText,
  processRows,
  jsHeap,
  parseBuildInfo,
  loadBuildInfo,
  buildView,
  checkResultLabel,
  summariseChecks,
  formatDeployTime,
  tabAfterKey,
  type ResourceLike,
  type VitalsReading,
} from '../../../assets/js/windowing/metrics.js'
import registrySource from '../apps/registry.ts?raw'
import appsJson from '../../../data/apps.json'

// The figures Task Manager shows in both builds. Every one has to come from
// the browser or from build.json, so these pin the rules that turn those into
// words, and the rules that refuse anything that is not real.

const SHA = '0123456789abcdef0123456789abcdef01234567'

describe('rateVital', () => {
  it("uses Google's thresholds for every Web Vital", () => {
    expect(VITAL_THRESHOLDS).toEqual({
      LCP: [2500, 4000],
      CLS: [0.1, 0.25],
      INP: [200, 500],
      FID: [100, 300],
      FCP: [1800, 3000],
      TTFB: [800, 1800],
    })
    expect(rateVital('LCP', 1200)).toBe('good')
    expect(rateVital('LCP', 3000)).toBe('needs-improvement')
    expect(rateVital('LCP', 4500)).toBe('poor')
    expect(rateVital('CLS', 0.3)).toBe('poor')
  })

  it('counts a value on a threshold as the better band, as Google does', () => {
    expect(rateVital('LCP', 2500)).toBe('good')
    expect(rateVital('LCP', 4000)).toBe('needs-improvement')
    expect(rateVital('CLS', 0)).toBe('good')
    expect(rateVital('INP', 200)).toBe('good')
  })

  it('rates nothing that is not a measurement', () => {
    expect(rateVital('LCP', Number.NaN)).toBeNull()
    expect(rateVital('LCP', -1)).toBeNull()
    expect(rateVital('NOPE' as 'LCP', 10)).toBeNull()
  })

  it("has Google's colour for each band", () => {
    expect(RATING_COLOURS).toEqual({ good: '#0cce6b', 'needs-improvement': '#ffa400', poor: '#ff4e42' })
  })
})

describe('formatting', () => {
  it('shows milliseconds below a second and seconds above', () => {
    expect(formatDuration(0)).toBe('0 ms')
    expect(formatDuration(123.4)).toBe('123 ms')
    expect(formatDuration(999.4)).toBe('999 ms')
    expect(formatDuration(1234)).toBe('1.23 s')
  })

  it('rounds a value just under a second to seconds, never to "1000 ms"', () => {
    expect(formatDuration(999.6)).toBe('1.00 s')
  })

  it('shows bytes the way DevTools does', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(999)).toBe('999 B')
    expect(formatBytes(1000)).toBe('1.0 kB')
    expect(formatBytes(156_568)).toBe('156.6 kB')
    expect(formatBytes(3_132_363)).toBe('3.13 MB')
    expect(formatBytes(999_960)).toBe('1.00 MB')
  })

  it('refuses to dress up a size that is not one', () => {
    expect(formatBytes(-5)).toBe('')
    expect(formatBytes(Number.NaN)).toBe('')
    expect(formatDuration(Number.NaN)).toBe('')
  })

  it('shows layout shift as a score and the rest as times', () => {
    expect(formatVitalValue('CLS', 0)).toBe('0')
    expect(formatVitalValue('CLS', 0.0004)).toBe('< 0.001')
    expect(formatVitalValue('CLS', 0.12345)).toBe('0.123')
    expect(formatVitalValue('LCP', 2400)).toBe('2.40 s')
    expect(formatVitalValue('TTFB', 42)).toBe('42 ms')
  })

  it('states each threshold in words', () => {
    expect(vitalThresholdText('LCP')).toBe('Good up to 2.50 s, poor over 4.00 s')
    expect(vitalThresholdText('CLS')).toBe('Good up to 0.1, poor over 0.25')
    expect(vitalThresholdText('INP')).toBe('Good up to 200 ms, poor over 500 ms')
    expect(vitalThresholdText('NOPE' as 'LCP')).toBe('')
  })
})

describe('clsFromShifts', () => {
  it('adds shifts that come close together into one burst', () => {
    expect(clsFromShifts([{ value: 0.05, startTime: 100 }, { value: 0.04, startTime: 600 }])).toBeCloseTo(0.09)
  })

  it('keeps the worst burst, not the total', () => {
    const shifts = [
      { value: 0.05, startTime: 100 },
      { value: 0.05, startTime: 500 },
      // More than a second later, so a new burst starts.
      { value: 0.2, startTime: 3000 },
      { value: 0.01, startTime: 3500 },
    ]
    expect(clsFromShifts(shifts)).toBeCloseTo(0.21)
  })

  it('caps a burst at five seconds', () => {
    const shifts = Array.from({ length: 12 }, (_, i) => ({ value: 0.01, startTime: i * 900 }))
    // 0 to 4500 ms is one burst of six; the next starts at 5400 ms.
    expect(clsFromShifts(shifts)).toBeCloseTo(0.06)
  })

  it('leaves out shifts that follow input, and anything malformed', () => {
    expect(clsFromShifts([{ value: 0.5, startTime: 10, hadRecentInput: true }])).toBe(0)
    expect(clsFromShifts([])).toBe(0)
    expect(clsFromShifts(null as unknown as [])).toBe(0)
    expect(clsFromShifts([{ value: Number.NaN, startTime: 1 }])).toBe(0)
  })
})

describe('inpFromEvents', () => {
  const ev = (interactionId: number, duration: number) => ({ interactionId, duration })

  it('is the slowest interaction, taking the longest event in each', () => {
    expect(inpFromEvents([ev(1, 40), ev(1, 120), ev(2, 80)])).toBe(120)
  })

  it('ignores one slowest interaction in every fifty', () => {
    const events = Array.from({ length: 60 }, (_, i) => ev(i + 1, i === 0 ? 900 : 50 + i))
    // 60 interactions: the worst one (900) is skipped, so the next is used.
    expect(inpFromEvents(events)).toBe(109)
  })

  it('uses the browser count of interactions when it is larger', () => {
    const events = [ev(1, 900), ev(2, 100)]
    expect(inpFromEvents(events, 2)).toBe(900)
    expect(inpFromEvents(events, 120)).toBe(100)
  })

  it('has no value without an interaction', () => {
    expect(inpFromEvents([])).toBeNull()
    expect(inpFromEvents([ev(0, 300)])).toBeNull()
    expect(inpFromEvents(undefined as unknown as [])).toBeNull()
  })
})

/** A stand-in for the browser's PerformanceObserver that a test can feed. */
function fakeBrowser(types: string[], options: { interactionId?: boolean; hidden?: boolean; navigation?: object | null } = {}) {
  const observers: { type: string; callback: (list: { getEntries: () => unknown[] }) => void; queue: unknown[]; options: object }[] = []
  class FakeObserver {
    static supportedEntryTypes = types
    callback: (list: { getEntries: () => unknown[] }) => void
    record?: (typeof observers)[number]
    constructor(callback: (list: { getEntries: () => unknown[] }) => void) {
      this.callback = callback
    }
    observe(opts: { type: string }) {
      this.record = { type: opts.type, callback: this.callback, queue: [], options: opts }
      observers.push(this.record)
    }
    takeRecords() {
      const queued = this.record?.queue ?? []
      if (this.record) this.record.queue = []
      return queued
    }
    disconnect() {
      const at = observers.indexOf(this.record!)
      if (at >= 0) observers.splice(at, 1)
    }
  }
  const listeners: Record<string, () => void> = {}
  const perf = {
    now: () => 5000,
    interactionCount: undefined as number | undefined,
    bufferSize: 0,
    getEntriesByType: (type: string) =>
      type === 'navigation' && options.navigation !== null ? [options.navigation ?? { responseStart: 180, activationStart: 0 }] : [],
    getEntriesByName: () => [],
    setResourceTimingBufferSize(size: number) {
      this.bufferSize = size
    },
    addEventListener: (name: string, fn: () => void) => {
      listeners[name] = fn
    },
  }
  const doc = {
    visibilityState: options.hidden ? 'hidden' : 'visible',
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  class PerformanceEventTiming {}
  if (options.interactionId !== false) Object.defineProperty(PerformanceEventTiming.prototype, 'interactionId', { get: () => 0 })
  return {
    env: { PerformanceObserver: FakeObserver, performance: perf, document: doc, PerformanceEventTiming },
    perf,
    listeners,
    /** Queues entries for the observers of one type, as the browser would. */
    emit(type: string, entries: unknown[]) {
      for (const o of observers) if (o.type === type) o.queue.push(...entries)
    },
    /** Delivers what is queued, as the browser does in a later task. */
    deliver() {
      for (const o of [...observers]) {
        const entries = o.queue
        o.queue = []
        if (entries.length) o.callback({ getEntries: () => entries })
      }
    },
    observers,
  }
}

const ALL = ['largest-contentful-paint', 'layout-shift', 'event', 'first-input', 'paint', 'navigation', 'resource']

describe('createVitalsCollector', () => {
  it('reads every vital from what the browser reports', () => {
    const browser = fakeBrowser(ALL)
    const vitals = createVitalsCollector(browser.env)
    browser.emit('largest-contentful-paint', [{ startTime: 900 }, { startTime: 1450 }])
    browser.emit('layout-shift', [{ value: 0.02, startTime: 300, hadRecentInput: false }])
    browser.emit('event', [{ interactionId: 7, duration: 88 }])
    browser.emit('paint', [{ name: 'first-paint', startTime: 400 }, { name: 'first-contentful-paint', startTime: 420 }])
    const reading = vitals.read()
    expect(reading.LCP).toEqual({ supported: true, value: 1450, hidden: false })
    expect(reading.CLS).toEqual({ supported: true, value: 0.02 })
    expect(reading.interaction).toEqual({ id: 'INP', supported: true, value: 88, under: false })
    expect(reading.FCP).toEqual({ supported: true, value: 420, hidden: false })
    expect(reading.TTFB).toEqual({ supported: true, value: 180 })
  })

  it('reads entries the browser has queued but not yet delivered', () => {
    const browser = fakeBrowser(ALL)
    const vitals = createVitalsCollector(browser.env)
    browser.emit('paint', [{ name: 'first-contentful-paint', startTime: 300 }])
    expect(vitals.read().FCP.value).toBe(300)
    browser.deliver()
    expect(vitals.read().FCP.value).toBe(300)
  })

  it('asks for entries from before it started, and for a bigger resource list', () => {
    const browser = fakeBrowser(ALL)
    createVitalsCollector(browser.env)
    expect(browser.observers.every((o) => (o.options as { buffered?: boolean }).buffered)).toBe(true)
    expect(browser.perf.bufferSize).toBeGreaterThanOrEqual(1000)
    expect(browser.observers.find((o) => o.type === 'event')?.options).toMatchObject({ durationThreshold: 16 })
  })

  it('says a vital the browser cannot measure is unsupported, never zero', () => {
    const browser = fakeBrowser(['paint', 'navigation'])
    const reading = createVitalsCollector(browser.env).read()
    expect(reading.LCP).toEqual({ supported: false, value: null, hidden: false })
    expect(reading.CLS).toEqual({ supported: false, value: null })
    expect(reading.interaction).toEqual({ id: 'INP', supported: false, value: null, under: false })
  })

  it('falls back to First Input Delay where interactions cannot be told apart', () => {
    const browser = fakeBrowser(['event', 'first-input'], { interactionId: false })
    const vitals = createVitalsCollector(browser.env)
    expect(vitals.read().interaction).toEqual({ id: 'FID', supported: true, value: null, under: false })
    browser.emit('first-input', [{ startTime: 1000, processingStart: 1012.5, interactionId: 0 }])
    expect(vitals.read().interaction).toEqual({ id: 'FID', supported: true, value: 12.5, under: false })
  })

  it('knows when every interaction was too quick to report', () => {
    const browser = fakeBrowser(ALL)
    const vitals = createVitalsCollector(browser.env)
    expect(vitals.read().interaction.under).toBe(false)
    browser.perf.interactionCount = 3
    expect(vitals.read().interaction).toEqual({ id: 'INP', supported: true, value: null, under: true })
  })

  it('knows from the first input that an interaction happened, where the browser keeps no count', () => {
    const browser = fakeBrowser(ALL)
    const vitals = createVitalsCollector(browser.env)
    browser.emit('first-input', [{ startTime: 900, processingStart: 902, duration: 8, interactionId: 0 }])
    expect(vitals.read().interaction).toEqual({ id: 'INP', supported: true, value: null, under: true })
  })

  it('does not count paints from a page that loaded in a background tab', () => {
    const browser = fakeBrowser(ALL, { hidden: true })
    const vitals = createVitalsCollector(browser.env)
    browser.emit('largest-contentful-paint', [{ startTime: 900 }])
    browser.emit('paint', [{ name: 'first-contentful-paint', startTime: 420 }])
    expect(vitals.read().LCP).toEqual({ supported: true, value: null, hidden: true })
    expect(vitals.read().FCP).toEqual({ supported: true, value: null, hidden: true })
  })

  it('has no time to first byte without a navigation entry', () => {
    const browser = fakeBrowser(ALL, { navigation: null })
    expect(createVitalsCollector(browser.env).read().TTFB).toEqual({ supported: false, value: null })
  })

  it('notices when the resource list fills up', () => {
    const browser = fakeBrowser(ALL)
    const vitals = createVitalsCollector(browser.env)
    expect(vitals.read().resourcesFull).toBe(false)
    browser.listeners.resourcetimingbufferfull()
    expect(vitals.read().resourcesFull).toBe(true)
  })

  it('copes with a browser that has no PerformanceObserver at all', () => {
    const reading = createVitalsCollector({ PerformanceObserver: undefined, performance: undefined, document: undefined }).read()
    expect(reading.LCP.supported).toBe(false)
    expect(reading.TTFB.supported).toBe(false)
  })

  it('stops listening when asked', () => {
    const browser = fakeBrowser(ALL)
    const vitals = createVitalsCollector(browser.env)
    expect(browser.observers.length).toBeGreaterThan(0)
    vitals.stop()
    expect(browser.observers).toHaveLength(0)
  })
})

describe('vitalCards', () => {
  const reading = (patch: Partial<VitalsReading> = {}): VitalsReading => ({
    LCP: { supported: true, value: 2600, hidden: false },
    CLS: { supported: true, value: 0 },
    interaction: { id: 'INP', supported: true, value: 520, under: false },
    FCP: { supported: true, value: 900, hidden: false },
    TTFB: { supported: true, value: 120 },
    resourcesFull: false,
    ...patch,
  })

  it('shows the five vitals in order, rated and coloured', () => {
    const cards = vitalCards(reading())
    expect(cards.map((card) => card.id)).toEqual(['LCP', 'CLS', 'INP', 'FCP', 'TTFB'])
    expect(cards[0]).toMatchObject({
      name: 'Largest Contentful Paint',
      state: 'measured',
      value: '2.60 s',
      rating: 'needs-improvement',
      ratingLabel: 'Needs improvement',
      colour: '#ffa400',
      scale: 'Good up to 2.50 s, poor over 4.00 s',
    })
    expect(cards[1]).toMatchObject({ value: '0', rating: 'good', colour: '#0cce6b' })
    expect(cards[2]).toMatchObject({ name: 'Interaction to Next Paint', value: '520 ms', rating: 'poor', colour: '#ff4e42' })
  })

  it('says plainly when a browser cannot measure a vital', () => {
    const card = vitalCards(reading({ CLS: { supported: false, value: null } }))[1]
    expect(card).toMatchObject({ state: 'unsupported', value: 'Not measured in this browser', rating: 'none', ratingLabel: '', colour: null })
  })

  it('labels First Input Delay honestly when INP is not available', () => {
    const card = vitalCards(reading({ interaction: { id: 'FID', supported: true, value: 14, under: false } }))[2]
    expect(card).toMatchObject({ id: 'FID', name: 'First Input Delay', value: '14 ms', rating: 'good' })
    expect(card.note).toBe('This browser cannot measure INP.')
  })

  it('waits for an interaction rather than inventing one', () => {
    const waiting = vitalCards(reading({ interaction: { id: 'INP', supported: true, value: null, under: false } }))[2]
    expect(waiting).toMatchObject({ state: 'waiting', value: 'No interactions yet', rating: 'none' })
    const quick = vitalCards(reading({ interaction: { id: 'INP', supported: true, value: null, under: true } }))[2]
    expect(quick).toMatchObject({ state: 'measured', value: 'Under 16 ms', rating: 'good' })
  })

  it('explains a paint that was not measured in a background tab', () => {
    const card = vitalCards(reading({ LCP: { supported: true, value: null, hidden: true } }))[0]
    expect(card).toMatchObject({ state: 'waiting', value: 'Not measured', rating: 'none' })
    expect(card.note).toMatch(/background tab/)
  })
})

const res = (name: string, patch: Partial<ResourceLike> = {}): ResourceLike => ({
  name,
  initiatorType: 'other',
  transferSize: 1300,
  encodedBodySize: 1000,
  decodedBodySize: 1000,
  contentType: '',
  deliveryType: '',
  ...patch,
})

describe('resourceGroup', () => {
  it('trusts the content type the server sent first', () => {
    expect(resourceGroup(res('/v2/src/styles/globals.css', { contentType: 'text/javascript', initiatorType: 'script' }))).toBe('scripts')
    expect(resourceGroup(res('/assets/css/app.css', { contentType: 'text/css' }))).toBe('styles')
    expect(resourceGroup(res('/assets/img/a.webp', { contentType: 'image/webp' }))).toBe('images')
    expect(resourceGroup(res('/f.woff2', { contentType: 'font/woff2' }))).toBe('fonts')
    expect(resourceGroup(res('/api/weather.php', { contentType: 'application/json', initiatorType: 'fetch' }))).toBe('data')
    // A picture address that came back as a page is counted as what it was.
    expect(resourceGroup(res('/v2/assets/img/wallpaper-bloom.webp', { contentType: 'text/html', initiatorType: 'link' }))).toBe('other')
  })

  it('falls back to the file name, then to what asked for it', () => {
    expect(resourceGroup(res('https://x.test/selawk.woff2?v=1', { initiatorType: 'css' }))).toBe('fonts')
    expect(resourceGroup(res('/assets/js/alpine.min.js', { initiatorType: 'script' }))).toBe('scripts')
    expect(resourceGroup(res('/v2/@vite/client', { initiatorType: 'script' }))).toBe('scripts')
    expect(resourceGroup(res('/api/app.php?name=notepad', { initiatorType: 'fetch', contentType: 'text/html' }))).toBe('data')
    expect(resourceGroup(res('/data/portfolio.json'))).toBe('data')
    expect(resourceGroup(res('/assets/img/icon', { initiatorType: 'img' }))).toBe('images')
  })

  it('puts anything else under other', () => {
    expect(resourceGroup(res('/assets/sounds/start.mp3', { initiatorType: 'audio' }))).toBe('other')
    expect(resourceGroup(res('', {}))).toBe('other')
    expect(resourceGroup(null as unknown as ResourceLike)).toBe('other')
  })
})

describe('resourceName', () => {
  it('names a file by its last part, without cache-busting', () => {
    expect(resourceName('http://h.test/assets/js/windowing/metrics.js?v=123', 'http://h.test')).toBe('metrics.js')
    expect(resourceName('http://h.test/assets/img/fl%20studio.webp', 'http://h.test')).toBe('fl studio.webp')
  })

  it('keeps what an endpoint was asked for', () => {
    expect(resourceName('http://h.test/api/app.php?name=calculator', 'http://h.test')).toBe('app.php?name=calculator')
  })

  it('names the page itself and other sites plainly', () => {
    expect(resourceName('http://h.test/v2/', 'http://h.test')).toBe('/v2/')
    expect(resourceName('https://fonts.example/a/b.woff2', 'http://h.test')).toBe('fonts.example/b.woff2')
    expect(resourceName('not a url', 'http://h.test')).toBe('not a url')
  })
})

describe('summariseDownloads', () => {
  const origin = 'http://h.test'
  const entries = [
    res(`${origin}/app.js`, { contentType: 'text/javascript', transferSize: 5300, encodedBodySize: 5000, decodedBodySize: 20000 }),
    res(`${origin}/app.css`, { contentType: 'text/css', transferSize: 0, encodedBodySize: 3000, decodedBodySize: 9000 }),
    res(`${origin}/a.webp`, { contentType: 'image/webp', transferSize: 40300, encodedBodySize: 40000, decodedBodySize: 40000 }),
    res('https://cdn.example/x.png', { transferSize: 0, encodedBodySize: 0, decodedBodySize: 0 }),
    res(`${origin}/api/weather.php`, { contentType: 'application/json', initiatorType: 'fetch', transferSize: 0, decodedBodySize: 507, deliveryType: 'cache' }),
  ]
  const navigation = res(`${origin}/`, { initiatorType: 'navigation', contentType: 'text/html', transferSize: 136500, encodedBodySize: 136200, decodedBodySize: 136200 })

  it('groups every request and adds them up', () => {
    const summary = summariseDownloads(entries, { origin, navigation })
    expect(summary.groups.map((group) => group.id)).toEqual(['scripts', 'styles', 'images', 'fonts', 'data', 'other'])
    const byId = Object.fromEntries(summary.groups.map((group) => [group.id, group]))
    expect(byId.scripts).toMatchObject({ requests: 1, transferred: 5300, size: 20000, transferredText: '5.3 kB', sizeText: '20.0 kB' })
    expect(byId.fonts).toMatchObject({ requests: 0, transferred: 0, size: 0, transferredText: '0 B' })
    expect(byId.other).toMatchObject({ requests: 1, size: 136200 })
    expect(byId.images).toMatchObject({ requests: 2, transferred: 40300, size: 40000 })
    expect(summary.total).toMatchObject({ requests: 6, transferred: 182100, size: 205707, cached: 2, unreported: 1 })
  })

  it('says how many came from the cache, and how many sizes are unknown', () => {
    const { notes } = summariseDownloads(entries, { origin, navigation })
    expect(notes).toEqual([
      { id: 'cache', text: '2 requests came from the browser cache, so nothing was transferred for them.' },
      { id: 'unreported', text: '1 request from another site did not share its size.' },
    ])
    expect(summariseDownloads([entries[1]], { origin }).notes).toEqual([
      { id: 'cache', text: '1 request came from the browser cache, so nothing was transferred for it.' },
    ])
  })

  it('lists the largest files, biggest first, marking cache hits', () => {
    const { largest } = summariseDownloads(entries, { origin, navigation, limit: 3 })
    expect(largest.map((file) => file.name)).toEqual(['This page (/)', 'a.webp', 'app.js'])
    expect(largest[0]).toMatchObject({ url: `${origin}/`, group: 'other', groupLabel: 'Other', sizeText: '136.2 kB', cached: false })
    const css = summariseDownloads(entries, { origin, limit: 10 }).largest.find((file) => file.name === 'app.css')
    expect(css).toMatchObject({ cached: true, transferredText: '0 B' })
  })

  it('warns when the browser stopped listing downloads', () => {
    expect(summariseDownloads([], { origin, full: true }).notes).toEqual([
      { id: 'full', text: "The browser's list of downloads filled up, so later downloads are missing." },
    ])
  })

  it('treats a missing list as nothing downloaded', () => {
    const summary = summariseDownloads(undefined as unknown as [], { origin })
    expect(summary.total.requests).toBe(0)
    expect(summary.largest).toEqual([])
  })
})

describe('appOwnsFile', () => {
  it("finds v1's partial for an app", () => {
    expect(appOwnsFile('calculator', 'http://h.test/api/app.php?name=calculator')).toBe(true)
    expect(appOwnsFile('calculator', 'http://h.test/api/app.php?name=notepad')).toBe(false)
  })

  it("finds v2's code for an app, in development and in a build", () => {
    expect(appOwnsFile('terminal', 'http://h.test/v2/src/apps/terminal/commands.ts')).toBe(true)
    expect(appOwnsFile('taskmanager', 'http://h.test/v2/assets/TaskManager-Bc1_d2Ef.js')).toBe(true)
    expect(appOwnsFile('flstudio', 'http://h.test/assets/js/windowing/fl-studio.js?v=1')).toBe(true)
    expect(appOwnsFile('admin', 'http://h.test/v2/assets/AdminConsole-AbCdEf12.js')).toBe(true)
  })

  it('does not mistake one app for another with a longer name', () => {
    expect(appOwnsFile('photos', 'http://h.test/v2/assets/Photoshop-AbCdEf12.js')).toBe(false)
    expect(appOwnsFile('photos', 'http://h.test/v2/src/apps/photoshop/Photoshop.tsx')).toBe(false)
    expect(appOwnsFile('edge', 'http://h.test/assets/img/edge-glow.webp')).toBe(false)
  })

  it('knows the file name of every app component in v2', () => {
    const ids = (appsJson as { apps: { id: string }[] }).apps.map((app) => app.id)
    const imports = [...registrySource.matchAll(/import\('\.\/([a-z]+)\/([A-Za-z]+)'\)/g)]
    expect(imports.length).toBeGreaterThan(20)
    for (const [, folder, file] of imports) {
      expect(ids, folder).toContain(folder)
      expect(appOwnsFile(folder, `http://h.test/v2/assets/${file}-AbCdEf12.js`), file).toBe(true)
    }
  })

  it('owns nothing for a bad address or app', () => {
    expect(appOwnsFile('', 'http://h.test/app.js')).toBe(false)
    expect(appOwnsFile('calculator', '')).toBe(false)
  })
})

describe('appFiles and processRows', () => {
  const entries = [
    res('http://h.test/api/app.php?name=calculator', { initiatorType: 'fetch', transferSize: 2300, decodedBodySize: 2000 }),
    res('http://h.test/assets/js/components/calculator.js?v=1', { transferSize: 0, decodedBodySize: 1400, deliveryType: 'cache' }),
    res('http://h.test/assets/js/components/apps/system.js?v=1', { decodedBodySize: 8000 }),
  ]

  it('adds up the files named for an app', () => {
    expect(appFiles('calculator', entries)).toEqual({ files: 2, size: 3400, transferred: 2300, text: '2 files, 3.4 kB' })
    expect(appFiles('taskmanager', entries)).toEqual({ files: 0, size: 0, transferred: 0, text: 'None found' })
  })

  it('names window states in British English', () => {
    expect(windowStatusLabel('minimized')).toBe('Minimised')
    expect(windowStatusLabel('maximized')).toBe('Maximised')
    expect(windowStatusLabel('snapped')).toBe('Snapped')
    expect(windowStatusLabel('floating')).toBe('Open')
    expect(windowStatusLabel(undefined)).toBe('Open')
  })

  it('counts the open windows in words', () => {
    expect(windowCountText(1)).toBe('1 window open')
    expect(windowCountText(3)).toBe('3 windows open')
    expect(windowCountText(0)).toBe('No windows open')
    expect(windowCountText(Number.NaN)).toBe('No windows open')
  })

  it('makes one row per open window, from the store', () => {
    const rows = processRows(
      [
        { id: 1, app: 'calculator', title: 'Calculator', state: 'floating' },
        { id: 2, app: 'taskmanager', title: 'Task Manager', state: 'minimized' },
      ],
      entries,
    )
    expect(rows).toEqual([
      { id: 1, app: 'calculator', title: 'Calculator', status: 'Open', files: '2 files, 3.4 kB' },
      { id: 2, app: 'taskmanager', title: 'Task Manager', status: 'Minimised', files: 'None found' },
    ])
    expect(processRows(undefined as unknown as [], entries)).toEqual([])
  })
})

describe('jsHeap', () => {
  it("reads Chromium's heap figures", () => {
    const heap = jsHeap({ memory: { usedJSHeapSize: 10_000_000, totalJSHeapSize: 11_200_000, jsHeapSizeLimit: 3_760_000_000 } })
    expect(heap).toEqual({
      used: 10_000_000,
      total: 11_200_000,
      limit: 3_760_000_000,
      text: '10.00 MB used of 11.20 MB allocated, limit 3.76 GB',
    })
  })

  it('has nothing to show where the browser does not say', () => {
    expect(jsHeap({})).toBeNull()
    expect(jsHeap(undefined)).toBeNull()
    expect(jsHeap({ memory: { usedJSHeapSize: Number.NaN, totalJSHeapSize: 1, jsHeapSizeLimit: 1 } })).toBeNull()
  })
})

const build = (patch: Record<string, unknown> = {}) => ({
  schema: 1,
  commit: SHA,
  shortCommit: SHA.slice(0, 7),
  deployedAt: '2026-11-07T08:30:00Z',
  checks: {
    state: 'read',
    ranOn: 'pull-request',
    results: [
      { name: 'site-tests', result: 'success' },
      { name: 'browser-tests', result: 'failure' },
      { name: 'ios-safari', result: 'skipped' },
    ],
  },
  ...patch,
})

describe('parseBuildInfo', () => {
  it('accepts what the deploy writes', () => {
    const parsed = parseBuildInfo(build())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.build).toEqual({
      commit: SHA,
      shortCommit: '0123456',
      deployedAt: '2026-11-07T08:30:00Z',
      checks: {
        state: 'read',
        ranOn: 'pull-request',
        results: [
          { name: 'site-tests', result: 'success' },
          { name: 'browser-tests', result: 'failure' },
          { name: 'ios-safari', result: 'skipped' },
        ],
      },
    })
  })

  it('accepts a deploy whose checks could not be read, or found none', () => {
    expect(parseBuildInfo(build({ checks: { state: 'unreadable', results: [] } })).ok).toBe(true)
    expect(parseBuildInfo(build({ checks: { state: 'none', ranOn: 'commit', results: [] } })).ok).toBe(true)
  })

  it('drops anything it was not asked to show', () => {
    const parsed = parseBuildInfo(build({ repository: 'someone/somewhere', url: 'https://example.test' }))
    expect(parsed.ok && Object.keys(parsed.build)).toEqual(['commit', 'shortCommit', 'deployedAt', 'checks'])
  })

  it.each([
    ['not an object', 'hello'],
    ['null', null],
    ['an array', []],
    ['another schema', build({ schema: 2 })],
    ['a short commit', build({ commit: 'abc' })],
    ['a commit with capitals', build({ commit: SHA.toUpperCase(), shortCommit: SHA.slice(0, 7).toUpperCase() })],
    ['a short SHA from elsewhere', build({ shortCommit: 'fffffff' })],
    ['a date that is not one', build({ deployedAt: 'yesterday' })],
    ['a date out of range', build({ deployedAt: '2026-13-45T99:99:99Z' })],
    ['no checks', build({ checks: undefined })],
    ['an unknown check state', build({ checks: { state: 'great', results: [] } })],
    ['results without a source', build({ checks: { state: 'read', results: [{ name: 'a', result: 'success' }] } })],
    ['a read with no results', build({ checks: { state: 'read', ranOn: 'commit', results: [] } })],
    ['results on an unreadable state', build({ checks: { state: 'unreadable', results: [{ name: 'a', result: 'success' }] } })],
    ['a check with no name', build({ checks: { state: 'read', ranOn: 'commit', results: [{ name: '', result: 'success' }] } })],
    ['a check name with a line break', build({ checks: { state: 'read', ranOn: 'commit', results: [{ name: 'a\nb', result: 'success' }] } })],
    ['a check name that is too long', build({ checks: { state: 'read', ranOn: 'commit', results: [{ name: 'x'.repeat(101), result: 'success' }] } })],
    ['a result that is not a word', build({ checks: { state: 'read', ranOn: 'commit', results: [{ name: 'a', result: '<b>ok</b>' }] } })],
    ['too many checks', build({ checks: { state: 'read', ranOn: 'commit', results: Array.from({ length: 101 }, (_, i) => ({ name: `c${i}`, result: 'success' })) } })],
  ])('refuses %s', (_, value) => {
    expect(parseBuildInfo(value).ok).toBe(false)
  })
})

describe('loadBuildInfo', () => {
  const reply = (status: number, body: string) => () => Promise.resolve(new Response(body, { status }))

  it('reads a deployed build', async () => {
    const result = await loadBuildInfo(reply(200, JSON.stringify(build())))
    expect(result.state).toBe('deployed')
  })

  it('asks the server, not the cache', async () => {
    let init: RequestInit | undefined
    let asked = ''
    await loadBuildInfo((url: string, options?: RequestInit) => {
      asked = url
      init = options
      return Promise.resolve(new Response('{}', { status: 404 }))
    }, '/build.json')
    expect(asked).toBe('/build.json')
    expect(init?.cache).toBe('no-store')
  })

  it('calls a copy with no build.json a local build', async () => {
    expect(await loadBuildInfo(reply(404, 'Not found'))).toEqual({ state: 'local' })
  })

  it('says it could not read a broken or unreachable build.json', async () => {
    expect((await loadBuildInfo(reply(200, '<!doctype html>'))).state).toBe('unreadable')
    expect((await loadBuildInfo(reply(200, JSON.stringify({ schema: 1 })))).state).toBe('unreadable')
    expect((await loadBuildInfo(reply(500, 'oops'))).state).toBe('unreadable')
    expect((await loadBuildInfo(() => Promise.reject(new TypeError('offline')))).state).toBe('unreadable')
  })
})

describe('check results', () => {
  it('words each conclusion, with a tone for its colour', () => {
    expect(checkResultLabel('success')).toEqual({ label: 'Passed', tone: 'good' })
    expect(checkResultLabel('failure')).toEqual({ label: 'Failed', tone: 'poor' })
    expect(checkResultLabel('timed_out')).toEqual({ label: 'Timed out', tone: 'poor' })
    expect(checkResultLabel('pending')).toEqual({ label: 'Not finished at deploy', tone: 'warn' })
    expect(checkResultLabel('skipped')).toEqual({ label: 'Skipped', tone: 'neutral' })
  })

  it('shows a conclusion it does not know in its own words', () => {
    expect(checkResultLabel('brand_new_state')).toEqual({ label: 'Brand new state', tone: 'neutral' })
  })

  it('sums the results up, worst first', () => {
    expect(summariseChecks([{ result: 'success' }, { result: 'success' }, { result: 'failure' }, { result: 'skipped' }])).toBe(
      '1 failed, 2 passed, 1 skipped',
    )
    expect(summariseChecks([{ result: 'success' }])).toBe('1 passed')
    expect(summariseChecks([])).toBe('')
  })
})

describe('buildView', () => {
  it('shows the short commit, the deploy time and every check', () => {
    const parsed = parseBuildInfo(build())
    if (!parsed.ok) throw new Error('fixture')
    const view = buildView({ state: 'deployed', build: parsed.build }, { timeZone: 'UTC' })
    expect(view).toMatchObject({
      state: 'deployed',
      title: 'Deployed build',
      commit: '0123456',
      deployed: '7 Nov 2026, 08:30 UTC',
      checksTitle: 'Checks on the merged pull request',
      checksMessage: '1 failed, 1 passed, 1 skipped',
    })
    expect(view.checks).toEqual([
      { name: 'site-tests', label: 'Passed', tone: 'good' },
      { name: 'browser-tests', label: 'Failed', tone: 'poor' },
      { name: 'ios-safari', label: 'Skipped', tone: 'neutral' },
    ])
    // The full SHA, the account and the repository are never shown.
    expect(JSON.stringify(view)).not.toContain(SHA)
  })

  it('says plainly when the checks could not be read, or none ran', () => {
    const unreadable = parseBuildInfo(build({ checks: { state: 'unreadable', results: [] } }))
    const none = parseBuildInfo(build({ checks: { state: 'none', ranOn: 'commit', results: [] } }))
    if (!unreadable.ok || !none.ok) throw new Error('fixture')
    expect(buildView({ state: 'deployed', build: unreadable.build }).checksMessage).toBe(
      'The check results could not be read when this was deployed.',
    )
    expect(buildView({ state: 'deployed', build: none.build })).toMatchObject({
      checksTitle: 'Checks on this commit',
      checksMessage: 'No checks ran on this commit.',
      checks: [],
    })
  })

  it('names a local build and an unreadable one', () => {
    expect(buildView({ state: 'local' })).toMatchObject({ state: 'local', title: 'Local build', commit: '', checks: [] })
    expect(buildView({ state: 'unreadable' })).toMatchObject({ state: 'unreadable', title: 'Build information could not be read' })
    expect(buildView(null)).toMatchObject({ state: 'loading', title: 'Reading build information' })
  })

  it('formats the deploy time in the zone it is read in, or not at all', () => {
    expect(formatDeployTime('2026-06-01T12:05:00Z', { timeZone: 'Europe/London' })).toBe('1 Jun 2026, 13:05 BST')
    expect(formatDeployTime('nonsense')).toBe('')
  })
})

describe('tabs', () => {
  it('lists the three tabs', () => {
    expect(TASK_MANAGER_TABS.map((tab) => tab.label)).toEqual(['Processes', 'Performance', 'Build'])
  })

  it('moves along the tabs with the arrow keys, wrapping round', () => {
    expect(tabAfterKey('ArrowRight', 0, 3)).toBe(1)
    expect(tabAfterKey('ArrowRight', 2, 3)).toBe(0)
    expect(tabAfterKey('ArrowLeft', 0, 3)).toBe(2)
    expect(tabAfterKey('Home', 2, 3)).toBe(0)
    expect(tabAfterKey('End', 0, 3)).toBe(2)
  })

  it('ignores other keys', () => {
    expect(tabAfterKey('Enter', 1, 3)).toBeNull()
    expect(tabAfterKey('ArrowRight', 0, 0)).toBeNull()
  })
})
