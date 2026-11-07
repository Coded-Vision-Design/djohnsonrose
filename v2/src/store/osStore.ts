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
import {
  DESKTOP,
  renameEntry,
  restoreFileSystem,
  type FileClipboard,
  type IconSize,
} from '../../../assets/js/windowing/file-ops.js'
import {
  animateWindowOut,
  initialTheme,
  quickTogglePatch,
  recentKey,
  type QuickToggle,
} from '../../../assets/js/windowing/shell-ui.js'
import { filesystem, type FileSystem, type FsEntry } from '../data/filesystem'
import { forgetReferences } from '../../../assets/js/windowing/references.js'
import { addNotification, type ShellNotification } from '../../../assets/js/windowing/calendar.js'

const prefersDark = () => !!window.matchMedia?.('(prefers-color-scheme: dark)').matches

/** Plays the close or minimise animation on a copy of the window. See shell-ui.js. */
const animateOut = (id: number, kind: 'close' | 'minimise') =>
  animateWindowOut(document.getElementById(`win-${id}`), kind)

// The file system is saved on its own, and only when it changes: it is far too
// big to go through persist below, which writes on every state change.
const FILES_KEY = 'react.fileSystem'
// Bump this when data/filesystem.json changes, so that saved copies pick it up.
const FILES_VERSION = 3

function savedFiles(): FileSystem {
  try {
    const version = localStorage.getItem(`${FILES_KEY}.version`)
    return restoreFileSystem(localStorage.getItem(FILES_KEY), version, filesystem, FILES_VERSION)
  } catch {
    return filesystem
  }
}

const toggled = (list: string[], item: string) =>
  list.includes(item) ? list.filter((value) => value !== item) : [...list, item]

export interface WinWindow extends ManagedWindow {
  app: string
  title: string
  loading: boolean
  // Per-app extras (photos image, pdf url, etc.) - typed as unknown for now.
  extra?: Record<string, unknown>
  /** Goes up when an open app is given something new to show. */
  revision?: number
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
  /** So that Widgets can say when the forecast failed, as v1 does. */
  status?: 'loading' | 'ready' | 'error'
}

export type NewsStatus = 'loading' | 'ready' | 'error'

export interface NewsItem {
  id?: string | number
  title: string
  link: string
  description: string
  pubDate?: string
}

export interface RecycledItem {
  /** Original Desktop entry name - used as the unique key. */
  name: string
  /** Where it lived before being recycled - for restore-in-place. */
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
  shortcut?: string
  /** Click handler - receives no args, called once. */
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
  /** The icon row above the items, on file menus. */
  actions: ContextMenuItem[]
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
const DEFAULT_WALLPAPER = '/assets/img/wallpaper-bloom.webp'

// Monotonic id source - Date.now() collides on rapid successive opens.
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
  /** Whether the visitor picked the theme. Until they do, it follows the system. */
  themeChosen: boolean
  /** A wallpaper Settings is previewing on the desktop, before it is saved. */
  previewWallpaper: string | null
  /** When Start's Recommended items were last opened, by key. */
  recent: Record<string, number>

  // Logs (in-memory, capped)
  eventLogs: EventLog[]

  // Chrome state (taskbar / start menu / quick settings / widgets panel)
  startMenuOpen: boolean
  quickSettingsOpen: boolean
  widgetsOpen: boolean
  /** The clock's notifications and calendar. */
  calendarOpen: boolean
  pinnedApps: string[]

  // Live ambient state
  clock: Clock
  weather: Weather
  news: NewsItem[]
  newsStatus: NewsStatus

  /** Reported by the browser where it can, which is not persisted. */
  battery: { level: number; charging: boolean }
  desktopZoom: number

  // The file system, and what a visitor is doing to it.
  fileSystem: FileSystem
  fileClipboard: FileClipboard | null
  renaming: { path: string; name: string } | null
  properties: { entry: FsEntry; path: string } | null
  toast: string | null
  /** Every toast shown this session, newest first, for the clock's flyout. */
  notifications: ShellNotification[]

  // Persisted.
  startPins: string[]
  favourites: string[]
  desktopIconSize: IconSize
  desktopIconsVisible: boolean
  iconPositions: Record<string, IconPosition>

  // Viewport flags - kept in-memory only, updated by a global listener.
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean

  // Right-click context menu - single instance, mounted at root.
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
  /** A theme chosen in Settings, which wins over the system's from then on. */
  setTheme: (theme: Settings['theme']) => void
  /** One Quick Settings toggle, with the settings tied to it. See quickTogglePatch. */
  toggleQuickSetting: (id: QuickToggle) => void
  setPreviewWallpaper: (url: string | null) => void

  logEvent: (
    source: string,
    level: EventLog['level'],
    description: string,
    details?: Record<string, unknown>,
  ) => void

  // Chrome toggles
  toggleStartMenu: () => void
  toggleQuickSettings: () => void
  toggleWidgets: () => void
  toggleCalendar: () => void
  closeAllPopups: () => void
  minimizeAll: () => void

  // Ambient setters
  setClock: (clock: Clock) => void
  setWeather: (weather: Partial<Weather>) => void
  setNews: (news: NewsItem[]) => void
  setNewsStatus: (status: NewsStatus) => void

  // Files. Each change comes from a function in file-ops.js.
  changeFiles: (change: (fs: FileSystem) => FileSystem) => void
  setFileClipboard: (clip: FileClipboard | null) => void
  toggleStartPin: (full: string) => void
  toggleFavourite: (full: string) => void
  beginRename: (path: string, name: string) => void
  commitRename: (value: string) => void
  cancelRename: () => void
  showProperties: (entry: FsEntry, path: string) => void
  closeProperties: () => void
  showToast: (message: string) => void
  clearNotifications: () => void
  setDesktopIconSize: (size: IconSize) => void
  setDesktopIconsVisible: (visible: boolean) => void
  setIconPosition: (name: string, pos: IconPosition) => void
  resetIconPositions: () => void

  // Responsive flags + context menu
  setWindowTitle: (id: number, title: string) => void
  setBattery: (battery: OsState['battery']) => void
  setDesktopZoom: (zoom: number) => void
  togglePinned: (app: string) => void
  openContextMenu: (
    x: number,
    y: number,
    items: ContextMenuItem[],
    variant?: ContextMenuState['variant'],
    actions?: ContextMenuItem[],
  ) => void
  closeContextMenu: () => void
}

// Only `settings`, the auth flag, and filesystem-shaped state are persisted.
// Window state intentionally lives only in memory - matches the PHP version.
interface PersistedSlice {
  loggedIn: boolean
  settings: Settings
  themeChosen: boolean
  pinnedApps: string[]
  recent: Record<string, number>
  startPins: string[]
  favourites: string[]
  desktopIconSize: IconSize
  desktopIconsVisible: boolean
  iconPositions: Record<string, IconPosition>
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
        // A first visit follows the system. See the merge below for later ones.
        theme: initialTheme(null, prefersDark()),
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
      themeChosen: false,
      previewWallpaper: null,
      recent: {},

      eventLogs: [],

      startMenuOpen: false,
      quickSettingsOpen: false,
      widgetsOpen: false,
      calendarOpen: false,
      pinnedApps,

      clock: { time: '', date: '' },
      weather: { temp: '--', condition: 'Loading...', icon: '☁️', city: 'Essex', status: 'loading' },
      news: [],
      newsStatus: 'loading',

      fileSystem: savedFiles(),
      fileClipboard: null,
      renaming: null,
      properties: null,
      toast: null,
      notifications: [],
      startPins: [],
      favourites: [],
      desktopIconSize: 'medium',
      desktopIconsVisible: true,
      iconPositions: {},

      // Kept up to date by setDesktop.
      isMobile: initialMode() === 'phone',
      isTablet: initialMode() === 'tablet',
      isDesktop: initialMode() === 'desktop',

      contextMenu: { open: false, x: 0, y: 0, items: [], actions: [], variant: 'modern' },
      battery: { level: 85, charging: false },
      desktopZoom: 1,

      finishBoot: () => set({ isBooting: false }),
      login: () => {
        set({ loggedIn: true, isBooting: false })
        // v1 fires a single Security logEvent on login and lets the
        // Security/System/Explorer router record it. A separate
        // track('Login') here would record every login twice.
        get().logEvent('Security', 'Information', 'User DeVante logged in successfully')
      },
      logout: () => {
        get().logEvent('Security', 'Information', 'User DeVante logged out')
        // Letters opened in References must not outlast the visitor's session.
        forgetReferences(sessionStorage)
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
        const recent = recentKey(app, options?.extra)
        if (recent) set({ recent: { ...get().recent, [recent]: Date.now() } })
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
          // A new file, folder or address replaces what the app is showing.
          if (options?.extra) {
            set({
              windows: get().windows.map((w) =>
                w.id === existing.id
                  ? { ...w, title: title ?? w.title, extra: options.extra, revision: (w.revision ?? 0) + 1 }
                  : w,
              ),
            })
          }
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
        // Single System logEvent matches v1's openApp: the logEvent router
        // already records System events, so an explicit track('Open App')
        // here would record every open twice. The app goes with it, as in v1.
        get().logEvent('System', 'Information', `Starting application: ${w.title}`, { app })
      },

      closeWindow: (id) => {
        const state = get()
        const win = state.windows.find((w) => w.id === id)
        if (win) {
          state.logEvent('System', 'Information', `Closing application: ${win.title}`)
          animateOut(id, 'close')
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
          // Closing Settings drops a wallpaper it was only previewing, as in v1.
          ...(win?.app === 'settings' ? { previewWallpaper: null } : {}),
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
        animateOut(id, 'minimise')
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

      setTheme: (theme) => set({ settings: { ...get().settings, theme }, themeChosen: true }),

      toggleQuickSetting: (id) => {
        const settings = get().settings
        set({ settings: { ...settings, ...quickTogglePatch(settings, id) } })
      },

      setPreviewWallpaper: (previewWallpaper) => set({ previewWallpaper }),

      logEvent: (source, level, description, details = {}) => {
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
        // v1's store.js sends Security/System/Explorer events to /api/log.php,
        // which stores them for the Admin Console and the daily digest.
        // v2 does the same, so both builds record the same events.
        if (source === 'Security' || source === 'System' || source === 'Explorer') {
          track(`${source}: ${level}`, { description, ...details })
        }
      },

      // Chrome toggles: only one of start/quickSettings/widgets/calendar is ever open.
      toggleStartMenu: () => {
        const open = !get().startMenuOpen
        set({ startMenuOpen: open, quickSettingsOpen: false, widgetsOpen: false, calendarOpen: false })
      },
      toggleQuickSettings: () => {
        const open = !get().quickSettingsOpen
        set({ quickSettingsOpen: open, startMenuOpen: false, widgetsOpen: false, calendarOpen: false })
      },
      toggleWidgets: () => {
        const open = !get().widgetsOpen
        set({ widgetsOpen: open, startMenuOpen: false, quickSettingsOpen: false, calendarOpen: false })
      },
      toggleCalendar: () => {
        const open = !get().calendarOpen
        set({ calendarOpen: open, startMenuOpen: false, quickSettingsOpen: false, widgetsOpen: false })
      },
      closeAllPopups: () =>
        set({ startMenuOpen: false, quickSettingsOpen: false, widgetsOpen: false, calendarOpen: false }),

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
      setNewsStatus: (newsStatus) => set({ newsStatus }),

      changeFiles: (change) => {
        const fileSystem = change(get().fileSystem)
        if (fileSystem === get().fileSystem) return
        set({ fileSystem })
        try {
          localStorage.setItem(FILES_KEY, JSON.stringify(fileSystem))
          localStorage.setItem(`${FILES_KEY}.version`, String(FILES_VERSION))
        } catch {
          // Storage is full or blocked, so this change lasts until the page closes.
        }
      },
      setFileClipboard: (fileClipboard) => set({ fileClipboard }),
      toggleStartPin: (full) => set({ startPins: toggled(get().startPins, full) }),
      toggleFavourite: (full) => set({ favourites: toggled(get().favourites, full) }),
      beginRename: (path, name) => set({ renaming: { path, name } }),
      cancelRename: () => set({ renaming: null }),
      commitRename: (value) => {
        const { renaming, iconPositions } = get()
        if (!renaming) return
        const { path, name } = renaming
        const newName = value.trim()
        set({ renaming: null })
        get().changeFiles((fs) => renameEntry(fs, path, name, newName))
        const renamed = get().fileSystem[path]?.some((entry) => entry.name === newName)
        if (renamed && newName !== name && path === DESKTOP && iconPositions[name]) {
          const { [name]: position, ...others } = iconPositions
          set({ iconPositions: { ...others, [newName]: position } })
        }
      },
      showProperties: (entry, path) => set({ properties: { entry, path } }),
      closeProperties: () => set({ properties: null }),
      showToast: (toast) => {
        set({ toast, notifications: addNotification(get().notifications, toast, Date.now()) })
        window.setTimeout(() => {
          if (get().toast === toast) set({ toast: null })
        }, 3000)
      },
      clearNotifications: () => set({ notifications: [] }),
      setDesktopIconSize: (desktopIconSize) => set({ desktopIconSize }),
      setDesktopIconsVisible: (desktopIconsVisible) => set({ desktopIconsVisible }),

      setIconPosition: (name, pos) =>
        set({ iconPositions: { ...get().iconPositions, [name]: pos } }),

      resetIconPositions: () => set({ iconPositions: {} }),

      openContextMenu: (x, y, items, variant = 'modern', actions = []) =>
        set({ contextMenu: { open: true, x, y, items, actions, variant } }),
      closeContextMenu: () =>
        set({ contextMenu: { open: false, x: 0, y: 0, items: [], actions: [], variant: 'modern' } }),
      setWindowTitle: (id, title) =>
        set({ windows: get().windows.map((w) => (w.id === id ? { ...w, title } : w)) }),
      setBattery: (battery) => set({ battery }),
      setDesktopZoom: (desktopZoom) => set({ desktopZoom }),
      togglePinned: (app) =>
        set((state) => ({
          pinnedApps: state.pinnedApps.includes(app)
            ? state.pinnedApps.filter((id) => id !== app)
            : [...state.pinnedApps, app],
        })),
      }
    },
    {
      name: 'react.os',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedSlice => ({
        loggedIn: state.loggedIn,
        settings: state.settings,
        themeChosen: state.themeChosen,
        pinnedApps: state.pinnedApps,
        recent: state.recent,
        startPins: state.startPins,
        favourites: state.favourites,
        desktopIconSize: state.desktopIconSize,
        desktopIconsVisible: state.desktopIconsVisible,
        iconPositions: state.iconPositions,
      }),
      // Until the visitor picks a theme, it follows the system on every visit, as
      // in v1. A dark theme saved before this flag existed can only have been chosen.
      merge: (saved, current) => {
        const persisted = (saved ?? {}) as Partial<PersistedSlice>
        const merged = { ...current, ...persisted }
        const chosen = persisted.themeChosen ?? persisted.settings?.theme === 'dark'
        const theme = chosen ? merged.settings.theme : initialTheme(null, prefersDark())
        return { ...merged, themeChosen: chosen, settings: { ...current.settings, ...merged.settings, theme } }
      },
    },
  ),
)

export { TASKBAR_HEIGHT }

// Lets the browser tests read and drive the store. Stripped from production.
if (import.meta.env.DEV) {
  ;(window as unknown as { __osStore: typeof useOsStore }).__osStore = useOsStore
}
