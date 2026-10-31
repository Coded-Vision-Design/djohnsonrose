import { useEffect, useRef, useMemo } from 'react'
import { useOsStore, type WinWindow } from '../store/osStore'
import { playSound } from '../lib/sounds'
import { useWindowGestures } from './useWindowGestures'
import { cancelSnapFlyoutHover, hoverMaximize, leaveSnapFlyout } from './snapFlyoutHover'
import { resizableEdges } from '../../../assets/js/windowing/windowing.js'

interface Props {
  win: WinWindow
  children: React.ReactNode
}

// Matches partials/desktop.php window block. Title bar h-9 (h-[44px] for Edge,
// which v1 special-cases). Min/maximise/close buttons are 46x32 with the Win11
// #c42b1c close red. Geometry and device-class rules live in windowing.css.

export function Window({ win, children }: Props) {
  const isFocused = useOsStore((s) => s.focusedWindowId === win.id)
  const desktop = useOsStore((s) => s.desktop)
  const focusWindow = useOsStore((s) => s.focusWindow)
  const closeWindow = useOsStore((s) => s.closeWindow)
  const toggleMinimize = useOsStore((s) => s.toggleMinimize)
  const toggleMaximize = useOsStore((s) => s.toggleMaximize)

  const element = useRef<HTMLDivElement>(null)
  const { startDrag, startResize, easeNextChange } = useWindowGestures(win.id, element)
  const playedOpen = useRef(false)

  useEffect(() => {
    if (!playedOpen.current) {
      playSound('open')
      playedOpen.current = true
    }
    // Leave focus alone if the app has already taken it, such as a text field.
    if (element.current && !element.current.contains(document.activeElement)) {
      element.current.focus({ preventScroll: true })
    }
  }, [])

  const isMaximized = win.state === 'maximized'
  const titleBarHeight = win.app === 'edge' ? 'h-[44px] py-[6px]' : 'h-9'
  const edges = useMemo(() => resizableEdges(win, desktop), [win, desktop])

  const onToggleMaximize = () => {
    if (useOsStore.getState().windowMode === 'phone') return
    easeNextChange()
    toggleMaximize(win.id)
  }

  return (
    <div
      id={`win-${win.id}`}
      ref={element}
      tabIndex={-1}
      data-state={win.state}
      className={`os-window win-shadow glass animate-window-open rounded-lg ${
        isFocused ? 'window-active' : ''
      }`}
      style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z }}
      onPointerDownCapture={() => focusWindow(win.id)}
      role="dialog"
      aria-label={win.title}
    >
      {/* Title bar — Edge hides its title because it has its own tab strip */}
      <div
        className={`os-titlebar ${titleBarHeight} flex items-center justify-between px-3 select-none bg-white/10 dark:bg-black/10 cursor-default overflow-hidden`}
        onPointerDown={(e) => {
          // Only the title bar surface itself starts the drag, not its buttons.
          if (e.target === e.currentTarget) startDrag(e)
        }}
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) onToggleMaximize()
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => toggleMinimize(win.id)}
          className="os-win-btn os-win-back items-center justify-center shrink-0 dark:text-white"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10.7 2.3 5 8l5.7 5.7 1-1L7 8l4.7-4.7z" />
          </svg>
        </button>
        <div className="flex items-center space-x-2 pointer-events-none min-w-0 grow">
          {win.app !== 'edge' && (
            <span className="os-window-title text-sm font-medium dark:text-white truncate">{win.title}</span>
          )}
        </div>
        <div className="flex items-center h-full gap-[2px] shrink-0">
          <button
            type="button"
            aria-label="Minimise"
            title="Minimise"
            onClick={() => toggleMinimize(win.id)}
            className="os-win-btn os-win-min w-[46px] h-[32px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-2.5 h-2.5 fill-black dark:fill-white opacity-70" viewBox="0 0 10 1" aria-hidden="true">
              <rect width="10" height="1" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={isMaximized ? 'Restore' : 'Maximise'}
            title={isMaximized ? 'Restore' : 'Maximise'}
            onClick={() => {
              cancelSnapFlyoutHover()
              onToggleMaximize()
            }}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') hoverMaximize(win.id, e.currentTarget)
            }}
            onPointerLeave={leaveSnapFlyout}
            className="os-win-btn os-win-max w-[46px] h-[32px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
            title="Close"
            onClick={() => closeWindow(win.id)}
            className="os-win-btn w-[46px] h-[32px] flex items-center justify-center hover:bg-[#c42b1c] hover:text-white text-black dark:text-white transition-colors group"
          >
            <svg className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 fill-current" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M10,1.4L8.6,0L5,3.6L1.4,0L0,1.4L3.6,5L0,8.6L1.4,10L5,6.4l3.6,3.6l1.4-1.4L6.4,5L10,1.4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Window content */}
      <div className="os-window-content bg-white dark:bg-[#1c1c1c]">{children}</div>

      {edges.map((dir) => (
        <div key={dir} className="os-resize" data-dir={dir} onPointerDown={(e) => startResize(dir, e)} />
      ))}
    </div>
  )
}
