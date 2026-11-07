export type SourceLanguage = 'javascript' | 'typescript' | 'css' | 'json' | 'text'

export type TokenType =
  | 'plain'
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'literal'
  | 'type'
  | 'function'
  | 'regex'
  | 'property'
  | 'selector'
  | 'at-rule'

export type Token = [TokenType, string]

export interface SourceNode {
  name: string
  path: string
  kind: 'folder' | 'file'
  children?: SourceNode[]
}

export interface SourceRow {
  path: string
  name: string
  kind: 'folder' | 'file'
  depth: number
  open: boolean
}

export interface SourceGroup {
  folder: string
  files: { path: string; name: string }[]
}

export interface SourceTabs {
  tabs: string[]
  active: string | null
}

export interface RenderedSource {
  html: string
  lines: number
  language: SourceLanguage
  languageName: string
}

export const SOURCE_FILES: readonly string[]
export const SOURCE_START: string
export const SOURCE_LANGUAGES: Record<SourceLanguage, { name: string; badge: string }>

export function sourceUrl(base: string, path: string): string | null
export function sourceLanguage(path: string): SourceLanguage
export function sourceTree(files?: readonly string[]): SourceNode[]
export function sourceRows(files?: readonly string[], expanded?: Iterable<string>): SourceRow[]
export function sourceFolders(path: string): string[]
export function sourceGroups(files?: readonly string[]): SourceGroup[]
export function openSourceTab(state: SourceTabs, path: string): SourceTabs
export function closeSourceTab(state: SourceTabs, path: string): SourceTabs
export function tokenizeSource(text: string, language: SourceLanguage): Token[][]
export function highlightSource(text: string, language: SourceLanguage): string
export function renderSource(text: string, path: string): RenderedSource
