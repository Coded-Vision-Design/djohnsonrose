import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useOsStore, type SnapFlyoutState } from '../store/osStore'
import { getApp } from '../apps/registry'
import { holdSnapFlyout, leaveSnapFlyout } from '../windowing/snapFlyoutHover'
import {
  fractionToRect,
  getLayout,
  snapFlyoutModel,
  type Rect,
  type SnapBar as SnapBarModel,
  type SnapTarget,
} from '../../../assets/js/windowing/windowing.js'

const place = ({ x, y, width, height }: Rect): CSSProperties => ({ left: x, top: y, width, height })

function SnapBar({ bar, target }: { bar: SnapBarModel; target: SnapTarget | null }) {
  return (
    <div className="os-snap-bar" data-snap-bar style={{ left: bar.x, top: bar.y, width: bar.width, height: bar.height }}>
      {bar.tiles.map((tile) =>
        tile.zones.map((z) => (
          <div
            key={`${tile.layout}:${z.zone}`}
            className="os-snap-zone"
            data-active={target?.layout === tile.layout && target?.zone === z.zone ? '' : undefined}
            style={{ left: z.x - bar.x, top: z.y - bar.y, width: z.width, height: z.height }}
          />
        )),
      )}
    </div>
  )
}

function SnapFlyout({ flyout }: { flyout: SnapFlyoutState }) {
  const desktop = useOsStore((s) => s.desktop)
  const mode = useOsStore((s) => s.windowMode)
  const snapWindow = useOsStore((s) => s.snapWindow)
  const closeSnapFlyout = useOsStore((s) => s.closeSnapFlyout)
  const model = useMemo(() => snapFlyoutModel(flyout.anchor, desktop, mode), [flyout.anchor, desktop, mode])
  const [hovered, setHovered] = useState<Rect | null>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (flyout.fromKeyboard) root.current?.querySelector('button')?.focus()
  }, [flyout.fromKeyboard])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSnapFlyout()
    }
    const onDown = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) closeSnapFlyout()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [closeSnapFlyout])

  return (
    <>
      {hovered && <div className="os-snap-preview" data-snap-preview style={place(hovered)} />}
      <div
        ref={root}
        className="os-snap-flyout"
        data-snap-flyout
        role="group"
        aria-label="Snap layouts"
        style={{ left: model.x, top: model.y, width: model.width, height: model.height }}
        onPointerEnter={holdSnapFlyout}
        onPointerLeave={() => {
          if (!flyout.fromKeyboard) leaveSnapFlyout()
        }}
      >
        {model.tiles.map((tile) => (
          <div key={tile.layout} className="os-snap-tile" data-layout={tile.layout} style={place(tile)}>
            {tile.zones.map((z) => {
              const frac = getLayout(tile.layout)?.zones.find((candidate) => candidate.id === z.zone)
              const show = () => setHovered(frac ? fractionToRect(frac, desktop) : null)
              const hide = () => setHovered(null)
              return (
                <button
                  key={z.zone}
                  type="button"
                  className="os-snap-zone"
                  data-zone={z.zone}
                  aria-label={`${tile.label}: ${z.label}`}
                  style={place(z)}
                  onPointerEnter={show}
                  onPointerLeave={hide}
                  onFocus={show}
                  onBlur={hide}
                  onClick={() => snapWindow(flyout.windowId, tile.layout, z.zone)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

function SnapAssist() {
  const assist = useOsStore((s) => s.snapAssist)
  const windows = useOsStore((s) => s.windows)
  const fillSnapAssist = useOsStore((s) => s.fillSnapAssist)
  const dismissSnapAssist = useOsStore((s) => s.dismissSnapAssist)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissSnapAssist()
    }
    const onDown = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) dismissSnapAssist()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [dismissSnapAssist])

  if (!assist) return null

  return (
    <div ref={root} className="os-snap-assist" data-snap-assist style={place(assist.rect)}>
      <h2>Choose a window for this space</h2>
      <div className="os-snap-assist-list">
        {assist.candidates.map((id) => {
          const win = windows.find((w) => w.id === id)
          if (!win) return null
          return (
            <button key={id} type="button" className="os-snap-assist-item" onClick={() => fillSnapAssist(id)}>
              <img src={getApp(win.app)?.icon} alt="" />
              <span>{win.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Everything that appears over the windows while arranging them. */
export function SnapUi() {
  const preview = useOsStore((s) => s.snapPreview)
  const flyout = useOsStore((s) => s.snapFlyout)
  const hasAssist = useOsStore((s) => s.snapAssist !== null)

  return (
    <>
      {preview.rect && <div className="os-snap-preview" data-snap-preview style={place(preview.rect)} />}
      {preview.bar && <SnapBar bar={preview.bar} target={preview.target} />}
      {flyout && <SnapFlyout key={flyout.windowId} flyout={flyout} />}
      {hasAssist && <SnapAssist />}
    </>
  )
}
