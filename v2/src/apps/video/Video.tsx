import { useWindowExtras } from '../../windowing/WindowContext'

// Native <video> element. URL comes through window extras; we default to
// the bundled easter-egg drone clip so the app still feels alive when
// launched standalone.
const DEFAULT_URL = '/data/south-africa-25.mp4'

export default function Video() {
  const { videoUrl } = useWindowExtras<{ videoUrl?: string }>()
  const src = videoUrl ?? DEFAULT_URL

  return (
    <div className="h-full flex flex-col bg-black text-white">
      <div className="h-9 bg-[#101010] flex items-center px-3 shrink-0 text-xs border-b border-white/10">
        <span className="opacity-70">Movies & TV</span>
        <span className="ml-auto opacity-50">{src.split('/').pop() ?? 'Clip'}</span>
      </div>
      {/* Fetches only the metadata until played; the poster is assets/img/posters/<video name>.webp. */}
      <video
        src={src}
        poster={`/assets/img/posters/${src.split('/').pop()?.replace(/\.[^.]+$/, '.webp')}`}
        preload="metadata"
        controls
        autoPlay
        className="grow w-full h-full bg-black"
      />
    </div>
  )
}
