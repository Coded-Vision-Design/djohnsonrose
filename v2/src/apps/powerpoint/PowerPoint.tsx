import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  OFFICE_ICONS,
  POWERPOINT_TABS,
  SLIDE_SIZE,
  loadChecked,
  portfolioDeck,
  slideForKey,
  watchFit,
  type Slide,
} from '../../../../assets/js/windowing/office.js'

// PowerPoint: a slide for each project in data/portfolio.json. What it shows
// and how the keys move between slides lives in assets/js/windowing/office.js,
// which v1 shares, and it is styled by assets/css/office.css.

const vars = (values: Record<string, string | number>) => values as CSSProperties

export default function PowerPoint() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [active, setActive] = useState(0)
  const [fit, setFit] = useState(1)
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const live = useRef({ active, count: slides.length })

  useEffect(() => {
    live.current = { active, count: slides.length }
  }, [active, slides.length])

  useEffect(() => {
    let cancelled = false
    loadChecked('/data/portfolio.json')
      .then((data) => {
        if (cancelled) return
        setSlides(portfolioDeck(data, '/'))
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => watchFit(stageRef.current, SLIDE_SIZE, setFit), [])

  // Only while PowerPoint's own window has focus: the keys go to its window.
  useEffect(() => {
    const host = rootRef.current?.closest('.os-window')
    if (!host) return
    const onKey = (event: Event) => {
      const next = slideForKey(event as KeyboardEvent, live.current.active, live.current.count)
      if (next === null) return
      event.preventDefault()
      setActive(next)
    }
    host.addEventListener('keydown', onKey)
    return () => host.removeEventListener('keydown', onKey)
  }, [])

  const current = slides[active]

  return (
    <div className="office-app" data-office-app="powerpoint" ref={rootRef}>
      <div className="office-titlebar">
        <div className="office-titlebar-name">
          <img src="/assets/img/powerpoint.webp" alt="" />
          <span>Portfolio.pptx - PowerPoint</span>
        </div>
        <span className="office-user office-optional">DeVanté Johnson-Rose</span>
      </div>

      <div className="office-tabs">
        {POWERPOINT_TABS.map((tab) => (
          <span key={tab} className="office-tab" data-active={tab === 'Home' ? '' : undefined}>
            {tab}
          </span>
        ))}
      </div>

      <div className="ppt-body">
        <div className="ppt-thumbs" role="group" aria-label="Slides">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className="ppt-thumb"
              data-slide-thumb=""
              aria-current={index === active ? 'true' : undefined}
              onClick={() => setActive(index)}
            >
              <img src={slide.image} alt="" loading="lazy" />
              <span>{`${index + 1}. ${slide.title}`}</span>
            </button>
          ))}
        </div>

        <div className="ppt-stage" data-slide-stage="" ref={stageRef}>
          {current ? (
            <div className="ppt-slide" data-slide="" style={vars({ '--office-zoom': fit })}>
              <img src={current.image} alt={`The ${current.title} website`} />
              <div className="ppt-slide-body">
                <div className="ppt-slide-count">{`Slide ${active + 1} / ${slides.length}`}</div>
                <h2 className="ppt-slide-title" data-slide-title="">
                  {current.title}
                </h2>
                <p className="ppt-slide-text">{current.description}</p>
                <div className="ppt-tags">
                  {current.tags.map((tag) => (
                    <span key={tag} className="ppt-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="ppt-message">
              {state === 'error' ? 'The slides could not be loaded.' : 'Loading slides…'}
            </div>
          )}
        </div>
      </div>

      <div className="office-status">
        <div className="office-status-group">
          <span data-slide-status="">{`Slide ${slides.length ? active + 1 : 0} of ${slides.length}`}</span>
          <span className="office-optional">English (United Kingdom)</span>
        </div>
        <div className="office-status-group">
          <span className="office-optional">Arrow keys change slide</span>
          <button
            type="button"
            title="Previous slide"
            aria-label="Previous slide"
            disabled={active === 0}
            onClick={() => setActive((index) => Math.max(0, index - 1))}
          >
            <svg className="office-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d={OFFICE_ICONS.previous.d} />
            </svg>
          </button>
          <button
            type="button"
            title="Next slide"
            aria-label="Next slide"
            disabled={active >= slides.length - 1}
            onClick={() => setActive((index) => Math.min(slides.length - 1, index + 1))}
          >
            <svg className="office-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d={OFFICE_ICONS.next.d} />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
