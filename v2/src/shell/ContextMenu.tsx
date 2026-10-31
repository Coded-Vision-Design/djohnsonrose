import { useEffect, useRef, useState } from 'react'
import { useOsStore } from '../store/osStore'

// The same markup as the menu in partials/shell.php. Closes on Escape, an
// outside click or a scroll. See menus.ts for what opens it.
const MODERN =
  'bg-white/90 dark:bg-[#1c1c1c]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl py-1 min-w-[260px] context-menu'
const CLASSIC =
  'bg-[#f0f0f0] dark:bg-[#2b2b2b] border border-[#a0a0a0] dark:border-black shadow-[2px_2px_4px_rgba(0,0,0,0.3)] py-1 min-w-[240px]'

export function ContextMenu() {
  const menu = useOsStore((s) => s.contextMenu)
  const close = useOsStore((s) => s.closeContextMenu)
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    if (!menu.open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onScroll = () => close()
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onDown)
      document.addEventListener('keydown', onKey)
      window.addEventListener('scroll', onScroll, true)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menu.open, close])

  if (!menu.open) return null

  // Close before running the action, so that an action which opens a follow-up
  // menu, such as "Show more options", is not closed straight away.
  const run = (action?: () => void) => {
    close()
    action?.()
  }

  return (
    <div
      ref={ref}
      role="menu"
      data-context-menu={menu.variant}
      className={`fixed z-20000 text-black dark:text-white ${menu.variant === 'classic' ? CLASSIC : MODERN}`}
      style={{ left: menu.x, top: menu.y }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {menu.actions.length > 0 && (
        <div className="context-menu-action-bar">
          {menu.actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              aria-label={action.label}
              data-menu-action={action.label}
              title={action.label}
              disabled={action.disabled}
              onClick={() => run(action.action)}
              className={`context-menu-action-btn group ${action.disabled ? 'disabled' : ''}`}
            >
              <span className="context-menu-icon pointer-events-none">
                <img src={action.icon} alt="" className="w-4 h-4" />
              </span>
            </button>
          ))}
        </div>
      )}
      {menu.items.map((item, i) =>
        item.separator ? (
          <div key={`separator-${i}`} className="context-menu-separator" data-menu-separator="" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            data-menu-item={item.label}
            disabled={item.disabled}
            onClick={() => run(item.action)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={`context-menu-item flex items-center justify-between w-[calc(100%-8px)] text-left px-3 py-1.5 cursor-default group transition-colors ${
              hovered === i ? 'active' : ''
            } ${item.disabled ? 'disabled' : ''}`}
          >
            <span className="flex items-center">
              <span className="w-4 h-4 mr-3 flex items-center justify-center text-sm context-menu-icon">
                <img src={item.icon} alt="" className="w-4 h-4" />
              </span>
              <span className="context-menu-label">{item.label}</span>
            </span>
            {item.shortcut && (
              <span data-menu-shortcut="" className="text-[10px] opacity-50 ml-4 font-mono">
                {item.shortcut}
              </span>
            )}
          </button>
        ),
      )}
    </div>
  )
}
