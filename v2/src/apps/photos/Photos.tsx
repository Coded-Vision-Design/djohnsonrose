import { useEffect, useState } from 'react'
import { useOsStore } from '../../store/osStore'
import { useWindowExtras } from '../../windowing/WindowContext'

interface PortfolioItem {
  id: number
  title: string
  description: string
  tags: string[]
  url: string
  thumbnail: string
  location?: string
  country_code?: string
}

interface PortfolioJson {
  projects: PortfolioItem[]
}

// Phase 2 photos: a gallery driven by /data/portfolio.json (same source as
// v1). Filmstrip + arrow-key navigation + zoom + rotate. The v1 dependency
// on the mock filesystem is dropped — Phase 4 can wire that back in.
export default function Photos() {
  const extras = useWindowExtras<{ imageUrl?: string }>()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const focusedApp = useOsStore((s) =>
    s.windows.find((w) => w.id === s.focusedWindowId)?.app,
  )
  const isFocused = focusedApp === 'photos'

  useEffect(() => {
    // When Explorer launches us with a single image URL, skip the gallery
    // load and render that image solo.
    if (extras.imageUrl) {
      setItems([
        {
          id: 0,
          title: 'Image',
          description: '',
          tags: [],
          url: '',
          thumbnail: extras.imageUrl.replace(/^\//, ''),
        },
      ])
      return
    }
    let cancelled = false
    fetch('/data/portfolio.json')
      .then((r) => r.json() as Promise<PortfolioJson>)
      .then((data) => {
        if (!cancelled) setItems(data.projects)
      })
      .catch(() => {
        /* leave empty — UI shows loading state */
      })
    return () => {
      cancelled = true
    }
  }, [extras.imageUrl])

  const current = items[index]

  const next = () => {
    if (items.length <= 1) return
    setIndex((i) => (i + 1) % items.length)
    setZoom(1)
    setRotation(0)
  }
  const prev = () => {
    if (items.length <= 1) return
    setIndex((i) => (i - 1 + items.length) % items.length)
    setZoom(1)
    setRotation(0)
  }

  // Left/right arrow keys when the photos window owns focus.
  useEffect(() => {
    if (!isFocused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // intentionally not depending on next/prev — they're stable callbacks
    // referencing items.length only through state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, items.length])

  return (
    <div className="h-full flex flex-col bg-[#f3f3f3] dark:bg-[#1c1c1c] text-black dark:text-white select-none">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 justify-between bg-white dark:bg-[#2b2b2b] shrink-0">
        <span className="text-sm font-semibold truncate max-w-[60%]">
          {current?.title ?? 'Photos'}
        </span>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded"
            aria-label="Zoom in"
          >
            +
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded"
            aria-label="Rotate"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-grow relative overflow-hidden bg-[#eeeeee] dark:bg-[#0a0a0a] flex items-center justify-center p-2 sm:p-4 md:p-8">
        {!current ? (
          <div className="opacity-50 text-sm">Loading gallery…</div>
        ) : (
          <div className="relative group h-full w-full flex items-center justify-center">
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-4 z-20 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all transform hover:scale-110 active:scale-95"
                  aria-label="Previous"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-4 z-20 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all transform hover:scale-110 active:scale-95"
                  aria-label="Next"
                >
                  →
                </button>
              </>
            )}
            <img
              src={`/${current.thumbnail}`}
              alt={current.title}
              className="max-w-full max-h-full object-contain shadow-2xl"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: 'transform 0.2s' }}
              onClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
            />
            {current.description && (
              <div className="absolute bottom-4 left-4 right-4 mx-auto max-w-2xl text-xs bg-black/50 text-white p-3 rounded pointer-events-none">
                <div className="font-semibold mb-1">{current.title}</div>
                <div className="opacity-80 line-clamp-2">{current.description}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filmstrip */}
      <div className="h-20 bg-white dark:bg-[#2b2b2b] border-t border-gray-200 dark:border-gray-800 flex items-center px-4 space-x-2 overflow-x-auto shrink-0">
        {items.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => {
              setIndex(i)
              setZoom(1)
              setRotation(0)
            }}
            className={`h-16 w-16 shrink-0 rounded border-2 p-0.5 transition-all ${
              i === index
                ? 'border-win-blue bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
            title={img.title}
          >
            <img src={`/${img.thumbnail}`} alt="" className="w-full h-full object-cover rounded-sm" />
          </button>
        ))}
      </div>
    </div>
  )
}
