import { useEffect } from 'react'
import { useCurrentWindow, useWindowExtras } from '../../windowing/WindowContext'
import { track } from '../../lib/telemetry'
import { DEFAULT_PDF, canShowPdf, mediaName, pdfOpenLabel } from '../../../../assets/js/windowing/media.js'

// The browser's own PDF viewer in a frame, as in v1. Phones often cannot show
// a PDF in a frame, so narrow screens, and browsers that say they have no
// viewer, get a prompt to open or download it instead.
const showsPdf = canShowPdf(typeof navigator === 'undefined' ? undefined : navigator)

export default function PdfReader() {
  const { pdfUrl } = useWindowExtras<{ pdfUrl?: string }>()
  const { title } = useCurrentWindow()
  const url = pdfUrl ?? DEFAULT_PDF
  const src = /^(https?:)?\//.test(url) ? url : `/${url}`
  const fileName = title || mediaName(src)

  // Parity with v1's openItem → sendTelemetry('Document Viewed', …): admin
  // emails surface PDF opens explicitly, not just the generic "Open App".
  useEffect(() => {
    track('Document Viewed', { name: mediaName(src), url: src })
  }, [src])

  return (
    <div className="h-full flex flex-col bg-[#525659] text-white select-none" data-pdf-reader>
      <div className="h-10 bg-[#323639] flex items-center px-3 sm:px-4 gap-3 shrink-0">
        <div
          className="w-6 h-6 bg-[#ff0000] rounded-sm flex items-center justify-center font-bold text-[10px] text-white shrink-0"
          aria-hidden="true"
        >
          PDF
        </div>
        <span className="text-xs font-medium truncate min-w-0">{fileName}</span>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-block hover:bg-white/10 px-3 py-1 rounded-sm text-[11px] font-medium"
          >
            Open in new tab
          </a>
          <a
            href={src}
            download
            className="bg-[#ff0000] hover:bg-[#cc0000] text-white px-3 py-1 rounded-sm text-[11px] font-bold transition-colors"
          >
            Download
          </a>
        </div>
      </div>

      <iframe
        src={src}
        title={fileName}
        className={`grow w-full border-none bg-[#525659] hidden ${showsPdf ? 'sm:block' : ''}`}
      />

      <div
        data-pdf-prompt
        className={`grow flex flex-col items-center justify-center text-center gap-4 p-6 overflow-auto ${showsPdf ? 'sm:hidden' : ''}`}
      >
        <img src="/assets/img/pdf.webp" alt="" className="w-16 h-16" />
        <h2 className="text-base font-semibold break-words max-w-xs">{fileName}</h2>
        <p className="text-sm text-white/80 max-w-xs">
          This browser cannot show a PDF inside a window. Open it full screen, or save a copy.
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-xs bg-[#ff0000] hover:bg-[#cc0000] text-white font-semibold rounded-md py-3 px-4"
        >
          {pdfOpenLabel(src)}
        </a>
        <a
          href={src}
          download
          className="w-full max-w-xs border border-white/40 hover:bg-white/10 text-white font-semibold rounded-md py-3 px-4"
        >
          Download
        </a>
      </div>
    </div>
  )
}
