import type { FileOs } from '../../../assets/js/windowing/file-ops.js'
import type { FsEntry } from '../data/filesystem'
import { playSound } from '../lib/sounds'
import { useOsStore } from '../store/osStore'
import { openEntry } from './openEntry'

const IMG = '/assets/img/'

const folderName = (path: string) => path.split('\\').filter(Boolean).pop() ?? path

/**
 * Plugs v2 into the shared file rules in file-ops.js. Explorer overrides what
 * differs inside it, such as opening a folder in the same window.
 */
export function fileOs(overrides: Partial<FileOs<FsEntry>> = {}): FileOs<FsEntry> {
  const store = useOsStore.getState
  return {
    files: () => store().fileSystem,
    changeFiles: (change) => store().changeFiles(change),
    clipboard: () => store().fileClipboard,
    setClipboard: (clip) => store().setFileClipboard(clip),
    startPins: () => store().startPins,
    favourites: () => store().favourites,
    toggleStartPin: (full) => store().toggleStartPin(full),
    toggleFavourite: (full) => store().toggleFavourite(full),
    openEntry,
    openLocation: (path, name) =>
      store().openApp('explorer', folderName(path), { extra: { initialPath: path, selectName: name } }),
    beginRename: (entry, path) => store().beginRename(path, entry.name),
    showProperties: (entry, path) => store().showProperties(entry, path),
    setWallpaper: (url) => store().updateSetting('wallpaper', url),
    toast: (message) => store().showToast(message),
    playSound: (name) => playSound(name as Parameters<typeof playSound>[0]),
    shareBase: `${window.location.origin}/v2/`,
    icons: {
      zip: `${IMG}win11/zipfolder.webp`,
      folder: `${IMG}win11/folder.webp`,
      text: `${IMG}notepad++.webp`,
    },
    iconSize: () => store().desktopIconSize,
    setIconSize: (size) => store().setDesktopIconSize(size),
    iconsVisible: () => store().desktopIconsVisible,
    setIconsVisible: (visible) => store().setDesktopIconsVisible(visible),
    resetIconPositions: () => store().resetIconPositions(),
    ...overrides,
  }
}
