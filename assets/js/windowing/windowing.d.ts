// Types for windowing.js, which stays plain JavaScript so that v1 can load it
// directly with no build step.

export type WindowMode = 'phone' | 'tablet' | 'desktop'
export type WindowState = 'floating' | 'snapped' | 'maximized' | 'minimized'
export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export type Shortcut = 'left' | 'right' | 'up' | 'down' | 'layouts' | 'close'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Desktop {
  left: number
  top: number
  width: number
  height: number
}

export interface Fraction {
  x: number
  y: number
  w: number
  h: number
}

export interface SnapInfo {
  layout: string
  zone: string
  frac: Fraction
}

export interface ManagedWindow extends Rect {
  id: number
  z: number
  state: WindowState
  resumeState?: WindowState | null
  floating?: Rect | null
  snap?: SnapInfo | null
}

export type WindowPatch = Partial<Omit<ManagedWindow, 'id' | 'z'>>

export interface LayoutZone extends Fraction {
  id: string
  label: string
}

export interface Layout {
  id: string
  label: string
  portraitOnly?: boolean
  zones: LayoutZone[]
}

export interface Point {
  x: number
  y: number
}

export interface SnapTarget {
  kind: 'snap' | 'maximize'
  layout?: string
  zone?: string
  rect: Rect
}

export interface TileZone extends Rect {
  zone: string
  label: string
}

export interface Tile extends Rect {
  layout: string
  label: string
  zones: TileZone[]
}

export interface SnapBar extends Rect {
  tiles: Tile[]
}

export type SnapFlyout = SnapBar

export interface AssistPlan {
  layout: string
  zone: string
  rect: Rect
  candidates: number[]
}

export interface BoundaryGroup {
  axis: 'x' | 'y'
  position: number
  before: number[]
  after: number[]
  min: number
  max: number
}

export type KeyboardPlacement =
  | { type: 'snap'; layout: string; zone: string }
  | { type: 'maximize' | 'restore' | 'minimize' }

export interface DragContext {
  element: HTMLElement
  handle: HTMLElement
  getWindow: () => ManagedWindow
  getDesktop: () => Desktop
  getMode: () => WindowMode
  onDetach: (rect: Rect) => void
  onPreview: (rect: Rect | null, bar: SnapBar | null, target: SnapTarget | null) => void
  onMove: (x: number, y: number) => void
  onMaximize: () => void
  onSnap: (layout: string, zone: string) => void
}

export interface ResizeContext {
  element: HTMLElement
  handle: HTMLElement
  dir: ResizeDir
  getWindow: () => ManagedWindow
  getWindows: () => ManagedWindow[]
  getElement: (id: number) => HTMLElement | null
  getDesktop: () => Desktop
  getMode: () => WindowMode
  onCommit: (patches: Record<number, WindowPatch>) => void
}

export const TASKBAR_HEIGHT: number
export const MIN_WIDTH: number
export const MIN_HEIGHT: number
export const LAYOUTS: Layout[]

export function rectOf(win: Rect): Rect
export function detectMode(input: { width: number; height: number; coarse: boolean }): WindowMode
export function getLayout(id: string): Layout | undefined
export function availableLayouts(desktop: Desktop, mode?: WindowMode): Layout[]
export function fractionToRect(frac: Fraction, desktop: Desktop): Rect
export function detectSnapTarget(
  point: Point,
  desktop: Desktop,
  mode: WindowMode,
  armed?: { top?: boolean; left?: boolean; right?: boolean; bottom?: boolean },
): SnapTarget | null
export function snapBarModel(desktop: Desktop, mode: WindowMode): SnapBar
export function hitSnapBar(point: Point, bar: SnapBar, desktop: Desktop): SnapTarget | null
export function snapFlyoutModel(
  anchor: { left: number; top: number; width: number; height: number },
  desktop: Desktop,
  mode: WindowMode,
): SnapFlyout
export function clampFloating(rect: Rect, desktop: Desktop): Rect
export function placeNewWindow(size: { w: number; h: number }, desktop: Desktop, count: number): Rect
export function floatingRectOf(win: ManagedWindow): Rect
export function snapPatch(win: ManagedWindow, layout: string, zone: string, desktop: Desktop): WindowPatch
export function maximizePatch(win: ManagedWindow, desktop: Desktop): WindowPatch
export function restorePatch(win: ManagedWindow, desktop: Desktop): WindowPatch
export function detachPatch(rect: Rect): WindowPatch
export function minimizePatch(win: ManagedWindow): WindowPatch
export function unminimizePatch(win: ManagedWindow, desktop: Desktop): WindowPatch
export function reflowPatch(win: ManagedWindow, desktop: Desktop, mode?: WindowMode): WindowPatch | null
export function restoreUnderPointer(floating: Rect, point: Point, current: Rect, desktop: Desktop): Rect
export function resizeRect(start: Rect, dir: ResizeDir, dx: number, dy: number, desktop: Desktop): Rect
export function resizableEdges(win: ManagedWindow, desktop: Desktop): ResizeDir[]
export function boundaryGroup(
  windows: ManagedWindow[],
  activeId: number,
  axis: 'x' | 'y',
  side: 'before' | 'after',
  desktop: Desktop,
): BoundaryGroup | null
export function boundaryPatches(
  group: BoundaryGroup,
  position: number,
  windows: ManagedWindow[],
  desktop: Desktop,
): Record<number, WindowPatch>
export function planAssist(windows: ManagedWindow[], layout: string, desktop: Desktop): AssistPlan | null
export function nextFocusedWindow<T extends ManagedWindow>(windows: T[]): T | null
export function keyboardPlacement(
  win: ManagedWindow,
  action: 'left' | 'right' | 'up' | 'down',
  desktop: Desktop,
  mode?: WindowMode,
): KeyboardPlacement | null
export function shortcutFromEvent(event: KeyboardEvent): Shortcut | null
export function measureDesktop(element: Element): Desktop
export function animateGeometry(element: HTMLElement | null): void
export function beginWindowDrag(event: PointerEvent, ctx: DragContext): (() => void) | null
export function beginWindowResize(event: PointerEvent, ctx: ResizeContext): (() => void) | null
export function watchDesktop(
  element: Element,
  onChange: (desktop: Desktop, mode: WindowMode) => void,
): () => void
export function canHoverLayouts(mode: WindowMode): boolean
