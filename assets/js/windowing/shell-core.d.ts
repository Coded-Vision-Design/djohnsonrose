export interface MenuItemData {
  id?: string
  label?: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  hidden?: boolean
  separator?: boolean
}

export interface MenuData {
  variant?: string
  actions?: MenuItemData[]
  items?: MenuItemData[]
}

export interface MenuItem extends MenuItemData {
  action?: () => void
}

export interface BuiltMenu {
  variant: 'modern' | 'classic'
  actions: MenuItem[]
  items: MenuItem[]
}

export interface SearchApp {
  id: string
  title: string
  icon: string
}

export interface SearchEntry {
  name: string
  type: string
  icon?: string
  app?: string
}

export type SearchResult<T> = (T | SearchEntry) & { fullPath: string }

export function prepareFileSystem<T = Record<string, unknown>>(
  data: Record<string, unknown[]>,
  options: {
    imgPath: string
    basePath: string
    otherBuild: { name: string; url: string; icon: string }
  },
): Record<string, T[]>

export function searchOs<T extends SearchEntry>(
  query: string,
  apps: SearchApp[],
  fileSystem: Record<string, T[]>,
  limit?: number,
): SearchResult<T>[]

export function buildMenu(
  menu: MenuData,
  imgPath: string,
  handlers?: Record<string, () => void>,
  overrides?: Record<string, Partial<MenuItemData>>,
): BuiltMenu

export function placeMenu(
  x: number,
  y: number,
  menu: Pick<BuiltMenu, 'actions' | 'items'> & { variant?: string },
  viewport: { width: number; height: number },
  above?: boolean,
): { x: number; y: number }
