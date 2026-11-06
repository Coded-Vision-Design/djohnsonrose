import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  DRAWING_ICONS,
  MAX_SIZE,
  MIN_SIZE,
  PAINT_PALETTE,
  PAINT_SHAPES,
  PAINT_TABS,
  PAINT_TOOLS,
  ZOOM_LEVELS,
  commandState,
  createPaint,
  paintInitialState,
  zoomIndex,
  type PaintController,
} from '../../../../assets/js/windowing/drawing.js'
import { useOsStore } from '../../store/osStore'
import { useCurrentWindow } from '../../windowing/WindowContext'

// Paint. Everything it does lives in assets/js/windowing/drawing.js, which v1
// shares, so this file only renders the same markup as partials/apps/paint.php.

const vars = (values: Record<string, string>) => values as CSSProperties

function Icon({ name }: { name: string }) {
  return (
    <svg className="dr-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={DRAWING_ICONS[name]} />
    </svg>
  )
}

export default function Paint() {
  const win = useCurrentWindow()
  const root = useRef<HTMLDivElement>(null)
  const paint = useRef<PaintController | null>(null)
  const [s, setS] = useState(paintInitialState)

  useEffect(() => {
    const controller = createPaint(root.current!, {
      onChange: setS,
      isActive: () => useOsStore.getState().focusedWindowId === win.id,
    })
    paint.current = controller
    return () => {
      controller.dispose()
      paint.current = null
    }
  }, [win.id])

  const run = (id: string) => paint.current?.run(id)
  const off = (id: string) => commandState(id, s).disabled

  return (
    <div className="pt-app" ref={root} data-tool={s.tool}>
      <div className="pt-tabs" role="tablist" aria-label="Paint">
        {PAINT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className="pt-tab"
            data-paint-tab={tab.id}
            aria-selected={s.tab === tab.id}
            onClick={() => paint.current?.setTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-ribbon" role="tabpanel" aria-label="File" hidden={s.tab !== 'file'}>
        <div className="pt-group">
          <div className="pt-group-body">
            <button type="button" className="pt-button pt-big" data-paint-command="new" onClick={() => run('new')}>
              <Icon name="new" />
              <span>New</span>
            </button>
            <button type="button" className="pt-button pt-big" data-paint-command="save" onClick={() => run('save')}>
              <Icon name="save" />
              <span>Save as PNG</span>
            </button>
          </div>
          <span className="pt-group-label">File</span>
        </div>
      </div>

      <div className="pt-ribbon" role="tabpanel" aria-label="Home" hidden={s.tab !== 'home'}>
        <div className="pt-group">
          <div className="pt-group-body pt-stack">
            <button type="button" className="pt-button" data-paint-command="undo" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={off('undo')} onClick={() => run('undo')}>
              <Icon name="undo" />
            </button>
            <button type="button" className="pt-button" data-paint-command="redo" aria-label="Redo" title="Redo (Ctrl+Y)" disabled={off('redo')} onClick={() => run('redo')}>
              <Icon name="redo" />
            </button>
          </div>
          <span className="pt-group-label">History</span>
        </div>

        <div className="pt-group">
          <div className="pt-group-body">
            <div className="pt-grid" role="group" aria-label="Tools">
              {PAINT_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className="pt-button"
                  data-paint-tool={tool.id}
                  aria-label={tool.label}
                  title={tool.label}
                  aria-pressed={s.tool === tool.id}
                  onClick={() => paint.current?.setTool(tool.id)}
                >
                  <Icon name={tool.id} />
                </button>
              ))}
            </div>
          </div>
          <span className="pt-group-label">Tools</span>
        </div>

        <div className="pt-group">
          <div className="pt-group-body">
            <button
              type="button"
              className="pt-button pt-big"
              data-paint-tool="brush"
              aria-pressed={s.tool === 'brush'}
              onClick={() => paint.current?.setTool('brush')}
            >
              <Icon name="brush" />
              <span>Brush</span>
            </button>
          </div>
          <span className="pt-group-label">Brushes</span>
        </div>

        <div className="pt-group">
          <div className="pt-group-body">
            <div className="pt-grid" role="group" aria-label="Shapes">
              {PAINT_SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  className="pt-button"
                  data-paint-shape={shape.id}
                  aria-label={shape.label}
                  title={shape.label}
                  aria-pressed={s.tool === 'shape' && s.shape === shape.id}
                  onClick={() => paint.current?.setShape(shape.id)}
                >
                  <Icon name={shape.id} />
                </button>
              ))}
            </div>
          </div>
          <span className="pt-group-label">Shapes</span>
        </div>

        <div className="pt-group">
          <div className="pt-group-body pt-size">
            <span className="pt-size-row">
              <span className="pt-size-preview" aria-hidden="true">
                <span className="pt-size-dot" style={vars({ '--s': `${s.size}px` })} />
              </span>
              <span className="pt-size-value">{s.size}px</span>
            </span>
            <input
              type="range"
              min={MIN_SIZE}
              max={MAX_SIZE}
              value={s.size}
              aria-label="Size"
              data-paint-size
              onChange={(e) => paint.current?.setSize(e.target.value)}
            />
          </div>
          <span className="pt-group-label">Size</span>
        </div>

        <div className="pt-group">
          <div className="pt-group-body pt-colours">
            <div className="pt-wells">
              {[0, 1].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className="pt-well"
                  data-paint-slot={slot}
                  aria-label={`Colour ${slot + 1}`}
                  title={`Colour ${slot + 1}`}
                  aria-pressed={s.slot === slot}
                  onClick={() => paint.current?.setSlot(slot)}
                >
                  <span className="pt-well-swatch" style={vars({ '--c': s.colours[slot] })} />
                </button>
              ))}
            </div>
            <div className="pt-palette" role="group" aria-label="Palette">
              {PAINT_PALETTE.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  className="pt-swatch"
                  data-paint-colour={swatch.hex}
                  aria-label={swatch.name}
                  title={swatch.name}
                  style={vars({ '--c': swatch.hex })}
                  onClick={() => paint.current?.setColour(swatch.hex)}
                />
              ))}
            </div>
            <label className="pt-edit" title="Edit colours">
              <span className="pt-well-swatch" style={vars({ '--c': 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' })} />
              <span>Edit colours</span>
              <input
                type="color"
                value={s.colours[s.slot]}
                aria-label="Edit colours"
                data-paint-custom
                onChange={(e) => paint.current?.setColour(e.target.value)}
              />
            </label>
          </div>
          <span className="pt-group-label">Colours</span>
        </div>

        <div className="pt-actions">
          <button type="button" className="pt-action" data-paint-command="clear" onClick={() => run('clear')}>
            <Icon name="clear" />
            Clear
          </button>
          <button type="button" className="pt-action pt-action-primary" data-paint-command="save" onClick={() => run('save')}>
            <Icon name="save" />
            Save PNG
          </button>
        </div>
      </div>

      <div className="pt-ribbon" role="tabpanel" aria-label="View" hidden={s.tab !== 'view'}>
        <div className="pt-group">
          <div className="pt-group-body">
            <button type="button" className="pt-button pt-big" data-paint-command="zoomIn" disabled={off('zoomIn')} onClick={() => run('zoomIn')}>
              <Icon name="zoomIn" />
              <span>Zoom in</span>
            </button>
            <button type="button" className="pt-button pt-big" data-paint-command="zoomOut" disabled={off('zoomOut')} onClick={() => run('zoomOut')}>
              <Icon name="zoomOut" />
              <span>Zoom out</span>
            </button>
            <button type="button" className="pt-button pt-big" data-paint-command="zoomReset" disabled={off('zoomReset')} onClick={() => run('zoomReset')}>
              <Icon name="actual" />
              <span>100%</span>
            </button>
          </div>
          <span className="pt-group-label">Zoom</span>
        </div>
      </div>

      <div className="pt-viewport" data-paint-viewport>
        <div className="pt-frame" data-paint-frame>
          <div className="pt-sheet">
            <canvas className="pt-canvas" data-paint-canvas aria-label="Canvas" />
          </div>
          <textarea className="pt-textbox" data-paint-text aria-label="Text" rows={1} hidden />
          <span className="pt-handle" data-paint-resize="x" aria-hidden="true" />
          <span className="pt-handle" data-paint-resize="y" aria-hidden="true" />
          <span className="pt-handle" data-paint-resize="xy" aria-hidden="true" />
        </div>
      </div>

      <div className="pt-status">
        <span className="pt-status-item">
          <Icon name="pointer" />
          <span className="pt-pointer" data-paint-pointer />
        </span>
        <span className="pt-status-item pt-status-size">
          <Icon name="size" />
          <span data-paint-dimensions>
            {s.width} × {s.height}px
          </span>
        </span>
        <span className="pt-zoom">
          <span className="pt-zoom-value" data-paint-zoom>
            {s.zoom}%
          </span>
          <button type="button" className="pt-button" aria-label="Zoom out" disabled={off('zoomOut')} onClick={() => run('zoomOut')}>
            <Icon name="minus" />
          </button>
          <input
            type="range"
            min={0}
            max={ZOOM_LEVELS.length - 1}
            value={zoomIndex(s.zoom)}
            aria-label="Zoom"
            aria-valuetext={`${s.zoom}%`}
            onChange={(e) => paint.current?.setZoom(ZOOM_LEVELS[Number(e.target.value)])}
          />
          <button type="button" className="pt-button" aria-label="Zoom in" disabled={off('zoomIn')} onClick={() => run('zoomIn')}>
            <Icon name="plus" />
          </button>
        </span>
      </div>
    </div>
  )
}
