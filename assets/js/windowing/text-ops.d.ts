export interface EditorState {
  text: string
  start: number
  end: number
}

export interface NotepadOptions {
  wordWrap: boolean
  monospace: boolean
  statusBar: boolean
  zoom: number
}

export interface NotepadMenuItem {
  id?: string
  label?: string
  shortcut?: string
  option?: keyof NotepadOptions
  separator?: boolean
}

export interface NotepadMenu {
  id: string
  label: string
  items: NotepadMenuItem[]
}

export interface NotepadEditor {
  read: () => EditorState
  /** `remember: false` leaves the undo history alone. */
  write: (state: EditorState, remember?: boolean) => void
  popUndo: () => string | null
  copy: (text: string) => unknown
  paste: () => Promise<string | null>
  openFind: (mode: 'find' | 'replace') => void
  findNext: () => void
  option: <K extends keyof NotepadOptions>(name: K) => NotepadOptions[K]
  setOption: <K extends keyof NotepadOptions>(name: K, value: NotepadOptions[K]) => void
  now: () => Date
  toast: (message: string) => void
}

export interface FindOptions {
  matchCase?: boolean
}

export const NOTEPAD_OPTIONS_KEY: string
export const NOTEPAD_DEFAULTS: NotepadOptions
export const NOTEPAD_MENUS: NotepadMenu[]

export function replaceRange(state: EditorState, value: string): EditorState
export function selectedText(state: EditorState): string
export function findNext(text: string, query: string, from: number, options?: FindOptions): { start: number; end: number } | null
export function replaceNext(state: EditorState, query: string, replacement: string, options?: FindOptions): EditorState
export function replaceAll(text: string, query: string, replacement: string, options?: FindOptions): { text: string; count: number }
export function textParts(
  text: string,
  mark?: { start: number; end: number } | null,
): { text: string; link: string | null; marked: boolean }[]
export function lineColumn(text: string, caret: number): { line: number; column: number }
export function stamp(date: Date): string
export function stepZoom(zoom: number, direction: number): number
export function pushUndo(stack: string[], text: string): string[]
export function notepadShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean }): string | null
export function notepadCommands(editor: NotepadEditor): Record<string, () => unknown>
export function readNotepadOptions(text: string | null): NotepadOptions
