import { useEffect, useMemo, useRef, useState } from 'react'
import { useOsStore, TASKBAR_HEIGHT } from '../store/osStore'
import { listAt, type FsEntry } from '../data/filesystem'
import { playSound } from '../lib/sounds'

const DESKTOP_PATH = 'C:\\Users\\DeVante\\Desktop'

const ICON_W = 110
const ICON_H = 110
const MARGIN = 16
// "DeVanté's PC" lives at the (0,0) slot — synthetic, not in the filesystem.
const PC_NAME = "DeVanté's PC"

interface PlacedIcon {
  name: string
  icon: string
  type: 'pc' | 'recycleBin' | FsEntry['type']
  entry?: FsEntry
  x: number
  y: number
}

function autoLayout(entries: { name: string }[], stored: Record<string, { x: number; y: number }>) {
  const occupied = new Set<string>()
  // PC always at slot 0,0.
  occupied.add('0,0')
  for (const e of entries) {
    const pos = stored[e.name]
    if (pos) {
      const col = Math.round((pos.x - MARGIN) / ICON_W)
      const row = Math.round((pos.y - MARGIN) / ICON_H)
      occupied.add(`${col},${row}`)
    }
  }
  const availH = window.innerHeight - TASKBAR_HEIGHT - MARGIN * 2
  const maxPerCol = Math.max(1, Math.floor(availH / ICON_H))
  let idx = 0
  const nextSlot = () => {
    while (true) {
      const col = Math.floor(idx / maxPerCol)
      const row = idx % maxPerCol
      const key = `${col},${row}`
      idx++
      if (!occupied.has(key)) {
        occupied.add(key)
        return { col, row }
      }
    }
  }
  return (name: string) => {
    const stored2 = stored[name]
    if (stored2) return stored2
    const slot = nextSlot()
    return {
      x: MARGIN + slot.col * ICON_W,
      y: MARGIN + slot.row * ICON_H,
    }
  }
}

export function DesktopIcons() {
  const openApp = useOsStore((s) => s.openApp)
  const iconPositions = useOsStore((s) => s.iconPositions)
  const setIconPosition = useOsStore((s) => s.setIconPosition)
  const recycleItem = useOsStore((s) => s.recycleItem)
  const recycleCount = useOsStore((s) => s.recycleBin.length)
  const hiddenDesktop = useOsStore((s) => s.hiddenDesktop)
  // Drag state — refs because we don't want to re-render on every mousemove.
  const dragRef = useRef<{ name: string; offsetX: number; offsetY: number; moved: boolean } | null>(
    null,
  )
  const [hoverRecycle, setHoverRecycle] = useState(false)

  // Build the icon list: synthetic PC + recycle bin + Desktop filesystem
  // entries minus anything hidden.
  const icons = useMemo<PlacedIcon[]>(() => {
    const entries = listAt(DESKTOP_PATH).filter((e) => !hiddenDesktop.includes(e.name))
    const layout = autoLayout(entries, iconPositions)
    const pcPos = iconPositions[PC_NAME] ?? { x: MARGIN, y: MARGIN }
    const recyclePos = iconPositions['Recycle Bin'] ?? layout('Recycle Bin')

    const placed: PlacedIcon[] = [
      {
        name: PC_NAME,
        icon: '/assets/img/thispc.webp',
        type: 'pc',
        x: pcPos.x,
        y: pcPos.y,
      },
      {
        name: 'Recycle Bin',
        icon:
          recycleCount > 0
            ? '/assets/img/recyclebinfull.webp'
            : '/assets/img/recyclebinempty.webp',
        type: 'recycleBin',
        x: recyclePos.x,
        y: recyclePos.y,
      },
      ...entries.map((entry): PlacedIcon => {
        const pos = layout(entry.name)
        return {
          name: entry.name,
          icon: entry.icon,
          type: entry.type,
          entry,
          x: pos.x,
          y: pos.y,
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
    if (i.type === 'recycleBin') {
      openApp('explorer', 'Recycle Bin', { extra: { initialPath: 'C:\\Recycle Bin' } })
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

  // Track which icon is mid-drag in state so we can render a `cursor: grabbing`.
  const [draggingName, setDraggingName] = useState<string | null>(null)

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
      if (!d.moved && Math.hypot(dx, ev.clientY - rect.top - d.offsetY) > 4) {
        d.moved = true
      }
      setIconPosition(d.name, { x: Math.max(0, nx), y: Math.max(0, ny) })
      // hover detection for recycle bin
      const elsAt = document.elementsFromPoint(ev.clientX, ev.clientY)
      const overBin = elsAt.some((el) => el.getAttribute('data-recycle-target') === 'true')
      setHoverRecycle(overBin && d.name !== 'Recycle Bin' && d.name !== PC_NAME)
    }

    const onUp = (ev: MouseEvent) => {
      const d = dragRef.current
      if (d) {
        const elsAt = document.elementsFromPoint(ev.clientX, ev.clientY)
        const droppedOnBin = elsAt.some(
          (el) => el.getAttribute('data-recycle-target') === 'true',
        )
        if (
          d.moved &&
          droppedOnBin &&
          d.name !== 'Recycle Bin' &&
          d.name !== PC_NAME
        ) {
          // Persist the entry into the recycle bin and mark hidden.
          const entry = icons.find((i) => i.name === d.name)?.entry
          if (entry) {
            recycleItem(d.name, DESKTOP_PATH, { ...entry })
            playSound('recycle')
          }
        } else if (!d.moved) {
          // Treat as a click — open the icon.
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

  useEffect(() => {
    // Re-flow on resize so auto-laid-out icons stay on screen.
    const onResize = () => {
      // The layout function reads window.innerHeight at memo time, so a
      // resize triggers re-layout naturally on the next render. We just need
      // to nudge React via a state update.
      setHoverRecycle((v) => v)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none p-2" aria-label="Desktop icons">
      {icons.map((icon) => {
        const isRecycle = icon.type === 'recycleBin'
        const isDragging = draggingName === icon.name
        const recycleHover = isRecycle && hoverRecycle
        return (
          <button
            key={icon.name}
            type="button"
            data-recycle-target={isRecycle ? 'true' : undefined}
            onMouseDown={(e) => onMouseDown(icon, e)}
            onDoubleClick={() => open(icon)}
            onContextMenu={(e) => e.preventDefault()}
            title={icon.name}
            className={`pointer-events-auto absolute flex flex-col items-center justify-start p-2 w-[110px] rounded-md text-center group ${
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
            <span
              className="text-white text-[11px] drop-shadow-lg w-full px-1 leading-tight overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
              }}
            >
              {icon.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
