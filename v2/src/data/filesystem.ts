import data from '../../../data/filesystem.json'
import { prepareFileSystem } from '../../../assets/js/windowing/shell-core.js'

// The mock Windows file system. data/filesystem.json is shared with v1, so that
// search, Explorer and the desktop cannot drift apart. Read-only here: changes
// a visitor makes are kept as overlays in the store.

export interface FsAppEntry {
  name: string
  type: 'app'
  app: string
  icon: string
  extraData?: Record<string, unknown>
}

export interface FsFolderEntry {
  name: string
  type: 'folder'
  icon: string
  /** Optional alias path — e.g. Desktop's "Projects" shortcut points at Users/.../Projects. */
  path?: string
}

export interface FsFileEntry {
  name: string
  type: 'file'
  icon: string
  content?: string
  extraData?: Record<string, unknown>
}

export interface FsImageEntry {
  name: string
  type: 'image'
  icon: string
  url: string
}

export interface FsVideoEntry {
  name: string
  type: 'video'
  icon: string
  url: string
  originalPath?: string
}

export interface FsLinkEntry {
  name: string
  type: 'link'
  icon: string
  /** Absolute path or full URL navigated to on activation. */
  url: string
}

/** Set by what a visitor does to an entry. See file-ops.js. */
interface FsHistory {
  modified?: number
  shortcut?: boolean
  zipped?: boolean
  originalName?: string
  originalPath?: string
  /** Where a search result was found. */
  location?: string
}

export type FsEntry = (
  | FsAppEntry
  | FsFolderEntry
  | FsFileEntry
  | FsImageEntry
  | FsVideoEntry
  | FsLinkEntry
) &
  FsHistory

export type FileSystem = Record<string, FsEntry[]>

export const filesystem: FileSystem = prepareFileSystem<FsEntry>(data, {
  imgPath: '/assets/img/',
  basePath: '/',
  otherBuild: { name: 'PHP Build', url: '/', icon: 'php.webp' },
})

// Paths, search and the Explorer sidebar are in assets/js/windowing/file-ops.js
// and shell-core.js, shared with v1.
