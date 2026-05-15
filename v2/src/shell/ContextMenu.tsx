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

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-[20000] context-menu bg-white/95 dark:bg-[#252526]/95 backdrop-blur-md border border-black/10 dark:border-white/10 min-w-[200px] text-black dark:text-white animate-window-open"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.items.map((item, i) =>
        item.separator ? (
          <div
            key={`sep-${i}`}
            className="my-1 border-t border-black/10 dark:border-white/10"
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
            className={`context-menu-item w-full text-left flex items-center px-3 text-xs ${
              item.disabled ? 'disabled' : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {item.icon && (
              <span className="context-menu-icon mr-3 w-4 h-4 flex items-center justify-center">
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
