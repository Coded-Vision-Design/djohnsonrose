import menus from '../../../data/menus.json'
import {
  buildMenu,
  placeMenu,
  type MenuData,
  type MenuItemData,
} from '../../../assets/js/windowing/shell-core.js'
import { useOsStore } from '../store/osStore'

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

function desktopHandlers() {
  const { openApp } = useOsStore.getState()
  return {
    refresh: () => window.location.reload(),
    displaySettings: () => openApp('settings'),
    personalise: () => openApp('settings', 'Settings', { extra: { currentTab: 'personalisation' } }),
    terminal: () => openApp('terminal'),
  }
}

/** The Win10-style menu, opened from "Show more options". */
export function showClassicDesktopMenu(point: MenuPoint) {
  const { clientX, clientY } = point
  showMenu('desktopClassic', { clientX, clientY }, desktopHandlers())
}

export function showDesktopMenu(point: MenuPoint) {
  const { clientX, clientY } = point
  const here = { clientX, clientY }
  const { desktopZoom, resetIconPositions, setDesktopZoom } = useOsStore.getState()
  showMenu(
    'desktop',
    here,
    {
      ...desktopHandlers(),
      autoArrange: resetIconPositions,
      sortBy: resetIconPositions,
      resetZoom: () => setDesktopZoom(1),
      classic: () => showClassicDesktopMenu(here),
    },
    { resetZoom: { disabled: desktopZoom === 1 } },
  )
}
