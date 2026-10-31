import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { track } from '../lib/telemetry'
import { getManifestEntry, pinnedApps } from '../apps/manifest'
import {
  TASKBAR_HEIGHT,
  detachPatch,
  detectMode,
  keyboardPlacement,
  maximizePatch,
  minimizePatch,
  nextFocusedWindow,
  placeNewWindow,
  planAssist,
  reflowPatch,
  restorePatch,
  snapPatch,
  unminimizePatch,
  type AssistPlan,
  type Desktop,
  type ManagedWindow,
  type Rect,
  type Shortcut,
  type SnapBar,
  type SnapTarget,
  type WindowMode,
  type WindowPatch,
} from '../../../assets/js/windowing/windowing.js'

// Static C:\Recycle Bin seeds — when restored, we re-materialise them at
// their originalPath. Keep this list aligned with data/filesystem.ts.
// (Inlined rather than imported to avoid a circular dependency.)
function lookupRecycleBinSeed(
  name: string,
): { fromPath: string; item: Record<string, unknown> } | null {
  if (name === 'Easter Egg - South Africa 25 Video.mp4') {
    return {
      fromPath: 'C:\\Users\\DeVante\\Desktop',
      item: {
        name: 'Easter Egg - South Africa 25 Video.mp4',
        type: 'video',
        icon: '🎬',
        url: '/data/south-africa-25.mp4',
      },
    }
  }
  return null
}

export interface WinWindow extends ManagedWindow {
  app: string
  title: string
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

/** What a drag in progress is offering. Held apart from the windows so that it
 *  never rerenders them. */
export interface SnapPreview {
  rect: Rect | null
  bar: SnapBar | null
  target: SnapTarget | null
}

export interface SnapFlyoutState {
  windowId: number
  anchor: { left: number; top: number; width: number; height: number }
  /** Opened from the keyboard, so focus moves into the flyout. */
  fromKeyboard: boolean
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

const EMPTY_PREVIEW: SnapPreview = { rect: null, bar: null, target: null }

function initialDesktop(): Desktop {
  return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight - TASKBAR_HEIGHT }
}

function initialMode(): WindowMode {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return detectMode({ width: window.innerWidth, height: window.innerHeight, coarse })
}
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
  snapFlyout: SnapFlyoutState | null
  snapAssist: AssistPlan | null
  taskSwitcherOpen: boolean
  /** The usable desktop: the windows layer, excluding the taskbar. */
  desktop: Desktop
  windowMode: WindowMode

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
  isDesktop: boolean

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
  /** A snapped or maximised window pulled away by its title bar. */
  detachWindow: (id: number, rect: Rect) => void
  /** Commits a resize. Snapped windows can move several at once. */
  applyWindowPatches: (patches: Record<number, WindowPatch>) => void
  snapWindow: (id: number, layout: string, zone: string) => void
  fillSnapAssist: (id: number) => void
  dismissSnapAssist: () => void
  openSnapFlyout: (flyout: SnapFlyoutState) => void
  closeSnapFlyout: () => void
  setSnapPreview: (preview: SnapPreview) => void
  toggleTaskSwitcher: () => void
  setDesktop: (desktop: Desktop, mode: WindowMode) => void
  /** Runs a window shortcut. Returns true when it did something. */
  runShortcut: (shortcut: Shortcut) => boolean

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
    (set, get) => {
      const patchWindows = (patches: Record<number, WindowPatch>) => {
        if (Object.keys(patches).length === 0) return
        set({ windows: get().windows.map((w) => (patches[w.id] ? { ...w, ...patches[w.id] } : w)) })
      }

      return {
      isBooting: true,
      loggedIn: false,

      windows: [],
      focusedWindowId: null,
      nextWindowZ: 100,
      snapPreview: EMPTY_PREVIEW,
      snapFlyout: null,
      snapAssist: null,
      taskSwitcherOpen: false,
      desktop: initialDesktop(),
      windowMode: initialMode(),

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
      pinnedApps,

      clock: { time: '', date: '' },
      weather: { temp: '--', condition: 'Loading...', icon: '☁️', city: 'London' },
      news: [],

      recycleBin: [],
      hiddenDesktop: [],
      restoredSeeds: [],
      recoveredItems: [],
      renames: {},
      iconPositions: {},

      // Kept up to date by setDesktop.
      isMobile: initialMode() === 'phone',
      isTablet: initialMode() === 'tablet',
      isDesktop: initialMode() === 'desktop',

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
        if (
          state.startMenuOpen ||
          state.quickSettingsOpen ||
          state.widgetsOpen ||
          state.taskSwitcherOpen
        ) {
          set({
            startMenuOpen: false,
            quickSettingsOpen: false,
            widgetsOpen: false,
            taskSwitcherOpen: false,
          })
        }
        // If already open, focus + restore.
        const existing = state.windows.find((w) => w.app === app)
        if (existing) {
          if (existing.state === 'minimized') {
            get().toggleMinimize(existing.id)
          } else {
            get().focusWindow(existing.id)
          }
          return
        }

        const id = nextWindowId()
        const manifest = getManifestEntry(app)
        const size = options?.size ?? manifest?.size ?? { w: 800, h: 600 }

        const w: WinWindow = {
          id,
          app,
          title: title ?? manifest?.title ?? app.charAt(0).toUpperCase() + app.slice(1),
          ...placeNewWindow(size, state.desktop, state.windows.length),
          z: state.nextWindowZ,
          state: 'floating',
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
        set({
          windows: remaining,
          focusedWindowId:
            state.focusedWindowId === id
              ? (nextFocusedWindow(remaining)?.id ?? null)
              : state.focusedWindowId,
          snapAssist: null,
          snapFlyout: state.snapFlyout?.windowId === id ? null : state.snapFlyout,
        })
      },

      focusWindow: (id) => {
        const state = get()
        const win = state.windows.find((w) => w.id === id)
        if (!win) return
        // Already on top: nothing to change, so nothing needs to rerender.
        if (state.focusedWindowId === id && win.z === state.nextWindowZ - 1) return
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
        if (win.state === 'minimized') {
          patchWindows({ [id]: unminimizePatch(win, state.desktop) })
          get().focusWindow(id)
          return
        }
        patchWindows({ [id]: minimizePatch(win) })
        const windows = get().windows
        if (state.focusedWindowId === id) {
          set({ focusedWindowId: nextFocusedWindow(windows)?.id ?? null })
        }
      },

      toggleMaximize: (id) => {
        const state = get()
        const win = state.windows.find((w) => w.id === id)
        if (!win || win.state === 'minimized') return
        patchWindows({
          [id]: win.state === 'maximized' ? restorePatch(win, state.desktop) : maximizePatch(win, state.desktop),
        })
        set({ snapFlyout: null, snapAssist: null })
      },

      moveWindow: (id, x, y) => patchWindows({ [id]: { x, y } }),

      detachWindow: (id, rect) => patchWindows({ [id]: detachPatch(rect) }),

      applyWindowPatches: (patches) => patchWindows(patches),

      snapWindow: (id, layout, zone) => {
        const state = get()
        const win = state.windows.find((w) => w.id === id)
        if (!win) return
        patchWindows({ [id]: snapPatch(win, layout, zone, state.desktop) })
        get().focusWindow(id)
        set({
          snapFlyout: null,
          snapAssist: planAssist(get().windows, layout, state.desktop),
        })
      },

      fillSnapAssist: (id) => {
        const { snapAssist, desktop, windows } = get()
        const win = windows.find((w) => w.id === id)
        if (!snapAssist || !win) return
        patchWindows({ [id]: snapPatch(win, snapAssist.layout, snapAssist.zone, desktop) })
        get().focusWindow(id)
        set({ snapAssist: planAssist(get().windows, snapAssist.layout, desktop) })
      },

      dismissSnapAssist: () => set({ snapAssist: null }),

      openSnapFlyout: (snapFlyout) => set({ snapFlyout }),

      closeSnapFlyout: () => set({ snapFlyout: null }),

      setSnapPreview: (snapPreview) => set({ snapPreview }),

      toggleTaskSwitcher: () => set({ taskSwitcherOpen: !get().taskSwitcherOpen }),

      setDesktop: (desktop, mode) => {
        const state = get()
        const changed = state.desktop.width !== desktop.width || state.desktop.height !== desktop.height
        const patches: Record<number, WindowPatch> = {}
        for (const win of state.windows) {
          const patch = reflowPatch(win, desktop, mode)
          if (patch) patches[win.id] = patch
        }
        set({
          desktop,
          windowMode: mode,
          isMobile: mode === 'phone',
          isTablet: mode === 'tablet',
          isDesktop: mode === 'desktop',
          ...(changed ? { snapPreview: EMPTY_PREVIEW, snapFlyout: null, snapAssist: null } : {}),
        })
        patchWindows(patches)
      },

      runShortcut: (shortcut) => {
        const { focusedWindowId, windows, desktop, windowMode } = get()
        const win = windows.find((w) => w.id === focusedWindowId)
        if (!win) return false
        if (shortcut === 'close') {
          get().closeWindow(win.id)
          return true
        }
        if (shortcut === 'layouts' || windowMode === 'phone') return false

        const placement = keyboardPlacement(win, shortcut, desktop, windowMode)
        if (!placement) return false
        if (placement.type === 'snap') get().snapWindow(win.id, placement.layout, placement.zone)
        else if (placement.type === 'minimize') get().toggleMinimize(win.id)
        else if (placement.type === 'maximize') get().toggleMaximize(win.id)
        else patchWindows({ [win.id]: restorePatch(win, desktop) })
        return true
      },

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
          windows: get().windows.map((w) =>
            w.state === 'minimized' ? w : { ...w, ...minimizePatch(w) },
          ),
          focusedWindowId: null,
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
        const seedNames = ['Easter Egg - South Africa 25 Video.mp4']
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

      openContextMenu: (x, y, items, variant = 'modern') =>
        set({ contextMenu: { open: true, x, y, items, variant } }),
      closeContextMenu: () =>
        set({ contextMenu: { open: false, x: 0, y: 0, items: [], variant: 'modern' } }),
      }
    },
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

export { TASKBAR_HEIGHT }

// Lets the browser tests read and drive the store. Stripped from production.
if (import.meta.env.DEV) {
  ;(window as unknown as { __osStore: typeof useOsStore }).__osStore = useOsStore
}
