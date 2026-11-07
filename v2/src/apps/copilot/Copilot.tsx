import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useOsStore } from '../../store/osStore'
import { openEntry } from '../../shell/openEntry'
import {
  JOB_MAX,
  MISSING_SOURCE,
  QUESTION_MAX,
  SUGGESTED_QUESTIONS,
  askCopilot,
  chatBody,
  citationHint,
  citationHref,
  citationKindLabel,
  copilotStatus,
  countLabel,
  jobProblem,
  matchBody,
  matchCountsText,
  openCitation,
  printTailoredCv,
  questionProblem,
  saveTailoredCv,
  strengthLabel,
  copilotTabAfterKey,
  tailoredCvHtml,
  watchCvFrame,
  type ChatTurn,
  type Citation,
  type CopilotTab,
  type MatchReply,
} from '../../../../assets/js/windowing/copilot.js'

// Copilot: questions about DeVanté answered from the site's own data, and a
// job description matched against his CV. The same as v1's
// partials/apps/copilot.php; what the two share is in
// assets/js/windowing/copilot.js, the server is api/copilot.php, and the
// styles are the Copilot section of assets/css/windowing.css.

// /cv and /privacy sit at the site root, outside v2's /v2/ base.
const BASE = '/'
const ICON = '/assets/img/copilot.webp'

interface Message extends ChatTurn {
  id: number
  citations?: Citation[]
  covered?: boolean
  grounded?: boolean
}

type Status = 'checking' | 'on' | 'off' | 'unknown'

const failure = (error: unknown) => error as { code?: string; message: string }

/** The sources for one answer, requirement or summary, as v1 writes them with its $citations. */
function Citations({ list, onOpen }: { list: Citation[]; onOpen: (citation: Citation) => void }) {
  return (
    <ul className="copilot-citations">
      {list.map((c) => {
        const href = citationHref(c, BASE)
        const label = (
          <>
            <span className="copilot-citation-kind">{citationKindLabel(c)}</span>
            <span>{c.title}</span>
            <span className="copilot-visually-hidden">{` (${citationHint(c)})`}</span>
          </>
        )
        return (
          <li key={c.id}>
            {href ? (
              <a className="copilot-citation" href={href} target="_blank" rel="noopener" data-citation={c.id} title={citationHint(c)}>
                {label}
              </a>
            ) : (
              <button type="button" className="copilot-citation" onClick={() => onOpen(c)} data-citation={c.id} title={citationHint(c)}>
                {label}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function Copilot() {
  const [status, setStatus] = useState<Status>('checking')
  const [tab, setTab] = useState<CopilotTab>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [job, setJob] = useState('')
  const [matching, setMatching] = useState(false)
  const [matchError, setMatchError] = useState('')
  const [match, setMatch] = useState<MatchReply | null>(null)
  const [notice, setNotice] = useState('')
  const nextId = useRef(1)
  const logRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const tabRefs = { chat: useRef<HTMLButtonElement>(null), match: useRef<HTMLButtonElement>(null) }
  const cvHtml = match ? tailoredCvHtml(match.cv) : ''

  useEffect(() => {
    let live = true
    copilotStatus().then((found) => {
      // A question may already have found it switched off.
      if (live) setStatus((current) => (current === 'checking' ? found : current))
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, asking])

  // Screen readers and the eye both land on the results.
  useEffect(() => {
    if (match) resultsRef.current?.focus()
  }, [match])

  useEffect(() => watchCvFrame(frameRef.current), [cvHtml])

  const say = (role: Message['role'], text: string, extra: Partial<Message> = {}) =>
    setMessages((list) => [...list, { id: nextId.current++, role, text, ...extra }])

  const ask = async (text = question) => {
    if (asking || questionProblem(text)) return
    const body = chatBody(text, messages)
    say('user', body.question)
    setQuestion('')
    setNotice('')
    setAsking(true)
    try {
      const reply = await askCopilot(body, { basePath: BASE })
      say('assistant', reply.answer, { citations: reply.citations, covered: reply.covered, grounded: reply.grounded })
    } catch (error) {
      if (failure(error).code === 'off') setStatus('off')
      say('error', failure(error).message)
    } finally {
      setAsking(false)
    }
  }

  const runMatch = async () => {
    if (matching) return
    const problem = jobProblem(job)
    setMatchError(problem)
    if (problem) return
    setMatching(true)
    setNotice('')
    try {
      setMatch(await askCopilot(matchBody(job), { basePath: BASE }))
    } catch (error) {
      if (failure(error).code === 'off') setStatus('off')
      setMatchError(failure(error).message)
    } finally {
      setMatching(false)
    }
  }

  const open = (citation: Citation) => {
    const { fileSystem, openApp } = useOsStore.getState()
    const opened = openCitation(citation, {
      fileSystem,
      openEntry,
      openApp: (app) => openApp(app),
      openUrl: (href) => window.open(href, '_blank', 'noopener'),
      basePath: BASE,
    })
    setNotice(opened ? '' : MISSING_SOURCE)
  }

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = copilotTabAfterKey(tab, event.key)
    if (!next) return
    event.preventDefault()
    event.stopPropagation()
    setTab(next)
    tabRefs[next].current?.focus()
  }

  const printCv = () => {
    if (!printTailoredCv(frameRef.current)) setNotice('The tailored CV is not ready to print yet.')
  }

  const downloadCv = () => {
    if (match) setNotice(`Saved ${saveTailoredCv(match.cv)}.`)
  }

  const asked = messages.some((m) => m.role === 'user')

  const tabButton = (id: CopilotTab, label: string) => (
    <button
      type="button"
      role="tab"
      id={`copilot-tab-${id}`}
      className="copilot-tab"
      aria-controls={`copilot-panel-${id}`}
      aria-selected={tab === id ? 'true' : 'false'}
      tabIndex={tab === id ? 0 : -1}
      onClick={() => setTab(id)}
      data-copilot-tab={id}
      ref={tabRefs[id]}
    >
      {label}
    </button>
  )

  return (
    <div className="copilot" data-copilot>
      <header className="copilot-header">
        <img src={ICON} alt="" className="copilot-logo" width={32} height={32} />
        <div>
          <h1 className="copilot-title">Copilot</h1>
          <p className="copilot-subtitle">Answers from DeVanté's CV, with sources</p>
        </div>
      </header>

      {status === 'checking' && (
        <p className="copilot-loading" role="status">
          Starting Copilot…
        </p>
      )}

      {status === 'off' && (
        <div className="copilot-off" data-copilot-off>
          <img src={ICON} alt="" className="copilot-off-logo" width={64} height={64} />
          <h2 className="copilot-off-title">Copilot is not switched on yet</h2>
          <p>
            Once it is, Copilot will answer questions about DeVanté's work and match job descriptions against his CV, showing where each answer comes from. Until then, the CV has everything it would draw on.
          </p>
          <a className="copilot-button copilot-button-primary" href={`${BASE}cv`} target="_blank" rel="noopener">
            Read the CV<span className="copilot-visually-hidden"> (opens in a new tab)</span>
          </a>
        </div>
      )}

      {(status === 'on' || status === 'unknown') && (
        <div className="copilot-panel">
          <div className="copilot-tabs" role="tablist" aria-label="Copilot" onKeyDown={onTabKey}>
            {tabButton('chat', 'Chat')}
            {tabButton('match', 'Job match')}
          </div>
          <p className="copilot-notice" role="status" aria-live="polite" data-copilot-notice>
            {notice}
          </p>

          <section className="copilot-panel" id="copilot-panel-chat" role="tabpanel" aria-labelledby="copilot-tab-chat" hidden={tab !== 'chat'}>
            <div className="copilot-log" role="log" aria-label="Conversation" data-copilot-log ref={logRef}>
              <div className="copilot-message copilot-message-assistant" data-copilot-message="assistant">
                <p className="copilot-message-text">
                  Hello. Ask me about DeVanté's experience, skills, projects or certificates. I answer only from this site's own data, and show where each answer comes from.
                </p>
              </div>
              {messages.map((m) => (
                <div key={m.id} className={`copilot-message copilot-message-${m.role}`} data-copilot-message={m.role}>
                  <p className="copilot-message-text">{m.text}</p>
                  {m.role === 'assistant' && m.covered && !m.grounded && (
                    <p className="copilot-note" data-copilot-ungrounded>
                      No source could be checked for this answer, so treat it with care.
                    </p>
                  )}
                  {m.citations && m.citations.length > 0 && (
                    <div className="copilot-sources">
                      <p className="copilot-sources-title">Sources</p>
                      <Citations list={m.citations} onOpen={open} />
                    </div>
                  )}
                </div>
              ))}
              {asking && <div className="copilot-message copilot-message-assistant copilot-thinking">Copilot is thinking…</div>}
            </div>
            {!asked && (
              <div className="copilot-suggestions" role="group" aria-label="Suggested questions">
                {SUGGESTED_QUESTIONS.map((s) => (
                  <button key={s} type="button" className="copilot-suggestion" data-copilot-suggestion onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <form
              className="copilot-composer"
              onSubmit={(event) => {
                event.preventDefault()
                ask()
              }}
            >
              <label htmlFor="copilot-question" className="copilot-visually-hidden">
                Ask Copilot about DeVanté
              </label>
              <textarea
                id="copilot-question"
                className="copilot-field"
                rows={2}
                maxLength={QUESTION_MAX}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask about his experience, skills or projects"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    ask()
                  }
                }}
              />
              <div className="copilot-bar">
                <span className="copilot-count" data-copilot-count>
                  {countLabel(question, QUESTION_MAX)}
                </span>
                <button type="submit" className="copilot-button copilot-button-primary" disabled={asking || !question.trim()}>
                  Send
                </button>
              </div>
            </form>
            <p className="copilot-disclaimer">
              Copilot uses Claude, by Anthropic, and answers only from this site's data. Check the sources.{' '}
              <a href={`${BASE}privacy#copilot`} target="_blank" rel="noopener">
                How your questions are handled
              </a>
            </p>
          </section>

          <section className="copilot-panel" id="copilot-panel-match" role="tabpanel" aria-labelledby="copilot-tab-match" hidden={tab !== 'match'}>
            <div className="copilot-scroll">
              <form
                className="copilot-job"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  runMatch()
                }}
              >
                <label htmlFor="copilot-job" className="copilot-label">
                  Paste a job description
                </label>
                <p className="copilot-subtitle" id="copilot-job-help">
                  Copilot maps each requirement to evidence in the CV, says plainly what is missing, and builds a CV chosen and ordered for the job.
                </p>
                <textarea
                  id="copilot-job"
                  className="copilot-field copilot-field-job"
                  rows={8}
                  maxLength={JOB_MAX}
                  value={job}
                  onChange={(event) => setJob(event.target.value)}
                  aria-describedby="copilot-job-help"
                />
                <div className="copilot-bar">
                  <span className="copilot-count" data-copilot-count>
                    {countLabel(job, JOB_MAX)}
                  </span>
                  <button type="submit" className="copilot-button copilot-button-primary" disabled={matching}>
                    Match
                  </button>
                </div>
              </form>
              {matchError && (
                <p className="copilot-error" role="alert" data-copilot-match-error>
                  {matchError}
                </p>
              )}
              {matching && (
                <p className="copilot-thinking" role="status">
                  Copilot is reading the job description…
                </p>
              )}
              {match && (
                <div className="copilot-results" data-copilot-results tabIndex={-1} ref={resultsRef}>
                  <h2 className="copilot-heading">How the CV matches</h2>
                  <p className="copilot-counts" data-copilot-counts>
                    {matchCountsText(match.requirements)}
                  </p>
                  {match.summary && (
                    <aside className="copilot-generated" data-copilot-summary aria-label="Generated summary">
                      <p className="copilot-generated-label">Generated by Copilot</p>
                      <p>{match.summary.text}</p>
                      <Citations list={match.summary.citations} onOpen={open} />
                    </aside>
                  )}
                  <table className="copilot-table" data-copilot-table>
                    <caption className="copilot-visually-hidden">Each requirement in the job description, with its evidence in the CV</caption>
                    <thead>
                      <tr>
                        <th scope="col">Requirement</th>
                        <th scope="col">Strength</th>
                        <th scope="col">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.requirements.map((r, i) => (
                        <tr key={i}>
                          <th scope="row">{r.requirement}</th>
                          <td>
                            <span className="copilot-strength" data-strength={r.strength}>
                              {strengthLabel(r.strength)}
                            </span>
                          </td>
                          <td>
                            <p>{r.note}</p>
                            {r.citations.length > 0 && <Citations list={r.citations} onOpen={open} />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <h3 className="copilot-subheading">Gaps</h3>
                  {match.gaps.length > 0 ? (
                    <ul className="copilot-gaps" data-copilot-gaps>
                      {match.gaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Copilot found no gaps between this job and the CV.</p>
                  )}
                  <h2 className="copilot-heading">Tailored CV</h2>
                  <p className="copilot-subtitle">
                    Chosen and ordered from the CV for this job, with the matched skills highlighted. Only a summary marked as generated is new text.
                  </p>
                  <div className="copilot-cv-actions">
                    <button type="button" className="copilot-button copilot-button-primary" onClick={printCv}>
                      Print<span className="copilot-visually-hidden"> the tailored CV</span>
                    </button>
                    <button type="button" className="copilot-button" onClick={downloadCv}>
                      Download<span className="copilot-visually-hidden"> the tailored CV</span>
                    </button>
                  </div>
                  <iframe
                    className="copilot-cv-frame"
                    title="Tailored CV preview"
                    sandbox="allow-same-origin allow-modals"
                    srcDoc={cvHtml}
                    ref={frameRef}
                    data-copilot-cv
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
