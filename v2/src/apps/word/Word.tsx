import { useEffect, useRef, useState } from 'react'

// document.execCommand is deprecated but still works in every shipping browser
// and is the simplest way to get rich-text controls without pulling in an
// editor library for a CV viewer.
const exec = (cmd: string, value?: string) => {
  try {
    document.execCommand(cmd, false, value)
  } catch {
    /* no-op */
  }
}

export default function Word() {
  const [html, setHtml] = useState<string>('')
  const [wordCount, setWordCount] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/data/cv.php')
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setHtml(text)
      })
      .catch(() => {
        if (!cancelled) setHtml('<p>Failed to load CV content.</p>')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const updateCounts = () => {
    const text = editorRef.current?.innerText ?? ''
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    setWordCount(words)
  }

  const print = () => {
    const w = window.open('', '_blank', 'width=900,height=1000')
    if (!w) return
    w.document.write(`
      <html>
        <head>
          <title>CV - DeVanté Johnson-Rose</title>
          <script src="https://cdn.tailwindcss.com"></` + `script>
        </head>
        <body>${editorRef.current?.innerHTML ?? ''}</body>
      </html>
    `)
    w.document.close()
    w.setTimeout(() => w.print(), 500)
  }

  return (
    <div className="h-full flex flex-col bg-[#f3f3f3] dark:bg-[#1c1c1c] select-none">
      {/* Title bar */}
      <div className="h-8 bg-[#2b579a] flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <img src="/assets/img/word.webp" alt="" className="w-4 h-4" />
          <span className="text-[11px] text-white font-medium">CV.docx — Word</span>
        </div>
        <span className="text-white/80 text-[11px]">DeVanté Johnson-Rose</span>
      </div>

      {/* Ribbon */}
      <div className="bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 shrink-0">
        <div className="flex items-center space-x-6 px-4 py-1 text-[11px] font-medium border-b border-gray-100 dark:border-gray-800">
          {['File', 'Home', 'Insert', 'Layout', 'References'].map((t, i) => (
            <span
              key={t}
              className={
                i === 1
                  ? 'text-[#2b579a] border-b-2 border-[#2b579a] pb-0.5 font-bold'
                  : 'opacity-60 cursor-default px-2 py-0.5'
              }
            >
              {t}
            </span>
          ))}
        </div>

        <div className="p-2 flex items-center space-x-2 bg-gray-50 dark:bg-[#2d2d2d] shadow-sm">
          <button
            type="button"
            onClick={() => exec('bold')}
            className="w-7 h-7 font-bold hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => exec('italic')}
            className="w-7 h-7 italic hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => exec('underline')}
            className="w-7 h-7 underline hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs"
            title="Underline"
          >
            U
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
          <button
            type="button"
            onClick={() => exec('justifyLeft')}
            className="px-2 h-7 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => exec('justifyCenter')}
            className="px-2 h-7 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs"
          >
            ≡
          </button>
          <button
            type="button"
            onClick={() => exec('justifyRight')}
            className="px-2 h-7 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs"
          >
            →
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
          <button
            type="button"
            onClick={() => exec('insertUnorderedList')}
            className="px-2 h-7 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs"
            title="Bulleted list"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => exec('insertOrderedList')}
            className="px-2 h-7 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs"
            title="Numbered list"
          >
            1.
          </button>

          <div className="ml-auto">
            <button
              type="button"
              onClick={print}
              className="text-[11px] bg-[#2b579a] text-white px-4 py-1.5 rounded-sm hover:bg-[#1e3e6d] font-medium"
            >
              Print PDF
            </button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="flex-grow overflow-y-auto p-12 flex justify-center bg-[#e6e6e6] dark:bg-[#202020]">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          className="w-full max-w-[816px] min-h-[1056px] bg-white text-black shadow-2xl p-16 outline-none font-serif"
          dangerouslySetInnerHTML={{ __html: html }}
          onInput={updateCounts}
          onMouseUp={updateCounts}
          onKeyUp={updateCounts}
        />
      </div>

      {/* Status */}
      <div className="h-6 bg-[#2b579a] flex items-center px-4 justify-between shrink-0 text-white text-[10px]">
        <div className="flex items-center space-x-4">
          <span>Page 1 of 1</span>
          <span>{wordCount} words</span>
          <span>English (United Kingdom)</span>
        </div>
        <span>100%</span>
      </div>
    </div>
  )
}
