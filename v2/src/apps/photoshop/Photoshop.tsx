import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  DRAWING_ICONS,
  MAX_SIZE,
  MIN_SIZE,
  PS_MENUS,
  PS_SIZE,
  PS_SWATCHES,
  PS_TOOLS,
  ZOOM_LEVELS,
  commandState,
  createPhotoshop,
  photoshopInitialState,
  zoomIndex,
  type PhotoshopController,
} from '../../../../assets/js/windowing/drawing.js'
import { useOsStore } from '../../store/osStore'
import { useCurrentWindow } from '../../windowing/WindowContext'

// Photoshop. Everything it does lives in assets/js/windowing/drawing.js, which
// v1 shares, so this file only renders the same markup as
// partials/apps/photoshop.php.

const vars = (values: Record<string, string>) => values as CSSProperties
const TOOL_ICONS: Record<string, string> = { move: 'move', brush: 'brush', eraser: 'eraser', bucket: 'fill', text: 'text' }

function Icon({ name }: { name: string }) {
  return (
    <svg className="dr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={DRAWING_ICONS[name]} />
    </svg>
  )
}

export default function Photoshop() {
  const win = useCurrentWindow()
  const root = useRef<HTMLDivElement>(null)
  const ps = useRef<PhotoshopController | null>(null)
  const [s, setS] = useState(photoshopInitialState)

  useEffect(() => {
    const controller = createPhotoshop(root.current!, {
      onChange: setS,
      isActive: () => useOsStore.getState().focusedWindowId === win.id,
    })
    ps.current = controller
    return () => {
      controller.dispose()
      ps.current = null
    }
  }, [win.id])

  const run = (id: string) => ps.current?.run(id)
  const tool = PS_TOOLS.find((item) => item.id === s.tool)
  const layer = s.layers.find((item) => item.id === s.active)

  return (
    <div className="ps-app" ref={root} data-tool={s.tool}>
      <div className="ps-titlebar">
        <img className="ps-logo" src="/assets/img/photoshop.webp" alt="" />
        <span className="ps-title">
          Adobe Photoshop 2025 · untitled-1.psd @ {s.zoom}% ({layer?.name}, RGB/8)
        </span>
      </div>

      <nav className="ps-menubar" aria-label="Photoshop menu">
        {PS_MENUS.map((menu) => (
          <div key={menu.id} className="ps-menu">
            <button
              type="button"
              className="ps-menu-button"
              data-ps-menu={menu.label}
              aria-haspopup="menu"
              aria-expanded={s.menu === menu.id}
              onClick={() => ps.current?.toggleMenu(menu.id)}
            >
              {menu.label}
            </button>
            {s.menu === menu.id && <div className="ps-menu-shield" onPointerDown={() => ps.current?.closeMenu()} />}
            {s.menu === menu.id && (
              <div className="ps-menu-list" role="menu">
                {menu.items.map((item, index) =>
                  item.separator ? (
                    <div key={index} className="ps-menu-sep" role="separator" />
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className="ps-menu-item"
                      data-ps-command={item.id}
                      disabled={commandState(item.id!, s).disabled}
                      onClick={() => run(item.id!)}
                    >
                      <span>{item.label}</span>
                      <span className="ps-menu-key">{item.shortcut ?? ''}</span>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="ps-options">
        <span className="ps-dim">Tool:</span>
        <span className="ps-strong" data-ps-tool-name>
          {tool?.label}
        </span>
        <span className="ps-sep" />
        <label className="ps-field">
          <span className="ps-dim">Size:</span>
          <input
            type="range"
            min={MIN_SIZE}
            max={MAX_SIZE}
            value={s.size}
            data-ps-size
            onChange={(e) => ps.current?.setSize(e.target.value)}
          />
          <span className="ps-value">{s.size}px</span>
        </label>
        <span className="ps-sep" />
        <label className="ps-field">
          <span className="ps-dim">Zoom:</span>
          <input
            type="range"
            min={0}
            max={ZOOM_LEVELS.length - 1}
            value={zoomIndex(s.zoom)}
            aria-valuetext={`${s.zoom}%`}
            data-ps-zoom
            onChange={(e) => ps.current?.setZoom(ZOOM_LEVELS[Number(e.target.value)])}
          />
          <span className="ps-value" data-ps-zoom-value>
            {s.zoom}%
          </span>
        </label>
        <button type="button" className="ps-export" data-ps-command="save" onClick={() => run('save')}>
          Export PNG
        </button>
      </div>

      <div className="ps-main">
        <div className="ps-rail" role="toolbar" aria-label="Tools">
          {PS_TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="ps-tool"
              data-ps-tool={item.id}
              aria-label={item.label}
              title={`${item.label} (${item.key})`}
              aria-pressed={s.tool === item.id}
              onClick={() => ps.current?.setTool(item.id)}
            >
              <Icon name={TOOL_ICONS[item.id]} />
            </button>
          ))}
          <div className="ps-wells" aria-hidden="true">
            <span className="ps-well ps-well-front" style={vars({ '--c': s.colour })} />
            <span className="ps-well ps-well-back" />
          </div>
        </div>

        <div className="ps-viewport" data-ps-viewport>
          <div className="ps-frame" data-ps-frame>
            <div className="ps-stack" data-ps-stack role="img" aria-label="Canvas" />
            <textarea className="ps-textbox" data-ps-text aria-label="Text" rows={1} hidden />
          </div>
        </div>

        <div className="ps-panels">
          <section aria-label="Swatches">
            <div className="ps-panel-head">Swatches</div>
            <div className="ps-swatches">
              {PS_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  className="ps-swatch"
                  data-ps-colour={swatch.hex}
                  aria-label={swatch.name}
                  title={swatch.name}
                  aria-pressed={s.colour === swatch.hex}
                  style={vars({ '--c': swatch.hex })}
                  onClick={() => ps.current?.setColour(swatch.hex)}
                />
              ))}
            </div>
            <div className="ps-custom">
              <input
                type="color"
                value={s.colour}
                aria-label="Colour"
                data-ps-custom
                onChange={(e) => ps.current?.setColour(e.target.value)}
              />
              <span className="ps-hex">{s.colour.toUpperCase()}</span>
            </div>
          </section>

          <section className="ps-layers" aria-label="Layers">
            <div className="ps-panel-head">
              <span>Layers</span>
              <span className="ps-head-buttons">
                <button
                  type="button"
                  className="ps-head-button"
                  data-ps-command="newLayer"
                  aria-label="New layer"
                  title="New layer"
                  disabled={commandState('newLayer', s).disabled}
                  onClick={() => run('newLayer')}
                >
                  <Icon name="plus" />
                </button>
                <button
                  type="button"
                  className="ps-head-button"
                  data-ps-command="deleteLayer"
                  aria-label="Delete layer"
                  title="Delete layer"
                  disabled={commandState('deleteLayer', s).disabled}
                  onClick={() => run('deleteLayer')}
                >
                  <Icon name="clear" />
                </button>
              </span>
            </div>
            {s.layers
              .slice()
              .reverse()
              .map((item) => (
                <div key={item.id} className="ps-layer-row" data-ps-layer-row={item.id} data-active={String(s.active === item.id)}>
                  <div className="ps-layer-top">
                    <button
                      type="button"
                      className="ps-eye"
                      data-ps-eye={item.id}
                      aria-label={`Show ${item.name}`}
                      aria-pressed={item.visible}
                      title={item.visible ? 'Hide layer' : 'Show layer'}
                      onClick={() => ps.current?.toggleLayer(item.id)}
                    >
                      {item.visible && <Icon name="eye" />}
                    </button>
                    <button
                      type="button"
                      className="ps-layer-pick"
                      data-ps-select={item.id}
                      aria-pressed={s.active === item.id}
                      onClick={() => ps.current?.selectLayer(item.id)}
                    >
                      <canvas className="ps-thumb" data-ps-thumb={item.id} width={36} height={24} aria-hidden="true" />
                      <span className="ps-layer-name">{item.name}</span>
                    </button>
                  </div>
                  <label className="ps-opacity">
                    <span>Opacity</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={item.opacity}
                      aria-label={`${item.name} opacity`}
                      data-ps-opacity={item.id}
                      onChange={(e) => ps.current?.setOpacity(item.id, e.target.value)}
                    />
                    <span>{item.opacity}%</span>
                  </label>
                </div>
              ))}
          </section>
        </div>
      </div>

      <div className="ps-status">
        <span>
          {PS_SIZE.width} × {PS_SIZE.height} · 72 ppi · sRGB
        </span>
        <span>RGB/8</span>
      </div>
    </div>
  )
}
