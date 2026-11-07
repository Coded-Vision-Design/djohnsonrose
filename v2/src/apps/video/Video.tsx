import { useRef, useState } from 'react'
import { useCurrentWindow, useWindowExtras } from '../../windowing/WindowContext'
import {
  DEFAULT_VIDEO,
  formatMediaTime,
  mediaName,
  progressPercent,
  seekTime,
} from '../../../../assets/js/windowing/media.js'

// The same player as v1's partials/apps/video.php. Nothing plays until the
// visitor clicks, in both builds. The clock and seek bar are shared in
// assets/js/windowing/media.js.

export default function Video() {
  const { videoUrl } = useWindowExtras<{ videoUrl?: string }>()
  const { title } = useCurrentWindow()
  const url = videoUrl ?? DEFAULT_VIDEO
  const src = /^(https?:)?\//.test(url) ? url : `/${url}`

  const player = useRef<HTMLVideoElement>(null)
  const seeking = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  const togglePlay = () => {
    const video = player.current
    if (!video) return
    if (video.paused) video.play().catch(() => setPlaying(false))
    else video.pause()
  }

  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const video = player.current
    if (!video) return
    video.currentTime = seekTime(e.clientX, e.currentTarget.getBoundingClientRect(), video.duration)
    setCurrentTime(video.currentTime)
  }

  const skip = (seconds: number) => {
    const video = player.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + seconds))
    setCurrentTime(video.currentTime)
  }

  const progress = progressPercent(currentTime, duration)

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white select-none">
      <div className="h-10 bg-[#1a1a1a] flex items-center px-4 justify-between border-b border-white/5 shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-5 h-5 bg-win-blue rounded-sm flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-[11px] font-medium truncate max-w-[300px]">{title || mediaName(src) || 'Media Player'}</span>
        </div>
      </div>

      <div className="grow relative group overflow-hidden bg-black flex items-center justify-center min-h-0">
        <video
          ref={player}
          className="max-h-full max-w-full shadow-2xl"
          onClick={togglePlay}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          src={src}
          poster={src ? `/assets/img/posters/${src.split('/').pop()?.replace(/\.[^.]+$/, '.webp')}` : undefined}
          preload="metadata"
          playsInline
        />

        {!playing && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer transition-opacity duration-300"
          >
            <span className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 hover:bg-white/20 hover:scale-110 transition-all shadow-2xl group/btn">
              <svg
                className="w-10 h-10 text-white fill-current ml-1 group-hover/btn:scale-110 transition-transform"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      <div className="bg-[#1a1a1a]/95 backdrop-blur-2xl p-4 space-y-4 border-t border-white/10 shrink-0">
        <div
          className="relative h-1.5 bg-white/10 rounded-full cursor-pointer group/seek touch-none"
          data-seek-bar
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration || 0)}
          aria-valuenow={Math.floor(currentTime)}
          aria-valuetext={formatMediaTime(currentTime)}
          onPointerDown={(e) => {
            seeking.current = true
            e.currentTarget.setPointerCapture?.(e.pointerId)
            seek(e)
          }}
          onPointerMove={(e) => {
            if (seeking.current) seek(e)
          }}
          onPointerUp={() => {
            seeking.current = false
          }}
          onPointerCancel={() => {
            seeking.current = false
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault()
              skip(e.key === 'ArrowLeft' ? -5 : 5)
            }
          }}
        >
          <div className="absolute inset-y-0 left-0 bg-win-blue rounded-full transition-all duration-75" style={{ width: `${progress}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-xl scale-0 group-hover/seek:scale-100 group-focus/seek:scale-100 transition-transform border-2 border-win-blue"
            style={{ left: `${progress}%`, marginLeft: -8 }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
              className="text-white hover:text-win-blue transition-all active:scale-90"
            >
              {playing ? (
                <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="text-[12px] font-mono tracking-wider opacity-80">
              <span className="text-white">{formatMediaTime(currentTime)}</span>
              <span className="mx-1 opacity-40">/</span>
              <span className="opacity-60">{formatMediaTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 group/vol">
              <svg
                className="w-5 h-5 opacity-60 group-hover/vol:opacity-100 transition-opacity"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
              <input
                type="range"
                aria-label="Volume"
                className="w-16 sm:w-24 h-1 accent-win-blue cursor-pointer"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setVolume(next)
                  if (player.current) player.current.volume = next
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => player.current?.requestFullscreen?.()}
              aria-label="Full screen"
              className="text-white opacity-60 hover:opacity-100 hover:text-win-blue transition-all active:scale-90"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
