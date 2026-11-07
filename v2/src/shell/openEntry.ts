import type { FsEntry } from '../data/filesystem'
import { useOsStore } from '../store/osStore'
import { appForFile } from '../../../assets/js/windowing/file-ops.js'

/** Opens a file system entry from the desktop or search, as v1's openItem does. */
export function openEntry(entry: FsEntry, path: string) {
  const { openApp, switchBuild } = useOsStore.getState()
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
    openApp(appForFile(entry.name), entry.name, { extra: { content: entry.content ?? '', filePath: path } })
  } else if (entry.type === 'link') {
    // The Desktop's build shortcut, which phones have in place of the chip.
    switchBuild(entry.url, entry.name)
  }
}
