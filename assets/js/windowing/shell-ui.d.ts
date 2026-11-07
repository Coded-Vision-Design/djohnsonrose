export interface DeviceInfo {
  os: string
  browser: string
  resolution: string
  deviceTime: string
  userAgent: string
}

export function detectOs(userAgent: string, touchPoints?: number): string
export function browserName(userAgent: string): string
export function deviceInfo(input: {
  userAgent: string
  screen: { width: number; height: number }
  touchPoints?: number
  now?: Date
}): DeviceInfo

export function relativeTime(then: Date | number | null | undefined, now?: Date): string | null

export function recentKey(
  app: string,
  extra: { pdfUrl?: unknown; initialPath?: unknown } | null | undefined,
): 'cv' | 'projects' | null

export type Theme = 'light' | 'dark'
export function initialTheme(saved: string | null | undefined, prefersDark: boolean): Theme

export function displayFilter(settings: {
  brightness: number | string
  nightLight: boolean
  accessibility: boolean
}): string

export type QuickToggle = 'wifi' | 'bluetooth' | 'airplane' | 'batterySaver' | 'nightLight' | 'accessibility'
export interface QuickSettingsState {
  wifi: boolean
  bluetooth: boolean
  airplane: boolean
  batterySaver: boolean
  nightLight: boolean
  accessibility: boolean
  brightness: number | string
}
export function quickTogglePatch(
  settings: QuickSettingsState,
  id: string,
): Partial<Omit<QuickSettingsState, 'brightness'> & { brightness: number }>

export function storedNumber(raw: string | null | undefined, fallback: number): number

export type ShellKey = 'taskManager' | 'search' | 'dismiss'
export function shellKeyFromEvent(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>,
): ShellKey | null

export const ICON_CELL: number
export const ICON_MARGIN: number
export function layoutDesktopIcons(
  names: string[],
  stored: Record<string, { x: number; y: number }>,
  area: { width: number; height: number },
): Record<string, { x: number; y: number }>

export const BOOT_MIN_MS: number
export const SIGN_IN_MIN_MS: number
export const READY_MAX_MS: number
export function whenAssetsReady(
  urls: (string | null | undefined)[],
  options?: { minMs?: number; maxMs?: number; load?: (url: string) => Promise<unknown> },
): Promise<void>

export function animateWindowOut(element: HTMLElement | null, kind: 'close' | 'minimise'): HTMLElement | null
export function focusAfterClose(nextWindowId: number | null | undefined, app: string): void
export function reserveBottomSpace(element: HTMLElement, root?: HTMLElement): () => void
