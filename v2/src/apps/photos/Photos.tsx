import { useEffect, useState } from 'react'
import { useOsStore } from '../../store/osStore'
import { useCurrentWindow, useWindowExtras } from '../../windowing/WindowContext'
import { photoAlbum, type AlbumPicture } from '../../../../assets/js/windowing/media.js'

// The same Photos as v1's partials/apps/photos.php. Both show a folder of the
// shared file system, Pictures by default, which holds the portfolio
// screenshots and the competition photos; assets/js/windowing/media.js picks
// the pictures in both builds.

const ICON_BUTTON = 'p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-sm transition-colors'
const ARROW =
  'absolute z-20 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all transform hover:scale-110 active:scale-95 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 opacity-100'

export default function Photos() {
  const extras = useWindowExtras<{ imageUrl?: string; imageName?: string; folderPath?: string }>()
  const windowId = useCurrentWindow().id
  const fileSystem = useOsStore((s) => s.fileSystem)
  const isFocused = useOsStore((s) => s.focusedWindowId === windowId)
  const [album] = useState(() => photoAlbum(fileSystem, extras))
  const [index, setIndex] = useState(album.index)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const images = album.images as AlbumPicture[]
  const current = images[index]

  const show = (next: number) => {
    setIndex(next)
    setZoom(1)
    setRotation(0)
  }
  const step = (by: number) => {
    if (images.length > 1) show((index + by + images.length) % images.length)
  }

  // Left and right arrows while this Photos window has focus.
  useEffect(() => {
    if (!isFocused) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element).closest?.('input, textarea')) return
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="h-full flex flex-col bg-win-bg dark:bg-[#1c1c1c] text-black dark:text-white select-none" data-photos>
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 justify-between bg-white dark:bg-[#2b2b2b] shrink-0 gap-2">
        <span className="text-sm font-semibold truncate min-w-0" data-photo-name>
          {current?.name ?? 'Photos'}
        </span>
        <div className="flex items-center space-x-2 shrink-0">
          <button type="button" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))} className={ICON_BUTTON} aria-label="Zoom out">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <span className="text-xs">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(z + 0.2, 3))} className={ICON_BUTTON} aria-label="Zoom in">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
          <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className={ICON_BUTTON} aria-label="Rotate">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="grow relative overflow-hidden bg-[#eeeeee] dark:bg-[#0a0a0a] flex items-center justify-center p-2 sm:p-4 md:p-8 min-h-0">
        {!current ? (
          <div className="opacity-60 text-sm">There are no pictures in this folder.</div>
        ) : (
          <div className="relative group h-full w-full flex items-center justify-center">
            {images.length > 1 && (
              <button type="button" onClick={() => step(-1)} className={`${ARROW} left-4`} aria-label="Previous picture">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <img
              src={current.url}
              alt={current.name}
              className="max-w-full max-h-full object-contain transition-transform duration-200 shadow-2xl z-0"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              onClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
            />
            {images.length > 1 && (
              <button type="button" onClick={() => step(1)} className={`${ARROW} right-4`} aria-label="Next picture">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filmstrip */}
      <div className="h-20 bg-white dark:bg-[#2b2b2b] border-t border-gray-200 dark:border-gray-800 flex items-center px-4 space-x-2 overflow-x-auto scrollbar-none shrink-0">
        {images.map((image, i) => (
          <button
            key={`${image.name}-${i}`}
            type="button"
            onClick={() => show(i)}
            aria-label={image.name}
            aria-current={i === index}
            data-filmstrip-photo={image.name}
            className={`h-16 w-16 shrink-0 rounded-sm border-2 p-0.5 cursor-pointer transition-all ${
              i === index ? 'border-win-blue bg-blue-50 dark:bg-blue-900/20' : 'border-transparent hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <img src={image.url} alt="" loading="lazy" className="w-full h-full object-cover rounded-xs" />
          </button>
        ))}
      </div>
    </div>
  )
}
