import { useEffect, useState } from 'react'
import { useOsStore, type Settings as SettingsShape } from '../../store/osStore'

// 1:1 port of partials/apps/settings.php — five-tab Win11 Settings shell that
// reads the same data/portfolio.json the PHP version reads. All copy below
// flows from data/portfolio.json so the CV stays the single source of truth.

const WALLPAPERS = [
  { id: 'Bloom', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop' },
  { id: 'Flow', url: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?q=80&w=1974&auto=format&fit=crop' },
  { id: 'Glow', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1974&auto=format&fit=crop' },
  { id: 'Sunrise', url: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=1970&auto=format&fit=crop' },
  { id: 'Urban', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1920&auto=format&fit=crop' },
  { id: 'Nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1920&auto=format&fit=crop' },
] as const

type Tab = 'system' | 'personalisation' | 'experience' | 'qualifications' | 'about'

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'system', label: 'System', icon: '💻' },
  { id: 'personalisation', label: 'Personalisation', icon: '🎨' },
  { id: 'experience', label: 'Experience', icon: '🏢' },
  { id: 'qualifications', label: 'Qualifications', icon: '🎓' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
]

interface ExperienceRow {
  id: number | string
  role: string
  company: string
  period: string
  location?: string
  logo?: string
  highlights: string
}

interface EducationRow {
  id: number | string
  title: string
  issuer: string
}

interface CertRow {
  id: number | string
  name: string
  issuer: string
  year?: string
}

interface Portfolio {
  summary?: string
  philosophy?: string
  experience?: ExperienceRow[]
  education?: EducationRow[]
  certifications?: CertRow[]
  skills?: {
    frameworks?: string[]
    tools?: string[]
    operations?: string[]
    apis?: string[]
  }
  interests?: string[]
}

const CORE_SKILLS = [
  'Active Directory / Group Policy',
  'Windows / Mac OS',
  'Microsoft Office 365',
  'Imaging / SCCM / JAMF',
  'RAID / Backup / DR',
  'iOS / iPadOS / MDM',
  'Azure / Cloud Ops',
  'SQL / Stored Procedures',
  'Docker / Virtualisation',
]

const HOME_LAB = [
  { label: 'Device name', value: 'DEVANTE-HOMELAB' },
  { label: 'Processor', value: 'AMD Ryzen 7 9800X3D (8-Core, 16-Thread)' },
  { label: 'Installed RAM', value: '128 GB DDR5 6000 MHz' },
  { label: 'Graphics Card', value: 'NVIDIA GeForce RTX 5070 Ti' },
  { label: 'Storage', value: '4 TB NVMe PCIe Gen 5 SSD' },
  { label: 'System type', value: '64-bit Full-Stack Home Lab Architecture' },
]

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`w-12 h-6 rounded-full relative transition-colors ${on ? 'bg-win-blue' : 'bg-gray-400'}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          on ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const settings = useOsStore((s) => s.settings)
  const updateSetting = useOsStore((s) => s.updateSetting)
  const isMobile = useOsStore((s) => s.isMobile)
  const [tab, setTab] = useState<Tab>('system')
  const [preview, setPreview] = useState<string | null>(null)
  const [data, setData] = useState<Portfolio | null>(null)

  const currentWallpaper = preview ?? settings.wallpaper

  useEffect(() => {
    fetch('/data/portfolio.json', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('portfolio.json fetch failed'))))
      .then((d: Portfolio) => setData(d))
      .catch(() => setData({}))
  }, [])

  const toggle = <K extends keyof SettingsShape>(key: K) => {
    updateSetting(key, !settings[key] as SettingsShape[K])
  }

  const summary =
    data?.summary ??
    'Applications Support Engineer and Full-Stack Developer with enterprise infrastructure experience across finance, education, and global technology.'
  const philosophy =
    data?.philosophy ??
    'Technique over brute force. I prioritise precision, efficient troubleshooting, and clear communication of complex technical concepts.'

  return (
    <div
      className={`h-full flex text-black dark:text-white ${
        isMobile ? 'flex-col bg-white dark:bg-[#1c1c1c]' : 'bg-[#f3f3f3] dark:bg-[#202020]'
      }`}
    >
      {/* Sidebar */}
      <div
        className={`${
          isMobile
            ? 'w-full border-b flex overflow-x-auto p-2 space-x-2 shrink-0'
            : 'w-64 border-r p-4 space-y-2'
        } border-gray-300 dark:border-gray-700`}
      >
        {!isMobile && (
          <div className="flex items-center space-x-3 p-3 mb-6">
            <img
              src="/assets/img/profile.png"
              alt=""
              className="w-12 h-12 rounded-full object-cover border border-white/20"
            />
            <div>
              <div className="font-semibold text-sm">DeVanté Johnson-Rose</div>
              <div className="text-[10px] text-gray-500">Local Account</div>
            </div>
          </div>
        )}
        {NAV.map((item) => {
          const active = tab === item.id
          if (isMobile) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-medium flex items-center transition-all border ${
                  active
                    ? 'bg-white dark:bg-white/10 shadow-sm border-win-blue text-win-blue'
                    : 'border-transparent'
                }`}
              >
                <span className="mr-1 text-sm">{item.icon}</span>
                {item.label}
              </button>
            )
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex items-center transition-all border border-transparent ${
                active ? 'bg-white dark:bg-white/10 shadow-sm' : ''
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className={`flex-grow overflow-y-auto ${isMobile ? 'p-4' : 'p-10'}`}>
        <h1
          className={`font-semibold mb-8 ${isMobile ? 'text-xl mb-4' : 'text-3xl'}`}
        >
          {NAV.find((n) => n.id === tab)?.label}
        </h1>

        {tab === 'system' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass p-6 rounded-lg border border-gray-200 dark:border-white/10">
                <div className="text-xs font-bold uppercase text-gray-400 mb-2">Technical Status</div>
                <div className="text-xl font-bold text-win-blue">Experience Level: Senior</div>
                <div className="text-xs text-gray-500 mt-1">Specialising in Scalable Architectures</div>
              </div>
              <div className="glass p-6 rounded-lg border border-gray-200 dark:border-white/10">
                <div className="text-xs font-bold uppercase text-gray-400 mb-2">Operational Scope</div>
                <div className="text-xl font-bold text-win-blue">Environments Managed: Enterprise</div>
                <div className="text-xs text-gray-500 mt-1">High-Availability Cloud Infrastructure</div>
              </div>
            </div>

            <div className="glass p-6 rounded-lg flex items-center justify-between border border-gray-200 dark:border-white/10">
              <div className="flex items-center">
                <span className="text-2xl mr-4">🔊</span>
                <div>
                  <div className="font-medium">System Sounds</div>
                  <div className="text-xs text-gray-500">Enable or disable UI sound effects</div>
                </div>
              </div>
              <Toggle on={settings.sound} onClick={() => toggle('sound')} />
            </div>

            <div className="glass p-6 rounded-lg flex items-center justify-between border border-gray-200 dark:border-white/10">
              <div className="flex items-center">
                <span className="text-2xl mr-4">🌙</span>
                <div>
                  <div className="font-medium">Dark Mode</div>
                  <div className="text-xs text-gray-500">Switch between light and dark themes</div>
                </div>
              </div>
              <Toggle
                on={settings.theme === 'dark'}
                onClick={() =>
                  updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
                }
              />
            </div>
          </div>
        )}

        {tab === 'personalisation' && (
          <div className="space-y-6">
            <div className="glass p-6 rounded-lg border border-gray-200 dark:border-white/10 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
              <div className="w-full md:w-64 aspect-video rounded-lg overflow-hidden border-4 border-white/20 shadow-2xl relative shrink-0">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                  style={{ backgroundImage: `url(${currentWallpaper})` }}
                />
                <div className="absolute bottom-0 inset-x-0 h-2 bg-white/20 backdrop-blur-md" />
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-semibold mb-1">Background</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Select a picture to preview, then click Save to apply it.
                </p>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (preview) {
                        updateSetting('wallpaper', preview)
                        setPreview(null)
                      }
                    }}
                    disabled={!preview || preview === settings.wallpaper}
                    className="bg-win-blue text-white px-6 py-1.5 rounded text-xs font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Save Changes
                  </button>
                  {preview && preview !== settings.wallpaper && (
                    <button
                      type="button"
                      onClick={() => setPreview(null)}
                      className="text-xs hover:underline opacity-60"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {WALLPAPERS.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => setPreview(wp.url)}
                  className={`relative rounded-md overflow-hidden aspect-square border-2 transition-all hover:scale-105 ${
                    currentWallpaper === wp.url
                      ? 'border-win-blue ring-2 ring-win-blue/20 shadow-lg'
                      : 'border-transparent hover:border-gray-400'
                  }`}
                  title={wp.id}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${wp.url})`, backgroundColor: '#333' }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'experience' && (
          <div className="space-y-6">
            <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-win-blue/20 before:to-transparent">
              {(data?.experience ?? []).map((job, idx) => (
                <div
                  key={job.id}
                  className={`relative flex items-center md:justify-normal ${
                    idx % 2 === 1 ? 'md:flex-row-reverse' : ''
                  } group`}
                >
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full border border-win-blue bg-white dark:bg-[#202020] text-win-blue shadow shrink-0 md:order-1 overflow-hidden ${
                      idx % 2 === 1
                        ? 'md:translate-x-1/2'
                        : 'md:-translate-x-1/2'
                    }`}
                  >
                    {job.logo ? (
                      <img src={`/${job.logo}`} alt="" className="w-8 h-8 object-contain" />
                    ) : (
                      <span className="text-sm font-bold">{String(job.id)}</span>
                    )}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass p-6 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm transition-all hover:border-win-blue/50">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold dark:text-white text-base">{job.role}</div>
                      <time className="font-mono text-[10px] text-win-blue font-bold whitespace-nowrap bg-win-blue/10 px-2 py-0.5 rounded">
                        {job.period}
                      </time>
                    </div>
                    <div className="text-win-blue text-xs font-semibold mb-3">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ''}
                    </div>
                    <div className="text-xs text-gray-500 leading-relaxed">{job.highlights}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'qualifications' && (
          <div className="space-y-6">
            <div className="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="mr-3">🏫</span> Education
              </h3>
              <div className="space-y-3">
                {(data?.education ?? []).map((edu, idx) => (
                  <div
                    key={edu.id}
                    className={
                      idx === 0
                        ? 'flex items-start space-x-4 p-4 bg-win-blue/5 rounded-lg border border-win-blue/10'
                        : 'p-4 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10'
                    }
                  >
                    {idx === 0 && <div className="text-2xl">🎓</div>}
                    <div>
                      <div className="font-bold text-sm">{edu.title}</div>
                      <div className="text-xs text-gray-500">{edu.issuer}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="mr-3">📜</span> Certifications
                {data?.certifications && (
                  <span className="ml-2 text-[10px] font-normal opacity-60">
                    ({data.certifications.length} credentials)
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(data?.certifications ?? []).map((cert) => (
                  <div
                    key={cert.id}
                    className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg flex flex-col justify-between transition-all hover:shadow-md hover:border-win-blue/30 group"
                  >
                    <div className="font-bold text-xs mb-1 group-hover:text-win-blue transition-colors">
                      {cert.name}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest flex justify-between">
                      <span>{cert.issuer}</span>
                      {cert.year && <span className="opacity-60">{cert.year}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-6">
            <div className="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src="/assets/img/profile.png"
                  alt=""
                  className="w-20 h-20 rounded-full border-4 border-win-blue/20 object-cover"
                />
                <div>
                  <h2 className="text-2xl font-bold">DeVanté Johnson-Rose</h2>
                  <p className="text-sm text-win-blue font-medium">
                    Applications Support Engineer · Full-Stack Developer
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="font-bold text-xs uppercase text-gray-400 mb-2">Who am I?</div>
                  <p className="text-sm leading-relaxed opacity-80">{summary}</p>
                </div>
                <div>
                  <div className="font-bold text-xs uppercase text-gray-400 mb-2">Career philosophy</div>
                  <p className="text-sm leading-relaxed opacity-80">{philosophy}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkillCard label="Frameworks & Technologies" tone="blue" items={data?.skills?.frameworks ?? []} />
              <SkillCard label="Tools & Infrastructure" tone="muted" items={data?.skills?.tools ?? []} />
              <SkillCard label="Operations & Management" tone="blue" items={data?.skills?.operations ?? []} />
              <SkillCard label="API Integration" tone="muted" items={data?.skills?.apis ?? []} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
                <div className="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">
                  Core Skillset Highlights
                </div>
                <div className="space-y-2">
                  {CORE_SKILLS.map((skill) => (
                    <div key={skill} className="flex items-center text-xs opacity-80">
                      <span className="text-win-blue mr-2">✔</span>
                      <span>{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
                <div className="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">
                  Interests & Human Profile
                </div>
                <div className="flex flex-wrap gap-2">
                  {(data?.interests ?? []).map((interest) => (
                    <span
                      key={interest}
                      className="px-2 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[10px] font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
              <div className="font-bold text-lg mb-4 text-win-blue">Home Lab specifications</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {HOME_LAB.map((spec) => (
                  <div key={spec.label} className="space-y-1">
                    <div className="text-[10px] uppercase text-gray-500">{spec.label}</div>
                    <div className="text-sm dark:text-white font-medium">{spec.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SkillCard({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: 'blue' | 'muted'
}) {
  const chip =
    tone === 'blue'
      ? 'px-2 py-1 bg-win-blue/10 border border-win-blue/20 rounded text-[10px] font-medium'
      : 'px-2 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[10px] font-medium'
  return (
    <div className="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
      <div className="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={chip}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
