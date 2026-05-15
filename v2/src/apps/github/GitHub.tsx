// GitHub repo page mockup. Recognizable layout (dark navbar, breadcrumb,
// Star/Watch/Fork bar, file tree, README pane, sidebar with language bar)
// but every "live" action defers to the real GitHub via window.open so
// nothing actually happens locally.

const REPO_URL = 'https://github.com/Coded-Vision-Design/djohnsonrose'
const OWNER = 'Coded-Vision-Design'
const REPO = 'djohnsonrose'

// Files mirror what's actually at the repo root, with the commit-summary
// text borrowed from real subjects so it reads truthfully on the page.
interface FileRow {
  name: string
  type: 'dir' | 'file'
  message: string
  age: string
}

const FILES: FileRow[] = [
  { name: '.github', type: 'dir', message: 'feat(v1): compile Tailwind locally + via CI', age: '4 hours ago' },
  { name: 'api', type: 'dir', message: 'feat(v1): port the Admin Console to v1', age: '2 hours ago' },
  { name: 'assets', type: 'dir', message: 'feat: cross-build Desktop shortcuts + telemetry parity', age: '12 minutes ago' },
  { name: 'data', type: 'dir', message: 'feat: bundle SA Landscape clip', age: '1 hour ago' },
  { name: 'partials', type: 'dir', message: 'feat(v1): port the Admin Console to v1', age: '2 hours ago' },
  { name: 'portfolio', type: 'dir', message: 'chore(portfolio): refresh all 14 site screenshots', age: '3 hours ago' },
  { name: 'scripts', type: 'dir', message: 'fix: hero capture + apostrophe escape', age: '30 minutes ago' },
  { name: 'v2', type: 'dir', message: 'fix(v2 mobile): tighten padding + stacking', age: '2 minutes ago' },
  { name: '.env.example', type: 'file', message: 'chore: sanitize .env.example', age: '10 minutes ago' },
  { name: '.gitattributes', type: 'file', message: 'fix: Linguist override (PHP not Hack)', age: '5 minutes ago' },
  { name: '.gitignore', type: 'file', message: 'chore: ignore Claude/hook config + .MOV originals', age: '5 minutes ago' },
  { name: '.htaccess', type: 'file', message: 'fix: serve /data/*.mp4 and .webm', age: '2 minutes ago' },
  { name: 'LICENSE', type: 'file', message: 'feat: LICENSE/SECURITY + GDPR cookie banner', age: '5 hours ago' },
  { name: 'README.md', type: 'file', message: 'docs: portfolio README + refresh llm.txt', age: '5 hours ago' },
  { name: 'SECURITY.md', type: 'file', message: 'feat: LICENSE/SECURITY + GDPR cookie banner', age: '5 hours ago' },
  { name: 'bootstrap.php', type: 'file', message: 'feat: Google OAuth admin console + analytics', age: '6 hours ago' },
  { name: 'config.php', type: 'file', message: 'feat: Google OAuth admin console + analytics', age: '6 hours ago' },
  { name: 'deploy-config.json', type: 'file', message: 'feat: CV-aligned Word/Explorer + References vault', age: '4 hours ago' },
  { name: 'dev-server.php', type: 'file', message: 'feat: restore-to-Desktop, classic context menu', age: '6 hours ago' },
  { name: 'favicon.ico', type: 'file', message: 'Initial commit with project config', age: '2 months ago' },
  { name: 'index.php', type: 'file', message: 'Initial commit with project config', age: '2 months ago' },
  { name: 'llm.txt', type: 'file', message: 'docs: portfolio README + refresh llm.txt', age: '5 hours ago' },
  { name: 'manifest.json', type: 'file', message: 'feat: restore-to-Desktop, classic context menu', age: '6 hours ago' },
  { name: 'package.json', type: 'file', message: 'chore(portfolio): refresh all 14 site screenshots', age: '3 hours ago' },
  { name: 'robots.txt', type: 'file', message: 'feat: restore-to-Desktop, classic context menu', age: '6 hours ago' },
  { name: 'router.php', type: 'file', message: 'Initial commit with project config', age: '2 months ago' },
  { name: 'sitemap.xml', type: 'file', message: 'feat: restore-to-Desktop, classic context menu', age: '6 hours ago' },
  { name: 'tailwind.config.js', type: 'file', message: 'Initial commit with project config', age: '2 months ago' },
]

const LANGUAGES = [
  { name: 'TypeScript', pct: 47.2, color: '#3178c6' },
  { name: 'PHP', pct: 31.6, color: '#4F5D95' },
  { name: 'JavaScript', pct: 19.4, color: '#f1e05a' },
  { name: 'CSS', pct: 1.5, color: '#563d7c' },
  { name: 'HTML', pct: 0.3, color: '#e34c26' },
]

function FolderIcon() {
  return (
    <svg className="w-4 h-4 text-[#54aeff]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1H13.75a1.75 1.75 0 0 1 1.75 1.75v9a1.75 1.75 0 0 1-1.75 1.75H2.25A1.75 1.75 0 0 1 .5 13.75V2.75c0-.464.184-.91.513-1.237Z" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg className="w-4 h-4 text-[#7d8590]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
    </svg>
  )
}

export default function GitHub() {
  const openExternal = (path = '') => {
    window.open(`${REPO_URL}${path}`, '_blank', 'noopener')
  }

  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-[#e6edf3] overflow-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Top nav bar */}
      <div className="shrink-0 bg-[#010409] border-b border-[#30363d] flex items-center px-3 sm:px-4 h-12 gap-4">
        <img src="/assets/img/github.webp" alt="" className="w-7 h-7 shrink-0" />
        <div className="flex items-center text-sm min-w-0 truncate">
          <a
            href={`https://github.com/${OWNER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2f81f7] hover:underline truncate"
          >
            {OWNER}
          </a>
          <span className="mx-1.5 opacity-60">/</span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline truncate"
          >
            {REPO}
          </a>
          <span className="ml-2 px-2 py-0.5 text-[10px] border border-[#30363d] rounded-full opacity-80 hidden sm:inline-block">
            Public
          </span>
        </div>
        <button
          type="button"
          onClick={() => openExternal()}
          className="ml-auto shrink-0 text-xs sm:text-[13px] bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1.5 rounded-md font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M0 1.75C0 .784.784 0 1.75 0h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Z" />
            <path d="M14.78 1.22a.75.75 0 0 1 0 1.06L8.06 9l5.72.001a.75.75 0 0 1 0 1.5H6.5a.75.75 0 0 1-.75-.75V2.219a.75.75 0 0 1 1.5 0v5.72l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
          </svg>
          <span className="hidden sm:inline">Open on GitHub</span>
          <span className="sm:hidden">Open</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 bg-[#0d1117] border-b border-[#30363d] flex items-center px-3 sm:px-4 overflow-x-auto">
        {[
          { label: 'Code', active: true },
          { label: 'Issues', count: 0 },
          { label: 'Pull requests', count: 0 },
          { label: 'Actions' },
          { label: 'Projects' },
          { label: 'Security' },
          { label: 'Insights' },
        ].map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => openExternal()}
            className={`flex items-center gap-2 px-3 py-2 text-[13px] whitespace-nowrap border-b-2 transition-colors ${
              t.active
                ? 'border-[#fd8c73] text-white font-semibold'
                : 'border-transparent text-[#e6edf3]/80 hover:text-white hover:border-[#30363d]'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span className="text-[11px] bg-[#30363d] rounded-full px-1.5 leading-4">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-grow overflow-auto">
        <div className="max-w-[1280px] mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-[1fr_296px] gap-4">
          {/* Main column */}
          <div className="min-w-0">
            {/* Star/Watch/Fork bar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => openExternal()}
                className="flex items-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[12px] px-3 py-1.5 rounded-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                </svg>
                Star
                <span className="ml-1 bg-[#0d1117] border border-[#30363d] px-1.5 leading-4 rounded-full text-[11px]">0</span>
              </button>
              <button
                type="button"
                onClick={() => openExternal()}
                className="flex items-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[12px] px-3 py-1.5 rounded-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.932 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z" />
                </svg>
                Watch
                <span className="ml-1 bg-[#0d1117] border border-[#30363d] px-1.5 leading-4 rounded-full text-[11px]">0</span>
              </button>
              <button
                type="button"
                onClick={() => openExternal('/fork')}
                className="flex items-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[12px] px-3 py-1.5 rounded-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
                </svg>
                Fork
                <span className="ml-1 bg-[#0d1117] border border-[#30363d] px-1.5 leading-4 rounded-full text-[11px]">0</span>
              </button>
            </div>

            {/* Branch / latest commit row */}
            <div className="flex items-center gap-2 mb-2 text-[12px] flex-wrap">
              <button
                type="button"
                onClick={() => openExternal('/branches')}
                className="flex items-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-3 py-1.5 rounded-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
                </svg>
                main
              </button>
              <span className="opacity-60">·</span>
              <span className="opacity-70">60 commits</span>
            </div>

            {/* File list */}
            <div className="border border-[#30363d] rounded-md overflow-hidden">
              <div className="bg-[#161b22] px-3 py-2 text-[12px] opacity-80 border-b border-[#30363d] flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2f81f7] to-[#a371f7] flex items-center justify-center text-[10px] font-bold">
                  CV
                </div>
                <span className="font-semibold">CodedVisionDesign</span>
                <span className="hidden sm:inline truncate opacity-80">
                  fix(v2 mobile): tighten padding + stacking in high-traffic apps
                </span>
                <span className="ml-auto shrink-0 opacity-70">2 minutes ago</span>
              </div>
              <div className="divide-y divide-[#21262d]">
                {FILES.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => openExternal(`/blob/main/${f.name}`)}
                    className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_2fr_auto] gap-3 items-center text-left px-3 py-1.5 text-[13px] hover:bg-[#0d1117]/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {f.type === 'dir' ? <FolderIcon /> : <FileIcon />}
                      <span className="truncate hover:underline">{f.name}</span>
                    </div>
                    <span className="hidden sm:block text-[12px] opacity-60 truncate">{f.message}</span>
                    <span className="text-[12px] opacity-60 whitespace-nowrap">{f.age}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* README */}
            <div className="mt-5 border border-[#30363d] rounded-md overflow-hidden">
              <div className="bg-[#161b22] px-4 py-2 text-[12px] flex items-center gap-2 border-b border-[#30363d]">
                <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Z" />
                </svg>
                <span className="font-semibold">README.md</span>
              </div>
              <div className="p-5 sm:p-8 text-[14px] leading-relaxed">
                <h1 className="text-2xl font-bold border-b border-[#30363d] pb-3 mb-4">
                  Portfolio OS — DeVanté Johnson-Rose
                </h1>
                <p className="mb-3">
                  A pixel-faithful Windows 11 desktop, in the browser, as a portfolio.
                </p>
                <p className="mb-4">
                  Live:{' '}
                  <a
                    href="https://devante.johnson-rose.co.uk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2f81f7] hover:underline"
                  >
                    https://devante.johnson-rose.co.uk
                  </a>
                </p>
                <p className="mb-4 opacity-90">
                  Two parallel builds of the same OS ship from the same repo and the same{' '}
                  <code className="bg-[#161b22] px-1 py-0.5 rounded text-[12px]">assets/</code>:
                </p>
                <table className="text-[13px] mb-4 border-collapse">
                  <thead>
                    <tr className="border-b border-[#30363d]">
                      <th className="text-left py-1 pr-6 font-semibold">Track</th>
                      <th className="text-left py-1 pr-6 font-semibold">Stack</th>
                      <th className="text-left py-1 font-semibold">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#21262d]">
                      <td className="py-1 pr-6">v1</td>
                      <td className="py-1 pr-6">PHP 8 · Alpine.js · Tailwind</td>
                      <td className="py-1">/</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-6">v2</td>
                      <td className="py-1 pr-6">React 19 · TypeScript · Vite · Zustand</td>
                      <td className="py-1">/v2/</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mb-4 opacity-90">
                  A toggle in each taskbar (or the Desktop shortcut on mobile) flips between the two
                  builds so visitors can compare the same product written two different ways.
                </p>
                <h2 className="text-xl font-bold border-b border-[#30363d] pb-2 mb-3 mt-6">
                  Why this exists
                </h2>
                <p className="mb-4 opacity-90">
                  Portfolios that link to other portfolios are forgettable. This one is the work: a
                  working desktop OS, 26 windowed apps in v2, an admin OAuth flow, a Chart.js
                  analytics dashboard, and a CI/CD pipeline that builds both tracks and rsyncs them
                  atomically.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openExternal('/blob/main/README.md')}
                    className="text-[12px] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-3 py-1.5 rounded-md"
                  >
                    View full README on GitHub →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-5 lg:max-w-[296px] min-w-0">
            <section>
              <h3 className="text-[14px] font-semibold mb-2">About</h3>
              <p className="text-[14px] opacity-80 mb-3">
                React + PHP twin builds of an interactive Windows-style portfolio OS. Live at{' '}
                <a
                  href="https://devante.johnson-rose.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2f81f7] hover:underline"
                >
                  devante.johnson-rose.co.uk
                </a>
                .
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {['portfolio', 'windows-11', 'react', 'php', 'typescript', 'alpinejs', 'tailwindcss'].map(
                  (t) => (
                    <span
                      key={t}
                      className="text-[11px] bg-[#1f6feb]/15 text-[#79c0ff] border border-[#388bfd]/30 rounded-full px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ),
                )}
              </div>
              <ul className="text-[13px] space-y-1.5 opacity-90">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M0 3.75A1.75 1.75 0 0 1 1.75 2h12.5C15.216 2 16 2.784 16 3.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25Z" />
                  </svg>
                  MIT licence
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="m0 9 8-7 8 7v6a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 15Z" opacity="0.2" />
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                  </svg>
                  0 stars
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14Z" />
                  </svg>
                  0 watchers
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 opacity-70" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25Z" />
                  </svg>
                  0 forks
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-[14px] font-semibold mb-2">Releases</h3>
              <p className="text-[13px] opacity-70">No releases published</p>
            </section>

            <section>
              <h3 className="text-[14px] font-semibold mb-2">Packages</h3>
              <p className="text-[13px] opacity-70">No packages published</p>
            </section>

            <section>
              <h3 className="text-[14px] font-semibold mb-2">Contributors</h3>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2f81f7] to-[#a371f7] flex items-center justify-center text-[11px] font-bold">
                  CV
                </div>
                <span className="text-[13px]">CodedVisionDesign</span>
              </div>
            </section>

            <section>
              <h3 className="text-[14px] font-semibold mb-2">Languages</h3>
              <div className="h-2 rounded-full overflow-hidden flex mb-2">
                {LANGUAGES.map((l) => (
                  <div key={l.name} style={{ width: `${l.pct}%`, background: l.color }} />
                ))}
              </div>
              <ul className="space-y-1 text-[12px]">
                {LANGUAGES.map((l) => (
                  <li key={l.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                    <span className="font-semibold">{l.name}</span>
                    <span className="opacity-70">{l.pct}%</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
