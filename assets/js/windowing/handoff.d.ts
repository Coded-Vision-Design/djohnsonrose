// Types for handoff.js, the build switch's hand-off between v1 and v2.

import type { Desktop, Fraction, Rect, WindowState } from './windowing.js'

export const HANDOFF_KEY: string
export const HANDOFF_VERSION: number
export const HANDOFF_TTL_MS: number
export const HANDOFF_EXTRAS: Record<string, string[]>
export const V1_EXTRA_NAMES: Record<string, string>

export type BuildName = 'v1' | 'v2'
export type HandoffExtras = Record<string, string>
export type IconSize = 'small' | 'medium' | 'large'

export interface HandoffSnap {
  layout: string
  zone: string
  frac: Fraction
}

/** A window as the build being left has it. */
export interface HandoffSourceWindow extends Rect {
  id: number | string
  app: string
  title: string
  z: number
  state: WindowState
  resumeState?: WindowState | null
  floating?: Rect | null
  snap?: HandoffSnap | null
  /** Extras in the shared names. See HANDOFF_EXTRAS. */
  extras?: Record<string, unknown> | null
}

export interface HandoffSettingsSource {
  theme: 'light' | 'dark'
  themeChosen: boolean
  sound: boolean
  volume: number
  brightness: number
  wallpaper: string
  wifi: boolean
  bluetooth: boolean
  airplane: boolean
  batterySaver: boolean
  nightLight: boolean
  accessibility: boolean
}

export interface HandoffDesktopSource {
  pinnedApps: string[]
  iconSize: IconSize
  iconsVisible: boolean
  iconPositions: Record<string, { x: number; y: number }>
  zoom: number
}

/** The weather the taskbar shows, once it has arrived. */
export interface HandoffWeather {
  temp: number
  condition: string
  icon: string
  city: string
}

export interface HandoffSource {
  from: BuildName
  signedIn: boolean
  windows: HandoffSourceWindow[]
  focusedId: number | string | null
  settings: HandoffSettingsSource
  desktop: HandoffDesktopSource
  /** The cookie choice, or null until the visitor answers. */
  consent: boolean | null
  /** Null while it is still loading or has failed. */
  weather?: HandoffWeather | null
}

/** A window fitted to the arriving build's desktop. */
export interface HandoffWindow extends Rect {
  app: string
  title: string
  /** As the build being left had it. Only the order counts. */
  z: number
  state: WindowState
  resumeState: WindowState | null
  floating: Rect | null
  snap: HandoffSnap | null
  extras: HandoffExtras
}

/** Each setting is null when it was missing or made no sense, for the build to keep its own. */
export type HandoffSettings = { [K in keyof HandoffSettingsSource]: HandoffSettingsSource[K] | null }

export interface HandoffDesktop {
  pinnedApps: string[] | null
  iconSize: IconSize | null
  iconsVisible: boolean | null
  iconPositions: Record<string, { x: number; y: number }>
  zoom: number | null
}

export interface Handoff {
  version: number
  at: number
  from: BuildName | null
  signedIn: boolean
  /** In the order they opened, which the taskbar shows. */
  windows: HandoffWindow[]
  /** The index of the focused window, or null. */
  focused: number | null
  settings: HandoffSettings
  desktop: HandoffDesktop
  consent: boolean | null
  weather: HandoffWeather | null
}

export interface ReadOptions {
  /** This build's clock. */
  now: number
  /** How long this page has been loading, as performance.now() gives it. */
  loadingFor?: number
  /** The app ids this build has. */
  apps: string[]
  /** The desktop the windows must fit. */
  desktop: Desktop
}

export interface RestoredWindow<Id> extends HandoffWindow {
  id: Id
  z: number
  restored: true
}

type HandoffStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function pickExtras(
  app: string,
  source: Record<string, unknown> | null | undefined,
  names?: Record<string, string>,
): Record<string, unknown>
export function renameExtras(extras: Record<string, unknown>, names?: Record<string, string>): Record<string, unknown>
export function createHandoff(state: HandoffSource, now: number): unknown
export function readHandoff(text: string | null, options: ReadOptions): Handoff | null
export function writeHandoff(storage: Pick<Storage, 'setItem'>, handoff: unknown): boolean
export function takeHandoff(storage: HandoffStorage, options: ReadOptions): Handoff | null
export function restoredWindows<Id>(
  handoff: Handoff,
  nextId: () => Id,
  firstZ?: number,
): { windows: RestoredWindow<Id>[]; focusedId: Id | null; nextWindowZ: number }
export function isPlainClick(
  event: Pick<MouseEvent, 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'> | null | undefined,
): boolean
export function shareLiveExtras(windowId: number | string, read: () => Record<string, unknown>): () => void
export function liveExtras(windowId: number | string): Record<string, unknown>
