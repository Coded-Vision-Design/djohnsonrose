export const MIN_SIZE: number
export const MAX_SIZE: number
export const HISTORY_LIMIT: number
export const ZOOM_LEVELS: number[]
export const MIN_ZOOM: number
export const MAX_ZOOM: number
export const MIN_CANVAS: number
export const MAX_CANVAS: number
export const PAINT_SIZE: { width: number; height: number }
export const PS_SIZE: { width: number; height: number }
export const MAX_LAYERS: number

export interface Swatch {
  hex: string
  name: string
}
export const PAINT_PALETTE: Swatch[]
export const PS_SWATCHES: Swatch[]

export type PaintTool = 'pencil' | 'brush' | 'eraser' | 'fill' | 'text' | 'picker' | 'zoom' | 'shape'
export type PaintShape = 'line' | 'rectangle' | 'ellipse' | 'rounded' | 'triangle' | 'star'
export type PaintTab = 'file' | 'home' | 'view'
export type PsTool = 'move' | 'brush' | 'eraser' | 'bucket' | 'text'

export const PAINT_TOOLS: { id: Exclude<PaintTool, 'brush' | 'shape'>; label: string }[]
export const PAINT_SHAPES: { id: PaintShape; label: string }[]
export const PAINT_TABS: { id: PaintTab; label: string }[]
export const PS_TOOLS: { id: PsTool; label: string; key: string }[]

export interface PsMenuItem {
  id?: string
  label?: string
  shortcut?: string
  separator?: boolean
}
export interface PsMenu {
  id: string
  label: string
  items: PsMenuItem[]
}
export const PS_MENUS: PsMenu[]

export const DRAWING_ICONS: Record<string, string>

export interface Point {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}
export interface ClientRect {
  left: number
  top: number
  width: number
  height: number
}
export interface Rgb {
  r: number
  g: number
  b: number
}
export interface PixelImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

export function parseColour(value: unknown): Rgb | null
export function toHex(r: number, g: number, b: number): string

export function canvasPosition(clientX: number, clientY: number, rect: ClientRect, width: number, height: number): Point
export function canvasPixel(clientX: number, clientY: number, rect: ClientRect, width: number, height: number): Point
export function linePoints(x0: number, y0: number, x1: number, y1: number): Point[]
export function pointsBounds(points: Point[], pad?: number): Rect | null
export function unionRect(a: Rect | null, b: Rect | null): Rect | null
export function clampRect(rect: Rect, width: number, height: number): Rect | null
export function cropPixels(image: PixelImage, rect: Rect): Uint8ClampedArray

export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  colour: (Rgb & { a?: number }) | null,
): (Rect & { count: number }) | null

export function clampZoom(value: unknown): number
export function zoomStep(zoom: number, direction: number): number
export function zoomIndex(zoom: number): number
export function clampSize(value: unknown): number
export function resizeCanvas(
  start: { width: number; height: number },
  delta: Point,
  edge: string,
): { width: number; height: number }

export type ShapeOutline =
  | { kind: 'line'; points: Point[] }
  | { kind: 'polygon'; points: Point[] }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'rounded'; x: number; y: number; width: number; height: number; radius: number }
export function shapeEnd(shape: string, from: Point, to: Point, constrain: boolean): Point
export function shapeOutline(shape: string, from: Point, to: Point): ShapeOutline | null

export function textLines(value: unknown): string[]

export interface HistoryStep {
  layer: string
  x: number
  y: number
  before: unknown
  after: unknown
  resize?: boolean
}
export interface DrawingHistory<S extends { layer: string } = HistoryStep> {
  done: S[]
  undone: S[]
}
export function emptyHistory<S extends { layer: string } = HistoryStep>(): DrawingHistory<S>
export function recordStep<S extends { layer: string }>(history: DrawingHistory<S>, step: S, limit?: number): DrawingHistory<S>
export function undoStep<S extends { layer: string }>(history: DrawingHistory<S>): { step: S; history: DrawingHistory<S> } | null
export function redoStep<S extends { layer: string }>(history: DrawingHistory<S>): { step: S; history: DrawingHistory<S> } | null
export function forgetLayer<S extends { layer: string }>(history: DrawingHistory<S>, layer: string): DrawingHistory<S>

export function drawingShortcut(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  app: 'paint' | 'photoshop',
): string | null
export function commandState(
  id: string,
  state: { zoom: number; canUndo: boolean; canRedo: boolean; layers?: unknown[] },
): { known: boolean; disabled: boolean }

export interface PaintState {
  tab: PaintTab
  tool: PaintTool
  previous: PaintTool
  shape: PaintShape
  colours: [string, string]
  slot: 0 | 1
  size: number
  zoom: number
  width: number
  height: number
  canUndo: boolean
  canRedo: boolean
}
export function paintInitialState(): PaintState

export interface DrawingOptions<S> {
  onChange?: (state: S) => void
  isActive?: () => boolean
}

export interface PaintController {
  readonly state: PaintState
  setTab(tab: PaintTab): void
  setTool(tool: PaintTool): void
  setShape(shape: PaintShape): void
  setSize(size: number | string): void
  setSlot(slot: number): void
  setColour(value: string): void
  setZoom(zoom: number): void
  run(id: string): void
  dispose(): void
}
export function createPaint(root: HTMLElement, options?: DrawingOptions<PaintState>): PaintController

export interface PsLayer {
  id: string
  name: string
  visible: boolean
  opacity: number
}
export interface PhotoshopState {
  tool: PsTool
  colour: string
  size: number
  zoom: number
  width: number
  height: number
  layers: PsLayer[]
  active: string
  menu: string | null
  canUndo: boolean
  canRedo: boolean
}
export function photoshopInitialState(): PhotoshopState

export interface PhotoshopController {
  readonly state: PhotoshopState
  setTool(tool: PsTool): void
  setColour(value: string): void
  setSize(size: number | string): void
  setZoom(zoom: number): void
  selectLayer(id: string): void
  toggleLayer(id: string): void
  setOpacity(id: string, value: number | string): void
  toggleMenu(id: string): void
  closeMenu(): void
  run(id: string): void
  dispose(): void
}
export function createPhotoshop(root: HTMLElement, options?: DrawingOptions<PhotoshopState>): PhotoshopController
