import menus from '../../../data/menus.json'
import {
  buildMenu,
  placeMenu,
  type MenuData,
  type MenuItemData,
} from '../../../assets/js/windowing/shell-core.js'
import {
  desktopMenuHandlers,
  fileMenuFor,
  folderMenuOverrides,
  type FileOs,
} from '../../../assets/js/windowing/file-ops.js'
import type { FsEntry } from '../data/filesystem'
import { useOsStore } from '../store/osStore'
import { fileOs } from './fileOs'

const IMG = '/assets/img/'

/** Anywhere a menu can open from: a mouse event, or a point kept from one. */
export interface MenuPoint {
  clientX: number
  clientY: number
}

/**
 * Opens a menu from data/menus.json, which v1 shares, so that the two cannot
 * drift apart. Each caller only says what the items do.
 */
export function showMenu(
  name: keyof typeof menus,
  { clientX, clientY }: MenuPoint,
  handlers: Record<string, () => void> = {},
  overrides: Record<string, Partial<MenuItemData>> = {},
  above = false,
) {
  const menu = buildMenu(menus[name] as MenuData, IMG, handlers, overrides)
  const viewport = { width: window.innerWidth, height: window.innerHeight }
  const { x, y } = placeMenu(clientX, clientY, menu, viewport, above)
  useOsStore.getState().openContextMenu(x, y, menu.items, menu.variant, menu.actions)
}

function desktopHandlers(here: MenuPoint) {
  const { openApp } = useOsStore.getState()
  return {
    ...desktopMenuHandlers(fileOs(), showMenu as never, here),
    refresh: () => window.location.reload(),
    displaySettings: () => openApp('settings'),
    personalise: () => openApp('settings', 'Settings', { extra: { currentTab: 'personalisation' } }),
    terminal: () => openApp('terminal'),
  }
}

/** The Win10-style menu, opened from "Show more options". */
export function showClassicDesktopMenu({ clientX, clientY }: MenuPoint) {
  const here = { clientX, clientY }
  showMenu('desktopClassic', here, desktopHandlers(here), folderMenuOverrides(fileOs()))
}

export function showDesktopMenu({ clientX, clientY }: MenuPoint) {
  const here = { clientX, clientY }
  const { desktopZoom, setDesktopZoom } = useOsStore.getState()
  showMenu(
    'desktop',
    here,
    {
      ...desktopHandlers(here),
      resetZoom: () => setDesktopZoom(1),
      classic: () => showClassicDesktopMenu(here),
    },
    { ...folderMenuOverrides(fileOs()), resetZoom: { disabled: desktopZoom === 1 } },
  )
}

/** A file's menu, wherever it is. Explorer overrides what differs inside it. */
export function showFileMenu(
  entry: FsEntry,
  path: string,
  { clientX, clientY }: MenuPoint,
  overrides: Partial<FileOs<FsEntry>> = {},
) {
  const here = { clientX, clientY }
  const { name, handlers, overrides: changes } = fileMenuFor(fileOs(overrides), entry, path)
  showMenu(name, here, { ...handlers, classic: () => showClassicDesktopMenu(here) }, changes)
}
