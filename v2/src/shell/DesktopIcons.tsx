import { useMemo, useRef, useState } from 'react'
import { useOsStore, TASKBAR_HEIGHT } from '../store/osStore'
import { listAt, type FsEntry } from '../data/filesystem'
import { playSound } from '../lib/sounds'

const DESKTOP_PATH = 'C:\\Users\\DeVante\\Desktop'
const PC_NAME = "DeVanté's PC"
const ICON_W = 110
const ICON_H = 110
const MARGIN = 16

interface PlacedIcon {
  name: string
  icon: string
  type: 'pc' | FsEntry['type']
  entry?: FsEntry
  x: number
  y: number
  isRecycleBin: boolean
}

/**
 * Lay out icons in column-first order. Stored positions are honoured and
 * pre-marked as occupied so unpositioned icons get the next free slot
 * deterministically. v1's shell.js does the same — the bug in my previous
 * pass was treating Recycle Bin synthetically, so its slot wasn't tracked.
 */
function computeLayout(
  names: string[],
  stored: Record<string, { x: number; y: number }>,
  maxPerCol: number,
) {
  const occupied = new Set<string>()
  occupied.add('0,0') // PC tile is always at (0,0)

  const positions: Record<string, { x: number; y: number }> = {}

  // First pass: place icons with stored positions, marking their slots.
  for (const name of names) {
    const pos = stored[name]
    if (!pos) continue
    positions[name] = pos
    const col = Math.max(0, Math.round((pos.x - MARGIN) / ICON_W))
    const row = Math.max(0, Math.round((pos.y - MARGIN) / ICON_H))
    occupied.add(`${col},${row}`)
  }

  // Second pass: assign the next empty slot to unpositioned icons.
  let cursor = 0
  for (const name of names) {
    if (positions[name]) continue
    while (true) {
      const col = Math.floor(cursor / maxPerCol)
      const row = cursor % maxPerCol
      const key = `${col},${row}`
      cursor++
      if (!occupied.has(key)) {
        occupied.add(key)
        positions[name] = { x: MARGIN + col * ICON_W, y: MARGIN + row * ICON_H }
        break
      }
    }
  }

  return positions
}

export function DesktopIcons() {
  const openApp = useOsStore((s) => s.openApp)
  const iconPositions = useOsStore((s) => s.iconPositions)
  const setIconPosition = useOsStore((s) => s.setIconPosition)
  const recycleItem = useOsStore((s) => s.recycleItem)
  const recycleCount = useOsStore((s) => s.recycleBin.length)
  const hiddenDesktop = useOsStore((s) => s.hiddenDesktop)
  const emptyRecycleBin = useOsStore((s) => s.emptyRecycleBin)
  const openContextMenu = useOsStore((s) => s.openContextMenu)

  const [hoverRecycle, setHoverRecycle] = useState(false)
  const [draggingName, setDraggingName] = useState<string | null>(null)
  const dragRef = useRef<{ name: string; offsetX: number; offsetY: number; moved: boolean } | null>(
    null,
  )

  const icons = useMemo<PlacedIcon[]>(() => {
    const entries = listAt(DESKTOP_PATH).filter((e) => !hiddenDesktop.includes(e.name))

    const availH = window.innerHeight - TASKBAR_HEIGHT - MARGIN * 2
    const maxPerCol = Math.max(1, Math.floor(availH / ICON_H))

    const names = [PC_NAME, ...entries.map((e) => e.name)]
    const positions = computeLayout(names, iconPositions, maxPerCol)

    const placed: PlacedIcon[] = [
      {
        name: PC_NAME,
        icon: '/assets/img/thispc.webp',
        type: 'pc',
        x: positions[PC_NAME].x,
        y: positions[PC_NAME].y,
        isRecycleBin: false,
      },
      ...entries.map((entry): PlacedIcon => {
        const isRecycleBin = entry.name === 'Recycle Bin'
        const icon = isRecycleBin
          ? recycleCount > 0
            ? '/assets/img/recyclebinfull.webp'
            : '/assets/img/recyclebinempty.webp'
          : entry.icon
        const pos = positions[entry.name]
        return {
          name: entry.name,
          icon,
          type: entry.type,
          entry,
          x: pos.x,
          y: pos.y,
          isRecycleBin,
        }
      }),
    ]
    return placed
  }, [iconPositions, recycleCount, hiddenDesktop])

  const open = (i: PlacedIcon) => {
    if (i.type === 'pc') {
      openApp('explorer', 'This PC', { extra: { initialPath: 'C:\\' } })
      return
    }
    const e = i.entry
    if (!e) return
    if (e.type === 'folder') {
      const target = 'path' in e && e.path ? e.path : `${DESKTOP_PATH}\\${e.name}`
      openApp('explorer', e.name, { extra: { initialPath: target } })
    } else if (e.type === 'app') {
      openApp(e.app, e.name, { extra: e.extraData })
    } else if (e.type === 'image') {
      openApp('photos', e.name, { extra: { imageUrl: e.url } })
    } else if (e.type === 'video') {
      openApp('video', e.name, { extra: { videoUrl: e.url } })
    } else if (e.type === 'file') {
      openApp('notepad', e.name, { extra: { content: e.content ?? '' } })
    }
  }

  const onMouseDown = (icon: PlacedIcon, e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    dragRef.current = {
      name: icon.name,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    }
    setDraggingName(icon.name)
    e.preventDefault()

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const nx = ev.clientX - d.offsetX
      const ny = ev.clientY - d.offsetY
      const dx = nx - rect.left
      const dy = ny - rect.top
      if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true
      setIconPosition(d.name, { x: Math.max(0, nx), y: Math.max(0, ny) })
      const elsAt = document.elementsFromPoint(ev.clientX, ev.clientY)
      const overBin = elsAt.some((el) => el.getAttribute('data-recycle-target') === 'true')
      setHoverRecycle(overBin && d.name !== 'Recycle Bin' && d.name !== PC_NAME)
    }
    const onUp = (ev: MouseEvent) => {
      const d = dragRef.current
      if (d) {
        const elsAt = document.elementsFromPoint(ev.clientX, ev.clientY)
        const droppedOnBin = elsAt.some((el) => el.getAttribute('data-recycle-target') === 'true')
        if (d.moved && droppedOnBin && d.name !== 'Recycle Bin' && d.name !== PC_NAME) {
          const entry = icons.find((i) => i.name === d.name)?.entry
          if (entry) {
            recycleItem(d.name, DESKTOP_PATH, { ...entry })
            playSound('recycle')
          }
        } else if (!d.moved) {
          const i = icons.find((x) => x.name === d.name)
          if (i) open(i)
        }
      }
      dragRef.current = null
      setDraggingName(null)
      setHoverRecycle(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="absolute inset-0 pointer-events-none p-2" aria-label="Desktop icons">
      {icons.map((icon) => {
        const isDragging = draggingName === icon.name
        const recycleHover = icon.isRecycleBin && hoverRecycle
        return (
          <button
            key={icon.name}
            type="button"
            data-recycle-target={icon.isRecycleBin ? 'true' : undefined}
            onMouseDown={(e) => onMouseDown(icon, e)}
            onDoubleClick={() => open(icon)}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const items = icon.isRecycleBin
                ? [
                    {
                      label: 'Open',
                      icon: '📂',
                      action: () => open(icon),
                    },
                    {
                      label: 'Empty Recycle Bin',
                      icon: '🗑',
                      disabled: recycleCount === 0,
                      action: () => emptyRecycleBin(),
                    },
                  ]
                : icon.type === 'pc'
                  ? [
                      {
                        label: 'Open',
                        icon: '📂',
                        action: () => open(icon),
                      },
                      {
                        label: 'Properties',
                        icon: 'ℹ️',
                        action: () => openApp('settings'),
                      },
                    ]
                  : [
                      { label: 'Open', icon: '📂', action: () => open(icon) },
                      { separator: true },
                      {
                        label: 'Delete',
                        icon: '🗑',
                        action: () => {
                          if (icon.entry) {
                            recycleItem(icon.name, DESKTOP_PATH, { ...icon.entry })
                            playSound('recycle')
                          }
                        },
                      },
                    ]
              openContextMenu(e.clientX, e.clientY, items)
            }}
            title={icon.name}
            className={`pointer-events-auto absolute flex flex-col items-center justify-start p-2 w-[110px] rounded-md text-center group desktop-icon-container ${
              recycleHover
                ? 'bg-white/30 ring-2 ring-win-blue scale-110'
                : 'hover:bg-white/10'
            } ${isDragging ? 'opacity-90 cursor-grabbing' : 'cursor-default'}`}
            style={{ left: icon.x, top: icon.y, userSelect: 'none' }}
          >
            <div className="mb-1 drop-shadow-md w-12 h-12 flex items-center justify-center">
              {icon.icon.includes('.') || icon.icon.startsWith('/') ? (
                <img
                  src={icon.icon}
                  alt=""
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                  draggable={false}
                />
              ) : (
                <span className="text-4xl">{icon.icon}</span>
              )}
            </div>
            <span className="text-white text-[11px] drop-shadow-lg w-full px-1 leading-tight">
              {icon.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
