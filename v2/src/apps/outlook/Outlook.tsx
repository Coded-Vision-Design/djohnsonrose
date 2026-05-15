import { useRef, useState } from 'react'

const RECIPIENT = 'devante@johnson-rose.co.uk'
// Same starter copy as v1's outlookApp() so visitors see a populated draft
// instead of an empty form.
const DEFAULT_SUBJECT = 'Project Inquiry - Portfolio OS'
const DEFAULT_BODY =
  'Hi,\n\nI was browsing your portfolio and would like to get in touch regarding...'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function Outlook() {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [attachments, setAttachments] = useState<File[]>([])
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setAttachments((prev) => [...prev, ...Array.from(e.target.files!)])
    e.target.value = '' // allow re-adding the same file
  }

  const removeAttachment = (i: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i))
  }

  const send = async () => {
    if (!subject.trim() || !body.trim()) {
      setStatus('error')
      setStatusMsg('Subject and message are required.')
      return
    }
    setStatus('sending')
    setStatusMsg('Sending…')
    try {
      const form = new FormData()
      form.set('recipient', RECIPIENT)
      form.set('subject', subject)
      form.set('body', body)
      form.set('website_hp', honeypot) // honeypot — bots fill this in
      for (const f of attachments) form.append('attachments[]', f)

      const res = await fetch('/api/send_email.php', { method: 'POST', body: form })
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean
        message?: string
      }
      if (data.success) {
        setStatus('sent')
        setStatusMsg(data.message || 'Message sent.')
        setSubject(DEFAULT_SUBJECT)
        setBody(DEFAULT_BODY)
        setAttachments([])
      } else {
        setStatus('error')
        setStatusMsg(data.message || 'Send failed. Please try again.')
      }
    } catch {
      setStatus('error')
      setStatusMsg('Network error. Check your connection and try again.')
    }
  }

  const sendViaMailto = () => {
    const url = `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(url, '_blank')
  }

  const discard = () => {
    setSubject(DEFAULT_SUBJECT)
    setBody(DEFAULT_BODY)
    setAttachments([])
    setStatus('idle')
    setStatusMsg('')
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white">
      <div className="h-9 bg-[#0078d4] text-white flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-sm">Outlook</span>
          <div className="text-xs opacity-80 border-l border-white/20 pl-4">New message</div>
        </div>
      </div>

      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 space-x-2 shrink-0">
        <button
          type="button"
          onClick={send}
          disabled={status === 'sending'}
          className="flex items-center text-win-blue font-semibold text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded disabled:opacity-50"
        >
          <span className="mr-2">✈️</span> Send
        </button>
        <button
          type="button"
          onClick={sendViaMailto}
          className="flex items-center text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-white/5 px-3 py-1.5 rounded"
        >
          <span className="mr-2">📧</span> Send from personal mail
        </button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-800" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-white/5 px-3 py-1.5 rounded"
        >
          <span className="mr-2">📎</span> Attach
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFile}
        />
        <button
          type="button"
          onClick={discard}
          className="flex items-center text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-white/5 px-3 py-1.5 rounded"
        >
          <span className="mr-2">🗑️</span> Discard
        </button>
        {status !== 'idle' && (
          <div
            className={`ml-auto text-[11px] font-medium ${
              status === 'sent'
                ? 'text-emerald-600 dark:text-emerald-400'
                : status === 'error'
                  ? 'text-red-500'
                  : 'text-gray-500'
            }`}
            role="status"
          >
            {statusMsg}
          </div>
        )}
      </div>

      <div className="flex-grow p-6 space-y-4 overflow-y-auto">
        {/* Honeypot — hidden from real users, bots fill it. */}
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          name="website_hp"
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
        />

        <div className="flex items-center border-b border-gray-200 dark:border-gray-800 py-2">
          <label className="w-12 text-xs text-gray-500">To</label>
          <span className="bg-blue-50 dark:bg-blue-900/30 text-win-blue dark:text-blue-300 px-2 py-0.5 rounded-full text-xs border border-win-blue/20">
            {RECIPIENT}
          </span>
        </div>

        <div className="flex items-center border-b border-gray-200 dark:border-gray-800 py-2">
          <label htmlFor="subj" className="w-12 text-xs text-gray-500">
            Subject
          </label>
          <input
            id="subj"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-grow bg-transparent outline-none text-xs dark:text-white"
          />
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((f, i) => (
              <div
                key={i}
                className="flex items-center bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-[10px] border border-gray-200 dark:border-white/10 group"
              >
                <span className="mr-2">📄</span>
                <span className="max-w-[150px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="ml-2 text-red-500 opacity-60 hover:opacity-100"
                  aria-label="Remove attachment"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your message here..."
          className="w-full h-64 bg-transparent outline-none text-sm resize-none dark:text-white"
        />
      </div>
    </div>
  )
}
