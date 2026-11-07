export const TASK_VIEW_KEYS: string

/** Just what the switchers read from a window. */
export interface SwitchableWindow {
  id: number
  z: number
  state: string
}

export function recentWindows<W extends SwitchableWindow>(windows: readonly W[] | null | undefined): W[]

export function switcherStart(
  list: readonly SwitchableWindow[],
  focusedId: number | null,
  backwards?: boolean,
): number

export function stepIndex(index: number, count: number, step: number): number

export function gridColumns(tops: readonly number[]): number

export function gridIndex(index: number, key: string, count: number, columns: number): number | null

export function neighbourAfterClose(list: readonly SwitchableWindow[], id: number): number | null

export type SwitcherKey = 'next' | 'previous' | 'taskView'
export function switcherKeyFromEvent(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'altKey' | 'shiftKey' | 'ctrlKey' | 'metaKey'> & {
    target?: EventTarget | null
  },
): SwitcherKey | null

export function isSwitchRelease(event: Pick<KeyboardEvent, 'key'> | null | undefined): boolean

export function activateWindow(
  store: {
    windows: readonly SwitchableWindow[]
    focusWindow: (id: number) => void
    toggleMinimize: (id: number) => void
  },
  id: number,
): boolean

export function focusWindowElement(id: number): void

export function restoreFocus(opener: Element | null | undefined): void

export function keepFocusInside(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>,
  container: HTMLElement | null | undefined,
): boolean
