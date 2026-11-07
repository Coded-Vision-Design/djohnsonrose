// The guided tour, shared by both builds: a minute of toasts, each pointing at
// part of the desktop. The steps, where each toast goes, how long it stays and
// whether the visitor has been offered the tour all live here, so that neither
// build can drift from the other. Each build only draws the toast.

/** One record for both builds, which share an origin and so their storage. */
export const TOUR_KEY = 'os.tour'
/** How long a step stays before the tour moves on by itself. */
export const TOUR_STEP_MS = 10000
/** The least time a step has left once the visitor stops hovering or focusing it. */
export const TOUR_RESUME_MS = 2000

const GAP = 12
const MARGIN = 16
const RING_PAD = 4

export const TOUR_OFFER = {
  title: 'New here?',
  text: 'Take a 60-second tour.',
  start: 'Start tour',
  dismiss: 'No thanks',
}

/**
 * What the tour says, in order. Each anchor is a selector for what the step
 * describes. phoneAnchor stands in on a phone, or null leaves the step out there.
 */
export const TOUR_STEPS = [
  {
    id: 'start',
    title: 'Start and search',
    text: 'Start has every app under All apps. Its search finds apps and files.',
    anchor: '[data-start-button]',
  },
  {
    id: 'cv',
    title: 'The CV',
    text: 'Short on time? Open the CV here, or go to /cv, which Recruiter on the sign-in screen opens too.',
    anchor: '[data-desktop-item="CV - DeVanté Johnson-Rose.pdf"]',
  },
  {
    id: 'work',
    title: 'The work',
    text: "File Explorer's Projects folder holds the work. Word opens the CV as a document.",
    anchor: '[data-taskbar-app="explorer"]',
  },
  {
    id: 'terminal',
    title: 'Terminal',
    text: 'Terminal takes typed commands. Type help to list them.',
    anchor: '[data-desktop-item="Terminal"]',
  },
  {
    id: 'build',
    title: 'Two builds',
    text: 'This site is built twice, in PHP and in React, and both work the same. Switch between them here.',
    anchor: '[data-tray-item="build"]',
    // The chip is hidden on narrow screens, where the desktop icon does its job.
    phoneAnchor: '[data-desktop-item$=" Build"]',
  },
  {
    id: 'done',
    title: "That's the tour",
    text: 'Replay it any time from Start, under Recommended.',
    anchor: '[data-start-button]',
  },
]

/** The steps for a phone, tablet or desktop, in order. */
export function tourSteps(mode, steps = TOUR_STEPS) {
  if (mode !== 'phone') return steps
  return steps
    .filter((step) => step.phoneAnchor !== null)
    .map((step) => (step.phoneAnchor === undefined ? step : { ...step, anchor: step.phoneAnchor }))
}

/** Whether to offer the tour: never twice, and never where storage cannot remember it. */
export function shouldOfferTour(storage) {
  try {
    return !!storage && storage.getItem(TOUR_KEY) === null
  } catch {
    return false
  }
}

export function rememberTourOffered(storage) {
  try {
    storage?.setItem(TOUR_KEY, 'offered')
  } catch {
    // Blocked storage: shouldOfferTour already says no there.
  }
}

/** The first of a step's anchors that is on screen, or null. */
export function findTourAnchor(step, root = globalThis.document) {
  if (!step || !root) return null
  for (const selector of [step.anchor, step.phoneAnchor]) {
    if (!selector) continue
    const el = root.querySelector(selector)
    if (el && el.getClientRects().length > 0) return el
  }
  return null
}

const clamp = (value, min, max) => Math.max(min, Math.min(value, max))

/**
 * Where a toast of this size goes, near the anchor's rectangle. The area is the
 * desktop above the taskbar. A toast sits above an anchor in the taskbar and
 * beside one on the desktop, and in the corner above the clock when there is
 * nothing to point at or no room, as a Windows notification does.
 */
export function placeTourToast(anchor, size, area) {
  const { width: w, height: h } = size
  const maxLeft = Math.max(MARGIN, area.width - MARGIN - w)
  const maxTop = Math.max(MARGIN, area.height - MARGIN - h)
  const corner = { left: maxLeft, top: maxTop, side: 'corner' }
  if (!anchor) return corner

  const across = clamp(anchor.left + anchor.width / 2 - w / 2, MARGIN, maxLeft)
  const level = clamp(anchor.top, MARGIN, maxTop)
  const sides = {
    above: () => {
      const top = anchor.top - GAP - h
      return top >= MARGIN ? { left: across, top } : null
    },
    right: () => {
      const left = anchor.right + GAP
      return left + w <= area.width - MARGIN ? { left, top: level } : null
    },
    left: () => {
      const left = anchor.left - GAP - w
      return left >= MARGIN ? { left, top: level } : null
    },
    below: () => {
      const top = anchor.bottom + GAP
      return top + h <= area.height - MARGIN ? { left: across, top } : null
    },
  }
  const inTaskbar = anchor.top >= area.height
  const order = inTaskbar ? ['above'] : ['right', 'left', 'below', 'above']
  for (const side of order) {
    const place = sides[side]()
    if (place) return { ...place, side }
  }
  return corner
}

/** The highlight drawn around an anchor, a little outside it. */
export function tourRing(rect) {
  if (!rect) return null
  return {
    left: rect.left - RING_PAD,
    top: rect.top - RING_PAD,
    width: rect.width + RING_PAD * 2,
    height: rect.height + RING_PAD * 2,
  }
}

/**
 * Where a phone's full-width toast docks: above the taskbar, or at the top of
 * the screen when there it would cover what it points at.
 */
export function phoneDock(anchor, docked) {
  if (!anchor || !docked) return 'dock'
  return anchor.bottom > docked.top && anchor.top < docked.bottom ? 'dock-top' : 'dock'
}

/**
 * Moves the toast and its ring to the step's anchor. On a phone the stylesheet
 * docks the toast instead. Both builds call this through followTour.
 */
export function positionTour(toast, ring, step, mode) {
  const anchor = findTourAnchor(step)
  const box = tourRing(anchor ? anchor.getBoundingClientRect() : null)
  if (ring) {
    ring.hidden = !box
    if (box) {
      for (const [key, value] of Object.entries(box)) ring.style[key] = `${value}px`
    }
  }
  if (!toast) return
  if (mode === 'phone') {
    toast.style.left = ''
    toast.style.top = ''
    toast.dataset.tourSide = 'dock'
    // Where it docks, without the slide it shows with. A fixed element's offsets are from the viewport.
    const docked = { top: toast.offsetTop, bottom: toast.offsetTop + toast.offsetHeight }
    if (anchor) toast.dataset.tourSide = phoneDock(anchor.getBoundingClientRect(), docked)
    return
  }
  const taskbar = document.querySelector('.os-taskbar')
  const area = {
    width: document.documentElement.clientWidth,
    height: taskbar ? taskbar.getBoundingClientRect().top : window.innerHeight,
  }
  const size = { width: toast.offsetWidth, height: toast.offsetHeight }
  const place = placeTourToast(anchor ? anchor.getBoundingClientRect() : null, size, area)
  toast.style.left = `${Math.round(place.left)}px`
  toast.style.top = `${Math.round(place.top)}px`
  toast.dataset.tourSide = place.side
}

/**
 * Keeps the toast and its ring in place: now, whenever the toast or what it
 * points at changes size (as when a picture or a font loads, or the toast first
 * shows), and when the window resizes. Returns a stop function.
 */
export function followTour(toast, ring, step, mode) {
  const place = () => positionTour(toast, ring, step, mode)
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
  if (observer && toast) {
    observer.observe(toast)
    const anchor = findTourAnchor(step)
    if (anchor) observer.observe(anchor)
  }
  window.addEventListener('resize', place)
  place()
  return () => {
    observer?.disconnect()
    window.removeEventListener('resize', place)
  }
}

const IDLE = Object.freeze({
  status: 'idle',
  index: -1,
  total: 0,
  step: null,
  count: '',
  last: false,
  announcement: '',
})

/**
 * The tour's state and timing. It offers the tour once after a first sign-in,
 * waits while something else asks first (block), runs the steps one at a time
 * and moves on by itself unless the toast is hovered or focused (hold).
 */
export function createTour({ storage = null, stepMs = TOUR_STEP_MS, resumeMs = TOUR_RESUME_MS } = {}) {
  let state = IDLE
  let steps = []
  let pending = false
  let blocked = false
  let timer = null
  let deadline = 0
  let remaining = 0
  const holds = new Set()
  const listeners = new Set()

  const emit = (next) => {
    state = next
    for (const listener of listeners) listener(state)
  }

  const stopTimer = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  const runTimer = (ms) => {
    stopTimer()
    if (holds.size > 0) {
      remaining = ms
      return
    }
    deadline = Date.now() + ms
    timer = setTimeout(() => {
      timer = null
      next()
    }, ms)
  }

  const show = (index) => {
    const step = steps[index]
    const count = `${index + 1} of ${steps.length}`
    holds.delete('hover')
    emit({
      status: 'running',
      index,
      total: steps.length,
      step,
      count,
      last: index === steps.length - 1,
      announcement: `${step.title}, ${count}. ${step.text}`,
    })
    runTimer(stepMs)
  }

  const end = () => {
    stopTimer()
    holds.clear()
    if (state !== IDLE) emit(IDLE)
  }

  const offerIfFree = () => {
    if (!pending || blocked || state.status !== 'idle') return
    pending = false
    rememberTourOffered(storage)
    emit({ ...IDLE, status: 'offer', announcement: `${TOUR_OFFER.title} ${TOUR_OFFER.text}` })
  }

  function next() {
    if (state.status !== 'running') return
    if (state.index + 1 < steps.length) show(state.index + 1)
    else end()
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    signedIn() {
      if (!shouldOfferTour(storage)) return
      pending = true
      offerIfFree()
    },
    block(on) {
      blocked = !!on
      offerIfFree()
    },
    start(list) {
      steps = [...list]
      if (steps.length === 0) {
        end()
        return
      }
      show(0)
    },
    next,
    skip: end,
    hold(reason, held) {
      if (state.status !== 'running') return
      const before = holds.size
      if (held) holds.add(reason)
      else holds.delete(reason)
      if (before === 0 && holds.size > 0) {
        remaining = Math.max(0, deadline - Date.now())
        stopTimer()
      } else if (before > 0 && holds.size === 0) {
        runTimer(Math.max(remaining, resumeMs))
      }
    },
    reset() {
      pending = false
      end()
    },
  }
}
