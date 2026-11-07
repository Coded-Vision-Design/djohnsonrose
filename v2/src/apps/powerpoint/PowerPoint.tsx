import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  OFFICE_ICONS,
  POWERPOINT_TABS,
  SHOW_MAX_ZOOM,
  SLIDE_SIZE,
  caseStudyDecks,
  deckIndex,
  loadChecked,
  showKey,
  slideForKey,
  stepSlide,
  watchFit,
  watchSwipe,
  type CaseSlide,
  type Deck,
} from '../../../../assets/js/windowing/office.js'
import fileSystem from '../../../../data/filesystem.json'
import { useWindowExtras } from '../../windowing/WindowContext'

// PowerPoint: a case study for each project, built from data/portfolio.json and
// the project's own folder in data/filesystem.json. What the slides say and how
// the keys and swipes move between them lives in assets/js/windowing/office.js,
// which v1 shares, and it is styled by assets/css/office.css.

const vars = (values: Record<string, string | number>) => values as CSSProperties

interface SlideViewProps {
  slide: CaseSlide
  deck: string
  index: number
  count: number
  fit: number
}

/** One slide, as partials/powerpoint-slide.php draws it for v1. */
function SlideView({ slide, deck, index, count, fit }: SlideViewProps) {
  return (
    <div className="ppt-slide" data-slide="" data-slide-kind={slide.kind} style={vars({ '--office-zoom': fit })}>
      {slide.kind === 'title' && slide.image ? <img src={slide.image} alt={slide.alt} /> : null}
      <div className="ppt-slide-body">
        <div className="ppt-slide-count">{`Slide ${index + 1} / ${count}`}</div>
        <h2 className="ppt-slide-title" data-slide-title="">
          {slide.heading}
        </h2>
        {slide.kind === 'title' && slide.text ? <p className="ppt-slide-text">{slide.text}</p> : null}
        {slide.kind === 'title' && slide.tags.length ? (
          <div className="ppt-tags">
            {slide.tags.map((tag, i) => (
              <span key={i} className="ppt-tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {slide.kind === 'title' && slide.url ? (
          <a className="ppt-slide-link" href={slide.url} target="_blank" rel="noopener noreferrer">
            {slide.link}
          </a>
        ) : null}
        {slide.kind === 'points' && !slide.ordered ? (
          <ul className="ppt-points">
            {slide.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : null}
        {slide.kind === 'points' && slide.ordered ? (
          <ol className="ppt-points">
            {slide.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        ) : null}
        {slide.kind === 'metrics' ? (
          <ul className="ppt-metrics">
            {slide.metrics.map((metric, i) => (
              <li key={i} className="ppt-metric">
                {/* The result says the figure again, so a screen reader hears it once. */}
                <strong className="ppt-metric-figure" aria-hidden="true">
                  {metric.figure}
                </strong>
                <span className="ppt-metric-text">{metric.text}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {slide.kind === 'shots' ? (
          <div className="ppt-shots">
            {slide.shots.map((shot) => (
              <figure key={shot.url} className="ppt-shot">
                <img src={shot.url} alt={shot.alt} />
                <figcaption>{shot.name}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}
        {slide.kind !== 'title' ? <div className="ppt-slide-footer">{deck}</div> : null}
      </div>
    </div>
  )
}

export default function PowerPoint() {
  const { deck: asked } = useWindowExtras<{ deck?: number | string }>()
  const [decks, setDecks] = useState<Deck[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [deckAt, setDeckAt] = useState(0)
  const [active, setActive] = useState(0)
  const [fit, setFit] = useState(1)
  const [showFit, setShowFit] = useState(1)
  const [presenting, setPresenting] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const showRef = useRef<HTMLDialogElement>(null)
  const showStageRef = useRef<HTMLDivElement>(null)
  const presentRef = useRef<HTMLButtonElement>(null)

  const deck = decks[deckAt]
  const slides = deck?.slides ?? []
  const slide = slides[active]
  const count = slides.length
  const live = useRef({ active, count, presenting })

  useEffect(() => {
    live.current = { active, count, presenting }
  }, [active, count, presenting])

  useEffect(() => {
    let cancelled = false
    loadChecked('/data/portfolio.json')
      .then((data) => {
        if (cancelled) return
        const built = caseStudyDecks(data, fileSystem, '/')
        setDecks(built)
        setDeckAt(deckIndex(built, asked))
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [asked])

  useEffect(() => watchFit(stageRef.current, SLIDE_SIZE, setFit), [])
  useEffect(() => watchFit(showStageRef.current, SLIDE_SIZE, setShowFit, { max: SHOW_MAX_ZOOM }), [])

  const step = (by: number) => setActive((index) => stepSlide(index, by, live.current.count))

  // A finger swiped across the slide, in the window or in the show.
  useEffect(() => {
    const onStep = (by: number) => setActive((index) => stepSlide(index, by, live.current.count))
    const stops = [watchSwipe(stageRef.current, onStep), watchSwipe(showRef.current, onStep)]
    return () => stops.forEach((stop) => stop())
  }, [])

  // The show is a modal <dialog>, so it covers the whole screen, above the
  // taskbar, and keeps focus inside it until it ends.
  const present = () => {
    const show = showRef.current
    if (!show || !slide) return
    if (!show.open) show.showModal()
    show.focus()
    setPresenting(true)
  }

  const endShow = () => {
    const show = showRef.current
    if (show?.open) show.close()
    setPresenting(false)
    presentRef.current?.focus({ preventScroll: true })
  }
  const endShowRef = useRef(endShow)
  useEffect(() => {
    endShowRef.current = endShow
  })

  // Only while PowerPoint's own window has focus: the keys go to its window,
  // and the show, which sits inside it, has them all to itself.
  useEffect(() => {
    const host = rootRef.current?.closest('.os-window')
    if (!host) return
    const onKey = (event: Event) => {
      const key = event as KeyboardEvent
      const { active: at, count: total, presenting: showing } = live.current
      if (showing) {
        key.stopPropagation()
        const next = showKey(key, at, total)
        if (next === null) return
        key.preventDefault()
        if (next === 'end') endShowRef.current()
        else setActive(next)
        return
      }
      const next = slideForKey(key, at, total)
      if (next === null) return
      key.preventDefault()
      setActive(next)
    }
    host.addEventListener('keydown', onKey)
    return () => host.removeEventListener('keydown', onKey)
  }, [])

  const pick = (index: number) => {
    setDeckAt(index)
    setActive(0)
  }

  return (
    <div className="office-app" data-office-app="powerpoint" ref={rootRef}>
      <div className="office-titlebar">
        <div className="office-titlebar-name">
          <img src="/assets/img/powerpoint.webp" alt="" />
          <span data-deck-title="">{deck ? `${deck.title} case study - PowerPoint` : 'Case studies - PowerPoint'}</span>
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
        <nav className="ppt-thumbs" aria-label="Case studies">
          {decks.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="ppt-thumb"
              data-deck={item.id}
              aria-current={index === deckAt ? 'true' : undefined}
              onClick={() => pick(index)}
            >
              {item.cover ? <img src={item.cover} alt="" loading="lazy" /> : null}
              <span>{item.title}</span>
            </button>
          ))}
        </nav>

        <div className="ppt-main">
          <div className="ppt-stage" data-slide-stage="" ref={stageRef}>
            {slide && deck ? (
              <SlideView slide={slide} deck={deck.title} index={active} count={count} fit={fit} />
            ) : (
              <div className="ppt-message">
                {state === 'error' ? 'The case studies could not be loaded.' : 'Loading case studies…'}
              </div>
            )}
          </div>

          <div className="ppt-toolbar" role="group" aria-label="Slides">
            <div className="ppt-nav">
              <button type="button" title="Previous slide" aria-label="Previous slide" disabled={active === 0} onClick={() => step(-1)}>
                <svg className="office-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={OFFICE_ICONS.previous.d} />
                </svg>
              </button>
              <span className="ppt-counter" data-slide-counter="" aria-live="polite">
                {`${count ? active + 1 : 0} / ${count}`}
              </span>
              <button type="button" title="Next slide" aria-label="Next slide" disabled={active >= count - 1} onClick={() => step(1)}>
                <svg className="office-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={OFFICE_ICONS.next.d} />
                </svg>
              </button>
            </div>
            <button type="button" className="ppt-present" ref={presentRef} disabled={!slide} onClick={present}>
              <svg className="office-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d={OFFICE_ICONS.present.d} />
              </svg>
              <span>Present</span>
            </button>
          </div>
        </div>
      </div>

      <div className="office-status">
        <div className="office-status-group">
          <span data-slide-status="">{`Slide ${count ? active + 1 : 0} of ${count}`}</span>
          <span className="office-optional">English (United Kingdom)</span>
        </div>
        <div className="office-status-group">
          <span className="office-optional">Arrow keys change slide</span>
        </div>
      </div>

      <dialog
        className="ppt-show"
        data-present=""
        aria-label={deck ? `${deck.title} case study, slide show` : 'Slide show'}
        tabIndex={-1}
        ref={showRef}
        onCancel={(event) => {
          event.preventDefault()
          endShow()
        }}
        onClose={() => setPresenting(false)}
      >
        <div className="ppt-show-stage" ref={showStageRef}>
          {presenting && slide && deck ? (
            <SlideView slide={slide} deck={deck.title} index={active} count={count} fit={showFit} />
          ) : null}
        </div>
        <div className="ppt-show-bar">
          <div className="ppt-nav">
            <button type="button" title="Previous slide" aria-label="Previous slide" disabled={active === 0} onClick={() => step(-1)}>
              <svg className="office-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d={OFFICE_ICONS.previous.d} />
              </svg>
            </button>
            <span className="ppt-counter" data-show-counter="">{`${count ? active + 1 : 0} / ${count}`}</span>
            <button type="button" title="Next slide" aria-label="Next slide" disabled={active >= count - 1} onClick={() => step(1)}>
              <svg className="office-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d={OFFICE_ICONS.next.d} />
              </svg>
            </button>
          </div>
          <button type="button" className="ppt-end-show" title="End show (Esc)" onClick={endShow}>
            <svg className="office-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d={OFFICE_ICONS.endShow.d} />
            </svg>
            <span>End show</span>
          </button>
        </div>
      </dialog>
    </div>
  )
}
