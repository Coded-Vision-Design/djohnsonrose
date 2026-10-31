import type { FsEntry } from '../data/filesystem'
import { useOsStore } from '../store/osStore'

export const isImageEntry = (entry: FsEntry) =>
  entry.type === 'image' || /\.(webp|jpe?g)$/.test(entry.name)

/** Opens a file system entry from the desktop or search, as v1's openItem does. */
export function openEntry(entry: FsEntry, path: string) {
  const { openApp, logEvent } = useOsStore.getState()
  if (entry.type === 'folder') {
    const initialPath = entry.path ? entry.path : `${path}\\${entry.name}`
    openApp('explorer', entry.name, { extra: { initialPath } })
  } else if (entry.type === 'app') {
    openApp(entry.app, entry.name, { extra: entry.extraData })
  } else if (entry.type === 'image') {
    openApp('photos', entry.name, { extra: { imageUrl: entry.url } })
  } else if (entry.type === 'video') {
    openApp('video', entry.name, { extra: { videoUrl: entry.url } })
  } else if (entry.type === 'file') {
    openApp('notepad', entry.name, { extra: { content: entry.content ?? '' } })
  } else if (entry.type === 'link') {
    // Cross-build hop (e.g. PHP/React Desktop shortcuts). Logged via the same
    // Security/System event mechanism v1 uses so emails read alike.
    logEvent('System', 'Information', `Version switch: opening ${entry.name} (${entry.url})`)
    window.location.href = entry.url
  }
}
