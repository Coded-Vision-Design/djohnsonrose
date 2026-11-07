export type TourMode = 'phone' | 'tablet' | 'desktop'

export interface TourStep {
  id: string
  title: string
  text: string
  /** A selector for what the step describes, or null for nothing. */
  anchor: string | null
  /** Stands in for anchor on a phone. Null leaves the step out there. */
  phoneAnchor?: string | null
}

export interface TourStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface TourRect {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
}

export interface TourPlacement {
  left: number
  top: number
  side: 'above' | 'right' | 'left' | 'below' | 'corner'
}

export type TourStatus = 'idle' | 'offer' | 'running'

export interface TourState {
  status: TourStatus
  /** The step on show, or -1. */
  index: number
  total: number
  step: TourStep | null
  /** Such as "2 of 6", or empty when no step shows. */
  count: string
  last: boolean
  /** What the polite live region says. */
  announcement: string
}

export interface TourController {
  getState(): TourState
  subscribe(listener: (state: TourState) => void): () => void
  /** Offers the tour once after a first sign-in. */
  signedIn(): void
  /** While true, a waiting offer holds back, as the cookie question comes first. */
  block(blocked: boolean): void
  start(steps: readonly TourStep[]): void
  next(): void
  /** Ends the tour, or turns the offer down. */
  skip(): void
  /** Stops the tour moving on by itself while any reason is held. */
  hold(reason: string, held: boolean): void
  /** Signed out: ends the tour and drops a waiting offer. */
  reset(): void
}

export const TOUR_KEY: string
export const TOUR_STEP_MS: number
export const TOUR_RESUME_MS: number
export const TOUR_OFFER: { title: string; text: string; start: string; dismiss: string }
export const TOUR_STEPS: readonly TourStep[]

export function tourSteps(mode: TourMode, steps?: readonly TourStep[]): TourStep[]
export function shouldOfferTour(storage: TourStorage | null | undefined): boolean
export function rememberTourOffered(storage: TourStorage | null | undefined): void
export function findTourAnchor(
  step: Pick<TourStep, 'anchor' | 'phoneAnchor'> | null | undefined,
  root?: ParentNode,
): Element | null
export function placeTourToast(
  anchor: TourRect | null,
  size: { width: number; height: number },
  area: { width: number; height: number },
): TourPlacement
export function tourRing(rect: Pick<TourRect, 'left' | 'top' | 'width' | 'height'> | null): {
  left: number
  top: number
  width: number
  height: number
} | null
export function positionTour(
  toast: HTMLElement | null,
  ring: HTMLElement | null,
  step: TourStep | null,
  mode: TourMode,
): void
export function createTour(options?: {
  storage?: TourStorage | null
  stepMs?: number
  resumeMs?: number
}): TourController
