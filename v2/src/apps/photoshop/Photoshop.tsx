import { useEffect, useRef, useState } from 'react'

// Photoshop port — Win11 chrome with a canvas you can draw on, a layers
// panel, and the classic left tool rail. The canvas auto-renders a small
// "untitled-1.psd" composition that the user can paint over.

type Tool = 'move' | 'brush' | 'eraser' | 'bucket' | 'text'

interface Layer {
  id: number
  name: string
  visible: boolean
  opacity: number
}

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'move', label: 'Move', icon: '✥' },
  { id: 'brush', label: 'Brush', icon: '🖌' },
  { id: 'eraser', label: 'Eraser', icon: '🧽' },
  { id: 'bucket', label: 'Paint Bucket', icon: '🪣' },
  { id: 'text', label: 'Text', icon: 'T' },
]

const SWATCHES = [
  '#000000', '#1e1e1e', '#ffffff', '#0078d4', '#31a8ff', '#cc2927',
  '#ec1ea0', '#ffaa00', '#ffe600', '#00d68f', '#6c63ff', '#a855f7',
]

const CANVAS_W = 720
const CANVAS_H = 480

export default function Photoshop() {
  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState('#0078d4')
  const [brushSize, setBrushSize] = useState(8)
  const [layers, setLayers] = useState<Layer[]>([
    { id: 1, name: 'Background', visible: true, opacity: 100 },
    { id: 2, name: 'Logo', visible: true, opacity: 100 },
    { id: 3, name: 'Highlights', visible: true, opacity: 75 },
  ])
  const [activeLayer, setActiveLayer] = useState(2)
  const [zoom, setZoom] = useState(100)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawing = useRef(false)

  // Seed the canvas with a gradient + brand text so the workspace doesn't
  // open blank — feels like a real PSD.
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return
    ctxRef.current = ctx
    cvs.width = CANVAS_W
    cvs.height = CANVAS_H

    const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
    grad.addColorStop(0, '#0078d4')
    grad.addColorStop(1, '#1e1e1e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.fillStyle = '#ffffff'
    ctx.font = '700 64px "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Portfolio OS', CANVAS_W / 2, CANVAS_H / 2 - 10)
    ctx.font = '500 18px "Segoe UI", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText('untitled-1.psd', CANVAS_W / 2, CANVAS_H / 2 + 24)

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const posFrom = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) * CANVAS_W) / r.width,
      y: ((e.clientY - r.top) * CANVAS_H) / r.height,
    }
  }

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const { x, y } = posFrom(e)
    if (tool === 'bucket') {
      ctx.fillStyle = color
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      return
    }
    if (tool === 'text') {
      const t = window.prompt('Text:')
      if (t) {
        ctx.fillStyle = color
        ctx.font = `700 ${brushSize * 3}px "Segoe UI", sans-serif`
        ctx.textAlign = 'left'
        ctx.fillText(t, x, y)
      }
      return
    }
    drawing.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current
    if (!ctx || !drawing.current) return
    if (tool !== 'brush' && tool !== 'eraser') return
    const { x, y } = posFrom(e)
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = color
    ctx.lineWidth = brushSize
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const onUp = () => {
    drawing.current = false
    const ctx = ctxRef.current
    ctx?.beginPath()
    if (ctx) ctx.globalCompositeOperation = 'source-over'
  }

  const toggleLayer = (id: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    )
  }

  const setLayerOpacity = (id: number, opacity: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, opacity } : l)))
  }

  const addLayer = () => {
    setLayers((prev) => [
      ...prev,
      { id: prev.length + 1, name: `Layer ${prev.length + 1}`, visible: true, opacity: 100 },
    ])
  }

  const exportPng = () => {
    const cvs = canvasRef.current
    if (!cvs) return
    const a = document.createElement('a')
    a.download = 'untitled-1.png'
    a.href = cvs.toDataURL('image/png')
    a.click()
  }

  return (
    <div className="h-full flex flex-col bg-[#535353] text-[#cccccc] select-none">
      {/* Title bar */}
      <div className="h-8 bg-[#001e36] flex items-center px-3 shrink-0 text-xs">
        <img src="/assets/img/photoshop.webp" alt="" className="w-4 h-4 mr-2" />
        <span>Adobe Photoshop 2025 — untitled-1.psd @ {zoom}%</span>
      </div>

      {/* Menu bar */}
      <div className="h-6 bg-[#323232] border-b border-black/40 flex items-center px-2 space-x-3 shrink-0 text-[11px]">
        {['File', 'Edit', 'Image', 'Layer', 'Type', 'Select', 'Filter', 'View', 'Window', 'Help'].map(
          (m) => (
            <span key={m} className="opacity-70 cursor-default">
              {m}
            </span>
          ),
        )}
      </div>

      {/* Options bar */}
      <div className="h-10 bg-[#404040] border-b border-black/40 flex items-center px-3 space-x-3 shrink-0 text-[11px]">
        <span className="opacity-70">Tool:</span>
        <span className="font-medium">{TOOLS.find((t) => t.id === tool)?.label}</span>
        <div className="w-px h-5 bg-black/40 mx-1" />
        <label className="flex items-center space-x-2">
          <span className="opacity-70">Size:</span>
          <input
            type="range"
            min={1}
            max={64}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-28"
          />
          <span className="opacity-80 w-8">{brushSize}px</span>
        </label>
        <div className="w-px h-5 bg-black/40 mx-1" />
        <label className="flex items-center space-x-2">
          <span className="opacity-70">Zoom:</span>
          <input
            type="range"
            min={25}
            max={200}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-28"
          />
          <span className="opacity-80 w-10">{zoom}%</span>
        </label>
        <div className="ml-auto flex items-center space-x-2">
          <button
            type="button"
            onClick={exportPng}
            className="px-3 py-1 rounded bg-[#0078d4] hover:bg-[#106ebe] text-white"
          >
            Export PNG
          </button>
        </div>
      </div>

      <div className="flex-grow flex min-h-0">
        {/* Tool rail */}
        <div className="w-12 bg-[#3a3a3a] border-r border-black/40 shrink-0 py-2 flex flex-col items-center space-y-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className={`w-10 h-10 rounded flex items-center justify-center text-lg ${
                tool === t.id ? 'bg-[#0078d4] text-white' : 'hover:bg-white/10'
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
          <div className="flex-grow" />
          {/* Foreground/background colour wells */}
          <div className="relative w-8 h-8 mb-3">
            <div
              className="absolute top-0 left-0 w-5 h-5 rounded-sm border-2 border-white shadow"
              style={{ backgroundColor: color }}
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-sm border-2 border-white shadow bg-white" />
          </div>
        </div>

        {/* Canvas viewport */}
        <div className="flex-grow bg-[#1f1f1f] flex items-center justify-center overflow-auto">
          <div
            className="bg-white shadow-2xl"
            style={{
              width: (CANVAS_W * zoom) / 100,
              height: (CANVAS_H * zoom) / 100,
            }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              onMouseLeave={onUp}
              className="w-full h-full cursor-crosshair"
            />
          </div>
        </div>

        {/* Right panels */}
        <div className="w-64 bg-[#3a3a3a] border-l border-black/40 shrink-0 flex flex-col">
          {/* Swatches */}
          <div className="border-b border-black/40">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider opacity-70 border-b border-black/40">
              Swatches
            </div>
            <div className="p-2 grid grid-cols-6 gap-1">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`aspect-square rounded-sm border ${
                    color === c ? 'border-white ring-1 ring-[#0078d4]' : 'border-black/40'
                  }`}
                  title={c}
                />
              ))}
            </div>
            <div className="px-3 pb-2 flex items-center space-x-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 rounded"
              />
              <span className="text-[10px] font-mono opacity-70">{color.toUpperCase()}</span>
            </div>
          </div>

          {/* Layers */}
          <div className="flex-grow overflow-y-auto">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider opacity-70 border-b border-black/40 flex items-center justify-between">
              <span>Layers</span>
              <button
                type="button"
                onClick={addLayer}
                className="text-[11px] px-2 rounded hover:bg-white/10"
                title="New layer"
              >
                +
              </button>
            </div>
            {layers
              .slice()
              .reverse()
              .map((l) => (
                <div
                  key={l.id}
                  onClick={() => setActiveLayer(l.id)}
                  className={`px-3 py-2 border-b border-black/30 cursor-default ${
                    activeLayer === l.id ? 'bg-[#0078d4]/30' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLayer(l.id)
                      }}
                      className="w-5 h-5 flex items-center justify-center text-xs opacity-80"
                      title={l.visible ? 'Hide' : 'Show'}
                    >
                      {l.visible ? '👁' : '–'}
                    </button>
                    <div className="w-7 h-7 bg-gradient-to-br from-[#0078d4] to-[#1e1e1e] rounded-sm border border-black/40" />
                    <span className="text-[11px] flex-grow truncate">{l.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1 pl-7">
                    <span className="text-[9px] opacity-60">Opacity</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={l.opacity}
                      onChange={(e) => setLayerOpacity(l.id, Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-grow"
                    />
                    <span className="text-[9px] opacity-70 w-7 text-right">{l.opacity}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="h-5 bg-[#323232] border-t border-black/40 flex items-center px-3 shrink-0 text-[10px] opacity-70 justify-between">
        <span>{CANVAS_W} × {CANVAS_H} · 72 ppi · sRGB</span>
        <span>RGB/8</span>
      </div>
    </div>
  )
}
