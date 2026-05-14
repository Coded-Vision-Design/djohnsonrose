import { useWindowExtras } from '../../windowing/WindowContext'

// Phase 5 light port: native browser PDF viewer in an iframe. The PDF URL
// is passed through window extras, defaulting to the CV.
export default function PdfReader() {
  const { pdfUrl } = useWindowExtras<{ pdfUrl?: string }>()
  const src = pdfUrl ?? '/data/cv.pdf'

  return (
    <div className="h-full flex flex-col bg-[#2b2b2b] text-white">
      <div className="h-9 bg-[#1f1f1f] flex items-center px-3 shrink-0 text-xs border-b border-white/10">
        <img src="/assets/img/pdf.webp" alt="" className="w-4 h-4 mr-2" />
        <span className="truncate">{src.split('/').pop() ?? 'Document.pdf'}</span>
        <a
          href={src}
          download
          className="ml-auto px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px]"
        >
          Download
        </a>
      </div>
      <iframe
        src={`${src}#toolbar=1&navpanes=0`}
        title="PDF viewer"
        className="flex-grow bg-[#525659]"
      />
    </div>
  )
}
