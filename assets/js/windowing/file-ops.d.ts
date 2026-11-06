export const DESKTOP: string
export const RECYCLE_BIN: string

export interface OsEntry {
  name: string
  type: string
  icon?: string
  path?: string
  url?: string
  content?: string
  app?: string
  extraData?: Record<string, unknown>
  modified?: number
  shortcut?: boolean
  zipped?: boolean
  originalName?: string
  originalPath?: string
  location?: string
}

export type OsFiles<T = OsEntry> = Record<string, T[]>

export interface FileClipboard {
  mode: 'cut' | 'copy'
  name: string
  fromPath: string
}

export type SortKey = 'name' | 'type' | 'date' | 'size'
export type SortDirection = 'asc' | 'desc'
export type IconSize = 'large' | 'medium' | 'small'

export interface FileOs<T extends OsEntry = OsEntry> {
  files: () => OsFiles<T>
  changeFiles: (change: (fs: OsFiles<T>) => OsFiles<T>) => void
  clipboard: () => FileClipboard | null
  setClipboard: (clip: FileClipboard | null) => void
  startPins: () => string[]
  favourites: () => string[]
  toggleStartPin: (full: string) => void
  toggleFavourite: (full: string) => void
  openEntry: (entry: T, path: string) => void
  openLocation: (path: string, name: string) => void
  beginRename: (entry: T, path: string) => void
  showProperties: (entry: T, path: string) => void
  setWallpaper: (url: string) => void
  toast: (message: string) => void
  playSound: (name: string) => void
  shareBase: string
  icons: { zip: string; folder: string; text: string }
  iconSize: () => IconSize
  setIconSize: (size: IconSize) => void
  iconsVisible: () => boolean
  setIconsVisible: (visible: boolean) => void
  resetIconPositions: () => void
}

type Handlers = Record<string, () => void>
type Overrides = Record<string, { label?: string; icon?: string; disabled?: boolean; hidden?: boolean }>

export interface SidebarEntry<T = OsEntry> {
  id?: string
  type?: 'header'
  label: string
  icon?: string
  path?: string
  indent?: boolean
  entry?: T
  favourite?: boolean
}

export function joinPath(path: string, name: string): string
export function parentPath(path: string): string
export function folderPath(entry: OsEntry, parent: string): string
export function findEntry<T extends OsEntry>(fs: OsFiles<T>, fullPath: string): { entry: T; path: string } | null
export function freeName(entries: { name: string }[], name: string): string
export function renameEntry<T extends OsEntry>(fs: OsFiles<T>, path: string, name: string, newName: string): OsFiles<T>
export function deleteEntry<T extends OsEntry>(fs: OsFiles<T>, path: string, name: string): OsFiles<T>
export function restoreEntry<T extends OsEntry>(fs: OsFiles<T>, name: string): OsFiles<T>
export function removeFromBin<T extends OsEntry>(fs: OsFiles<T>, name: string): OsFiles<T>
export function emptyBin<T extends OsEntry>(fs: OsFiles<T>): OsFiles<T>
export function pasteEntry<T extends OsEntry>(
  fs: OsFiles<T>,
  clip: { mode: string; name: string; fromPath: string },
  target: string,
): { fs: OsFiles<T>; name: string | null }
export function pasteShortcut<T extends OsEntry>(
  fs: OsFiles<T>,
  clip: { mode: string; name: string; fromPath: string },
  target: string,
): { fs: OsFiles<T>; name: string | null }
export function compressEntry<T extends OsEntry>(
  fs: OsFiles<T>,
  path: string,
  name: string,
  icon: string,
): { fs: OsFiles<T>; name: string | null }
export function createFolder<T extends OsEntry>(fs: OsFiles<T>, path: string, icon: string): { fs: OsFiles<T>; name: string }
export function createTextFile<T extends OsEntry>(fs: OsFiles<T>, path: string, icon: string): { fs: OsFiles<T>; name: string }
export function writeTextFile<T extends OsEntry>(
  fs: OsFiles<T>,
  path: string,
  name: string,
  content: string,
  icon: string,
): OsFiles<T>

export function entryType(entry: Pick<OsEntry, 'name' | 'type'> & Partial<OsEntry>): string
export function entrySize(entry: Pick<OsEntry, 'name' | 'type'> & Partial<OsEntry>): number
export function entryDate(entry: Pick<OsEntry, 'name' | 'type'> & Partial<OsEntry>): Date
export function formatSize(bytes: number): string
export function formatDate(date: Date): string
export function folderSummary(fs: OsFiles<never> | object, root: string): { files: number; folders: number; bytes: number }
export function sortEntries<T extends Pick<OsEntry, 'name' | 'type'>>(entries: T[], key: SortKey, direction?: SortDirection): T[]
export function sortFolder<T extends OsEntry>(fs: OsFiles<T>, path: string, key: SortKey, direction?: SortDirection): OsFiles<T>
export function searchFolder<T extends OsEntry>(fs: OsFiles<T>, root: string, query: string): (T & { location: string })[]
export function entryProperties(fs: object, entry: object, path: string): [string, string][]
export function explorerSidebar<T extends OsEntry>(fs: OsFiles<T>, favourites: string[], imgPath: string): SidebarEntry<T>[]
export function restoreFileSystem<T extends OsEntry>(
  text: string | null,
  savedVersion: string | null,
  defaults: OsFiles<T>,
  version: number,
): OsFiles<T>
export function copyText(text: string): Promise<boolean>
export function shareLink(base: string, fullPath: string): string
export function sharedPath(hash: string): string | null
export function isPicture(entry: Pick<OsEntry, 'name' | 'type'>): boolean
export function fileMenuHandlers<T extends OsEntry>(os: FileOs<T>, entry: T, path: string): Handlers
export function fileMenuOverrides<T extends OsEntry>(os: FileOs<T>, entry: T, path: string): Overrides
export function fileMenuFor<T extends OsEntry>(
  os: FileOs<T>,
  entry: T,
  path: string,
): { name: 'file' | 'recycleBin' | 'recycledFile'; handlers: Handlers; overrides: Overrides }
export function folderMenuHandlers<T extends OsEntry>(os: FileOs<T>, path: string): Handlers
export function folderMenuOverrides<T extends OsEntry>(os: FileOs<T>): Overrides
export function desktopMenuHandlers<T extends OsEntry>(
  os: FileOs<T>,
  show: (name: 'desktopView' | 'desktopSort' | 'newItem', point: never, handlers: Handlers, overrides?: Overrides) => void,
  point: unknown,
): Handlers
