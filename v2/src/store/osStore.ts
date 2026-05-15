import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { track } from '../lib/telemetry'

// Static C:\Recycle Bin seeds — when restored, we re-materialise them at
// their originalPath. Keep this list aligned with data/filesystem.ts.
// (Inlined rather than imported to avoid a circular dependency.)
function lookupRecycleBinSeed(
  name: string,
): { fromPath: string; item: Record<string, unknown> } | null {
  if (name === 'South Africa 25 Video.mp4') {
    return {
      fromPath: 'C:\\Users\\DeVante\\Desktop',
      item: {
        name: 'South Africa 25 Video.mp4',
        type: 'video',
        icon: '🎬',
        url: '/data/south-africa-25.mp4',
      },
    }
  }
  return null
}

export interface WinWindow {
  id: number
  app: string
  title: string
  x: number
  y: number
  width: number
  height: number
  z: number
  minimized: boolean
  maximized: boolean
  loading: boolean
  // Per-app extras (photos image, pdf url, etc.) — typed as unknown for now.
  extra?: Record<string, unknown>
}

export interface Settings {
  theme: 'light' | 'dark'
  sound: boolean
  volume: number
  brightness: number
  wallpaper: string
  wifi: boolean
  bluetooth: boolean
  airplane: boolean
  batterySaver: boolean
  nightLight: boolean
  accessibility: boolean
}

export interface SnapPreview {
  show: boolean
  x: number
  y: number
  w: number
  h: number
}

export interface EventLog {
  id: number
  time: string
  date: string
  source: string
  level: 'Information' | 'Warning' | 'Error'
  description: string
}

export interface Clock {
  time: string
  date: string
}

export interface Weather {
  temp: number | '--'
  city: string
  condition: string
  icon: string
}

export interface NewsItem {
  id?: string | number
  title: string
  link: string
  description: string
  pubDate?: string
}

export interface RecycledItem {
  /** Original Desktop entry name — used as the unique key. */
  name: string
  /** Where it lived before being recycled — for restore-in-place. */
  fromPath: string
  /** Serialised representation of the entry (icon, type, etc.). */
  payload: Record<string, unknown>
}

export interface IconPosition {
  x: number
  y: number
}

export interface ContextMenuItem {
  label?: string
  icon?: string
  /** Click handler — receives no args, called once. */
  action?: () => void
  /** Render as a horizontal divider between groups. */
  separator?: boolean
  /** Show but dim/un-clickable. */
  disabled?: boolean
}

export interface ContextMenuState {
  open: boolean
  x: number
  y: number
  items: ContextMenuItem[]
  /** Win11 modern (rounded) vs Win10 classic (square, dense). */
  variant: 'modern' | 'classic'
}

const TASKBAR_H = 48
const MIN_W = 300
const MIN_H = 200
const DEFAULT_WALLPAPER =
  'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop'

// Monotonic id source — Date.now() collides on rapid successive opens.
let windowIdCounter = 1
const nextWindowId = () => windowIdCounter++

interface OsState {
  // Boot / auth
  isBooting: boolean
  loggedIn: boolean

  // Windows
  windows: WinWindow[]
  focusedWindowId: number | null
  nextWindowZ: number
  snapPreview: SnapPreview

  // Settings (persisted)
  settings: Settings

  // Logs (in-memory, capped)
  eventLogs: EventLog[]

  // Chrome state (taskbar / start menu / quick settings / widgets panel)
  startMenuOpen: boolean
  quickSettingsOpen: boolean
  widgetsOpen: boolean
  pinnedApps: string[]

  // Live ambient state
  clock: Clock
  weather: Weather
  news: NewsItem[]

  // Recycle bin + desktop icon layout (both persisted)
  recycleBin: RecycledItem[]
  hiddenDesktop: string[]
  /** Static C:\Recycle Bin items the user has "Restored" (i.e. removed). */
  restoredSeeds: string[]
  /** Items materialised at a given path by restoring from the recycle bin. */
  recoveredItems: { path: string; item: Record<string, unknown> }[]
  iconPositions: Record<string, IconPosition>
  /** In-session Explorer rename overlay. Key is `${path}::${originalName}`. */
  renames: Record<string, string>

  // Viewport flags — kept in-memory only, updated by a global listener.
  isMobile: boolean
  isTablet: boolean
  isWideDesktop: boolean

  // Right-click context menu — single instance, mounted at root.
  contextMenu: ContextMenuState

  // Actions
  finishBoot: () => void
  login: () => void
  logout: () => void

  openApp: (
    app: string,
    title?: string,
    options?: { size?: { w: number; h: number }; extra?: Record<string, unknown> },
  ) => void
  closeWindow: (id: number) => void
  focusWindow: (id: number) => void
  toggleMinimize: (id: number) => void
  toggleMaximize: (id: number) => void
  moveWindow: (id: number, x: number, y: number) => void
  resizeWindow: (id: number, x: number, y: number, w: number, h: number) => void
  setMaximized: (id: number, maximized: boolean) => void
  setSnapPreview: (preview: SnapPreview) => void

  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void

  logEvent: (source: string, level: EventLog['level'], description: string) => void

  // Chrome toggles
  toggleStartMenu: () => void
  toggleQuickSettings: () => void
  toggleWidgets: () => void
  closeAllPopups: () => void
  minimizeAll: () => void

  // Ambient setters
  setClock: (clock: Clock) => void
  setWeather: (weather: Partial<Weather>) => void
  setNews: (news: NewsItem[]) => void

  // Recycle bin / icon positions
  recycleItem: (name: string, fromPath: string, payload: Record<string, unknown>) => void
  restoreFromRecycle: (name: string) => void
  emptyRecycleBin: () => void
  setIconPosition: (name: string, pos: IconPosition) => void
  resetIconPositions: () => void

  // Explorer rename (session-scoped overlay; doesn't mutate the static fs)
  renameFile: (path: string, originalName: string, newName: string) => void

  // Responsive flags + context menu
  setBreakpoint: (width: number) => void
  openContextMenu: (
    x: number,
    y: number,
    items: ContextMenuItem[],
    variant?: 'modern' | 'classic',
  ) => void
  closeContextMenu: () => void
}

// Only `settings`, the auth flag, and filesystem-shaped state are persisted.
// Window state intentionally lives only in memory — matches the PHP version.
interface PersistedSlice {
  loggedIn: boolean
  settings: Settings
  recycleBin: RecycledItem[]
  hiddenDesktop: string[]
  restoredSeeds: string[]
  recoveredItems: { path: string; item: Record<string, unknown> }[]
  iconPositions: Record<string, IconPosition>
  renames: Record<string, string>
}

export const useOsStore = create<OsState>()(
  persist(
    (set, get) => ({
      isBooting: true,
      loggedIn: false,

      windows: [],
      focusedWindowId: null,
      nextWindowZ: 100,
      snapPreview: { show: false, x: 0, y: 0, w: 0, h: 0 },

      settings: {
        theme: 'light',
        sound: true,
        volume: 75,
        brightness: 100,
        wallpaper: DEFAULT_WALLPAPER,
        wifi: true,
        bluetooth: true,
        airplane: false,
        batterySaver: false,
        nightLight: false,
        accessibility: false,
      },

      eventLogs: [],

      startMenuOpen: false,
      quickSettingsOpen: false,
      widgetsOpen: false,
      pinnedApps: ['edge', 'explorer', 'outlook', 'vscode', 'flstudio'],

      clock: { time: '', date: '' },
      weather: { temp: '--', condition: 'Loading...', icon: '☁️', city: 'London' },
      news: [],

      recycleBin: [],
      hiddenDesktop: [],
      restoredSeeds: [],
      recoveredItems: [],
      renames: {},
      iconPositions: {},

      // Initialised from window.innerWidth — useBreakpoint() keeps these
      // updated. SSR-safe via the typeof check.
      isMobile: typeof window !== 'undefined' ? window.innerWidth < 640 : false,
      isTablet:
        typeof window !== 'undefined' ? window.innerWidth >= 640 && window.innerWidth < 1024 : false,
      isWideDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,

      contextMenu: { open: false, x: 0, y: 0, items: [], variant: 'modern' },

      finishBoot: () => set({ isBooting: false }),
      login: () => {
        set({ loggedIn: true, isBooting: false })
        // v1 fires a single Security logEvent on login and lets the
        // Security/System/Explorer router send the email. Mirror that —
        // a separate track('Login') here would duplicate every email.
        get().logEvent('Security', 'Information', 'User DeVante logged in successfully')
      },
      logout: () => {
        get().logEvent('Security', 'Information', 'User DeVante logged out')
        set({
          loggedIn: false,
          windows: [],
          focusedWindowId: null,
          startMenuOpen: false,
          quickSettingsOpen: false,
          widgetsOpen: false,
        })
      },

      openApp: (app, title, options) => {
        const state = get()
        // Launching an app always closes start/quick-settings/widgets popups.
        if (state.startMenuOpen || state.quickSettingsOpen || state.widgetsOpen) {
          set({ startMenuOpen: false, quickSettingsOpen: false, widgetsOpen: false })
        }
        // If already open, focus + restore.
        const existing = state.windows.find((w) => w.app === app)
        if (existing) {
          if (existing.minimized) {
            get().toggleMinimize(existing.id)
          } else {
            get().focusWindow(existing.id)
          }
          return
        }

        const id = nextWindowId()
        const isSmallScreen = window.innerWidth < 1024
        const requested = options?.size
        let width = isSmallScreen ? window.innerWidth : (requested?.w ?? 800)
        let height = isSmallScreen ? window.innerHeight - TASKBAR_H : (requested?.h ?? 600)
        width = Math.min(width, window.innerWidth)
        height = Math.min(height, window.innerHeight - TASKBAR_H)

        const offset = state.windows.length * 30
        const x = isSmallScreen ? 0 : (window.innerWidth - width) / 2 + offset
        const y = isSmallScreen ? 0 : (window.innerHeight - TASKBAR_H - height) / 2 + offset

        const w: WinWindow = {
          id,
          app,
          title: title ?? app.charAt(0).toUpperCase() + app.slice(1),
          x,
          y,
          width,
          height,
          z: state.nextWindowZ,
          minimized: false,
          maximized: isSmallScreen,
          loading: false,
          extra: options?.extra,
        }

        set({
          windows: [...state.windows, w],
          focusedWindowId: id,
          nextWindowZ: state.nextWindowZ + 1,
        })
        // Single System logEvent matches v1's openApp — the logEvent router
        // already emails on System source, so an explicit track('Open App')
        // here would double-fire every email.
        get().logEvent('System', 'Information', `Starting application: ${w.title}`)
      },

      closeWindow: (id) => {
        const state = get()
        const win = state.windows.find((w) => w.id === id)
        if (win) {
          state.logEvent('System', 'Information', `Closing application: ${win.title}`)
        }
        const remaining = state.windows.filter((w) => w.id !== id)
        let focus = state.focusedWindowId
        if (focus === id) {
          const visible = remaining.filter((w) => !w.minimized)
          focus = visible.length ? visible[visible.length - 1].id : null
        }
        set({ windows: remaining, focusedWindowId: focus })
      },

      focusWindow: (id) => {
        const state = get()
        const win = state.windows.find((w) => w.id === id)
        if (!win) return
        set({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, z: state.nextWindowZ } : w,
          ),
          nextWindowZ: state.nextWindowZ + 1,
          focusedWindowId: id,
        })
      },

      toggleMinimize: (id) => {
        const state = get()
        const win = state.windows.find((w) => w.id === id)
        if (!win) return
        const nextMin = !win.minimized
        set({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, minimized: nextMin } : w,
          ),
        })
        if (!nextMin) get().focusWindow(id)
      },

      toggleMaximize: (id) => {
        const state = get()
        set({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, maximized: !w.maximized } : w,
          ),
        })
      },

      moveWindow: (id, x, y) => {
        set({
          windows: get().windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
        })
      },

      resizeWindow: (id, x, y, w, h) => {
        set({
          windows: get().windows.map((win) =>
            win.id === id ? { ...win, x, y, width: w, height: h } : win,
          ),
        })
      },

      setMaximized: (id, maximized) => {
        set({
          windows: get().windows.map((w) =>
            w.id === id ? { ...w, maximized } : w,
          ),
        })
      },

      setSnapPreview: (snapPreview) => set({ snapPreview }),

      updateSetting: (key, value) => {
        set({ settings: { ...get().settings, [key]: value } })
      },

      logEvent: (source, level, description) => {
        const ev: EventLog = {
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString(),
          date: new Date().toLocaleDateString(),
          source,
          level,
          description,
        }
        const next = [ev, ...get().eventLogs]
        if (next.length > 100) next.pop()
        set({ eventLogs: next })
        // v1's store.js routes Security/System/Explorer events to /api/log.php
        // which emails the admin. Mirror that behaviour here so the event
        // viewer in v2 has the same observability surface.
        if (source === 'Security' || source === 'System' || source === 'Explorer') {
          track(`${source}: ${level}`, { description })
        }
      },

      // Chrome toggles: only one of start/quickSettings/widgets is ever open.
      toggleStartMenu: () => {
        const open = !get().startMenuOpen
        set({ startMenuOpen: open, quickSettingsOpen: false, widgetsOpen: false })
      },
      toggleQuickSettings: () => {
        const open = !get().quickSettingsOpen
        set({ quickSettingsOpen: open, startMenuOpen: false, widgetsOpen: false })
      },
      toggleWidgets: () => {
        const open = !get().widgetsOpen
        set({ widgetsOpen: open, startMenuOpen: false, quickSettingsOpen: false })
      },
      closeAllPopups: () =>
        set({ startMenuOpen: false, quickSettingsOpen: false, widgetsOpen: false }),

      minimizeAll: () => {
        set({
          windows: get().windows.map((w) => ({ ...w, minimized: true })),
        })
      },

      setClock: (clock) => set({ clock }),
      setWeather: (partial) => set({ weather: { ...get().weather, ...partial } }),
      setNews: (news) => set({ news }),

      recycleItem: (name, fromPath, payload) => {
        const state = get()
        if (state.recycleBin.some((r) => r.name === name)) return
        set({
          recycleBin: [...state.recycleBin, { name, fromPath, payload }],
          hiddenDesktop: state.hiddenDesktop.includes(name)
            ? state.hiddenDesktop
            : [...state.hiddenDesktop, name],
        })
        state.logEvent('FileSystem', 'Information', `Recycled: ${name}`)
      },

      restoreFromRecycle: (name) => {
        const state = get()
        // Materialise the entry back at its original path so it actually
        // reappears (otherwise Restore would only "uncycle" without putting
        // anything anywhere visible). v1 mutated its mock filesystem; we
        // keep a `recoveredItems` overlay instead.
        let recoveredAdditions: { path: string; item: Record<string, unknown> }[] = []
        const dynamicMatch = state.recycleBin.find((r) => r.name === name)
        if (dynamicMatch) {
          recoveredAdditions = [
            { path: dynamicMatch.fromPath, item: dynamicMatch.payload },
          ]
        } else {
          // Seeded item — look up its originalPath from the static filesystem.
          const seededAt = lookupRecycleBinSeed(name)
          if (seededAt) recoveredAdditions = [{ path: seededAt.fromPath, item: seededAt.item }]
        }
        // De-dup by (path, name) so repeated restores don't multiply entries.
        const existing = state.recoveredItems
        const additions = recoveredAdditions.filter(
          (a) =>
            !existing.some(
              (e) =>
                e.path === a.path &&
                (e.item as { name?: string }).name === (a.item as { name?: string }).name,
            ),
        )
        set({
          recycleBin: state.recycleBin.filter((r) => r.name !== name),
          hiddenDesktop: state.hiddenDesktop.filter((n) => n !== name),
          restoredSeeds: state.restoredSeeds.includes(name)
            ? state.restoredSeeds
            : [...state.restoredSeeds, name],
          recoveredItems: [...existing, ...additions],
        })
        state.logEvent('FileSystem', 'Information', `Restored from recycle bin: ${name}`)
      },

      emptyRecycleBin: () => {
        const state = get()
        state.logEvent(
          'FileSystem',
          'Warning',
          `Recycle bin emptied (${state.recycleBin.length} items)`,
        )
        // Empty wipes both the dynamic bin and any remaining seeded items —
        // user can recover seeds via a fresh `localStorage.clear()` if needed.
        // Importing data/filesystem lazily would create a circular dep, so we
        // hard-code the known seed list here.
        const seedNames = ['South Africa 25 Video.mp4']
        set({
          recycleBin: [],
          restoredSeeds: Array.from(new Set([...state.restoredSeeds, ...seedNames])),
        })
      },

      setIconPosition: (name, pos) =>
        set({ iconPositions: { ...get().iconPositions, [name]: pos } }),

      resetIconPositions: () => set({ iconPositions: {} }),

      renameFile: (path, originalName, newName) => {
        const trimmed = newName.trim()
        if (!trimmed || trimmed === originalName) return
        const key = `${path}::${originalName}`
        set({ renames: { ...get().renames, [key]: trimmed } })
        get().logEvent('FileSystem', 'Information', `Renamed ${originalName} → ${trimmed}`)
      },

      setBreakpoint: (width) => {
        const isMobile = width < 640
        const isTablet = width >= 640 && width < 1024
        const isWideDesktop = width >= 1024
        const s = get()
        if (
          s.isMobile === isMobile &&
          s.isTablet === isTablet &&
          s.isWideDesktop === isWideDesktop
        ) {
          return
        }
        set({ isMobile, isTablet, isWideDesktop })
        // On mobile, force every window into the maximised state so it always
        // takes the full available area (matches v1's resize handler).
        if (!isWideDesktop) {
          set({
            windows: s.windows.map((w) => ({ ...w, maximized: true })),
          })
        }
      },

      openContextMenu: (x, y, items, variant = 'modern') =>
        set({ contextMenu: { open: true, x, y, items, variant } }),
      closeContextMenu: () =>
        set({ contextMenu: { open: false, x: 0, y: 0, items: [], variant: 'modern' } }),
    }),
    {
      name: 'react.os',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedSlice => ({
        loggedIn: state.loggedIn,
        settings: state.settings,
        recycleBin: state.recycleBin,
        hiddenDesktop: state.hiddenDesktop,
        restoredSeeds: state.restoredSeeds,
        recoveredItems: state.recoveredItems,
        iconPositions: state.iconPositions,
        renames: state.renames,
      }),
    },
  ),
)

export const TASKBAR_HEIGHT = TASKBAR_H
export const WINDOW_MIN_WIDTH = MIN_W
export const WINDOW_MIN_HEIGHT = MIN_H
