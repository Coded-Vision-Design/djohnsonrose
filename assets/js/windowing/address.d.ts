/** What an address shows: an app, or null for the desktop. */
export interface Addressed {
  app: string | null
}

export interface AddressState {
  /** From addressedApp: the app in front, or null for the desktop. */
  app: string | null
  /** How many apps have been opened, so that an open can be told from a focus. */
  opens: number
}

export type HistoryStep = 'push' | 'replace' | null

/** The parts of either build's window store that Back and Forward use. */
export interface AddressedStore {
  windows: { id: number; app: string; state: string }[]
  openApp: (app: string) => void
  focusWindow: (id: number) => void
  toggleMinimize: (id: number) => void
  minimizeAll: () => void
}

/** The parts of a browser window followAddress uses. */
export interface AddressWindow {
  location: { pathname: string }
  document: { title: string }
  history: {
    state: unknown
    pushState: (state: unknown, unused: string, url: string) => void
    replaceState: (state: unknown, unused: string, url: string) => void
  }
  addEventListener: (type: 'popstate', listener: () => void) => void
  removeEventListener: (type: 'popstate', listener: () => void) => void
}

export interface AddressFollower {
  update: (state: AddressState) => void
  stop: () => void
}

export function addressOf(base: string, app: string | null): string
export function readAddress(base: string, pathname: string, appIds: readonly string[]): Addressed | null
export function addressedApp(
  windows: readonly { id: number; app: string; state: string }[] | null | undefined,
  focusedWindowId: number | null | undefined,
): string | null
export function historyStep(from: Addressed | null, to: string | null, opened: boolean): HistoryStep
export function pageTitle(baseTitle: string, appTitle: string | null | undefined): string
export function showAddressed(store: AddressedStore, app: string | null): void
export function followAddress(options: {
  base: string
  appIds: readonly string[]
  titleOf?: (app: string) => string | undefined
  show: (app: string | null) => void
  win?: AddressWindow
}): AddressFollower
