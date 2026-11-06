import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import {
  OFFICE_ICONS,
  WORD_FONTS,
  WORD_PAGE_WIDTH,
  WORD_SIZES,
  WORD_TABS,
  countWords,
  documentText,
  loadChecked,
  pageStyles,
  printDocument,
  stepPageZoom,
  watchFit,
  wordEditor,
  zoomSliderAt,
  type OfficeIcon,
  type WordCommand,
  type WordEditor,
  type WordFormat,
} from '../../../../assets/js/windowing/office.js'

// Word. What it shows and does lives in assets/js/windowing/office.js, which
// v1 shares, and it is styled by assets/css/office.css, so this file only
// draws the screen and keeps React state.

const FAILED = '<p>The CV could not be loaded. Please try again later.</p>'
const vars = (values: Record<string, string | number>) => values as CSSProperties
// Keeps the editor's selection while a ribbon button is pressed.
const keepSelection = (event: MouseEvent) => event.preventDefault()

/** Words in the CV as it arrives, before anything has been typed. */
function wordsInHtml(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html
  return countWords(documentText(template.content))
}

function Icon({ icon }: { icon: OfficeIcon }) {
  return (
    <svg className="office-icon" data-stroke={icon.stroke ? '' : undefined} viewBox="0 0 24 24" aria-hidden="true">
      <path d={icon.d} />
    </svg>
  )
}

export default function Word() {
  const [html, setHtml] = useState('')
  const [edited, setEdited] = useState<number | null>(null)
  const [fit, setFit] = useState(1)
  const [userZoom, setUserZoom] = useState<number | null>(null)
  const [fontName, setFontName] = useState('Calibri')
  const [fontSize, setFontSize] = useState('3')
  const [format, setFormat] = useState<WordFormat>({ bold: false, italic: false, underline: false, align: 'left' })
  const editorRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const controller = useRef<WordEditor | null>(null)

  useEffect(() => {
    let cancelled = false
    loadChecked('/data/cv.php', 'text')
      .then((text) => {
        if (!cancelled) setHtml(text)
      })
      .catch(() => {
        if (!cancelled) setHtml(FAILED)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!editorRef.current) return
    const editor = wordEditor(editorRef.current, { onFormat: setFormat })
    controller.current = editor
    const stopFit = watchFit(areaRef.current, { width: WORD_PAGE_WIDTH }, setFit)
    return () => {
      editor.stop()
      stopFit()
    }
  }, [])

  const loaded = useMemo(() => wordsInHtml(html), [html])
  const words = edited ?? loaded
  const zoom = userZoom ?? fit
  const run = (command: WordCommand, value?: string) => controller.current?.run(command, value)

  const print = () => {
    printDocument({ title: 'CV - DeVanté Johnson-Rose', html: editorRef.current?.innerHTML ?? '', styles: pageStyles() })
  }

  return (
    <div className="office-app" data-office-app="word">
      <div className="office-titlebar">
        <div className="office-titlebar-name">
          <img src="/assets/img/word.webp" alt="" />
          <span>CV.docx - Word</span>
        </div>
        <div className="office-titlebar-side">
          <div className="office-qat">
            <button type="button" title="Save" aria-label="Save" disabled>
              <Icon icon={OFFICE_ICONS.save} />
            </button>
            <button type="button" title="Undo" aria-label="Undo" onMouseDown={keepSelection} onClick={() => run('undo')}>
              <Icon icon={OFFICE_ICONS.undo} />
            </button>
          </div>
          <span className="office-user office-optional">DeVanté Johnson-Rose</span>
        </div>
      </div>

      <div className="office-tabs">
        {WORD_TABS.map((tab) => (
          <span key={tab} className="office-tab" data-active={tab === 'Home' ? '' : undefined}>
            {tab}
          </span>
        ))}
      </div>

      <div className="word-ribbon" role="toolbar" aria-label="Home">
        <div className="word-group" role="group" aria-label="Clipboard" data-word-group="Clipboard">
          <div className="word-group-body">
            <button type="button" className="word-btn word-btn-large" onMouseDown={keepSelection} onClick={() => run('paste')}>
              <Icon icon={OFFICE_ICONS.paste} />
              <span>Paste</span>
            </button>
            <div className="word-group-stack">
              <button type="button" className="word-btn word-btn-small" onMouseDown={keepSelection} onClick={() => run('cut')}>
                <Icon icon={OFFICE_ICONS.cut} />
                <span>Cut</span>
              </button>
              <button type="button" className="word-btn word-btn-small" onMouseDown={keepSelection} onClick={() => run('copy')}>
                <Icon icon={OFFICE_ICONS.copy} />
                <span>Copy</span>
              </button>
            </div>
          </div>
          <span className="word-group-label" aria-hidden="true">
            Clipboard
          </span>
        </div>

        <div className="word-group" role="group" aria-label="Font" data-word-group="Font">
          <div className="word-group-stack">
            <div className="word-group-row">
              <select
                className="word-select word-select-font"
                aria-label="Font name"
                value={fontName}
                onChange={(event) => {
                  setFontName(event.target.value)
                  void run('fontName', event.target.value)
                }}
              >
                {WORD_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
              <select
                className="word-select word-select-size"
                aria-label="Font size"
                value={fontSize}
                onChange={(event) => {
                  setFontSize(event.target.value)
                  void run('fontSize', event.target.value)
                }}
              >
                {WORD_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="word-group-row">
              <button type="button" className="word-btn word-btn-letter" style={{ fontWeight: 700 }} title="Bold" aria-label="Bold" aria-pressed={format.bold} onMouseDown={keepSelection} onClick={() => run('bold')}>
                B
              </button>
              <button type="button" className="word-btn word-btn-letter" style={{ fontStyle: 'italic' }} title="Italic" aria-label="Italic" aria-pressed={format.italic} onMouseDown={keepSelection} onClick={() => run('italic')}>
                I
              </button>
              <button type="button" className="word-btn word-btn-letter" style={{ textDecoration: 'underline' }} title="Underline" aria-label="Underline" aria-pressed={format.underline} onMouseDown={keepSelection} onClick={() => run('underline')}>
                U
              </button>
              <span className="word-divider" aria-hidden="true" />
              <button type="button" className="word-btn word-btn-letter word-btn-colour" title="Font colour" aria-label="Font colour" onMouseDown={keepSelection} onClick={() => run('foreColor', '#dc2626')}>
                A
              </button>
            </div>
          </div>
          <span className="word-group-label" aria-hidden="true">
            Font
          </span>
        </div>

        <div className="word-group" role="group" aria-label="Paragraph" data-word-group="Paragraph">
          <div className="word-group-stack">
            <div className="word-group-row">
              <button type="button" className="word-btn" title="Bullets" aria-label="Bullets" onMouseDown={keepSelection} onClick={() => run('insertUnorderedList')}>
                <Icon icon={OFFICE_ICONS.bullets} />
              </button>
              <button type="button" className="word-btn" title="Numbering" aria-label="Numbering" onMouseDown={keepSelection} onClick={() => run('insertOrderedList')}>
                <Icon icon={OFFICE_ICONS.numbering} />
              </button>
            </div>
            <div className="word-group-row">
              <button type="button" className="word-btn" title="Align left" aria-label="Align left" aria-pressed={format.align === 'left'} onMouseDown={keepSelection} onClick={() => run('justifyLeft')}>
                <Icon icon={OFFICE_ICONS.alignLeft} />
              </button>
              <button type="button" className="word-btn" title="Centre" aria-label="Centre" aria-pressed={format.align === 'center'} onMouseDown={keepSelection} onClick={() => run('justifyCenter')}>
                <Icon icon={OFFICE_ICONS.alignCenter} />
              </button>
              <button type="button" className="word-btn" title="Align right" aria-label="Align right" aria-pressed={format.align === 'right'} onMouseDown={keepSelection} onClick={() => run('justifyRight')}>
                <Icon icon={OFFICE_ICONS.alignRight} />
              </button>
            </div>
          </div>
          <span className="word-group-label" aria-hidden="true">
            Paragraph
          </span>
        </div>

        <div className="word-group" role="group" aria-label="Styles" data-word-group="Styles">
          <div className="word-group-body">
            <button type="button" className="word-style" data-current="" aria-label="Normal style" onMouseDown={keepSelection} onClick={() => run('style', 'normal')}>
              <b>AaBbCc</b>
              <small>Normal</small>
            </button>
            <button type="button" className="word-style word-style-title" aria-label="Title style" onMouseDown={keepSelection} onClick={() => run('style', 'title')}>
              <b>AaBbCc</b>
              <small>Title</small>
            </button>
          </div>
          <span className="word-group-label" aria-hidden="true">
            Styles
          </span>
        </div>

        <div className="word-group" role="group" aria-label="Editing" data-word-group="Editing">
          <div className="word-group-stack">
            <button type="button" className="word-btn word-btn-small" disabled>
              <Icon icon={OFFICE_ICONS.find} />
              <span>Find</span>
            </button>
            <button type="button" className="word-btn word-btn-small" disabled>
              <Icon icon={OFFICE_ICONS.replace} />
              <span>Replace</span>
            </button>
          </div>
          <span className="word-group-label" aria-hidden="true">
            Editing
          </span>
        </div>

        <div className="word-print">
          <button type="button" onClick={print}>
            <Icon icon={OFFICE_ICONS.print} />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      <div className="word-area" data-word-area="" ref={areaRef}>
        <div
          ref={editorRef}
          className="word-page"
          data-word-page=""
          data-word-editor=""
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          role="textbox"
          aria-multiline="true"
          aria-label="CV.docx"
          style={vars({ '--office-zoom': zoom })}
          dangerouslySetInnerHTML={{ __html: html }}
          onInput={(event) => setEdited(countWords(documentText(event.currentTarget)))}
        />
      </div>

      <div className="office-status">
        <div className="office-status-group">
          <span className="office-optional">Page 1 of 1</span>
          <span data-word-count="">{`${words} words`}</span>
          <span className="office-optional">English (United Kingdom)</span>
        </div>
        <div className="office-status-group">
          <span className="office-optional">Focus</span>
          <div className="word-zoom">
            <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => setUserZoom(stepPageZoom(zoom, -1))}>
              <Icon icon={OFFICE_ICONS.zoomOut} />
            </button>
            <span className="word-zoom-track" style={vars({ '--office-zoom-at': `${zoomSliderAt(zoom) * 100}%` })} aria-hidden="true" />
            <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => setUserZoom(stepPageZoom(zoom, 1))}>
              <Icon icon={OFFICE_ICONS.zoomIn} />
            </button>
            <span className="word-zoom-value" data-word-zoom="">{`${Math.round(zoom * 100)}%`}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
