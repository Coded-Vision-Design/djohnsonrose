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

export type FsEntry =
  | FsAppEntry
  | FsFolderEntry
  | FsFileEntry
  | FsImageEntry
  | FsVideoEntry
  | FsLinkEntry

export type FileSystem = Record<string, FsEntry[]>

export const filesystem: FileSystem = prepareFileSystem<FsEntry>(data, {
  imgPath: '/assets/img/',
  basePath: '/',
  otherBuild: { name: 'PHP Build', url: '/', icon: 'php.webp' },
})

/** Quick-access shortcuts shown in the Explorer sidebar. */
export const QUICK_ACCESS = [
  { label: 'Home', icon: '🏠', path: 'C:\\Users\\DeVante' },
  { label: 'Desktop', icon: '🖥️', path: 'C:\\Users\\DeVante\\Desktop' },
  { label: 'Documents', icon: '📄', path: 'C:\\Users\\DeVante\\Documents' },
  { label: 'Downloads', icon: '⬇️', path: 'C:\\Users\\DeVante\\Downloads' },
  { label: 'Pictures', icon: '🖼️', path: 'C:\\Users\\DeVante\\Pictures' },
  { label: 'Projects', icon: '🧰', path: 'C:\\Users\\DeVante\\Projects' },
  { label: 'This PC', icon: '💻', path: 'C:\\' },
] as const

/** Returns the entries at `path`, or [] if it doesn't exist. */
export function listAt(path: string): FsEntry[] {
  return filesystem[path] ?? []
}

/** Parent path — splits on `\\` and rejoins. Returns 'C:\\' as the root. */
export function parentPath(path: string): string {
  const parts = path.split('\\').filter((p) => p !== '')
  // C:\  (parts=['C:']) or C:\Users (parts=['C:', 'Users']) — root is the parent.
  if (parts.length <= 2) return 'C:\\'
  return parts.slice(0, -1).join('\\')
}

/** Build the child path for entering `folder` from `current`. */
export function joinPath(current: string, folder: FsFolderEntry): string {
  if (folder.path) return folder.path // explicit alias (Desktop → Projects)
  const trimmed = current.endsWith('\\') ? current.slice(0, -1) : current
  return `${trimmed}\\${folder.name}`
}

/** Case-insensitive substring search across every entry in the filesystem. */
export function searchFiles(
  query: string,
  limit = 50,
): { path: string; entry: FsEntry }[] {
  if (!query) return []
  const q = query.toLowerCase()
  const out: { path: string; entry: FsEntry }[] = []
  for (const [path, entries] of Object.entries(filesystem)) {
    for (const entry of entries) {
      if (entry.name.toLowerCase().includes(q)) {
        out.push({ path, entry })
        if (out.length >= limit) return out
      }
    }
  }
  return out
}
