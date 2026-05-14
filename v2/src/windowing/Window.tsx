import { useEffect, useRef } from 'react'
import { useOsStore, type WinWindow, TASKBAR_HEIGHT } from '../store/osStore'
import { playSound } from '../lib/sounds'
import { useDrag } from './useDrag'
import { useResize, type ResizeDir } from './useResize'

interface Props {
  win: WinWindow
  children: React.ReactNode
}

const RESIZE_HANDLES: { dir: ResizeDir; className: string; cursor: string }[] = [
  { dir: 'n', className: 'left-0 right-0 -top-1 h-2', cursor: 'ns-resize' },
  { dir: 's', className: 'left-0 right-0 -bottom-1 h-2', cursor: 'ns-resize' },
  { dir: 'w', className: 'top-0 bottom-0 -left-1 w-2', cursor: 'ew-resize' },
  { dir: 'e', className: 'top-0 bottom-0 -right-1 w-2', cursor: 'ew-resize' },
  { dir: 'nw', className: '-top-1 -left-1 w-3 h-3', cursor: 'nwse-resize' },
  { dir: 'ne', className: '-top-1 -right-1 w-3 h-3', cursor: 'nesw-resize' },
  { dir: 'sw', className: '-bottom-1 -left-1 w-3 h-3', cursor: 'nesw-resize' },
  { dir: 'se', className: '-bottom-1 -right-1 w-3 h-3', cursor: 'nwse-resize' },
]

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

  // Frame style: maximized fills viewport above taskbar; otherwise free-floating.
  const style: React.CSSProperties = isMaximized
    ? {
        left: 0,
        top: 0,
        width: '100vw',
        height: `calc(100vh - ${TASKBAR_HEIGHT}px)`,
        zIndex: win.z,
      }
    : {
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.z,
      }

  if (win.minimized) return null

  return (
    <div
      className={`absolute glass animate-window-open ${
        isFocused ? 'win-shadow window-active' : ''
      } ${isMaximized ? '' : 'rounded-lg'} overflow-hidden flex flex-col`}
      style={style}
      onMouseDown={() => focusWindow(win.id)}
      role="dialog"
      aria-label={win.title}
    >
      {/* Title bar */}
      <div
        className="flex-none h-9 flex items-center justify-between pl-3 pr-0 select-none cursor-default bg-white/40 dark:bg-black/30 border-b border-black/5 dark:border-white/10"
        onMouseDown={(e) => {
          // Only drag with primary button, not resize-handle clicks.
          if (e.button !== 0) return
          onDragStart(win.id, e)
        }}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <span className="text-xs font-medium truncate pr-2">{win.title}</span>
        <div className="flex h-full">
          <button
            type="button"
            aria-label="Minimize"
            className="w-11 h-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              toggleMinimize(win.id)
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
            className="w-11 h-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              toggleMaximize(win.id)
            }}
          >
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <rect x="2" y="2" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1" />
                <rect x="3.5" y="0.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            )}
          </button>
          <button
            type="button"
            aria-label="Close"
            className="w-11 h-full hover:bg-red-500 hover:text-white flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(win.id)
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-zinc-900">{children}</div>

      {/* Resize handles — only when not maximized */}
      {!isMaximized &&
        RESIZE_HANDLES.map((h) => (
          <div
            key={h.dir}
            className={`absolute ${h.className} z-10`}
            style={{ cursor: h.cursor }}
            onMouseDown={(e) => {
              e.stopPropagation()
              onResizeStart(win.id, h.dir, e)
            }}
          />
        ))}
    </div>
  )
}
