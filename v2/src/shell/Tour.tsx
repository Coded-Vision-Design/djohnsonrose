import { useEffect, useLayoutEffect, useRef, type FocusEvent, type PointerEvent } from 'react'
import { useOsStore } from '../store/osStore'
import { useConsent } from '../lib/consent'
import { TOUR_OFFER, followTour } from '../../../assets/js/windowing/tour.js'
import { beginTour, takeTourFocus, tour, useTour } from './tourState'

// A button press that may end the tour hands focus to Start if it was in the toast.
function act(toast: HTMLElement | null, action: () => void) {
  const inside = !!toast?.contains(document.activeElement)
  action()
  if (inside && tour.getState().status === 'idle') {
    document.querySelector<HTMLElement>('[data-start-button]')?.focus({ preventScroll: true })
  }
}

// The guided tour's toast, the same markup as v1's partials/tour.php. Its steps,
// place and timing come from assets/js/windowing/tour.js.
export function Tour() {
  const state = useTour()
  const consent = useConsent()
  const mode = useOsStore((s) => s.windowMode)
  const toastRef = useRef<HTMLElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const offering = state.status === 'offer'
  // Start, Quick Settings and Widgets cover the toast, and the tour waits behind them.
  const covered = useOsStore(
    (s) => s.startMenuOpen || s.quickSettingsOpen || s.widgetsOpen || s.calendarOpen || s.taskSwitcherOpen,
  )

  // The cookie question is asked first, and the offer waits for it.
  useEffect(() => tour.block(consent === null), [consent])

  useEffect(() => tour.hold('popup', covered), [covered, state.status])

  // Keeps the toast and ring by what the step points at, until the next change.
  useLayoutEffect(() => {
    if (state.status === 'idle') return
    const stop = followTour(toastRef.current, ringRef.current, state.step, mode)
    if (state.status === 'running' && takeTourFocus()) {
      toastRef.current?.querySelector<HTMLElement>('[data-tour-next]')?.focus({ preventScroll: true })
    }
    return stop
  }, [state, mode])

  // Esc closes whatever covers the tour (Start, Quick Settings, Widgets, the
  // calendar, Task View) or a menu first, then skips the tour.
  useEffect(() => {
    if (state.status !== 'running') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const os = useOsStore.getState()
      if (os.startMenuOpen || os.quickSettingsOpen || os.widgetsOpen || os.calendarOpen || os.taskSwitcherOpen) return
      if (os.contextMenu.open) return
      act(toastRef.current, () => tour.skip())
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [state.status])

  const hover = (event: PointerEvent, held: boolean) => {
    if (event.pointerType === 'mouse') tour.hold('hover', held)
  }

  // Only keyboard focus holds the tour, so that a click does not stop it moving on.
  const focusIn = (event: FocusEvent) => {
    if ((event.target as Element).matches(':focus-visible')) tour.hold('focus', true)
  }
  const focusOut = (event: FocusEvent) => {
    if (!toastRef.current?.contains(event.relatedTarget as Node | null)) tour.hold('focus', false)
  }

  return (
    <div data-tour-covered={covered ? 'true' : 'false'}>
      {state.status === 'running' && (
        <div ref={ringRef} data-tour-ring="" className="os-tour-ring" aria-hidden="true" hidden />
      )}
      {state.status !== 'idle' && (
        <section
          ref={toastRef}
          data-tour-toast=""
          data-tour-step={offering ? 'offer' : state.step?.id}
          role="dialog"
          aria-modal="false"
          aria-labelledby="os-tour-title os-tour-count"
          aria-describedby="os-tour-text"
          className="os-tour-toast"
          onPointerMove={(e) => hover(e, true)}
          onPointerLeave={(e) => hover(e, false)}
          onFocus={focusIn}
          onBlur={focusOut}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div className="os-tour-head">
            <img src="/assets/img/startmenu.webp" alt="" className="os-tour-logo" />
            <span className="os-tour-app">Tour</span>
            <span id="os-tour-count" className="os-tour-count" data-tour-count="">
              {state.count}
            </span>
          </div>
          <p id="os-tour-title" className="os-tour-title">
            {offering ? TOUR_OFFER.title : state.step?.title}
          </p>
          <p id="os-tour-text" className="os-tour-text">
            {offering ? TOUR_OFFER.text : state.step?.text}
          </p>
          <div className="os-tour-actions">
            {offering ? (
              <div className="os-tour-buttons">
                <button type="button" data-tour-dismiss="" className="os-tour-button" onClick={() => act(toastRef.current, () => tour.skip())}>
                  {TOUR_OFFER.dismiss}
                </button>
                <button type="button" data-tour-start="" className="os-tour-button os-tour-primary" onClick={beginTour}>
                  {TOUR_OFFER.start}
                </button>
              </div>
            ) : (
              <div className="os-tour-buttons">
                {!state.last && (
                  <button type="button" data-tour-skip="" className="os-tour-button" onClick={() => act(toastRef.current, () => tour.skip())}>
                    Skip tour
                  </button>
                )}
                <button type="button" data-tour-next="" className="os-tour-button os-tour-primary" onClick={() => act(toastRef.current, () => tour.next())}>
                  {state.last ? 'Done' : 'Next'}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
      <div data-tour-live="" className="sr-only" aria-live="polite" aria-atomic="true">
        {state.announcement}
      </div>
    </div>
  )
}
