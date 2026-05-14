import { useEffect, useRef, useState } from 'react'
import { useOsStore } from '../../store/osStore'
import { floodFill, hexToRgb, rgbToHex } from './floodFill'

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker' | 'text'

const PALETTE = [
  '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
  '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7',
] as const

const CANVAS_W = 800
const CANVAS_H = 600
const MAX_HISTORY = 20

export default function Paint() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawing = useRef(false)
  const history = useRef<string[]>([])
  const historyStep = useRef(-1)

  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState<string>('#000000')
  const [size, setSize] = useState(4)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const focusedApp = useOsStore((s) =>
    s.windows.find((w) => w.id === s.focusedWindowId)?.app,
  )
  const isFocused = focusedApp === 'paint'

  const saveState = () => {
    const cvs = canvasRef.current
    if (!cvs) return
    historyStep.current++
    if (historyStep.current < history.current.length) {
      history.current = history.current.slice(0, historyStep.current)
    }
    history.current.push(cvs.toDataURL())
    if (history.current.length > MAX_HISTORY) {
      history.current.shift()
      historyStep.current--
    }
  }

  const restore = (dataUrl: string) => {
    const cvs = canvasRef.current
    const ctx = ctxRef.current
    if (!cvs || !ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, cvs.width, cvs.height)
      ctx.drawImage(img, 0, 0)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
    img.src = dataUrl
  }

  const undo = () => {
    if (historyStep.current > 0) {
      historyStep.current--
      restore(history.current[historyStep.current])
    }
  }

  const redo = () => {
    if (historyStep.current < history.current.length - 1) {
      historyStep.current++
      restore(history.current[historyStep.current])
    }
  }

  const clearAll = () => {
    if (!confirm('Clear the entire canvas?')) return
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    saveState()
  }

  const download = () => {
    const cvs = canvasRef.current
    if (!cvs) return
    const a = document.createElement('a')
    a.download = 'painting.png'
    a.href = cvs.toDataURL()
    a.click()
  }

  // Init canvas
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctxRef.current = ctx
    cvs.width = CANVAS_W
    cvs.height = CANVAS_H
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Seed history with the blank canvas.
    history.current = [cvs.toDataURL()]
    historyStep.current = 0
  }, [])

  // Ctrl+Z / Ctrl+Y when the paint window is focused.
  useEffect(() => {
    if (!isFocused) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFocused])

  const posFrom = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.round(((e.clientX - r.left) * CANVAS_W) / r.width),
      y: Math.round(((e.clientY - r.top) * CANVAS_H) / r.height),
    }
  }

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const { x, y } = posFrom(e)

    if (tool === 'picker') {
      const px = ctx.getImageData(x, y, 1, 1).data
      setColor(rgbToHex(px[0], px[1], px[2]))
      setTool('pencil')
      return
    }
    if (tool === 'fill') {
      const img = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H)
      floodFill(img.data, CANVAS_W, CANVAS_H, x, y, hexToRgb(color))
      ctx.putImageData(img, 0, 0)
      saveState()
      return
    }
    if (tool === 'text') {
      const text = window.prompt('Enter text:')
      if (text) {
        ctx.font = `${size * 2}px Segoe UI`
        ctx.fillStyle = color
        ctx.fillText(text, x, y)
        saveState()
      }
      return
    }
    drawing.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const { x, y } = posFrom(e)
    setMousePos({ x, y })
    if (!drawing.current) return
    if (tool === 'pencil' || tool === 'eraser') {
      ctx.lineWidth = size
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const onUp = () => {
    const ctx = ctxRef.current
    if (drawing.current && ctx) {
      drawing.current = false
      ctx.beginPath()
      saveState()
    }
  }

  const tools: { id: Tool; label: string }[] = [
    { id: 'pencil', label: '✏️' },
    { id: 'eraser', label: '🧹' },
    { id: 'fill', label: '🪣' },
    { id: 'picker', label: '🎯' },
    { id: 'text', label: 'A' },
  ]

  return (
    <div className="h-full flex flex-col bg-[#f3f3f3] dark:bg-[#1c1c1c] text-black dark:text-white select-none">
      {/* Ribbon */}
      <div className="bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 shrink-0 p-2 flex items-center space-x-2">
        <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-700 pr-2">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className={`w-8 h-8 rounded text-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 ${
                tool === t.id ? 'bg-win-blue/10 ring-1 ring-win-blue' : ''
              }`}
              title={t.id}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 border-r border-gray-300 dark:border-gray-700 pr-2">
          <input
            type="range"
            min={1}
            max={32}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-24"
            aria-label="Brush size"
          />
          <span className="text-[10px] w-6 text-right">{size}px</span>
        </div>

        <div className="grid grid-cols-10 gap-0.5 border-r border-gray-300 dark:border-gray-700 pr-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-4 h-4 rounded-sm border ${
                color === c ? 'ring-2 ring-win-blue ring-offset-1' : 'border-gray-300 dark:border-gray-700'
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Pick ${c}`}
            />
          ))}
        </div>

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer"
          aria-label="Custom colour"
        />

        <div className="flex items-center space-x-1 ml-auto">
          <button
            type="button"
            onClick={undo}
            className="px-3 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-white/10"
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={redo}
            className="px-3 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-white/10"
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-white/10"
          >
            🗑 Clear
          </button>
          <button
            type="button"
            onClick={download}
            className="px-3 py-1 text-xs rounded bg-win-blue text-white hover:opacity-90"
          >
            💾 Save PNG
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-grow overflow-auto bg-[#e6e6e6] dark:bg-[#0a0a0a] flex items-center justify-center p-6">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          style={{
            cursor:
              tool === 'fill'
                ? 'crosshair'
                : tool === 'picker'
                  ? 'copy'
                  : 'crosshair',
          }}
          className="bg-white shadow-2xl"
        />
      </div>

      {/* Status */}
      <div className="h-6 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-between px-4 text-[10px] shrink-0 opacity-70">
        <span>
          {mousePos.x}, {mousePos.y} px
        </span>
        <span>
          {CANVAS_W} × {CANVAS_H} px
        </span>
      </div>
    </div>
  )
}
