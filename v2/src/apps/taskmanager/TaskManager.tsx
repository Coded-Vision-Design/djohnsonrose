import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useOsStore } from '../../store/osStore'
import { getApp } from '../registry'
import {
  TASK_MANAGER_TABS,
  TONE_COLOURS,
  buildView,
  jsHeap,
  loadBuildInfo,
  processRows,
  startVitals,
  summariseDownloads,
  tabAfterKey,
  vitalCards,
  windowCountText,
  type BuildInfoResult,
  type ResourceLike,
  type TaskManagerTab,
} from '../../../../assets/js/windowing/metrics.js'

// Task Manager shows only what the page can vouch for: the store's windows,
// the browser's Web Vitals, downloads and heap, and the deploy's build.json.
// The same markup as partials/apps/taskmanager.php, styled by taskmanager.css.

const TICK_MS = 1000

/** What the browser says right now. */
function readPage() {
  const reading = startVitals().read()
  const entries = performance.getEntriesByType('resource') as ResourceLike[]
  const navigation = (performance.getEntriesByType('navigation')[0] as ResourceLike | undefined) ?? null
  return {
    entries,
    vitals: vitalCards(reading),
    downloads: summariseDownloads(entries, { navigation, full: reading.resourcesFull }),
    heap: jsHeap(performance as Parameters<typeof jsHeap>[0]),
  }
}

const badge = (colour: string) => ({ '--tm-badge': colour }) as CSSProperties

export default function TaskManager() {
  const windows = useOsStore((s) => s.windows)
  const closeWindow = useOsStore((s) => s.closeWindow)
  const uid = useId()
  const [tab, setTab] = useState<TaskManagerTab>('processes')
  const [page, setPage] = useState(readPage)
  const [build, setBuild] = useState<BuildInfoResult | null>(null)
  const buildRequest = useRef<Promise<BuildInfoResult> | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const id = window.setInterval(() => setPage(readPage()), TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  // build.json is read the first time the Build tab opens.
  useEffect(() => {
    if (tab !== 'build') return
    buildRequest.current ??= loadBuildInfo()
    let live = true
    void buildRequest.current.then((result) => {
      if (live) setBuild(result)
    })
    return () => {
      live = false
    }
  }, [tab])

  const onTabKey = (event: KeyboardEvent, index: number) => {
    const next = tabAfterKey(event.key, index, TASK_MANAGER_TABS.length)
    if (next === null) return
    event.preventDefault()
    setTab(TASK_MANAGER_TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  const rows = processRows(windows, page.entries)
  const info = buildView(build)
  const panelProps = (id: TaskManagerTab) => ({
    className: 'tm-panel',
    role: 'tabpanel',
    id: `${uid}-${id}`,
    'aria-labelledby': `${uid}-tab-${id}`,
    'data-tm-panel': id,
    tabIndex: 0,
    hidden: tab !== id,
  })

  return (
    <div className="tm" data-task-manager="">
      <div className="tm-head">
        <img src="/assets/img/taskmanager.webp" alt="" className="tm-head-icon" />
        <h1 className="tm-title">Task Manager</h1>
      </div>

      <div className="tm-tabs" role="tablist" aria-label="Task Manager views">
        {TASK_MANAGER_TABS.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            type="button"
            role="tab"
            className="tm-tab"
            id={`${uid}-tab-${item.id}`}
            aria-controls={`${uid}-${item.id}`}
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            data-tm-tab={item.id}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => onTabKey(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="tm-body">
        <section {...panelProps('processes')}>
          <table className="tm-table tm-processes" role="table">
            <caption className="tm-sr-only">Open windows</caption>
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">Name</th>
                <th role="columnheader" scope="col" className="tm-col-status">Status</th>
                <th role="columnheader" scope="col" className="tm-col-files">Own files</th>
                <th role="columnheader" scope="col" className="tm-col-actions">
                  <span className="tm-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {rows.map((row) => (
                <tr key={row.id} role="row" className="tm-row" data-tm-process={row.id}>
                  <td role="cell" className="tm-cell-name">
                    <span className="tm-name">
                      <img src={getApp(row.app)?.icon ?? '/assets/img/win11/taskmgr.webp'} alt="" className="tm-icon" />
                      <span className="tm-name-text" data-tm-name="">{row.title}</span>
                    </span>
                  </td>
                  <td role="cell" className="tm-cell-status" data-tm-status="">{row.status}</td>
                  <td role="cell" className="tm-cell-files" data-tm-files="">{row.files}</td>
                  <td role="cell" className="tm-cell-actions">
                    <button type="button" className="tm-end" aria-label={`End task: ${row.title}`} onClick={() => closeWindow(row.id)}>
                      End task
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {page.heap && (
            <div className="tm-heap" data-tm-heap="">
              <h2 className="tm-heading">Page JS heap</h2>
              <p className="tm-heap-value" data-tm-heap-value="">{page.heap.text}</p>
              <p className="tm-note">This page's JavaScript memory as Chromium reports it, rounded by the browser.</p>
            </div>
          )}
          <p className="tm-note">
            Own files are the downloads named for an app, such as its code or its page. Shared code and pictures are not counted.
          </p>
        </section>

        <section {...panelProps('performance')}>
          <h2 className="tm-heading">Web Vitals for this page load</h2>
          <ul className="tm-vitals">
            {page.vitals.map((card) => (
              <li key={card.id} className="tm-vital" data-tm-vital={card.id} data-state={card.state}>
                <span className="tm-vital-name">
                  {card.name} ({card.id})
                </span>
                <span className="tm-vital-row">
                  <span className="tm-vital-value" data-tm-value="">{card.value}</span>
                  {card.colour && (
                    <span className="tm-badge" data-tm-rating={card.rating} style={badge(card.colour)}>
                      {card.ratingLabel}
                    </span>
                  )}
                </span>
                <span className="tm-vital-scale" data-tm-scale="">{card.scale}</span>
                <span className="tm-vital-note">{card.note}</span>
              </li>
            ))}
          </ul>

          <h2 className="tm-heading">What this page downloaded</h2>
          <table className="tm-table tm-downloads">
            <caption className="tm-sr-only">Downloads by type</caption>
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col" className="tm-num">Requests</th>
                <th scope="col" className="tm-num">Transferred</th>
                <th scope="col" className="tm-num">Size</th>
              </tr>
            </thead>
            <tbody>
              {page.downloads.groups.map((group) => (
                <tr key={group.id} data-tm-group={group.id}>
                  <th scope="row">{group.label}</th>
                  <td className="tm-num" data-tm-requests="">{group.requests}</td>
                  <td className="tm-num" data-tm-transferred="">{group.transferredText}</td>
                  <td className="tm-num" data-tm-size="">{group.sizeText}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr data-tm-group="total">
                <th scope="row">Total</th>
                <td className="tm-num" data-tm-requests="">{page.downloads.total.requests}</td>
                <td className="tm-num" data-tm-transferred="">{page.downloads.total.transferredText}</td>
                <td className="tm-num" data-tm-size="">{page.downloads.total.sizeText}</td>
              </tr>
            </tfoot>
          </table>
          <p className="tm-note">Transferred is what came over the network, headers included. Size is the files once unpacked.</p>

          <h3 className="tm-subheading">Largest files</h3>
          <ol className="tm-largest">
            {page.downloads.largest.map((file, index) => (
              <li key={`${index}-${file.url}`} className="tm-file" data-tm-file="" data-tm-url={file.url}>
                <span className="tm-file-name" title={file.name}>{file.name}</span>
                <span className="tm-file-group">{file.groupLabel}</span>
                <span className="tm-file-size">
                  <span data-tm-file-size="">{file.sizeText}</span>
                  {file.cached && <span className="tm-file-cache"> (from cache)</span>}
                </span>
              </li>
            ))}
          </ol>
          {page.downloads.notes.map((note) => (
            <p key={note.id} className="tm-note" data-tm-note={note.id}>
              {note.text}
            </p>
          ))}
        </section>

        <section {...panelProps('build')}>
          <h2 className="tm-heading" data-tm-build-state={info.state}>{info.title}</h2>
          {info.message && <p className="tm-text">{info.message}</p>}
          {info.state === 'deployed' && (
            <div>
              <dl className="tm-build">
                <div>
                  <dt>Commit</dt>
                  <dd><code data-tm-commit="">{info.commit}</code></dd>
                </div>
                <div>
                  <dt>Deployed</dt>
                  <dd data-tm-deployed="">{info.deployed}</dd>
                </div>
              </dl>
              <h3 className="tm-subheading" data-tm-checks-title="">{info.checksTitle}</h3>
              <p className="tm-text" data-tm-checks-summary="">{info.checksMessage}</p>
              {info.checks.length > 0 && (
                <ul className="tm-checks">
                  {info.checks.map((check, index) => (
                    <li key={`${index}-${check.name}`} className="tm-check" data-tm-check="">
                      <span className="tm-check-name" data-tm-check-name="">{check.name}</span>
                      <span className="tm-badge" data-tm-tone={check.tone} style={badge(TONE_COLOURS[check.tone])}>
                        {check.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="tm-foot">
        <span data-tm-count="">{windowCountText(windows.length)}</span>
        <span>Measured in this browser</span>
      </div>
    </div>
  )
}
