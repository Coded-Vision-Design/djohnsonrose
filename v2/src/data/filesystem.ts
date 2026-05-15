// Mock Windows filesystem — typed port of v1's os/filesystem.js.
// Static so we can `as const` the paths. The explorer + terminal read from
// this; Phase 4+ may push writes via a store, but for now it's read-only.

const IMG = '/assets/img/'
const FOLDER = `${IMG}win11/folder.png`

export interface FsAppEntry {
  name: string
  type: 'app'
  app: string
  icon: string
  extraData?: Record<string, unknown>
}

export interface FsFolderEntry {
  name: string
  type: 'folder'
  icon: string
  /** Optional alias path — e.g. Desktop's "Projects" shortcut points at Users/.../Projects. */
  path?: string
}

export interface FsFileEntry {
  name: string
  type: 'file'
  icon: string
  content?: string
  extraData?: Record<string, unknown>
}

export interface FsImageEntry {
  name: string
  type: 'image'
  icon: string
  url: string
}

export interface FsVideoEntry {
  name: string
  type: 'video'
  icon: string
  url: string
  originalPath?: string
}

export type FsEntry = FsAppEntry | FsFolderEntry | FsFileEntry | FsImageEntry | FsVideoEntry

export type FileSystem = Record<string, FsEntry[]>

export const filesystem: FileSystem = {
  'C:\\': [
    { name: 'Users', type: 'folder', icon: FOLDER },
    { name: 'Program Files', type: 'folder', icon: FOLDER },
    { name: 'Program Files (x86)', type: 'folder', icon: FOLDER },
    { name: 'Windows', type: 'folder', icon: FOLDER },
  ],
  'C:\\Program Files': [
    { name: 'Adobe', type: 'folder', icon: FOLDER },
    { name: 'Docker', type: 'folder', icon: FOLDER },
    { name: 'Google', type: 'folder', icon: FOLDER },
    { name: 'Microsoft Office', type: 'folder', icon: FOLDER },
    { name: 'Microsoft VS Code', type: 'folder', icon: FOLDER },
    { name: 'XAMPP', type: 'folder', icon: FOLDER },
  ],
  'C:\\Program Files\\Adobe': [
    { name: 'photoshop.exe', type: 'app', app: 'photoshop', icon: `${IMG}photoshop.webp` },
  ],
  'C:\\Program Files\\Google\\Chrome\\Application': [
    { name: 'chrome.exe', type: 'app', app: 'edge', icon: `${IMG}chrome.webp` },
  ],
  'C:\\Program Files\\Google\\Chrome': [
    { name: 'Application', type: 'folder', icon: FOLDER },
  ],
  'C:\\Program Files\\Google': [
    { name: 'Chrome', type: 'folder', icon: FOLDER },
  ],
  'C:\\Program Files\\Microsoft VS Code': [
    { name: 'Code.exe', type: 'app', app: 'vscode', icon: `${IMG}vscode.webp` },
  ],
  'C:\\Program Files\\Microsoft Office\\root\\Office16': [
    { name: 'WINWORD.EXE', type: 'app', app: 'word', icon: `${IMG}word.webp` },
    { name: 'EXCEL.EXE', type: 'app', app: 'excel', icon: `${IMG}excel.webp` },
    { name: 'POWERPNT.EXE', type: 'app', app: 'powerpoint', icon: `${IMG}powerpoint.webp` },
    { name: 'OUTLOOK.EXE', type: 'app', app: 'outlook', icon: `${IMG}outlook.webp` },
  ],
  'C:\\Program Files\\Microsoft Office\\root': [
    { name: 'Office16', type: 'folder', icon: FOLDER },
  ],
  'C:\\Program Files\\Microsoft Office': [
    { name: 'root', type: 'folder', icon: FOLDER },
  ],
  'C:\\Program Files\\Docker': [
    { name: 'Docker Desktop.exe', type: 'app', app: 'docker', icon: `${IMG}docker.webp` },
  ],
  'C:\\Program Files\\XAMPP': [
    { name: 'htdocs', type: 'folder', icon: FOLDER },
    { name: 'mysql', type: 'folder', icon: FOLDER },
    { name: 'php', type: 'folder', icon: FOLDER },
  ],
  'C:\\Program Files (x86)': [
    { name: 'FileZilla FTP Client', type: 'folder', icon: FOLDER },
    { name: 'Image-Line', type: 'folder', icon: FOLDER },
    { name: 'Notepad++', type: 'folder', icon: FOLDER },
    { name: 'PuTTY', type: 'folder', icon: FOLDER },
  ],
  'C:\\Program Files (x86)\\Image-Line\\FL Studio 24': [
    { name: 'FL.exe', type: 'app', app: 'flstudio', icon: `${IMG}fl%20studio.webp` },
  ],
  'C:\\Program Files (x86)\\Image-Line': [
    { name: 'FL Studio 24', type: 'folder', icon: FOLDER },
  ],
  'C:\\Program Files (x86)\\Notepad++': [
    { name: 'notepad++.exe', type: 'app', app: 'notepad', icon: `${IMG}notepad++.webp` },
  ],
  'C:\\Program Files (x86)\\PuTTY': [
    { name: 'putty.exe', type: 'app', app: 'putty', icon: `${IMG}putty.webp` },
  ],
  'C:\\Program Files (x86)\\FileZilla FTP Client': [
    { name: 'filezilla.exe', type: 'app', app: 'filezilla', icon: `${IMG}filezilla.webp` },
  ],
  'C:\\Windows': [
    { name: 'System32', type: 'folder', icon: FOLDER },
    { name: 'Fonts', type: 'folder', icon: FOLDER },
    { name: 'Media', type: 'folder', icon: FOLDER },
  ],
  'C:\\Windows\\System32': [
    { name: 'cmd.exe', type: 'app', app: 'terminal', icon: `${IMG}terminal.webp` },
    { name: 'calc.exe', type: 'app', app: 'calculator', icon: `${IMG}calculator.webp` },
    { name: 'Ssms.exe', type: 'app', app: 'database', icon: `${IMG}mssql.webp` },
    { name: 'taskmgr.exe', type: 'app', app: 'taskmanager', icon: `${IMG}taskmanager.webp` },
    { name: 'settings.exe', type: 'app', app: 'settings', icon: `${IMG}settings.webp` },
    { name: 'eventvwr.exe', type: 'app', app: 'eventviewer', icon: `${IMG}eventviewer.webp` },
  ],
  'C:\\Windows\\Media': [
    { name: 'Windows Logon.wav', type: 'file', icon: '🎵' },
    { name: 'Windows Error.wav', type: 'file', icon: '🎵' },
  ],
  'C:\\Windows\\Fonts': [
    { name: 'Segoe UI.ttf', type: 'file', icon: '🔤' },
    { name: 'Arial.ttf', type: 'file', icon: '🔤' },
  ],
  'C:\\Users': [
    { name: 'DeVante', type: 'folder', icon: FOLDER },
    { name: 'Public', type: 'folder', icon: FOLDER },
  ],
  'C:\\Users\\DeVante': [
    { name: 'Desktop', type: 'folder', icon: `${IMG}win11/desktop.png` },
    { name: 'Documents', type: 'folder', icon: `${IMG}win11/documents.png` },
    { name: 'Downloads', type: 'folder', icon: `${IMG}win11/downloads.png` },
    { name: 'Pictures', type: 'folder', icon: `${IMG}win11/pictures.png` },
    { name: 'Projects', type: 'folder', icon: FOLDER },
  ],
  'C:\\Users\\DeVante\\Desktop': [
    { name: 'Projects', type: 'folder', path: 'C:\\Users\\DeVante\\Projects', icon: FOLDER },
    {
      name: 'CV - DeVanté Johnson-Rose.pdf',
      type: 'app',
      app: 'pdfreader',
      icon: `${IMG}pdf.webp`,
    },
    {
      name: 'achievements.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content: `KEY ACHIEVEMENTS:
- 4 x NAGA World Champion
- 2 x IBJJF No-Gi Medalist
- AJP 4 x Grand Slam Champion
- IBJJF European Champion (No-Gi)
- IBJJF Master European Champion (Gi)
- British Judo Silver Medalist`,
    },
    {
      name: 'SQL Server Management Studio',
      type: 'app',
      app: 'database',
      icon: `${IMG}mssql.webp`,
    },
    { name: 'VS Code', type: 'app', app: 'vscode', icon: `${IMG}vscode.webp` },
    { name: 'Chrome', type: 'app', app: 'edge', icon: `${IMG}chrome.webp` },
    { name: 'Outlook', type: 'app', app: 'outlook', icon: `${IMG}outlook.webp` },
    { name: 'Terminal', type: 'app', app: 'terminal', icon: `${IMG}terminal.webp` },
    {
      name: 'FL Studio 24',
      type: 'app',
      app: 'flstudio',
      icon: `${IMG}fl%20studio.webp`,
    },
    // Recycle Bin lives on the Desktop in v1 — kept here so the auto-layout
    // treats it like any other tile and never collides with a sibling.
    {
      name: 'Recycle Bin',
      type: 'folder',
      path: 'C:\\Recycle Bin',
      icon: `${IMG}recyclebinempty.webp`,
    },
  ],
  'C:\\Users\\DeVante\\Documents': [
    { name: 'Career', type: 'folder', icon: FOLDER },
    {
      name: 'CV - DeVanté Johnson-Rose.pdf',
      type: 'app',
      app: 'pdfreader',
      icon: `${IMG}pdf.webp`,
    },
  ],
  'C:\\Users\\DeVante\\Documents\\Career': [
    {
      name: 'Killik and Co.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content:
        'Killik & Co — Applications Support Engineer\nIpswich · Apr 2025 – Present\n\n' +
        '- Maintain and enhance business-critical applications with a strong focus on automation and knowledge sharing.\n' +
        '- Build AI-assisted internal tooling and PowerShell automation scripts that streamline repeat processes and generate reports.\n' +
        '- Query and update SQL databases via MSSMS for production data work and reporting.',
    },
    {
      name: 'Coded Vision Design.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content:
        'Coded Vision Design — Freelance Full-Stack Developer\nRemote · 2013 – Present\n\n' +
        '- 100+ freelance projects delivered, with consistent 5-star feedback across SMEs and startups.\n' +
        '- Engagements span CMS platforms, e-commerce, AI-powered chatbots, deployment and auth consulting.\n' +
        '- Self-hosts containerised stacks on VPS with Docker, Traefik reverse-proxy, Grafana, Ofelia and OpenClaw.\n' +
        '- Adjacent creative services: CAA A2 CofC drone videography, drone-photogrammetry 3D modelling, indoor 360° virtual tours, social-media ad editing, content writing.\n' +
        '- Mainly UK-based clients; engagements across the US, UAE, Saudi Arabia, Australia, and South Africa.',
    },
    {
      name: 'UEA.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content:
        'UEA (University of East Anglia) — Desktop Developer / 3rd Line Engineer\nNorwich · Nov 2021 – Apr 2025\n\n' +
        "- Transformed UEA's desktop infrastructure across 8,000+ devices, achieving 60% faster deployments through SCCM and JAMF automation.\n" +
        '- PowerShell automation eliminated 20+ weekly manual hours while maintaining 99.9% system availability.\n' +
        '- Led Windows 11 migration for 2,000+ users and spearheaded remote-learning infrastructure for 15,000+ students.',
    },
    {
      name: 'Skyscanner.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content:
        'Skyscanner — Systems Engineer II\nGlobal · Mar 2020 – Nov 2021\n\n' +
        '- Led global deployment of AI heat-sensing CCTV across 10+ international offices during COVID-19.\n' +
        '- Managed £500K infrastructure budget; optimised JAMF/SCCM workflows reducing onboarding setup by 65%.\n' +
        '- MacBook provisioning compressed from 4 hours to 45 minutes. Provided in-house support via the techbar.',
    },
    {
      name: 'Shawbrook Bank.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content:
        'Shawbrook Bank — Desk Side Engineer\nEssex · Mar 2017 – Mar 2020\n\n' +
        '- End-to-end IT support for 900+ users across multiple sites; SCCM imaging, patching, RSA deployment.\n' +
        '- PowerShell scripting and process improvements; trained incoming desk-side engineers, reducing onboarding time.',
    },
    {
      name: 'Earlier roles (2011-2017).txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content:
        'Earlier roles · 2011 – 2017\n\n' +
        'FRP Advisory — 2nd Line Engineer (Aug 2016 – Feb 2017)\n' +
        '  Remote/desk side support across the UK for companies in liquidation. P2V migrations,\n' +
        '  digital forensics, extracted 200 TB of data from BHS.\n\n' +
        'Alexander Knight Business Solutions — Senior Network Engineer (Jul 2015 – Aug 2016)\n' +
        '  Quickly promoted; ran multiple IT departments for an MSP, reporting directly to the CEO.\n\n' +
        'Ontraq IT — IT Support / 2nd Line Field (Nov 2014 – Jul 2015)\n' +
        '  On-site and telephone assistance for British Transport Police, Gepp & Sons, private legal &\n' +
        '  financial firms, and sole traders.\n\n' +
        'Pensar IT — Service Desk / 2nd Line (Jun 2014 – Nov 2014)\n' +
        '  Service-desk and 2nd-line support across an MSP client base.\n\n' +
        'Databarracks — IT Support, 1st Line (Jun 2013 – Jun 2014)\n' +
        '  1st-line support for a UK disaster-recovery and backup specialist.\n\n' +
        'Blueprint Collections — IT Systems Administrator (Sep 2011 – Jun 2013)\n' +
        '  Systems administration across the business — first professional role.',
    },
    {
      name: 'References (locked).txt',
      type: 'app',
      app: 'references',
      icon: `${IMG}notepad++.webp`,
      extraData: { locked: true },
    },
  ],
  'C:\\Users\\DeVante\\Pictures': [
    {
      name: 'baymotors.webp',
      type: 'image',
      icon: '🖼️',
      url: '/portfolio/baymotors.webp',
    },
    {
      name: 'cpttours.webp',
      type: 'image',
      icon: '🖼️',
      url: '/portfolio/cpttours.webp',
    },
    {
      name: 'ekbjjdesktop.webp',
      type: 'image',
      icon: '🖼️',
      url: '/portfolio/ekbjjdesktop.webp',
    },
    {
      name: 'eurogoatdesktop.webp',
      type: 'image',
      icon: '🖼️',
      url: '/portfolio/eurogoatdesktop.webp',
    },
    {
      name: 'youngsconstructiondesktop.webp',
      type: 'image',
      icon: '🖼️',
      url: '/portfolio/youngsconstructiondesktop.webp',
    },
  ],
  'C:\\Recycle Bin': [
    {
      name: 'Easter Egg - Drone Footage.mp4',
      type: 'video',
      icon: '🎬',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-serene-lake-and-mountains-4318-large.mp4',
      originalPath: 'C:\\Users\\DeVante\\Desktop',
    },
  ],
  'C:\\Users\\DeVante\\Projects': [
    { name: 'Freelance', type: 'folder', icon: FOLDER },
    { name: 'Killik and Co', type: 'folder', icon: FOLDER },
    { name: 'Coded Vision Design', type: 'folder', icon: FOLDER },
    { name: 'UEA', type: 'folder', icon: FOLDER },
    { name: 'Skyscanner', type: 'folder', icon: FOLDER },
    { name: 'Shawbrook Bank', type: 'folder', icon: FOLDER },
    { name: 'FRP Advisory', type: 'folder', icon: FOLDER },
  ],
  'C:\\Users\\DeVante\\Projects\\Freelance': [
    { name: 'English Open BJJ', type: 'folder', icon: FOLDER },
    { name: 'Bay Motors', type: 'folder', icon: FOLDER },
    { name: 'CPT Tours', type: 'folder', icon: FOLDER },
    { name: 'EKBJJ', type: 'folder', icon: FOLDER },
    { name: 'BJJ Havering', type: 'folder', icon: FOLDER },
    { name: 'Euro-Goat', type: 'folder', icon: FOLDER },
    { name: 'Youngs Construction', type: 'folder', icon: FOLDER },
    { name: 'Boulevard Logistics', type: 'folder', icon: FOLDER },
  ],
}

// Add a small `Role_Description.txt` per Projects/{role} folder so the
// explorer has meaningful content to click into.
const ROLES = [
  [
    'Killik and Co',
    'Killik & Co — Applications Support Engineer (Apr 2025 – Present)\n\n' +
      '- Maintain and enhance business-critical applications with a strong focus on automation and knowledge sharing.\n' +
      '- Build AI-assisted internal tooling and PowerShell automation scripts that streamline repeat processes and generate reports.\n' +
      '- Query and update SQL databases via MSSMS for production data work and reporting.',
  ],
  [
    'Coded Vision Design',
    'Coded Vision Design — Freelance Full-Stack Developer (2013 – Present, Remote)\n\n' +
      '- 100+ freelance projects delivered, consistent 5-star feedback across SMEs and startups.\n' +
      '- Engagements span CMS platforms, e-commerce, AI-powered chatbots, deployment and auth consulting.\n' +
      '- Self-hosts containerised stacks on VPS with Docker, Traefik, Grafana, Ofelia and OpenClaw.\n' +
      '- Adjacent creative services: CAA A2 CofC drone videography, drone-photogrammetry 3D modelling,\n' +
      '  indoor 360° virtual tours, social-media ad editing, content writing.\n' +
      '- UK-based clients with engagements across the US, UAE, Saudi Arabia, Australia, and South Africa.',
  ],
  [
    'UEA',
    'UEA — Desktop Developer / 3rd Line Engineer (Nov 2021 – Apr 2025, Norwich)\n\n' +
      "- Transformed UEA's desktop infrastructure across 8,000+ devices; 60% faster deployments via SCCM/JAMF.\n" +
      '- PowerShell automation eliminated 20+ weekly manual hours while maintaining 99.9% availability.\n' +
      '- Led Windows 11 migration for 2,000+ users; spearheaded remote-learning infra for 15,000+ students.',
  ],
  [
    'Skyscanner',
    'Skyscanner — Systems Engineer II (Mar 2020 – Nov 2021, Global)\n\n' +
      '- Led global AI heat-sensing CCTV deployment across 10+ international offices during COVID-19.\n' +
      '- Managed £500K infrastructure budget; optimised JAMF/SCCM workflows, 65% faster onboarding.\n' +
      '- MacBook provisioning compressed from 4 hours to 45 minutes; in-house techbar support.',
  ],
  [
    'Shawbrook Bank',
    'Shawbrook Bank — Desk Side Engineer (Mar 2017 – Mar 2020, Essex)\n\n' +
      '- End-to-end IT support for 900+ users across multiple sites; SCCM imaging, patching, RSA.\n' +
      '- PowerShell scripting + process improvements; trained incoming desk-side engineers.',
  ],
  [
    'FRP Advisory',
    'FRP Advisory — 2nd Line Engineer (Aug 2016 – Feb 2017)\n\n' +
      '- Remote/desk side support across the UK for companies in liquidation.\n' +
      '- P2V migrations and on-site infrastructure moves.\n' +
      '- Assisted in extracting and sorting 200 TB of data from BHS.\n' +
      '- Specialised in digital forensics and ethical hacking.',
  ],
] as const

for (const [role, content] of ROLES) {
  filesystem[`C:\\Users\\DeVante\\Projects\\${role}`] = [
    {
      name: 'Role_Description.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content,
    },
    {
      name: 'References (locked).txt',
      type: 'app',
      app: 'references',
      icon: `${IMG}notepad++.webp`,
      extraData: { locked: true, role },
    },
  ]
}

const FREELANCE: { name: string; url: string; summary: string; thumb: string }[] = [
  { name: 'English Open BJJ', url: 'https://englishopenbjjchampionships.co.uk/', summary: 'The premier BJJ tournament in the UK. Custom weight calculators, registration flows, AI FAQ.', thumb: '/portfolio/englishopenbjj.webp' },
  { name: 'Bay Motors', url: 'https://www.baymotors.co.uk/', summary: 'Automotive booking + diagnostic platform. #1 local Google rank within 3 weeks.', thumb: '/portfolio/baymotors.webp' },
  { name: 'CPT Tours', url: 'https://cpttours.co.za/', summary: 'Cape Town tour booking — 360° interactive, WhatsApp-integrated booking flows.', thumb: '/portfolio/cpttours.webp' },
  { name: 'EKBJJ', url: 'https://ekbjj.com/', summary: 'Academy site for Prof. Eddie Kone — timetables, memberships, lineage tracking.', thumb: '/portfolio/ekbjjdesktop.webp' },
  { name: 'BJJ Havering', url: 'https://bjjhavering.co.uk/', summary: 'Modernised non-responsive site; 50% increase in enrolments.', thumb: '/portfolio/wolvesbjj.webp' },
  { name: 'Euro-Goat', url: 'https://euro-goat.com/', summary: 'Premium mobile mechanic for German cars. Interactive 3D vehicle models.', thumb: '/portfolio/eurogoatdesktop.webp' },
  { name: 'Youngs Construction', url: 'https://youngsconstructionltd.co.uk/', summary: 'Construction portal with 4K drone footage and Three.js wireframes.', thumb: '/portfolio/youngsconstructiondesktop.webp' },
  { name: 'Boulevard Logistics', url: 'https://boulevardlogistics.co.uk/', summary: 'Multi-variable pricing engine replacing complex spreadsheets.', thumb: '/portfolio/boulevardlogistics.webp' },
]

for (const project of FREELANCE) {
  filesystem[`C:\\Users\\DeVante\\Projects\\Freelance\\${project.name}`] = [
    {
      name: 'Visit Site.url',
      type: 'app',
      app: 'edge',
      icon: `${IMG}chrome.webp`,
      extraData: { initialUrl: project.url },
    },
    {
      name: 'README.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content: project.summary,
    },
    {
      name: 'preview.webp',
      type: 'image',
      icon: '🖼️',
      url: project.thumb,
    },
  ]
}

/** Quick-access shortcuts shown in the Explorer sidebar. */
export const QUICK_ACCESS = [
  { label: 'Home', icon: '🏠', path: 'C:\\Users\\DeVante' },
  { label: 'Desktop', icon: '🖥️', path: 'C:\\Users\\DeVante\\Desktop' },
  { label: 'Documents', icon: '📄', path: 'C:\\Users\\DeVante\\Documents' },
  { label: 'Downloads', icon: '⬇️', path: 'C:\\Users\\DeVante\\Downloads' },
  { label: 'Pictures', icon: '🖼️', path: 'C:\\Users\\DeVante\\Pictures' },
  { label: 'Projects', icon: '🧰', path: 'C:\\Users\\DeVante\\Projects' },
  { label: 'This PC', icon: '💻', path: 'C:\\' },
] as const

/** Returns the entries at `path`, or [] if it doesn't exist. */
export function listAt(path: string): FsEntry[] {
  return filesystem[path] ?? []
}

/** Parent path — splits on `\\` and rejoins. Returns 'C:\\' as the root. */
export function parentPath(path: string): string {
  const parts = path.split('\\').filter((p) => p !== '')
  // C:\  (parts=['C:']) or C:\Users (parts=['C:', 'Users']) — root is the parent.
  if (parts.length <= 2) return 'C:\\'
  return parts.slice(0, -1).join('\\')
}

/** Build the child path for entering `folder` from `current`. */
export function joinPath(current: string, folder: FsFolderEntry): string {
  if (folder.path) return folder.path // explicit alias (Desktop → Projects)
  const trimmed = current.endsWith('\\') ? current.slice(0, -1) : current
  return `${trimmed}\\${folder.name}`
}

/** Case-insensitive substring search across every entry in the filesystem. */
export function searchFiles(
  query: string,
  limit = 50,
): { path: string; entry: FsEntry }[] {
  if (!query) return []
  const q = query.toLowerCase()
  const out: { path: string; entry: FsEntry }[] = []
  for (const [path, entries] of Object.entries(filesystem)) {
    for (const entry of entries) {
      if (entry.name.toLowerCase().includes(q)) {
        out.push({ path, entry })
        if (out.length >= limit) return out
      }
    }
  }
  return out
}
