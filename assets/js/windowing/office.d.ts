// ---- Loading ----

export function loadChecked(url: string, kind?: 'json', fetcher?: typeof fetch): Promise<unknown>
export function loadChecked(url: string, kind: 'text', fetcher?: typeof fetch): Promise<string>

// ---- Word ----

export const WORD_PAGE_WIDTH: number
export const WORD_TABS: string[]
export const WORD_FONTS: string[]
export const WORD_SIZES: { value: string; label: string }[]

export interface OfficeIcon {
  d: string
  stroke?: boolean
}
export const OFFICE_ICONS: Record<
  | 'save'
  | 'undo'
  | 'paste'
  | 'cut'
  | 'copy'
  | 'bullets'
  | 'numbering'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'find'
  | 'replace'
  | 'print'
  | 'zoomOut'
  | 'zoomIn'
  | 'previous'
  | 'next'
  | 'present'
  | 'endShow',
  OfficeIcon
>

export function documentText(root: Node | null | undefined): string
export function countWords(value: string | null | undefined): number

export interface FitBox {
  width: number
  height?: number
}
export function fitScale(box: FitBox, content: FitBox, options?: { min?: number; max?: number }): number
export function watchFit(
  element: HTMLElement | null | undefined,
  content: FitBox,
  onScale: (scale: number) => void,
  options?: { min?: number; max?: number },
): () => void
export function stepPageZoom(zoom: number, direction: number): number
export function zoomSliderAt(zoom: number): number

export type WordAlign = 'left' | 'center' | 'right' | 'justify'
export interface WordFormat {
  bold: boolean
  italic: boolean
  underline: boolean
  align: WordAlign
}
export function formatState(doc?: Pick<Document, 'queryCommandState'>): WordFormat

export type WordCommand =
  | 'paste'
  | 'cut'
  | 'copy'
  | 'undo'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'foreColor'
  | 'fontName'
  | 'fontSize'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'justifyLeft'
  | 'justifyCenter'
  | 'justifyRight'
  | 'style'
export function runWordCommand(
  command: WordCommand,
  value?: string,
  doc?: Pick<Document, 'execCommand'>,
  clipboard?: Pick<Clipboard, 'readText'>,
): Promise<boolean>

export interface WordEditor {
  run(command: WordCommand, value?: string): Promise<boolean>
  stop(): void
}
export function wordEditor(
  editor: HTMLElement,
  options?: { onFormat?: (format: WordFormat) => void },
  doc?: Document,
): WordEditor

export interface PrintOpener {
  open(url: string, target: string, features: string): PrintWindow | null
}
export interface PrintWindow {
  document: { open(): void; write(markup: string): void; close(): void }
  focus?(): void
  print(): void
  setTimeout(run: () => void, ms?: number): unknown
}
export function printDocument(
  doc: { title: string; html: string; styles?: string },
  opener?: PrintOpener | Window,
): boolean
export function pageStyles(doc?: Document): string

// ---- Excel ----

export const SHEET_HEADERS: string[]
export const EXCEL_TABS: string[]
export function columnName(index: number): string

export interface SheetCell {
  ref: string
  value: string
  header: boolean
}
export interface SheetRow {
  number: number
  cells: SheetCell[]
}
export interface Sheet {
  columns: string[]
  rows: SheetRow[]
  count: number
}
export function portfolioSheet(data: unknown, options?: { columns?: number; minRows?: number }): Sheet
export function cellValue(sheet: Sheet, ref: string): string

// ---- PowerPoint ----

export const SLIDE_SIZE: { width: number; height: number }
export const POWERPOINT_TABS: string[]
export const SHOW_MAX_ZOOM: number
export const SLIDE_HEADINGS: string[]

export interface TitleSlide {
  kind: 'title'
  id: 'title'
  heading: string
  text: string
  tags: string[]
  url: string
  link: string
  image: string
  alt: string
}
export interface PointsSlide {
  kind: 'points'
  id: 'problem' | 'approach' | 'outcome'
  heading: string
  items: string[]
  ordered: boolean
}
export interface SlideMetric {
  figure: string
  text: string
}
export interface MetricsSlide {
  kind: 'metrics'
  id: 'metrics'
  heading: string
  metrics: SlideMetric[]
}
export interface SlideShot {
  name: string
  url: string
  alt: string
}
export interface ShotsSlide {
  kind: 'shots'
  id: 'shots'
  heading: string
  shots: SlideShot[]
}
export type CaseSlide = TitleSlide | PointsSlide | MetricsSlide | ShotsSlide
export interface Deck {
  id: number | string
  title: string
  cover: string
  slides: CaseSlide[]
}

export function linkLabel(url: string | null | undefined): string
export function slidePoints(value: string | null | undefined): { items: string[]; ordered: boolean }
export function slideMetrics(points: string[] | null | undefined): SlideMetric[]
export function caseStudyDecks(data: unknown, fileSystem: unknown, base?: string): Deck[]
export function deckIndex(decks: Pick<Deck, 'id'>[], key: unknown): number
export function stepSlide(active: number, step: number, count: number): number

type SlideKey = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'> & { target: EventTarget | null }
export function slideForKey(event: SlideKey, active: number, count: number): number | null
export function showKey(event: SlideKey & Pick<KeyboardEvent, 'shiftKey'>, active: number, count: number): number | 'end' | null

export interface SwipePoint {
  x: number
  y: number
}
export function swipeStep(start: SwipePoint | null | undefined, end: SwipePoint | null | undefined, threshold?: number): -1 | 0 | 1
export function watchSwipe(
  element: Element | null | undefined,
  onStep: (step: -1 | 1) => void,
  options?: { threshold?: number },
): () => void

// ---- PuTTY ----

export interface PuttySession {
  name: string
  host: string
}
export const PUTTY_SESSIONS: PuttySession[]
export const PUTTY_CATEGORIES: { name: string; children: string[] }[]
export const PUTTY_CONNECTION_TYPES: string[]
export const PUTTY_USER: string

export function puttyBanner(session: { host: string; port?: number; date?: Date }): string[]
export function puttyPrompt(host: string): string
export interface PuttyReply {
  lines: string[]
  clear: boolean
  exit: boolean
}
export function puttyReply(input: string, session: { host: string; date?: Date }): PuttyReply
