import { useEffect, useRef } from 'react'
import { useOsStore } from '../store/osStore'

// 1:1 port of v1's `<div x-show="$store.os.contextMenu.open">` block — a
// floating Win11-style context menu fed by openContextMenu(x, y, items).
// Closes on Escape, outside click, scroll, or the host window being closed.
export function ContextMenu() {
  const menu = useOsStore((s) => s.contextMenu)
  const close = useOsStore((s) => s.closeContextMenu)
  const ref = useRef<HTMLDivElement>(null)

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

  // Position is clamped to the viewport so menus opened near the right/bottom
  // edge still fit.
  const left = Math.min(menu.x, window.innerWidth - 240)
  const top = Math.min(menu.y, window.innerHeight - menu.items.length * 36 - 20)

  const isClassic = menu.variant === 'classic'
  // Classic Win10 style: tighter rows, square corners, grey background; the
  // shell uses this when the user picks "Show more options".
  const containerClass = isClassic
    ? 'fixed z-[20000] bg-[#f0f0f0] dark:bg-[#2b2b2b] border border-[#a0a0a0] dark:border-black shadow-[2px_2px_4px_rgba(0,0,0,0.3)] min-w-[220px] text-black dark:text-white animate-window-open py-1'
    : 'fixed z-[20000] context-menu bg-white/95 dark:bg-[#252526]/95 backdrop-blur-md border border-black/10 dark:border-white/10 min-w-[200px] text-black dark:text-white animate-window-open'

  const itemClass = isClassic
    ? 'w-full text-left flex items-center px-3 py-1 text-[11px] hover:bg-[#0078d4] hover:text-white'
    : 'context-menu-item w-full text-left flex items-center px-3 text-xs hover:bg-black/5 dark:hover:bg-white/5'

  return (
    <div
      ref={ref}
      role="menu"
      data-variant={menu.variant}
      className={containerClass}
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.items.map((item, i) =>
        item.separator ? (
          <div
            key={`sep-${i}`}
            className={
              isClassic
                ? 'my-1 border-t border-[#a0a0a0]/50 dark:border-white/10'
                : 'my-1 border-t border-black/10 dark:border-white/10'
            }
          />
        ) : (
          <button
            key={item.label ?? `item-${i}`}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              item.action?.()
              close()
            }}
            className={`${itemClass} ${item.disabled ? 'opacity-40 pointer-events-none' : ''}`}
          >
            {item.icon && (
              <span className="mr-3 w-4 h-4 flex items-center justify-center">
                {item.icon.startsWith('/') || item.icon.includes('.') ? (
                  <img src={item.icon} alt="" className="w-4 h-4 object-contain" />
                ) : (
                  <span>{item.icon}</span>
                )}
              </span>
            )}
            <span className="flex-grow">{item.label}</span>
          </button>
        ),
      )}
    </div>
  )
}
