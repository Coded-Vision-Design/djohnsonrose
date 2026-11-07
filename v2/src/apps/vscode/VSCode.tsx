import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SOURCE_FILES,
  SOURCE_LANGUAGES,
  SOURCE_START,
  closeSourceTab,
  openSourceTab,
  renderSource,
  sourceFolders,
  sourceGroups,
  sourceLanguage,
  sourceRows,
  sourceUrl,
  type RenderedSource,
  type SourceTabs,
} from '../../../../assets/js/windowing/source-viewer.js'

// The same VS Code as v1's partials/apps/vscode.php: a read-only viewer of the
// site's own source. The explorer (a picker on phones) lists the files in
// source-viewer.js, and each opens in a tab, fetched from the site the way any
// visitor's browser already fetches it. Styles are in assets/css/windowing.css.

type Loaded = { status: 'error' } | ({ status: 'ready' } & RenderedSource)

const fileName = (path: string) => path.split('/').pop() ?? path
const badge = (path: string) => SOURCE_LANGUAGES[sourceLanguage(path)].badge
const groups = sourceGroups()

const ICONS = [
  'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8L19.2 7.5 12 11.1 4.8 7.5 12 4.8zm-7.2 5.1l6.2 3.1v6.2l-6.2-3.1v-6.2zm8.2 9.3v-6.2l6.2-3.1v6.2l-6.2 3.1z',
  'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
]

export default function VSCode() {
  const [tabs, setTabs] = useState<SourceTabs>({ tabs: [SOURCE_START], active: SOURCE_START })
  const [expanded, setExpanded] = useState<string[]>(() => sourceFolders(SOURCE_START))
  const [files, setFiles] = useState<Record<string, Loaded>>({})
  const pending = useRef(new Set<string>())

  const active = tabs.active
  const view = active ? files[active] : undefined
  const rows = useMemo(() => sourceRows(SOURCE_FILES, expanded), [expanded])

  // Fetches the open file once. Only listed files have a URL at all.
  useEffect(() => {
    const url = active ? sourceUrl('/', active) : null
    if (!active || !url || files[active] || pending.current.has(active)) return
    pending.current.add(active)
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => setFiles((all) => ({ ...all, [active]: { status: 'ready', ...renderSource(text, active) } })))
      .catch(() => setFiles((all) => ({ ...all, [active]: { status: 'error' } })))
      .finally(() => pending.current.delete(active))
  }, [active, files])

  const open = (path: string) => {
    setTabs((state) => openSourceTab(state, path))
    setExpanded((open) => [...new Set([...open, ...sourceFolders(path)])])
  }
  const close = (path: string) => setTabs((state) => closeSourceTab(state, path))
  const toggle = (path: string) =>
    setExpanded((open) => (open.includes(path) ? open.filter((folder) => folder !== path) : [...open, path]))
  const retry = () =>
    setFiles((all) => {
      const rest = { ...all }
      if (active) delete rest[active]
      return rest
    })

  return (
    <div className="vsc" data-vscode>
      <div className="vsc-activity" aria-hidden="true">
        {ICONS.map((d) => (
          <span key={d}>
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d={d} />
            </svg>
          </span>
        ))}
      </div>

      <nav className="vsc-explorer" aria-label="Explorer">
        <h2 className="vsc-explorer-title">Explorer</h2>
        <ul className="vsc-tree" data-vscode-tree>
          {rows.map((row) => (
            <li key={row.path}>
              {row.kind === 'folder' ? (
                <button
                  type="button"
                  className="vsc-tree-row"
                  data-depth={row.depth}
                  data-source-folder={row.path}
                  aria-expanded={row.open}
                  onClick={() => toggle(row.path)}
                >
                  <span className="vsc-chevron" aria-hidden="true">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                  </span>
                  <span className="vsc-name">{row.name}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="vsc-tree-row"
                  data-depth={row.depth}
                  data-source-file={row.path}
                  aria-current={row.path === active ? 'true' : undefined}
                  onClick={() => open(row.path)}
                >
                  <span className="vsc-chevron" aria-hidden="true"></span>
                  <span className="vsc-badge" data-lang={sourceLanguage(row.path)} aria-hidden="true">
                    {badge(row.path)}
                  </span>
                  <span className="vsc-name">{row.name}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="vsc-main">
        <label className="vsc-picker">
          <span>File</span>
          <select aria-label="File" value={active ?? ''} onChange={(e) => e.target.value && open(e.target.value)}>
            <option value="" disabled>
              Choose a file
            </option>
            {groups.map((group) => (
              <optgroup key={group.folder} label={group.folder}>
                {group.files.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="vsc-tabs" data-vscode-tabs>
          {tabs.tabs.map((path) => (
            <div key={path} className="vsc-tab" data-active={path === active ? 'true' : undefined} data-source-tab={path}>
              <button
                type="button"
                className="vsc-tab-open"
                aria-current={path === active ? 'true' : undefined}
                title={path}
                onClick={() => open(path)}
              >
                <span className="vsc-badge" data-lang={sourceLanguage(path)} aria-hidden="true">
                  {badge(path)}
                </span>
                <span className="vsc-name">{fileName(path)}</span>
              </button>
              <button type="button" className="vsc-tab-close" aria-label={`Close ${fileName(path)}`} onClick={() => close(path)}>
                <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {active && <p className="vsc-crumbs">{active.split('/').join(' › ')}</p>}

        {view?.status === 'ready' ? (
          <div className="vsc-editor" tabIndex={0} role="region" aria-label={`${fileName(active!)}, read-only`} data-vscode-editor>
            <pre className="vsc-code">
              <code dangerouslySetInnerHTML={{ __html: view.html }} />
            </pre>
          </div>
        ) : (
          <div className="vsc-message" data-vscode-message>
            {!active && <p>Choose a file to read the source of this site.</p>}
            {active && !view && <p>Loading {fileName(active)}...</p>}
            {active && view?.status === 'error' && (
              <>
                <p>Could not load {fileName(active)}.</p>
                <button type="button" onClick={retry}>
                  Try again
                </button>
              </>
            )}
          </div>
        )}

        <div className="vsc-status" data-vscode-status>
          <div>
            <span>Read-only</span>
          </div>
          {view?.status === 'ready' && (
            <div>
              <span>{view.lines} lines</span>
              <span>UTF-8</span>
              <span>{view.languageName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
