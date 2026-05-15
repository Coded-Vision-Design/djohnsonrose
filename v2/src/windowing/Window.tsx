import { useEffect, useRef } from 'react'
import { useOsStore, type WinWindow, TASKBAR_HEIGHT } from '../store/osStore'
import { playSound } from '../lib/sounds'
import { useDrag } from './useDrag'
import { useResize, type ResizeDir } from './useResize'

interface Props {
  win: WinWindow
  children: React.ReactNode
}

// Matches partials/desktop.php window block. Title bar h-9 (h-[44px] for Edge,
// which v1 special-cases). Min/maximize/close buttons w-[46px] h-[32px], close
// gets the Win11 #c42b1c red. Resize handles in an inset[-4px] overlay.

export function Window({ win, children }: Props) {
  const focusedId = useOsStore((s) => s.focusedWindowId)
  const focusWindow = useOsStore((s) => s.focusWindow)
  const closeWindow = useOsStore((s) => s.closeWindow)
  const toggleMinimize = useOsStore((s) => s.toggleMinimize)
  const toggleMaximize = useOsStore((s) => s.toggleMaximize)

  const onDragStart = useDrag()
  const onResizeStart = useResize()
  const playedOpen = useRef(false)

  useEffect(() => {
    if (!playedOpen.current) {
      playSound('open')
      playedOpen.current = true
    }
  }, [])

  const isFocused = focusedId === win.id
  const isMaximized = win.maximized

  if (win.minimized) return null

  const titleBarHeight = win.app === 'edge' ? 'h-[44px] py-[6px]' : 'h-9'

  // Maximized: fill viewport up to the taskbar (taskbar height reserved at
  // bottom). Restored: free-floating geometry from the store.
  const style: React.CSSProperties = isMaximized
    ? {
        left: 0,
        top: 0,
        width: '100dvw',
        height: `calc(100dvh - ${TASKBAR_HEIGHT}px)`,
        zIndex: win.z,
      }
    : {
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.z,
      }

  return (
    <div
      className={`absolute flex flex-col pointer-events-auto win-shadow glass animate-window-open overflow-hidden ${
        isFocused ? 'window-active' : ''
      } ${isMaximized ? '!rounded-none' : 'rounded-lg'}`}
      style={style}
      onMouseDown={() => focusWindow(win.id)}
      role="dialog"
      aria-label={win.title}
    >
      {/* Title bar — Edge hides its title because it has its own tab strip */}
      <div
        className={`${titleBarHeight} flex items-center justify-between px-3 select-none bg-white/10 dark:bg-black/10 cursor-default overflow-hidden ${
          isMaximized ? '' : 'rounded-t-lg'
        }`}
        onMouseDown={(e) => {
          // Only the title bar surface itself starts the drag — not its children.
          if (e.target !== e.currentTarget) return
          if (e.button !== 0) return
          onDragStart(win.id, e)
        }}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <div className="flex items-center space-x-2 pointer-events-none min-w-0">
          {win.app !== 'edge' && (
            <span className="text-sm font-medium dark:text-white truncate">{win.title}</span>
          )}
        </div>
        <div className="flex items-center h-full gap-[2px] shrink-0">
          <button
            type="button"
            aria-label="Minimize"
            onClick={(e) => {
              e.stopPropagation()
              toggleMinimize(win.id)
            }}
            className="w-[46px] h-[32px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-2.5 h-2.5 fill-black dark:fill-white opacity-70" viewBox="0 0 10 1" aria-hidden="true">
              <rect width="10" height="1" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
            onClick={(e) => {
              e.stopPropagation()
              toggleMaximize(win.id)
            }}
            className="w-[46px] h-[32px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {isMaximized ? (
              <svg className="w-2.5 h-2.5 fill-black dark:fill-white opacity-70" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2,0v2H0v8h8V8h2V0H2z M7,9H1V3h6V9z M9,7H8V2H3V1h6V7z" />
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5 fill-black dark:fill-white opacity-70" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M0,0v10h10V0H0z M9,9H1V1h8V9z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(win.id)
            }}
            className="w-[46px] h-[32px] flex items-center justify-center hover:bg-[#c42b1c] hover:text-white text-black dark:text-white transition-colors group"
          >
            <svg className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 fill-current" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M10,1.4L8.6,0L5,3.6L1.4,0L0,1.4L3.6,5L0,8.6L1.4,10L5,6.4l3.6,3.6l1.4-1.4L6.4,5L10,1.4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Window content */}
      <div
        className={`flex-grow overflow-auto relative bg-white dark:bg-[#1c1c1c] ${
          isMaximized ? '' : 'rounded-b-lg'
        }`}
      >
        {children}
      </div>

      {/* Resize handles — v1's inset[-4px] overlay with 8 hit zones */}
      {!isMaximized && (
        <div className="absolute inset-[-4px] pointer-events-none z-50">
          {RESIZE_HANDLES.map((h) => (
            <div
              key={h.dir}
              className={`absolute ${h.className} pointer-events-auto`}
              style={{ cursor: h.cursor }}
              onMouseDown={(e) => {
                e.stopPropagation()
                onResizeStart(win.id, h.dir, e)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const RESIZE_HANDLES: { dir: ResizeDir; className: string; cursor: string }[] = [
  // Edges, inset from the corners by 2 px each side so the corners get clean
  // diagonal cursors (matches v1's top-2 / bottom-2 / left-2 / right-2 spacing).
  { dir: 'w', className: 'top-2 bottom-2 left-0 w-2', cursor: 'ew-resize' },
  { dir: 'e', className: 'top-2 bottom-2 right-0 w-2', cursor: 'ew-resize' },
  { dir: 'n', className: 'top-0 left-2 right-2 h-2', cursor: 'ns-resize' },
  { dir: 's', className: 'bottom-0 left-2 right-2 h-2', cursor: 'ns-resize' },
  // Corners
  { dir: 'nw', className: 'top-0 left-0 w-3 h-3', cursor: 'nwse-resize' },
  { dir: 'ne', className: 'top-0 right-0 w-3 h-3', cursor: 'nesw-resize' },
  { dir: 'sw', className: 'bottom-0 left-0 w-3 h-3', cursor: 'nesw-resize' },
  { dir: 'se', className: 'bottom-0 right-0 w-3 h-3', cursor: 'nwse-resize' },
]
