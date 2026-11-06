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
  | 'previous'
  | 'next',
  OfficeIcon
>

export function documentText(root: Node | null | undefined): string
export function countWords(value: string | null | undefined): number

export interface FitBox {
  width: number
  height?: number
}
export function fitScale(box: FitBox, content: FitBox, options?: { min?: number; max?: number }): number
export function stepPageZoom(zoom: number, direction: number): number

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

export interface Slide {
  id: number | string
  title: string
  description: string
  tags: string[]
  image: string
}
export function portfolioDeck(data: unknown, base?: string): Slide[]
export function slideForKey(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'> & { target: EventTarget | null },
  active: number,
  count: number,
): number | null

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
