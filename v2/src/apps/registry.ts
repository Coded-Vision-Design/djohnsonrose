import { lazy, type LazyExoticComponent, type FC } from 'react'

const Placeholder = lazy(() => import('./placeholder/Placeholder'))
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
// Apache in prod). When we port a real app in Phase 2+, swap its `Component`.
const IMG = '/assets/img/'

export const apps: Record<string, AppDef> = {
  edge: { id: 'edge', title: 'Chrome', icon: `${IMG}chrome.webp`, defaultSize: { w: 1024, h: 720 }, Component: Edge },
  vscode: { id: 'vscode', title: 'VS Code', icon: `${IMG}vscode.webp`, defaultSize: { w: 1100, h: 720 }, Component: Placeholder },
  explorer: { id: 'explorer', title: 'File Explorer', icon: `${IMG}explorer.webp`, defaultSize: { w: 900, h: 600 }, Component: Placeholder },
  terminal: { id: 'terminal', title: 'Terminal', icon: `${IMG}terminal.webp`, defaultSize: { w: 720, h: 480 }, Component: Terminal },
  notepad: { id: 'notepad', title: 'Notepad', icon: `${IMG}notepad++.webp`, defaultSize: { w: 700, h: 500 }, Component: Notepad },
  word: { id: 'word', title: 'Word', icon: `${IMG}word.webp`, defaultSize: { w: 980, h: 720 }, Component: Word },
  excel: { id: 'excel', title: 'Excel', icon: `${IMG}excel.webp`, defaultSize: { w: 980, h: 720 }, Component: Placeholder },
  powerpoint: { id: 'powerpoint', title: 'PowerPoint', icon: `${IMG}powerpoint.webp`, defaultSize: { w: 980, h: 720 }, Component: Placeholder },
  outlook: { id: 'outlook', title: 'Outlook', icon: `${IMG}outlook.webp`, defaultSize: { w: 720, h: 600 }, Component: Outlook },
  photoshop: { id: 'photoshop', title: 'Photoshop', icon: `${IMG}photoshop.webp`, defaultSize: { w: 1100, h: 720 }, Component: Placeholder },
  flstudio: { id: 'flstudio', title: 'FL Studio 24', icon: `${IMG}fl studio.webp`, defaultSize: { w: 1200, h: 720 }, Component: Placeholder },
  docker: { id: 'docker', title: 'Docker', icon: `${IMG}docker.webp`, defaultSize: { w: 1000, h: 700 }, Component: Placeholder },
  putty: { id: 'putty', title: 'PuTTY', icon: `${IMG}putty.webp`, defaultSize: { w: 720, h: 480 }, Component: Placeholder },
  filezilla: { id: 'filezilla', title: 'FileZilla', icon: `${IMG}filezilla.webp`, defaultSize: { w: 980, h: 640 }, Component: Placeholder },
  database: { id: 'database', title: 'SQL Server Management Studio', icon: `${IMG}mssql.webp`, defaultSize: { w: 1100, h: 720 }, Component: Placeholder },
  settings: { id: 'settings', title: 'Settings', icon: `${IMG}settings.webp`, defaultSize: { w: 900, h: 640 }, Component: Settings },
  taskmanager: { id: 'taskmanager', title: 'Task Manager', icon: `${IMG}taskmanager.webp`, defaultSize: { w: 900, h: 640 }, Component: TaskManager },
  eventviewer: { id: 'eventviewer', title: 'Event Viewer', icon: `${IMG}eventviewer.webp`, defaultSize: { w: 980, h: 640 }, Component: EventViewer },
  calculator: { id: 'calculator', title: 'Calculator', icon: `${IMG}calculator.webp`, defaultSize: { w: 320, h: 480 }, Component: Calculator },
  paint: { id: 'paint', title: 'Paint', icon: `${IMG}win11/paint.png`, defaultSize: { w: 900, h: 650 }, Component: Paint },
  photos: { id: 'photos', title: 'Photos', icon: `${IMG}win11/photos.png`, defaultSize: { w: 900, h: 640 }, Component: Photos },
  video: { id: 'video', title: 'Movies & TV', icon: `${IMG}win11/video.png`, defaultSize: { w: 900, h: 600 }, Component: Placeholder },
  pdfreader: { id: 'pdfreader', title: 'PDF Reader', icon: `${IMG}pdf.webp`, defaultSize: { w: 900, h: 720 }, Component: Placeholder },
}

export function getApp(id: string): AppDef | undefined {
  return apps[id]
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
