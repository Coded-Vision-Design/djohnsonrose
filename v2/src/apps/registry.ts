import { lazy, type LazyExoticComponent, type FC } from 'react'
import { appManifest } from './manifest'

const Calculator = lazy(() => import('./calculator/Calculator'))
const Notepad = lazy(() => import('./notepad/Notepad'))
const Photos = lazy(() => import('./photos/Photos'))
const EventViewer = lazy(() => import('./eventviewer/EventViewer'))
const TaskManager = lazy(() => import('./taskmanager/TaskManager'))
const Settings = lazy(() => import('./settings/Settings'))
const Terminal = lazy(() => import('./terminal/Terminal'))
const Word = lazy(() => import('./word/Word'))
const Edge = lazy(() => import('./edge/Edge'))
const Outlook = lazy(() => import('./outlook/Outlook'))
const Paint = lazy(() => import('./paint/Paint'))
const Explorer = lazy(() => import('./explorer/Explorer'))
const VSCode = lazy(() => import('./vscode/VSCode'))
const Database = lazy(() => import('./database/Database'))
const Docker = lazy(() => import('./docker/Docker'))
const FLStudio = lazy(() => import('./flstudio/FLStudio'))
const PdfReader = lazy(() => import('./pdfreader/PdfReader'))
const Video = lazy(() => import('./video/Video'))
const Excel = lazy(() => import('./excel/Excel'))
const PowerPoint = lazy(() => import('./powerpoint/PowerPoint'))
const Putty = lazy(() => import('./putty/Putty'))
const FileZilla = lazy(() => import('./filezilla/FileZilla'))
const Photoshop = lazy(() => import('./photoshop/Photoshop'))
const AdminConsole = lazy(() => import('./admin/AdminConsole'))
const ReferencesVault = lazy(() => import('./references/ReferencesVault'))
const GitHubApp = lazy(() => import('./github/GitHub'))

export interface AppDef {
  id: string
  title: string
  icon: string
  defaultSize: { w: number; h: number }
  Component: LazyExoticComponent<FC>
  /** Render as an emoji glyph if `icon` is provided as one. */
  emoji?: string
}

// Icons share the PHP version's /assets/img/ tree (proxied in dev, served by
// Apache in prod).
const IMG = '/assets/img/'

const components: Record<string, LazyExoticComponent<FC>> = {
  edge: Edge,
  vscode: VSCode,
  explorer: Explorer,
  terminal: Terminal,
  notepad: Notepad,
  word: Word,
  excel: Excel,
  powerpoint: PowerPoint,
  outlook: Outlook,
  photoshop: Photoshop,
  flstudio: FLStudio,
  docker: Docker,
  putty: Putty,
  filezilla: FileZilla,
  database: Database,
  settings: Settings,
  taskmanager: TaskManager,
  eventviewer: EventViewer,
  calculator: Calculator,
  paint: Paint,
  photos: Photos,
  video: Video,
  pdfreader: PdfReader,
  admin: AdminConsole,
  references: ReferencesVault,
  github: GitHubApp,
}

// Titles, icons and sizes come from the manifest shared with v1.
export const apps: Record<string, AppDef> = Object.fromEntries(
  Object.values(appManifest).map(({ id, title, icon, size }) => [
    id,
    { id, title, icon: `${IMG}${icon}`, defaultSize: size, Component: components[id] },
  ]),
)

export function getApp(id: string): AppDef | undefined {
  return Object.hasOwn(apps, id) ? apps[id] : undefined
}

export function listApps(): AppDef[] {
  return Object.values(apps)
}

/** Apps grouped by first letter for the All apps view. */
export function groupAppsByLetter(): { letter: string; apps: AppDef[] }[] {
  const groups = new Map<string, AppDef[]>()
  for (const a of listApps()) {
    const letter = a.title.charAt(0).toUpperCase()
    const arr = groups.get(letter) ?? []
    arr.push(a)
    groups.set(letter, arr)
  }
  const sortedLetters = Array.from(groups.keys()).sort()
  return sortedLetters.map((letter) => ({
    letter,
    apps: groups.get(letter)!.sort((a, b) => a.title.localeCompare(b.title)),
  }))
}

/** Search by title — case-insensitive substring match. */
export function searchApps(query: string): AppDef[] {
  if (!query) return []
  const q = query.toLowerCase()
  return listApps().filter((a) => a.title.toLowerCase().includes(q))
}
