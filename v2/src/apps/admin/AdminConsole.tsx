import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

// Admin Console — Google Sign-In gated dashboard for visitor analytics +
// Outlook enquiries. Reads admin-only /api/stats.php (cookie auth, see
// requireAdmin() in bootstrap.php).

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
)

interface BreakdownRow {
  total: number
}
type CountedRow = BreakdownRow & Record<string, string | number | null>

interface PerDayRow {
  day: string
  source: 'php' | 'react' | 'unknown' | string
  sessions: number | string
}

interface ScreenTimeRow {
  source: string
  events: number
  sessions: number
  events_per_session: number
}

interface EnquiryRow {
  id: string
  sender: string
  recipient: string
  subject: string
  body: string
  status: string
  ip_address: string
  created_at: string
}

interface StatsPayload {
  generated_at: string
  total_events: number
  enquiries_count: number
  source: {
    lifetime: CountedRow[]
    last_30d: CountedRow[]
  }
  per_app: CountedRow[]
  os: CountedRow[]
  browser: CountedRow[]
  country: CountedRow[]
  per_day: PerDayRow[]
  screen_time: ScreenTimeRow[]
  enquiries: EnquiryRow[]
}

interface MeResponse {
  authenticated: boolean
  email?: string
  client_id?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string
            callback: (res: { credential: string }) => void
            auto_select?: boolean
            ux_mode?: 'popup' | 'redirect'
          }) => void
          renderButton: (
            parent: HTMLElement,
            opts: {
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              shape?: 'rectangular' | 'pill'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              logo_alignment?: 'left' | 'center'
              width?: number
            },
          ) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('GSI failed to load')))
      return
    }
    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('GSI failed to load'))
    document.head.appendChild(s)
  })
}

function toCountMap(rows: CountedRow[], labelKey: string) {
  const labels: string[] = []
  const values: number[] = []
  for (const r of rows) {
    labels.push(String(r[labelKey] ?? 'Unknown'))
    values.push(Number(r.total) || 0)
  }
  return { labels, values }
}

const SOURCE_COLOURS: Record<string, string> = {
  php: '#0078d4',
  react: '#61dafb',
  unknown: '#888888',
}

function classifyDevice(os: string | null): 'Desktop' | 'Mobile' | 'Tablet' | 'Other' {
  if (!os) return 'Other'
  const v = os.toLowerCase()
  if (v.includes('ipad') || v.includes('tablet')) return 'Tablet'
  if (v.includes('android') || v.includes('iphone') || v.includes('ios') || v.includes('mobile'))
    return 'Mobile'
  if (
    v.includes('windows') ||
    v.includes('mac') ||
    v.includes('linux') ||
    v.includes('chrome os')
  )
    return 'Desktop'
  return 'Other'
}

export default function AdminConsole() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'dashboard' | 'enquiries'>('dashboard')
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryRow | null>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  const refreshMe = useCallback(async () => {
    try {
      const r = await fetch('/api/admin_me.php', { credentials: 'same-origin' })
      const body = (await r.json()) as MeResponse
      setMe(body)
    } catch {
      setMe({ authenticated: false })
    }
  }, [])

  const loadStats = useCallback(async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/stats.php', { credentials: 'same-origin' })
      if (r.status === 401) {
        setMe({ authenticated: false })
        setStats(null)
        return
      }
      if (!r.ok) throw new Error(`Stats request failed (${r.status})`)
      const body = (await r.json()) as StatsPayload
      setStats(body)
    } catch (e) {
      setAuthError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    refreshMe()
  }, [refreshMe])

  useEffect(() => {
    if (me?.authenticated) loadStats()
  }, [me?.authenticated, loadStats])

  const handleCredential = useCallback(
    async (credential: string) => {
      setAuthError(null)
      setBusy(true)
      try {
        const r = await fetch('/api/admin_auth.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: credential }),
        })
        const body = (await r.json()) as { ok?: boolean; error?: string; email?: string }
        if (!r.ok || !body.ok) {
          setAuthError(body.error || 'Sign-in failed')
          return
        }
        await refreshMe()
      } catch (e) {
        setAuthError((e as Error).message)
      } finally {
        setBusy(false)
      }
    },
    [refreshMe],
  )

  // Mount Google Sign-In button when we have a client_id and no session.
  useEffect(() => {
    if (me?.authenticated || !me?.client_id || !buttonRef.current) return
    let cancelled = false
    loadGsi()
      .then(() => {
        if (cancelled || !window.google || !buttonRef.current || !me.client_id) return
        window.google.accounts.id.initialize({
          client_id: me.client_id,
          callback: (res) => handleCredential(res.credential),
          ux_mode: 'popup',
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_blue',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 280,
        })
      })
      .catch((e: Error) => setAuthError(e.message))
    return () => {
      cancelled = true
    }
  }, [me?.authenticated, me?.client_id, handleCredential])

  const logout = async () => {
    try {
      window.google?.accounts.id.disableAutoSelect()
    } catch {
      /* noop */
    }
    await fetch('/api/admin_logout.php', { method: 'POST', credentials: 'same-origin' })
    setStats(null)
    refreshMe()
  }

  if (!me) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f5f5f5] dark:bg-[#1c1c1c] text-black dark:text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-win-blue" />
      </div>
    )
  }

  if (!me.authenticated) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-[#003a8c] via-[#0050b3] to-[#1890ff] text-white p-6 text-center">
        <img src="/assets/img/profile.png" alt="" className="w-20 h-20 rounded-full ring-4 ring-white/20" />
        <div>
          <h1 className="text-2xl font-semibold">Admin Console</h1>
          <p className="opacity-80 text-sm mt-1">Sign in with an authorised Google account.</p>
        </div>
        <div ref={buttonRef} aria-label="Sign in with Google" />
        {!me.client_id && (
          <p className="text-xs text-red-200 max-w-sm">
            GOOGLE_OAUTH_CLIENT_ID isn't configured on the server.
          </p>
        )}
        {authError && <p className="text-xs text-red-200 max-w-sm">{authError}</p>}
        <p className="text-[11px] opacity-60 mt-6 max-w-sm">
          This area is restricted. Your Google identity is verified server-side and
          only accounts on the allowlist may sign in.
        </p>
      </div>
    )
  }

  return (
    <Dashboard
      me={me}
      stats={stats}
      busy={busy}
      tab={tab}
      onTab={setTab}
      onRefresh={loadStats}
      onLogout={logout}
      selectedEnquiry={selectedEnquiry}
      onSelectEnquiry={setSelectedEnquiry}
    />
  )
}

interface DashboardProps {
  me: MeResponse
  stats: StatsPayload | null
  busy: boolean
  tab: 'dashboard' | 'enquiries'
  onTab: (t: 'dashboard' | 'enquiries') => void
  onRefresh: () => void
  onLogout: () => void
  selectedEnquiry: EnquiryRow | null
  onSelectEnquiry: (e: EnquiryRow | null) => void
}

function Dashboard({
  me,
  stats,
  busy,
  tab,
  onTab,
  onRefresh,
  onLogout,
  selectedEnquiry,
  onSelectEnquiry,
}: DashboardProps) {
  const sourceLifetime = useMemo(
    () => (stats ? toCountMap(stats.source.lifetime, 'source') : { labels: [], values: [] }),
    [stats],
  )

  const perApp = useMemo(
    () => (stats ? toCountMap(stats.per_app, 'app') : { labels: [], values: [] }),
    [stats],
  )

  const browserBreakdown = useMemo(
    () => (stats ? toCountMap(stats.browser, 'browser') : { labels: [], values: [] }),
    [stats],
  )

  const countryBreakdown = useMemo(
    () => (stats ? toCountMap(stats.country, 'country') : { labels: [], values: [] }),
    [stats],
  )

  // Roll OS rows into Desktop / Mobile / Tablet buckets — much more useful
  // for the dashboard than 8 separate Windows variants.
  const deviceTypes = useMemo(() => {
    if (!stats) return { labels: [] as string[], values: [] as number[] }
    const buckets: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0, Other: 0 }
    for (const row of stats.os) {
      buckets[classifyDevice(row.os as string | null)] += Number(row.total) || 0
    }
    return {
      labels: Object.keys(buckets),
      values: Object.values(buckets),
    }
  }, [stats])

  // Stacked daily sessions (php vs react).
  const dailySessions = useMemo(() => {
    if (!stats) return { labels: [] as string[], php: [] as number[], react: [] as number[] }
    const byDay: Record<string, { php: number; react: number }> = {}
    for (const r of stats.per_day) {
      byDay[r.day] = byDay[r.day] || { php: 0, react: 0 }
      const sessions = Number(r.sessions) || 0
      if (r.source === 'php') byDay[r.day].php = sessions
      else if (r.source === 'react') byDay[r.day].react = sessions
    }
    const labels = Object.keys(byDay).sort()
    return {
      labels,
      php: labels.map((d) => byDay[d].php),
      react: labels.map((d) => byDay[d].react),
    }
  }, [stats])

  return (
    <div
      className="h-full flex flex-col bg-[#f5f5f5] dark:bg-[#1c1c1c] text-black dark:text-white overflow-hidden"
      style={{ fontFamily: 'Segoe UI, sans-serif' }}
    >
      {/* Header */}
      <header className="shrink-0 bg-white dark:bg-[#2b2b2b] border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0078d4] to-[#5cb6ff] flex items-center justify-center text-white font-bold text-lg shrink-0">
            A
          </div>
          <div className="min-w-0">
            <div className="font-semibold leading-tight truncate">Portfolio OS · Admin Console</div>
            <div className="text-[11px] opacity-60 truncate">
              Signed in as {me.email}
              {stats && (
                <> · Updated {new Date(stats.generated_at).toLocaleTimeString()}</>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <nav className="flex bg-gray-100 dark:bg-black/20 rounded-full p-1 text-[12px]">
            <button
              type="button"
              onClick={() => onTab('dashboard')}
              className={`px-3 py-1 rounded-full transition ${
                tab === 'dashboard'
                  ? 'bg-white dark:bg-[#1c1c1c] shadow text-[#0078d4]'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onTab('enquiries')}
              className={`px-3 py-1 rounded-full transition ${
                tab === 'enquiries'
                  ? 'bg-white dark:bg-[#1c1c1c] shadow text-[#0078d4]'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Enquiries
              {stats && stats.enquiries_count > 0 && (
                <span className="ml-1 inline-flex min-w-[18px] justify-center bg-[#0078d4] text-white rounded-full text-[10px] px-1.5">
                  {stats.enquiries_count}
                </span>
              )}
            </button>
          </nav>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className="text-[12px] px-3 py-1 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
          >
            {busy ? 'Loading…' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="text-[12px] px-3 py-1 rounded-full bg-gray-900 text-white hover:bg-black"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-grow overflow-auto p-4 md:p-6 space-y-6">
        {busy && !stats && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-win-blue" />
          </div>
        )}

        {tab === 'dashboard' && stats && (
          <>
            {/* KPI strip */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Total events" value={stats.total_events.toLocaleString()} />
              <KpiCard label="Enquiries" value={stats.enquiries_count.toLocaleString()} />
              <KpiCard
                label="v1 events (PHP)"
                value={
                  stats.source.lifetime.find((r) => r.source === 'php')?.total?.toLocaleString() ??
                  '0'
                }
                tone="amber"
              />
              <KpiCard
                label="v2 events (React)"
                value={
                  stats.source.lifetime.find((r) => r.source === 'react')?.total?.toLocaleString() ??
                  '0'
                }
                tone="blue"
              />
            </section>

            {/* Source pie + daily sessions */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartCard title="v1 vs v2 (lifetime)" className="lg:col-span-1">
                {sourceLifetime.values.length === 0 ? (
                  <Empty />
                ) : (
                  <Doughnut
                    data={{
                      labels: sourceLifetime.labels.map((l) => l.toUpperCase()),
                      datasets: [
                        {
                          data: sourceLifetime.values,
                          backgroundColor: sourceLifetime.labels.map(
                            (l) => SOURCE_COLOURS[l] ?? '#aaa',
                          ),
                          borderWidth: 0,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' } },
                    }}
                  />
                )}
              </ChartCard>

              <ChartCard title="Daily sessions (last 14 days)" className="lg:col-span-2">
                {dailySessions.labels.length === 0 ? (
                  <Empty />
                ) : (
                  <Line
                    data={{
                      labels: dailySessions.labels,
                      datasets: [
                        {
                          label: 'v1 PHP',
                          data: dailySessions.php,
                          borderColor: SOURCE_COLOURS.php,
                          backgroundColor: 'rgba(0,120,212,0.2)',
                          fill: true,
                          tension: 0.35,
                        },
                        {
                          label: 'v2 React',
                          data: dailySessions.react,
                          borderColor: SOURCE_COLOURS.react,
                          backgroundColor: 'rgba(97,218,251,0.25)',
                          fill: true,
                          tension: 0.35,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: 'index', intersect: false },
                      plugins: { legend: { position: 'bottom' } },
                      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                    }}
                  />
                )}
              </ChartCard>
            </section>

            {/* Per-app + device type */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartCard title="Most used apps (60 days)" className="lg:col-span-2">
                {perApp.labels.length === 0 ? (
                  <Empty />
                ) : (
                  <Bar
                    data={{
                      labels: perApp.labels,
                      datasets: [
                        {
                          label: 'Events',
                          data: perApp.values,
                          backgroundColor: '#0078d4',
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { legend: { display: false } },
                      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
                    }}
                  />
                )}
              </ChartCard>

              <ChartCard title="Device type" className="lg:col-span-1">
                {deviceTypes.values.every((v) => v === 0) ? (
                  <Empty />
                ) : (
                  <Doughnut
                    data={{
                      labels: deviceTypes.labels,
                      datasets: [
                        {
                          data: deviceTypes.values,
                          backgroundColor: ['#0078d4', '#10b981', '#f59e0b', '#94a3b8'],
                          borderWidth: 0,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' } },
                    }}
                  />
                )}
              </ChartCard>
            </section>

            {/* Browser + country */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Browser breakdown">
                {browserBreakdown.labels.length === 0 ? (
                  <Empty />
                ) : (
                  <Bar
                    data={{
                      labels: browserBreakdown.labels,
                      datasets: [
                        {
                          label: 'Events',
                          data: browserBreakdown.values,
                          backgroundColor: '#10b981',
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                    }}
                  />
                )}
              </ChartCard>

              <ChartCard title="Top countries">
                {countryBreakdown.labels.length === 0 ? (
                  <Empty />
                ) : (
                  <Bar
                    data={{
                      labels: countryBreakdown.labels,
                      datasets: [
                        {
                          label: 'Events',
                          data: countryBreakdown.values,
                          backgroundColor: '#8b5cf6',
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { legend: { display: false } },
                      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
                    }}
                  />
                )}
              </ChartCard>
            </section>

            {/* Screen time */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stats.screen_time.map((row) => (
                <div
                  key={row.source}
                  className="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm"
                >
                  <div className="text-[11px] uppercase tracking-wide opacity-60">
                    {row.source.toUpperCase()} session depth
                  </div>
                  <div className="text-2xl font-semibold mt-1">{row.events_per_session}</div>
                  <div className="text-[11px] opacity-60 mt-1">
                    {row.events.toLocaleString()} events across{' '}
                    {row.sessions.toLocaleString()} sessions (30d)
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {tab === 'enquiries' && stats && (
          <section className="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row min-h-[420px]">
              <div className="md:w-2/5 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 overflow-y-auto max-h-[40vh] md:max-h-[60vh]">
                {stats.enquiries.length === 0 && (
                  <div className="p-6 text-sm opacity-60">No enquiries yet.</div>
                )}
                {stats.enquiries.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => onSelectEnquiry(row)}
                    className={`w-full text-left p-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 ${
                      selectedEnquiry?.id === row.id ? 'bg-[#e6f3fb] dark:bg-white/10' : ''
                    }`}
                  >
                    <div className="text-[11px] opacity-60 flex justify-between gap-2">
                      <span className="truncate">{row.sender || 'Web Visitor'}</span>
                      <span className="shrink-0">
                        {new Date(row.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="font-semibold truncate mt-0.5">{row.subject || '(no subject)'}</div>
                    <div className="text-xs opacity-60 truncate mt-0.5">
                      {row.body?.split('\n')[0] ?? ''}
                    </div>
                  </button>
                ))}
              </div>

              <div className="md:w-3/5 p-4 md:p-6 overflow-y-auto md:max-h-[60vh]">
                {!selectedEnquiry ? (
                  <div className="opacity-60 text-sm">Select an enquiry to read it.</div>
                ) : (
                  <article className="space-y-3">
                    <h2 className="text-lg font-semibold">{selectedEnquiry.subject}</h2>
                    <div className="text-[11px] opacity-60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="opacity-60">From: </span>
                        {selectedEnquiry.sender || 'Web Visitor'}
                      </div>
                      <div>
                        <span className="opacity-60">To: </span>
                        {selectedEnquiry.recipient}
                      </div>
                      <div>
                        <span className="opacity-60">Received: </span>
                        {new Date(selectedEnquiry.created_at).toLocaleString()}
                      </div>
                      <div>
                        <span className="opacity-60">IP: </span>
                        {selectedEnquiry.ip_address}
                      </div>
                    </div>
                    <pre className="text-sm whitespace-pre-wrap font-sans border-t border-gray-200 dark:border-gray-800 pt-3">
                      {selectedEnquiry.body}
                    </pre>
                  </article>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'amber' | 'blue'
}) {
  const ring =
    tone === 'amber'
      ? 'ring-amber-200/60 dark:ring-amber-500/30'
      : tone === 'blue'
        ? 'ring-blue-200/60 dark:ring-blue-500/30'
        : 'ring-gray-200/60 dark:ring-white/10'
  return (
    <div
      className={`bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm ring-1 ${ring}`}
    >
      <div className="text-[11px] uppercase tracking-wide opacity-60">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  )
}

function ChartCard({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col ${
        className ?? ''
      }`}
    >
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="relative flex-grow min-h-[240px]">{children}</div>
    </div>
  )
}

function Empty() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-xs opacity-50">
      No data yet
    </div>
  )
}
