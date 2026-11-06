import type { FsEntry } from '../data/filesystem'
import { useOsStore } from '../store/osStore'

/** Opens a file system entry from the desktop or search, as v1's openItem does. */
export function openEntry(entry: FsEntry, path: string) {
  const { openApp, logEvent } = useOsStore.getState()
  // Locked entries are in the References vault, which asks for the password.
  if ('extraData' in entry && entry.extraData?.locked) {
    openApp('references', entry.name, { extra: entry.extraData })
  } else if (entry.type === 'folder') {
    const initialPath = entry.path ? entry.path : `${path}\\${entry.name}`
    openApp('explorer', entry.name, { extra: { initialPath } })
  } else if (entry.type === 'app') {
    openApp(entry.app, entry.name, { extra: entry.extraData })
  } else if (entry.type === 'image') {
    openApp('photos', entry.name, { extra: { imageUrl: entry.url } })
  } else if (entry.type === 'video') {
    openApp('video', entry.name, { extra: { videoUrl: entry.url } })
  } else if (entry.type === 'file') {
    openApp('notepad', entry.name, { extra: { content: entry.content ?? '', filePath: path } })
  } else if (entry.type === 'link') {
    // Cross-build hop (e.g. PHP/React Desktop shortcuts). Logged via the same
    // Security/System event mechanism v1 uses so emails read alike.
    logEvent('System', 'Information', `Version switch: opening ${entry.name} (${entry.url})`)
    window.location.href = entry.url
  }
}
