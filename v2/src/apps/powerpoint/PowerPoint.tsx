import { useEffect, useState } from 'react'

interface Project {
  id: number
  title: string
  description: string
  tags: string[]
  url: string
  thumbnail: string
}

// PowerPoint mock: each portfolio project becomes a slide, with arrow-key
// navigation and a thumbnail strip on the left.
export default function PowerPoint() {
  const [slides, setSlides] = useState<Project[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/data/portfolio.json')
      .then((r) => r.json() as Promise<{ projects: Project[] }>)
      .then((d) => {
        if (!cancelled) setSlides(d.projects)
      })
      .catch(() => {
        /* leave empty */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (slides.length === 0) return
      if (e.key === 'ArrowRight') setActive((a) => Math.min(a + 1, slides.length - 1))
      else if (e.key === 'ArrowLeft') setActive((a) => Math.max(a - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length])

  const current = slides[active]

  return (
    <div className="h-full flex flex-col bg-[#f3f3f3] dark:bg-[#1c1c1c] text-black dark:text-white">
      <div className="h-8 bg-[#b7472a] flex items-center px-3 shrink-0">
        <img src="/assets/img/powerpoint.webp" alt="" className="w-4 h-4 mr-2" />
        <span className="text-white text-xs font-medium">Portfolio.pptx — PowerPoint</span>
      </div>

      <div className="flex-grow flex min-h-0">
        <div className="w-40 bg-white dark:bg-[#2b2b2b] border-r border-gray-300 dark:border-gray-700 overflow-y-auto shrink-0 p-2 space-y-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              className={`w-full aspect-video rounded border text-[10px] flex flex-col bg-cover bg-center relative overflow-hidden text-left ${
                i === active ? 'border-[#b7472a] ring-2 ring-[#b7472a]/30' : 'border-gray-300 dark:border-gray-700'
              }`}
              style={{ backgroundImage: `url(/${s.thumbnail})` }}
            >
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative px-1 py-0.5 text-white truncate">
                {i + 1}. {s.title}
              </div>
            </button>
          ))}
        </div>

        <div className="flex-grow bg-gray-100 dark:bg-[#0f0f0f] flex items-center justify-center p-8">
          {current ? (
            <div
              className="w-full max-w-4xl aspect-video rounded-lg shadow-2xl bg-white relative overflow-hidden"
              style={{ backgroundImage: `url(/${current.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/30 to-black/80" />
              <div className="absolute bottom-0 inset-x-0 p-8 text-white">
                <div className="text-xs uppercase tracking-widest opacity-80 mb-2">
                  Slide {active + 1} / {slides.length}
                </div>
                <h2 className="text-4xl font-bold mb-2">{current.title}</h2>
                <p className="text-sm opacity-90 max-w-2xl">{current.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {current.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-[10px] font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="opacity-50 text-sm">Loading slides…</div>
          )}
        </div>
      </div>

      <div className="h-6 bg-[#b7472a] text-white text-[10px] flex items-center px-3 shrink-0 justify-between">
        <span>Slide {active + 1} of {slides.length}</span>
        <span>← / → to navigate</span>
      </div>
    </div>
  )
}
