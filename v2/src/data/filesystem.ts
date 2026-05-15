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

export interface FsLinkEntry {
  name: string
  type: 'link'
  icon: string
  /** Absolute path or full URL navigated to on activation. */
  url: string
}

export type FsEntry =
  | FsAppEntry
  | FsFolderEntry
  | FsFileEntry
  | FsImageEntry
  | FsVideoEntry
  | FsLinkEntry

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
- World #1, AJP & IBJJF, Represented GBR internationally (2022-2024)
- GB Judo Squad, Veteran category
- 4 x NAGA World Champion
- 4 x AJP Grand Slam Champion
- IBJJF European Champion
- IBJJF Masters North American Champion
- High Sheriff of Essex Award, Volunteer child mentor (Lads Need Dads)

VERIFY:
- Smoothcomp: https://smoothcomp.com/en/profile/73838
- British Judo Squad: https://www.britishjudo.org.uk/wp-content/uploads/2024/10/British-Masters-Squad-2024-2025.pdf`,
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
    // Cross-build switch — taskbar React/PHP toggle is hidden on mobile, so
    // the PHP shortcut lives on the Desktop. Handled by DesktopIcons' 'link'
    // branch.
    { name: 'PHP Build', type: 'link', url: '/', icon: `${IMG}php.png` },
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
      name: 'South Africa 25 Video.mp4',
      type: 'video',
      icon: '🎬',
      url: '/data/south-africa-25.mp4',
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
    // Featured (newest, currently active)
    { name: 'Earth Echo', type: 'folder', icon: FOLDER },
    { name: 'Combat Evolved Sports', type: 'folder', icon: FOLDER },
    { name: "Ram's Taxis", type: 'folder', icon: FOLDER },
    // Archive
    { name: 'English Open BJJ', type: 'folder', icon: FOLDER },
    { name: 'Bay Motors', type: 'folder', icon: FOLDER },
    { name: 'CPT Tours', type: 'folder', icon: FOLDER },
    { name: 'EKBJJ', type: 'folder', icon: FOLDER },
    { name: 'BJJ Havering', type: 'folder', icon: FOLDER },
    { name: 'BHR Recovery', type: 'folder', icon: FOLDER },
    { name: 'Euro-Goat', type: 'folder', icon: FOLDER },
    { name: 'Youngs Construction', type: 'folder', icon: FOLDER },
    { name: 'Boulevard Logistics', type: 'folder', icon: FOLDER },
    { name: 'Hameedahs Delights', type: 'folder', icon: FOLDER },
  ],

  // System folders — listed so they show as real folders if a visitor types
  // into the address bar / Terminal cd. Empty for safety, mirroring v1.
  'C:\\Program Files\\Docker\\Docker': [],
  'C:\\Windows\\Resources': [
    { name: 'Themes', type: 'folder', icon: FOLDER },
  ],
  'C:\\Windows\\Resources\\Themes': [],
  'C:\\Windows\\Web': [],
}

// Patch top-level C:\Windows to expose Resources + Web.
filesystem['C:\\Windows'] = [
  ...filesystem['C:\\Windows'],
  { name: 'Resources', type: 'folder', icon: FOLDER },
  { name: 'Web', type: 'folder', icon: FOLDER },
]

// Patch C:\Program Files\Docker to expose the inner Docker folder.
filesystem['C:\\Program Files\\Docker'] = [
  ...filesystem['C:\\Program Files\\Docker'],
  { name: 'Docker', type: 'folder', icon: FOLDER },
]

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

interface FreelanceProject {
  name: string
  url: string
  thumb: string
  thumbMobile: string
  requirements: string
  plan: string
  outcome: string
}

const FREELANCE: FreelanceProject[] = [
  {
    name: 'Earth Echo',
    url: 'https://earthecho.co.uk/',
    thumb: '/portfolio/earthecho.webp',
    thumbMobile: '/portfolio/earthecho-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Carbon-footprint tracker that scales from a uni study project to production.\n- Human-readable metrics across travel, energy, food, water, plastic.\n- Gamified streaks + community feed to drive habit-forming behaviour.\n- Companion iOS app (incl. an Apple Watch app) and Android app delivered\n  from the same codebase.',
    plan:
      'PLAN:\n- Next.js 16 + React 19 web client on Vercel, Prisma + Postgres data layer.\n- NextAuth + WebAuthn passkeys for password-less login.\n- D3 + Globe.gl visualisations of per-user impact vs cohort.\n- TinyMCE-driven editor CMS for admin posts; Stripe-style billing scaffolding.\n- Capacitor packaging for iOS (with a SwiftUI Apple Watch companion) and Android.\n- Push notifications via Expo + APNs for streak reminders.',
    outcome:
      'OUTCOME:\n- Shipped to production with multi-platform reach: web, iPhone, Apple Watch, Android.\n- Passkey-first auth in place day one; zero stored passwords.\n- Real-time analytics dashboard for admin moderation and content curation.',
  },
  {
    name: 'Combat Evolved Sports',
    url: 'https://combatevolvedsports.com/',
    thumb: '/portfolio/combatevolvedsports.webp',
    thumbMobile: '/portfolio/combatevolvedsports-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Sports journalism platform that feels modern without leaning on a framework.\n- Editor-first CMS with live-search, modals and inline reactions via HTMX.\n- Subscription tier gated by Stripe with social-login fallback.',
    plan:
      'PLAN:\n- PHP 8.5 from scratch — PSR-4 autoload, PDO, no framework.\n- HTMX for partial swaps + Alpine.js for state, Tailwind for styling.\n- Stripe checkout + customer portal; Google + Facebook OAuth via league/oauth2.\n- Lcobucci JWT for API tokens; PHPMailer for transactional email.\n- Image pipeline via Intervention/Image with PSR-7 streams.',
    outcome:
      'OUTCOME:\n- Live in production; PHP 8.5 build with full PHPUnit + CS-Fixer.\n- Stripe + multi-provider OAuth all running through the same Auth boundary.\n- Editor admin lets the small journalism team ship articles without devs.',
  },
  {
    name: "Ram's Taxis",
    url: 'https://ramstaxis.co.uk/',
    thumb: '/portfolio/ramstaxis.webp',
    thumbMobile: '/portfolio/ramstaxis-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Local taxi firm in Braintree, Essex — needed a modern shopfront.\n- Airport transfers (Stansted, Heathrow, Gatwick), school runs, courier jobs,\n  wheelchair-accessible vehicles — all surfaced clearly.\n- Click-to-call dominant on mobile; static-first for instant first paint.',
    plan:
      'PLAN:\n- Next.js + TypeScript + Tailwind on Vercel.\n- Static generation for every service page; route metadata per page.\n- Dedicated landing pages per airport for SEO long-tail.\n- Mobile-first CTAs with prominent tel: links and a sticky call bar.',
    outcome:
      'OUTCOME:\n- Site live on Vercel with sub-second mobile load.\n- Verified locally relevant pages ranking for "taxi Braintree" search terms.\n- Booking volume primarily driven by direct mobile call from the site.',
  },
  {
    name: 'English Open BJJ',
    url: 'https://englishopenbjjchampionships.co.uk/',
    thumb: '/portfolio/englishopenbjj.webp',
    thumbMobile: '/portfolio/englishopenbjj-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Showcase the prestige of the English Open BJJ Championships.\n- Highlight previous champions and event highlights.\n- Seamless integration with Smoothcomp for registrations.\n- User-friendly, intuitive interface.',
    plan:
      'PLAN:\n- Build lightweight site with high Lighthouse/SEO scores.\n- Optimise assets (WebP/WebM) for mobile-first performance.\n- Implement JS Weight Class Finder (Imperial/Metric).\n- Train AI Chatbot on FAQs and IBJJF ruleset.\n- Create clear CTA pathways to Smoothcomp.',
    outcome:
      'OUTCOME:\n- Largest competitor turnout in event history.\n- Significant reduction in manual admin tasks.\n- Massive growth in web traffic via SEO optimization.',
  },
  {
    name: 'Bay Motors',
    url: 'https://www.baymotors.co.uk/',
    thumb: '/portfolio/baymotors.webp',
    thumbMobile: '/portfolio/baymotors-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Establish first digital presence for trusted local garage.\n- Automate booking process to reduce phone dependency.\n- Prevent lost revenue from missed calls during peak hours.',
    plan:
      'PLAN:\n- Build SEO-focussed site with dedicated service pages.\n- Integrate car registration API for automated data retrieval.\n- Create formatted email notification system for bookings.\n- Showcase high-end project gallery to build trust.',
    outcome:
      'OUTCOME:\n- Reached #1 on Google for local searches within 3 weeks.\n- Maintained top position and significantly increased traffic.\n- Drastic increase in new customer bookings.',
  },
  {
    name: 'CPT Tours',
    url: 'https://cpttours.co.za/',
    thumb: '/portfolio/cpttours.webp',
    thumbMobile: '/portfolio/cpttours-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Bypass high GetYourGuide commission fees.\n- Enable direct, easy booking for international travellers.\n- Build independent brand credibility.',
    plan:
      'PLAN:\n- Integrate Google Places API for verified reviews.\n- Link system to WhatsApp for real-time booking alerts.\n- Integrate Calendar API for visual booking management.\n- Build custom Headless CMS for blogs and tour management.\n- Implement secure Google OAuth authentication.',
    outcome:
      'OUTCOME:\n- First direct booking within 9 days of launch.\n- Drastically reduced reliance on 3rd party platforms.\n- Streamlined operations via integrated calendar.',
  },
  {
    name: 'EKBJJ',
    url: 'https://ekbjj.com/',
    thumb: '/portfolio/ekbjjdesktop.webp',
    thumbMobile: '/portfolio/ekbjjdesktop-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Rescue site from a bad state after the previous developer went AWOL.\n- Modernise outdated UI and optimise for mobile.\n- Consolidate 12 dormant domains into one platform.',
    plan:
      'PLAN:\n- Build modern, lightweight Headless CMS with RBAC.\n- Integrate SumUp API for secure class bookings.\n- Automate podcast/video updates via Spotify & YouTube.\n- Implement 301 redirects for all dormant domains.\n- Deploy AI Chatbot for 24/7 lead capture and triaging.',
    outcome:
      'OUTCOME:\n- Huge increase in trial classes and Gi hire bookings.\n- Improved local SEO rankings.\n- Significant reduction in administrative overhead.',
  },
  {
    name: 'BJJ Havering',
    url: 'https://bjjhavering.co.uk/',
    thumb: '/portfolio/wolvesbjj.webp',
    thumbMobile: '/portfolio/wolvesbjj-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Modernise non-responsive site after developer disappeared.\n- Create fresh digital presence for competitive market.\n- Increase online lead generation for the academy.',
    plan:
      'PLAN:\n- Mobile-first redesign with high-performance metrics.\n- Build automated enrolment workflows.\n- Implement local SEO strategy for martial arts keywords.\n- Deploy AI FAQ system for student triaging.',
    outcome:
      'OUTCOME:\n- Achieved #1 local Google ranking.\n- 50% increase in monthly student enrolments.\n- Operational efficiency improved via automated bookings.',
  },
  {
    name: 'BHR Recovery',
    url: 'https://bhrrecovery.co.uk/',
    thumb: '/portfolio/bhrrecovery.webp',
    thumbMobile: '/portfolio/bhrrecovery-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Establish first digital presence for local recovery service.\n- Appeal to specific geographic areas in the community.',
    plan:
      'PLAN:\n- Create full company branding, logo, and guidelines.\n- Build high-converting site with dedicated area landing pages.\n- Optimise for hyper-local SEO.\n- Design and print integrated business cards.',
    outcome:
      'OUTCOME:\n- Rapid deployment: Site live within 4 hours of contact.\n- Full project (Branding + Site) turned around in 72 hours.\n- Immediate increase in local service calls.',
  },
  {
    name: 'Euro-Goat',
    url: 'https://euro-goat.com/',
    thumb: '/portfolio/eurogoatdesktop.webp',
    thumbMobile: '/portfolio/eurogoatdesktop-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Launch first digital presence for niche mobile mechanic.\n- Transition from word-of-mouth to high-volume lead gen.',
    plan:
      'PLAN:\n- Build high-converting expertise-led website.\n- Use interactive 3D car models for specialist vehicle types.\n- Optimise high-poly OBJ files for mobile performance.\n- Local New Jersey SEO strategy deployment.',
    outcome:
      'OUTCOME:\n- Ranked #1 in New Jersey for mobile European mechanics.\n- Consistent volume of high-quality bookings.',
  },
  {
    name: 'Youngs Construction',
    url: 'https://youngsconstructionltd.co.uk/',
    thumb: '/portfolio/youngsconstructiondesktop.webp',
    thumbMobile: '/portfolio/youngsconstructiondesktop-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Modernise outdated site that was failing to generate leads.\n- Replace stock imagery with authentic project showcases.\n- Build a high-trust professional digital portal.',
    plan:
      'PLAN:\n- Capture 4K drone photography of major flats project.\n- Create and embed 360-degree virtual project tours.\n- Build interactive 3D house wireframes using Three.js.\n- Optimise site structure for construction-specific SEO.',
    outcome:
      'OUTCOME:\n- Drastic increase in average time-on-site.\n- Measurable growth in high-value project inquiries.',
  },
  {
    name: 'Boulevard Logistics',
    url: 'https://boulevardlogistics.co.uk/',
    thumb: '/portfolio/boulevardlogistics.webp',
    thumbMobile: '/portfolio/boulevardlogistics-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Custom pricing engine to replace complex spreadsheets.\n- Multi-variable calculation (fuel surcharge, pallet count, weight, distance).\n- Automated customer payment integration.\n- Streamlined operational workflow.',
    plan:
      'PLAN:\n1. Audit existing spreadsheet variables and logic.\n2. Design database schema for logistics tracking.\n3. Build calculation engine using PHP.\n4. Integrate payment gateway (Stripe/GoCardless).\n5. Beta testing with internal ops team.',
    outcome:
      'OUTCOME:\n- Eliminated manual spreadsheet updates.\n- 75% reduction in administrative booking time.\n- Streamlined financial reconciliation workflow.',
  },
  {
    name: 'Hameedahs Delights',
    url: 'https://hameedahsdelights.com/',
    thumb: '/portfolio/sweetdelights.webp',
    thumbMobile: '/portfolio/sweetdelights-mobile.webp',
    requirements:
      'REQUIREMENTS:\n- Scale from social media to a professional corporate portal.\n- Appeal to large business orders and event catering.\n- Automated booking and inquiry management.',
    plan:
      'PLAN:\n- Build custom specification form with photo upload capability.\n- Implement full interactive menu with auto-pricing engine.\n- Link instant booking notifications to WhatsApp.\n- Synchronise GMB profile and social media lead flows.',
    outcome:
      'OUTCOME:\n- First major booking within 24 hours of launch.\n- Significant increase in professional visibility.\n- Scalable digital presence for business growth.',
  },
]

for (const project of FREELANCE) {
  const base = `C:\\Users\\DeVante\\Projects\\Freelance\\${project.name}`
  filesystem[base] = [
    {
      name: 'Visit Site.url',
      type: 'app',
      app: 'edge',
      icon: `${IMG}chrome.webp`,
      extraData: { initialUrl: project.url },
    },
    {
      name: 'requirements.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content: project.requirements,
    },
    {
      name: 'plan.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content: project.plan,
    },
    {
      name: 'outcome.txt',
      type: 'file',
      icon: `${IMG}notepad++.webp`,
      content: project.outcome,
    },
    { name: 'Pictures', type: 'folder', icon: FOLDER },
  ]
  filesystem[`${base}\\Pictures`] = [
    {
      name: 'Desktop UI.webp',
      type: 'image',
      icon: '🖼️',
      url: project.thumb,
    },
    {
      name: 'Mobile UI.webp',
      type: 'image',
      icon: '🖼️',
      url: project.thumbMobile,
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
