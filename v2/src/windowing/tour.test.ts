import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  TOUR_KEY,
  TOUR_OFFER,
  TOUR_RESUME_MS,
  TOUR_STEPS,
  TOUR_STEP_MS,
  createTour,
  findTourAnchor,
  followTour,
  phoneDock,
  placeTourToast,
  positionTour,
  rememberTourOffered,
  shouldOfferTour,
  tourRing,
  tourSteps,
  type TourStep,
} from '../../../assets/js/windowing/tour.js'

/** A Storage stand-in, which can be made to throw as blocked storage does. */
function memoryStorage(initial: Record<string, string> = {}, blocked = false) {
  const items = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => {
      if (blocked) throw new Error('blocked')
      return items.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      if (blocked) throw new Error('blocked')
      items.set(key, value)
    },
    items,
  }
}

const STEPS: TourStep[] = [
  { id: 'one', title: 'One', text: 'First.', anchor: '#one' },
  { id: 'two', title: 'Two', text: 'Second.', anchor: '#two', phoneAnchor: '#two-phone' },
  { id: 'three', title: 'Three', text: 'Third.', anchor: '#three', phoneAnchor: null },
]

describe('the tour steps', () => {
  it('runs in order: Start, the CV, the work, Terminal, the two builds, then the end', () => {
    expect(TOUR_STEPS.map((step) => step.id)).toEqual(['start', 'cv', 'work', 'terminal', 'build', 'done'])
  })

  it('takes about a minute, ten seconds a step', () => {
    expect(TOUR_STEP_MS).toBe(10_000)
    expect(TOUR_STEPS.length * TOUR_STEP_MS).toBe(60_000)
    expect(TOUR_OFFER.text).toContain('60-second tour')
  })

  it('keeps each toast to one or two short sentences, in plain British English', () => {
    for (const step of TOUR_STEPS) {
      const sentences = step.text.split(/(?<=[.?!])\s+/)
      expect(sentences.length, step.id).toBeLessThanOrEqual(2)
      expect(step.text.length, step.id).toBeLessThanOrEqual(120)
      expect(step.title.length, step.id).toBeLessThanOrEqual(20)
      expect(`${step.title} ${step.text}`, step.id).not.toMatch(/[–—]|--/)
    }
  })

  it('points at what each step describes, and the end points back at Start', () => {
    const anchors = Object.fromEntries(TOUR_STEPS.map((step) => [step.id, step.anchor]))
    expect(anchors.start).toBe('[data-start-button]')
    expect(anchors.cv).toBe('[data-desktop-item="CV - DeVanté Johnson-Rose.pdf"]')
    expect(anchors.work).toBe('[data-taskbar-app="explorer"]')
    expect(anchors.terminal).toBe('[data-desktop-item="Terminal"]')
    expect(anchors.build).toBe('[data-tray-item="build"]')
    expect(anchors.done).toBe('[data-start-button]')
  })

  it('keeps every step on a computer and a tablet', () => {
    expect(tourSteps('desktop')).toEqual(TOUR_STEPS)
    expect(tourSteps('tablet')).toEqual(TOUR_STEPS)
  })

  it('points the build step at the desktop icon on a phone, where the chip is hidden', () => {
    const phone = tourSteps('phone')
    expect(phone.map((step) => step.id)).toEqual(TOUR_STEPS.map((step) => step.id))
    expect(phone.find((step) => step.id === 'build')?.anchor).toBe('[data-desktop-item$=" Build"]')
    expect(phone.find((step) => step.id === 'start')?.anchor).toBe('[data-start-button]')
  })

  it('leaves out a step with nothing to point at on a phone, and keeps the order', () => {
    const phone = tourSteps('phone', STEPS)
    expect(phone.map((step) => step.id)).toEqual(['one', 'two'])
    expect(phone[1].anchor).toBe('#two-phone')
  })

  it('does not change the steps it is given', () => {
    const copy = structuredClone(STEPS)
    tourSteps('phone', STEPS)
    expect(STEPS).toEqual(copy)
  })

  it('has no steps for an empty list', () => {
    expect(tourSteps('phone', [])).toEqual([])
  })
})

describe('remembering the offer', () => {
  it('offers the tour to a visitor it has not offered it to', () => {
    expect(shouldOfferTour(memoryStorage())).toBe(true)
  })

  it('does not offer it again once remembered', () => {
    const storage = memoryStorage()
    rememberTourOffered(storage)
    expect(storage.items.get(TOUR_KEY)).toBe('offered')
    expect(shouldOfferTour(storage)).toBe(false)
  })

  it('shares one record between the builds, under one key', () => {
    expect(TOUR_KEY).toBe('os.tour')
    expect(shouldOfferTour(memoryStorage({ [TOUR_KEY]: 'offered' }))).toBe(false)
  })

  it('does not offer it where storage is blocked, as it could not remember', () => {
    const storage = memoryStorage({}, true)
    expect(shouldOfferTour(storage)).toBe(false)
    expect(() => rememberTourOffered(storage)).not.toThrow()
    expect(shouldOfferTour(null)).toBe(false)
  })
})

describe('placing the toast', () => {
  const area = { width: 1440, height: 852 }
  const size = { width: 360, height: 150 }
  const rect = (left: number, top: number, width: number, height: number) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  })

  it('sits above a taskbar button, centred on it', () => {
    const start = rect(600, 856, 40, 40)
    expect(placeTourToast(start, size, area)).toEqual({ left: 440, top: 856 - 12 - 150, side: 'above' })
  })

  it('stays on the screen when the taskbar button is near an edge', () => {
    const chip = rect(1300, 860, 96, 32)
    expect(placeTourToast(chip, size, area).left).toBe(1440 - 16 - 360)
    expect(placeTourToast(rect(4, 860, 40, 32), size, area).left).toBe(16)
  })

  it('sits beside a desktop icon, level with it', () => {
    const icon = rect(16, 236, 110, 100)
    expect(placeTourToast(icon, size, area)).toEqual({ left: 16 + 110 + 12, top: 236, side: 'right' })
  })

  it('goes to the left of an icon with no room on its right', () => {
    const icon = rect(1300, 236, 110, 100)
    expect(placeTourToast(icon, size, area)).toEqual({ left: 1300 - 12 - 360, top: 236, side: 'left' })
  })

  it('keeps clear of the taskbar beside a low icon', () => {
    const icon = rect(16, 800, 110, 40)
    expect(placeTourToast(icon, size, area).top).toBe(852 - 16 - 150)
  })

  it('goes below or above an icon on a screen too narrow for either side', () => {
    const narrow = { width: 420, height: 852 }
    expect(placeTourToast(rect(150, 100, 110, 100), size, narrow)).toEqual({ left: 25, top: 212, side: 'below' })
    expect(placeTourToast(rect(150, 700, 110, 100), size, narrow)).toEqual({ left: 25, top: 538, side: 'above' })
  })

  it('sits in the corner above the clock when there is nothing to point at', () => {
    expect(placeTourToast(null, size, area)).toEqual({ left: 1440 - 16 - 360, top: 852 - 16 - 150, side: 'corner' })
  })

  it('falls back to the corner when nothing fits', () => {
    const tiny = { width: 300, height: 200 }
    expect(placeTourToast(rect(100, 50, 100, 100), size, tiny).side).toBe('corner')
  })

  it('docks a phone toast above the taskbar unless it would cover what it points at', () => {
    const docked = { top: 446, bottom: 616 }
    expect(phoneDock({ top: 236, bottom: 311 }, docked)).toBe('dock')
    expect(phoneDock({ top: 620, bottom: 660 }, docked)).toBe('dock')
    expect(phoneDock({ top: 456, bottom: 531 }, docked)).toBe('dock-top')
    expect(phoneDock({ top: 400, bottom: 450 }, docked)).toBe('dock-top')
    expect(phoneDock(null, docked)).toBe('dock')
  })

  it('draws the ring a little outside the element', () => {
    expect(tourRing(rect(10, 20, 40, 40))).toEqual({ left: 6, top: 16, width: 48, height: 48 })
    expect(tourRing(null)).toBeNull()
  })
})

describe('finding what a step points at', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** jsdom lays nothing out, so an element counts as shown when it says so. */
  const shown = (el: Element | null, visible: boolean) => {
    if (el) el.getClientRects = () => (visible ? [{}] : []) as unknown as DOMRectList
  }

  it('finds the element the step points at', () => {
    document.body.innerHTML = '<button data-start-button></button>'
    shown(document.querySelector('[data-start-button]'), true)
    expect(findTourAnchor({ anchor: '[data-start-button]' })).toBe(document.querySelector('[data-start-button]'))
  })

  it('falls back to the phone anchor when the first is hidden, as the chip is on a narrow screen', () => {
    document.body.innerHTML = '<a data-tray-item="build"></a><div data-desktop-item="PHP Build"></div>'
    shown(document.querySelector('[data-tray-item]'), false)
    shown(document.querySelector('[data-desktop-item]'), true)
    const step = TOUR_STEPS.find((s) => s.id === 'build') as TourStep
    expect(findTourAnchor(step)).toBe(document.querySelector('[data-desktop-item]'))
  })

  it('finds nothing when nothing is shown, or the step points nowhere', () => {
    document.body.innerHTML = '<button data-start-button></button>'
    shown(document.querySelector('[data-start-button]'), false)
    expect(findTourAnchor({ anchor: '[data-start-button]' })).toBeNull()
    expect(findTourAnchor({ anchor: null })).toBeNull()
    expect(findTourAnchor(null)).toBeNull()
  })
})

describe('moving the toast and ring into place', () => {
  const box = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect

  /** A desktop with a taskbar at 852, an icon at (16, 236) and a 360 by 150 toast. jsdom lays nothing out. */
  function scene() {
    document.body.innerHTML =
      '<div class="os-taskbar"></div><div data-desktop-item="Terminal"></div><section data-tour-toast></section><div data-tour-ring hidden></div>'
    const taskbar = document.querySelector('.os-taskbar') as HTMLElement
    const icon = document.querySelector('[data-desktop-item]') as HTMLElement
    const toast = document.querySelector('[data-tour-toast]') as HTMLElement
    const ring = document.querySelector('[data-tour-ring]') as HTMLElement
    taskbar.getBoundingClientRect = () => box(0, 852, 1440, 48)
    icon.getBoundingClientRect = () => box(16, 236, 110, 96)
    icon.getClientRects = () => [{}] as unknown as DOMRectList
    Object.defineProperty(toast, 'offsetWidth', { value: 360 })
    Object.defineProperty(toast, 'offsetHeight', { value: 150 })
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1440, configurable: true })
    return { icon, toast, ring }
  }
  const terminal = TOUR_STEPS.find((step) => step.id === 'terminal') as TourStep

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('puts the toast beside the icon and the ring round it', () => {
    const { toast, ring } = scene()
    positionTour(toast, ring, terminal, 'desktop')
    expect([toast.style.left, toast.style.top, toast.dataset.tourSide]).toEqual(['138px', '236px', 'right'])
    expect(ring.hidden).toBe(false)
    expect([ring.style.left, ring.style.top, ring.style.width, ring.style.height]).toEqual(['12px', '232px', '118px', '104px'])
  })

  it('leaves a phone toast to the stylesheet, which docks it above the taskbar', () => {
    const { toast, ring } = scene()
    toast.style.left = '5px'
    Object.defineProperty(toast, 'offsetTop', { value: 470 })
    positionTour(toast, ring, terminal, 'phone')
    expect([toast.style.left, toast.style.top, toast.dataset.tourSide]).toEqual(['', '', 'dock'])
    expect(ring.hidden).toBe(false)
  })

  it('docks a phone toast at the top when above the taskbar it would cover the icon', () => {
    const { icon, toast, ring } = scene()
    icon.getBoundingClientRect = () => box(126, 456, 110, 75)
    Object.defineProperty(toast, 'offsetTop', { value: 446 })
    positionTour(toast, ring, terminal, 'phone')
    expect(toast.dataset.tourSide).toBe('dock-top')
  })

  it('hides the ring and uses the corner when there is nothing to point at', () => {
    const { toast, ring } = scene()
    ring.hidden = false
    positionTour(toast, ring, null, 'desktop')
    expect(ring.hidden).toBe(true)
    expect([toast.style.left, toast.style.top, toast.dataset.tourSide]).toEqual(['1064px', '686px', 'corner'])
  })

  it('places it again when the icon changes size or the window resizes, until stopped', () => {
    const { icon, toast, ring } = scene()
    const watched: Element[] = []
    let resized = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized = callback
        }
        observe(el: Element) {
          watched.push(el)
        }
        disconnect() {
          watched.length = 0
        }
      },
    )
    const stop = followTour(toast, ring, terminal, 'desktop')
    expect(watched).toEqual([toast, icon])
    expect(ring.style.height).toBe('104px')

    icon.getBoundingClientRect = () => box(16, 236, 110, 120)
    resized()
    expect(ring.style.height).toBe('128px')
    icon.getBoundingClientRect = () => box(16, 300, 110, 120)
    window.dispatchEvent(new Event('resize'))
    expect(toast.style.top).toBe('300px')

    stop()
    expect(watched).toEqual([])
    icon.getBoundingClientRect = () => box(16, 400, 110, 120)
    window.dispatchEvent(new Event('resize'))
    expect(toast.style.top).toBe('300px')
  })
})

describe('running the tour', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const running = (storage = memoryStorage()) => {
    const tour = createTour({ storage })
    tour.start(STEPS)
    return tour
  }

  it('starts idle', () => {
    const tour = createTour({ storage: memoryStorage() })
    expect(tour.getState()).toMatchObject({ status: 'idle', step: null, count: '', announcement: '' })
  })

  it('offers the tour after a first sign-in, and remembers that it did', () => {
    const storage = memoryStorage()
    const tour = createTour({ storage })
    tour.signedIn()
    expect(tour.getState()).toMatchObject({ status: 'offer', announcement: 'New here? Take a 60-second tour.' })
    expect(storage.items.get(TOUR_KEY)).toBe('offered')
  })

  it('does not offer it again after a later sign-in', () => {
    const storage = memoryStorage()
    const first = createTour({ storage })
    first.signedIn()
    first.skip()
    const later = createTour({ storage })
    later.signedIn()
    expect(later.getState().status).toBe('idle')
  })

  it('waits for the cookie question to be answered before offering', () => {
    const storage = memoryStorage()
    const tour = createTour({ storage })
    tour.block(true)
    tour.signedIn()
    expect(tour.getState().status).toBe('idle')
    expect(storage.items.has(TOUR_KEY)).toBe(false)
    tour.block(false)
    expect(tour.getState().status).toBe('offer')
    expect(storage.items.get(TOUR_KEY)).toBe('offered')
  })

  it('drops a waiting offer when the visitor signs out', () => {
    const tour = createTour({ storage: memoryStorage() })
    tour.block(true)
    tour.signedIn()
    tour.reset()
    tour.block(false)
    expect(tour.getState().status).toBe('idle')
  })

  it('turns the offer down with No thanks', () => {
    const tour = createTour({ storage: memoryStorage() })
    tour.signedIn()
    tour.skip()
    expect(tour.getState().status).toBe('idle')
  })

  it('shows each step with its count', () => {
    const tour = running()
    expect(tour.getState()).toMatchObject({ status: 'running', index: 0, total: 3, count: '1 of 3', last: false })
    expect(tour.getState().step?.id).toBe('one')
    expect(tour.getState().announcement).toBe('One, 1 of 3. First.')
  })

  it('moves on with Next, and ends after the last step', () => {
    const tour = running()
    tour.next()
    expect(tour.getState()).toMatchObject({ index: 1, count: '2 of 3' })
    tour.next()
    expect(tour.getState()).toMatchObject({ index: 2, count: '3 of 3', last: true })
    tour.next()
    expect(tour.getState()).toMatchObject({ status: 'idle', step: null, announcement: '' })
  })

  it('moves on by itself after ten seconds', () => {
    const tour = running()
    vi.advanceTimersByTime(TOUR_STEP_MS - 1)
    expect(tour.getState().index).toBe(0)
    vi.advanceTimersByTime(1)
    expect(tour.getState().index).toBe(1)
    vi.advanceTimersByTime(TOUR_STEP_MS * 2)
    expect(tour.getState().status).toBe('idle')
  })

  it('waits while the toast is hovered or focused, and goes on when it is left', () => {
    const tour = running()
    vi.advanceTimersByTime(4_000)
    tour.hold('hover', true)
    tour.hold('focus', true)
    vi.advanceTimersByTime(60_000)
    expect(tour.getState().index).toBe(0)
    tour.hold('hover', false)
    vi.advanceTimersByTime(60_000)
    expect(tour.getState().index).toBe(0)
    tour.hold('focus', false)
    vi.advanceTimersByTime(6_000 - 1)
    expect(tour.getState().index).toBe(0)
    vi.advanceTimersByTime(1)
    expect(tour.getState().index).toBe(1)
  })

  it('gives a step a moment more when it is left with almost no time to run', () => {
    const tour = running()
    vi.advanceTimersByTime(TOUR_STEP_MS - 100)
    tour.hold('hover', true)
    tour.hold('hover', false)
    vi.advanceTimersByTime(TOUR_RESUME_MS - 1)
    expect(tour.getState().index).toBe(0)
    vi.advanceTimersByTime(1)
    expect(tour.getState().index).toBe(1)
  })

  it('forgets a hover when the toast moves to the next step, as it moves from under the pointer', () => {
    const tour = running()
    tour.hold('hover', true)
    tour.next()
    vi.advanceTimersByTime(TOUR_STEP_MS)
    expect(tour.getState().index).toBe(2)
  })

  it('keeps waiting across steps while focus stays in the toast', () => {
    const tour = running()
    tour.hold('focus', true)
    tour.next()
    vi.advanceTimersByTime(TOUR_STEP_MS * 3)
    expect(tour.getState().index).toBe(1)
  })

  it('stops at once when skipped, and no timer is left behind', () => {
    const tour = running()
    tour.skip()
    expect(tour.getState().status).toBe('idle')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('starts again from the first step when replayed mid-tour', () => {
    const tour = running()
    tour.next()
    tour.start(STEPS)
    expect(tour.getState().index).toBe(0)
    vi.advanceTimersByTime(TOUR_STEP_MS - 1)
    expect(tour.getState().index).toBe(0)
  })

  it('does nothing for an empty tour, or for Next and holds when idle', () => {
    const tour = createTour({ storage: memoryStorage() })
    tour.start([])
    expect(tour.getState().status).toBe('idle')
    tour.next()
    tour.hold('hover', true)
    expect(tour.getState().status).toBe('idle')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('tells its listeners about each change, and stops when asked', () => {
    const tour = createTour({ storage: memoryStorage() })
    const seen: string[] = []
    const stop = tour.subscribe((state) => seen.push(`${state.status}:${state.index}`))
    tour.start(STEPS)
    tour.next()
    stop()
    tour.next()
    expect(seen).toEqual(['running:0', 'running:1'])
  })

  it('keeps the same state object until something changes', () => {
    const tour = running()
    const before = tour.getState()
    tour.hold('hover', true)
    expect(tour.getState()).toBe(before)
    tour.next()
    expect(tour.getState()).not.toBe(before)
  })

  it('ends the tour when the visitor signs out', () => {
    const tour = running()
    tour.reset()
    expect(tour.getState().status).toBe('idle')
    expect(vi.getTimerCount()).toBe(0)
  })
})
