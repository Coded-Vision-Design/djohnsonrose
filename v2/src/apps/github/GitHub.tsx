import profile from '../../../../data/profile.json'
import repository from '../../../../data/github.json'

// GitHub repo page mockup, the same as v1's partials/apps/github.php: dark
// navbar, breadcrumb, Star/Watch/Fork bar, file list, README pane and a sidebar
// with the language bar. It shows this site's repository with DeVanté as its
// owner and, at his request, names no GitHub account and links nowhere on
// github.com, so nothing in it is a control. The repository's files, last
// commits and languages are in data/github.json, which v1 reads too.

const LIVE_URL = 'https://devante.johnson-rose.co.uk'

const ICONS = {
  folder:
    'M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1H13.75a1.75 1.75 0 0 1 1.75 1.75v9a1.75 1.75 0 0 1-1.75 1.75H2.25A1.75 1.75 0 0 1 .5 13.75V2.75c0-.464.184-.91.513-1.237Z',
  file: 'M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z',
  star: 'M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z',
  eye: 'M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.932 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z',
  fork: 'M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z',
  branch:
    'M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z',
  book: 'M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Z',
  licence: 'M0 3.75A1.75 1.75 0 0 1 1.75 2h12.5C15.216 2 16 2.784 16 3.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25Z',
} as const

function Icon({ path, className = 'w-4 h-4' }: { path: keyof typeof ICONS; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d={ICONS[path]} />
    </svg>
  )
}

const TABS = [
  { label: 'Code', active: true },
  { label: 'Issues', count: 0 },
  { label: 'Pull requests', count: 0 },
  { label: 'Actions' },
  { label: 'Projects' },
  { label: 'Security' },
  { label: 'Insights' },
]

const COUNTERS = [
  { icon: 'star', label: 'Star' },
  { icon: 'eye', label: 'Watch' },
  { icon: 'fork', label: 'Fork' },
] as const

const STATS = [
  { icon: 'licence', label: 'MIT licence' },
  { icon: 'star', label: '0 stars' },
  { icon: 'eye', label: '0 watchers' },
  { icon: 'fork', label: '0 forks' },
] as const

function LiveLink({ children }: { children: string }) {
  return (
    <a href={LIVE_URL} target="_blank" rel="noopener noreferrer" className="text-[#2f81f7] hover:underline">
      {children}
    </a>
  )
}

export default function GitHub() {
  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-[#e6edf3] overflow-hidden" data-github-app style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Top nav bar */}
      <div className="shrink-0 bg-[#010409] border-b border-[#30363d] flex items-center px-3 sm:px-4 h-12 gap-4">
        <img src="/assets/img/github.webp" alt="" className="w-7 h-7 shrink-0" />
        <div className="flex items-center text-sm min-w-0">
          <span className="text-[#2f81f7] truncate" data-github-owner>{profile.name}</span>
          <span className="mx-1.5 opacity-60">/</span>
          <span className="font-semibold truncate" data-github-repo>{repository.repo}</span>
          <span className="ml-2 px-2 py-0.5 text-[10px] border border-[#30363d] rounded-full opacity-80 hidden sm:inline-block">Public</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 bg-[#0d1117] border-b border-[#30363d] flex items-center px-3 sm:px-4 overflow-hidden">
        {TABS.map((tab) => (
          <span
            key={tab.label}
            className={`flex items-center gap-2 px-3 py-2 text-[13px] whitespace-nowrap border-b-2 ${
              tab.active ? 'border-[#fd8c73] text-white font-semibold' : 'border-transparent text-[#e6edf3]/80'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' && <span className="text-[11px] bg-[#30363d] rounded-full px-1.5 leading-4">{tab.count}</span>}
          </span>
        ))}
      </div>

      {/* Body */}
      <div className="grow overflow-auto">
        <div className="max-w-[1280px] mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-[1fr_296px] gap-4">
          {/* Main column */}
          <div className="min-w-0">
            {/* Star/Watch/Fork bar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {COUNTERS.map((counter) => (
                <span key={counter.label} className="flex items-center gap-1.5 bg-[#21262d] border border-[#30363d] text-[12px] px-3 py-1.5 rounded-md">
                  <Icon path={counter.icon} />
                  {counter.label}
                  <span className="ml-1 bg-[#0d1117] border border-[#30363d] px-1.5 leading-4 rounded-full text-[11px]">0</span>
                </span>
              ))}
            </div>

            {/* Branch and commit count */}
            <div className="flex items-center gap-2 mb-2 text-[12px] flex-wrap">
              <span className="flex items-center gap-1.5 bg-[#21262d] border border-[#30363d] px-3 py-1.5 rounded-md">
                <Icon path="branch" />
                main
              </span>
              <span className="opacity-60">·</span>
              <span className="opacity-70">{repository.commits} commits</span>
            </div>

            {/* File list, under the latest commit */}
            <div className="border border-[#30363d] rounded-md overflow-hidden">
              <div className="bg-[#161b22] px-3 py-2 text-[12px] border-b border-[#30363d] flex items-center gap-2" data-github-commit>
                <img src="/assets/img/profile.webp" alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                <span className="font-semibold shrink-0">{profile.name}</span>
                <span className="hidden sm:inline truncate opacity-80">{repository.latestCommit.message}</span>
                <span className="ml-auto shrink-0 opacity-70">{repository.latestCommit.age}</span>
              </div>
              <ul className="divide-y divide-[#21262d]">
                {repository.files.map((file) => (
                  <li
                    key={file.name}
                    className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_2fr_auto] gap-3 items-center px-3 py-1.5 text-[13px]"
                    data-github-file
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon path={file.type === 'dir' ? 'folder' : 'file'} className={`w-4 h-4 shrink-0 ${file.type === 'dir' ? 'text-[#54aeff]' : 'text-[#7d8590]'}`} />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <span className="hidden sm:block text-[12px] opacity-60 truncate">{file.message}</span>
                    <span className="text-[12px] opacity-60 whitespace-nowrap">{file.age}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* README */}
            <div className="mt-5 border border-[#30363d] rounded-md overflow-hidden">
              <div className="bg-[#161b22] px-4 py-2 text-[12px] flex items-center gap-2 border-b border-[#30363d]">
                <Icon path="book" className="w-4 h-4 opacity-70" />
                <span className="font-semibold">README.md</span>
              </div>
              <div className="p-5 sm:p-8 text-[14px] leading-relaxed">
                <h1 className="text-2xl font-bold border-b border-[#30363d] pb-3 mb-4">Portfolio OS - DeVanté Johnson-Rose</h1>
                <p className="mb-3">A pixel-faithful Windows 11 desktop, in the browser, as a portfolio.</p>
                <p className="mb-4">
                  Live: <LiveLink>{LIVE_URL}</LiveLink>
                </p>
                <p className="mb-4 opacity-90">
                  Two parallel builds of the same OS ship from the same repo and the same{' '}
                  <code className="bg-[#161b22] px-1 py-0.5 rounded-sm text-[12px]">assets/</code>:
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
                  A toggle in each taskbar (or the Desktop shortcut on mobile) flips between the two builds so visitors can
                  compare the same product written two different ways.
                </p>
                <h2 className="text-xl font-bold border-b border-[#30363d] pb-2 mb-3 mt-6">Why this exists</h2>
                <p className="opacity-90">
                  Portfolios that link to other portfolios are forgettable. This one is the work: a working desktop OS, 26
                  windowed apps in both builds, an admin OAuth flow, a Chart.js analytics dashboard, and a CI/CD pipeline that
                  builds both tracks and rsyncs them atomically.
                </p>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-5 lg:max-w-[296px] min-w-0">
            <section>
              <h3 className="text-[14px] font-semibold mb-2">About</h3>
              <p className="text-[14px] opacity-80 mb-3">
                React + PHP twin builds of an interactive Windows-style portfolio OS. Live at{' '}
                <LiveLink>devante.johnson-rose.co.uk</LiveLink>.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {repository.topics.map((topic) => (
                  <span key={topic} className="text-[11px] bg-[#1f6feb]/15 text-[#79c0ff] border border-[#388bfd]/30 rounded-full px-2 py-0.5">
                    {topic}
                  </span>
                ))}
              </div>
              <ul className="text-[13px] space-y-1.5 opacity-90">
                {STATS.map((stat) => (
                  <li key={stat.label} className="flex items-center gap-2">
                    <Icon path={stat.icon} className="w-4 h-4 opacity-70" />
                    {stat.label}
                  </li>
                ))}
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
                <img src="/assets/img/profile.webp" alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                <span className="text-[13px]" data-github-contributor>{profile.name}</span>
              </div>
            </section>

            <section>
              <h3 className="text-[14px] font-semibold mb-2">Languages</h3>
              <div className="h-2 rounded-full overflow-hidden flex mb-2">
                {repository.languages.map((language) => (
                  <div key={language.name} style={{ width: `${language.pct}%`, background: language.color }} />
                ))}
              </div>
              <ul className="space-y-1 text-[12px]">
                {repository.languages.map((language) => (
                  <li key={language.name} className="flex items-center gap-2" data-github-language>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: language.color }} />
                    <span className="font-semibold">{language.name}</span>
                    <span className="opacity-70">{language.pct}%</span>
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
