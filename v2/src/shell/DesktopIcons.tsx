import { useMemo, useRef, useState } from 'react'
import { useOsStore } from '../store/osStore'
import { DESKTOP, RECYCLE_BIN, deleteEntry } from '../../../assets/js/windowing/file-ops.js'
import { layoutDesktopIcons } from '../../../assets/js/windowing/shell-ui.js'
import type { FsEntry } from '../data/filesystem'
import { RenameInput } from './RenameInput'
import { showClassicDesktopMenu, showFileMenu, showMenu, type MenuPoint } from './menus'
import { openEntry } from './openEntry'
import { playSound } from '../lib/sounds'

const PC_NAME = "DeVanté's PC"
const PC: FsEntry = { name: PC_NAME, type: 'folder', path: 'C:\\', icon: '/assets/img/thispc.webp' }

interface PlacedIcon {
  name: string
  icon: string
  type: 'pc' | FsEntry['type']
  entry?: FsEntry
  x: number
  y: number
  isRecycleBin: boolean
}

export function DesktopIcons() {
  const openApp = useOsStore((s) => s.openApp)
  const iconPositions = useOsStore((s) => s.iconPositions)
  const setIconPosition = useOsStore((s) => s.setIconPosition)
  const entries = useOsStore((s) => s.fileSystem[DESKTOP])
  const recycleCount = useOsStore((s) => s.fileSystem[RECYCLE_BIN]?.length ?? 0)
  const changeFiles = useOsStore((s) => s.changeFiles)
  const desktopZoom = useOsStore((s) => s.desktopZoom)
  const iconSize = useOsStore((s) => s.desktopIconSize)
  const iconsVisible = useOsStore((s) => s.desktopIconsVisible)
  const renaming = useOsStore((s) => s.renaming)
  const clipboard = useOsStore((s) => s.fileClipboard)
  const showProperties = useOsStore((s) => s.showProperties)

  const [hoverRecycle, setHoverRecycle] = useState(false)
  const [draggingName, setDraggingName] = useState<string | null>(null)
  const dragRef = useRef<{ name: string; offsetX: number; offsetY: number; moved: boolean } | null>(
    null,
  )

  // The measured desktop, so that the icons are laid out again after a resize
  // or a rotation, and pulled back on screen. Shared with v1: layoutDesktopIcons.
  const areaWidth = useOsStore((s) => s.desktop.width)
  const areaHeight = useOsStore((s) => s.desktop.height)

  const icons = useMemo<PlacedIcon[]>(() => {
    const positions = layoutDesktopIcons(
      [PC_NAME, ...(entries ?? []).map((e) => e.name)],
      iconPositions,
      { width: areaWidth, height: areaHeight },
    )

    const placed: PlacedIcon[] = [
      {
        name: PC_NAME,
        icon: '/assets/img/thispc.webp',
        type: 'pc',
        x: positions[PC_NAME].x,
        y: positions[PC_NAME].y,
        isRecycleBin: false,
      },
      ...(entries ?? []).map((entry): PlacedIcon => {
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
  }, [iconPositions, recycleCount, entries, areaWidth, areaHeight])


  const open = (i: PlacedIcon) => {
    if (i.type === 'pc') {
      openApp('explorer', 'This PC', { extra: { initialPath: 'C:\\' } })
      return
    }
    if (i.entry) openEntry(i.entry, DESKTOP)
  }

  const showIconMenu = (icon: PlacedIcon, { clientX, clientY }: MenuPoint) => {
    const here = { clientX, clientY }
    if (icon.entry) {
      showFileMenu(icon.entry, DESKTOP, here)
      return
    }
    showMenu('computer', here, {
      open: () => open(icon),
      properties: () => showProperties(PC, 'C:\\'),
      classic: () => showClassicDesktopMenu(here),
    })
  }

  const recycle = (name: string) => {
    changeFiles((fs) => deleteEntry(fs, DESKTOP, name))
    playSound('recycle')
  }

  const onMouseDown = (icon: PlacedIcon, e: React.MouseEvent) => {
    if (e.button !== 0 || renaming) return
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
          if (icons.find((i) => i.name === d.name)?.entry) recycle(d.name)
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
    <div
      className="absolute inset-0 pointer-events-none p-2 transition-transform duration-75 origin-center"
      style={{ transform: `scale(${desktopZoom})` }}
      aria-label="Desktop icons"
      data-icon-size={iconSize}
      hidden={!iconsVisible}
    >
      {icons.map((icon) => {
        const isDragging = draggingName === icon.name
        const recycleHover = icon.isRecycleBin && hoverRecycle
        const isRenaming = renaming?.path === DESKTOP && renaming.name === icon.name
        const isCut = clipboard?.mode === 'cut' && clipboard.fromPath === DESKTOP && clipboard.name === icon.name
        return (
          <div
            key={icon.name}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') open(icon)
            }}
            data-recycle-target={icon.isRecycleBin ? 'true' : undefined}
            onMouseDown={(e) => onMouseDown(icon, e)}
            onDoubleClick={() => open(icon)}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              showIconMenu(icon, e)
            }}
            data-desktop-item={icon.name}
            title={icon.name}
            className={`pointer-events-auto absolute flex flex-col items-center justify-start p-2 w-[110px] rounded-md text-center group desktop-icon-container ${
              recycleHover
                ? 'bg-white/30 ring-2 ring-win-blue scale-110'
                : 'hover:bg-white/10'
            } ${isDragging ? 'opacity-90 cursor-grabbing' : 'cursor-default'} ${isCut ? 'file-cut' : ''}`}
            style={{ left: icon.x, top: icon.y, userSelect: 'none' }}
          >
            <div className="desktop-tile-icon mb-1 drop-shadow-md w-12 h-12 flex items-center justify-center">
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
            {isRenaming ? (
              <RenameInput
                name={icon.name}
                className="w-full rounded-sm border border-win-blue bg-white px-1 text-center text-xs text-black outline-hidden"
              />
            ) : (
              <span className="text-white text-xs drop-shadow-lg w-full px-1 leading-tight">
                {icon.name}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
