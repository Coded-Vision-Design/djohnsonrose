import { useSyncExternalStore } from 'react'
import { useOsStore } from '../store/osStore'
import { readConsent } from '../lib/consent'
import { createTour, tourSteps } from '../../../assets/js/windowing/tour.js'

// The one guided tour for this page, as v1's Alpine.store('tour') in
// assets/js/components/os/tour.js. Its rules are in assets/js/windowing/tour.js.

// Storage can be blocked, which throws. The tour is then never offered.
const storage = (() => {
  try {
    return window.localStorage
  } catch {
    return null
  }
})()

export const tour = createTour({ storage })

// Set when the visitor starts the tour, so that its first button takes focus.
let focusNext = false

/** Whether the toast should take focus now, which it does once per start. */
export function takeTourFocus(): boolean {
  const take = focusNext
  focusNext = false
  return take
}

// A sign-in in this page offers the tour, and signing out ends it. The cookie
// question is asked first, and the offer waits for it.
useOsStore.subscribe((state, prev) => {
  if (state.loggedIn && !prev.loggedIn) {
    tour.block(readConsent() === null)
    tour.signedIn()
  } else if (!state.loggedIn && prev.loggedIn) {
    tour.reset()
  }
})

/** From Start and from the offer: the desktop is cleared, as the tour points at it. */
export function beginTour() {
  const { closeAllPopups, minimizeAll, windowMode } = useOsStore.getState()
  closeAllPopups()
  minimizeAll()
  focusNext = true
  tour.start(tourSteps(windowMode))
}

export const useTour = () => useSyncExternalStore(tour.subscribe, tour.getState)
