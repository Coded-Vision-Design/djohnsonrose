import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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

  // Actions
  finishBoot: () => void
  login: () => void
  logout: () => void

  openApp: (app: string, title?: string, extra?: Record<string, unknown>) => void
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
}

// Only `settings` and a couple of flags are persisted to localStorage.
// Window state intentionally lives only in memory — matches the PHP version.
interface PersistedSlice {
  loggedIn: boolean
  settings: Settings
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

      finishBoot: () => set({ isBooting: false }),
      login: () => set({ loggedIn: true, isBooting: false }),
      logout: () => set({ loggedIn: false, windows: [], focusedWindowId: null }),

      openApp: (app, title, extra) => {
        const state = get()
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
        let width = isSmallScreen ? window.innerWidth : 800
        let height = isSmallScreen ? window.innerHeight - TASKBAR_H : 600
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
          extra,
        }

        set({
          windows: [...state.windows, w],
          focusedWindowId: id,
          nextWindowZ: state.nextWindowZ + 1,
        })
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
      },
    }),
    {
      name: 'react.os',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedSlice => ({
        loggedIn: state.loggedIn,
        settings: state.settings,
      }),
    },
  ),
)

export const TASKBAR_HEIGHT = TASKBAR_H
export const WINDOW_MIN_WIDTH = MIN_W
export const WINDOW_MIN_HEIGHT = MIN_H
