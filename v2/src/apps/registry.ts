import { lazy, type LazyExoticComponent, type FC } from 'react'

export interface AppDef {
  id: string
  title: string
  icon?: string
  defaultSize: { w: number; h: number }
  Component: LazyExoticComponent<FC>
}

// Phase 1A: just placeholder shells so we can prove the window manager works.
// Phase 2 onward replaces these with real ports.
export const apps: Record<string, AppDef> = {
  paint: {
    id: 'paint',
    title: 'Paint',
    defaultSize: { w: 900, h: 650 },
    Component: lazy(() => import('./placeholder/Placeholder')),
  },
  calculator: {
    id: 'calculator',
    title: 'Calculator',
    defaultSize: { w: 320, h: 480 },
    Component: lazy(() => import('./placeholder/Placeholder')),
  },
  notepad: {
    id: 'notepad',
    title: 'Notepad',
    defaultSize: { w: 700, h: 500 },
    Component: lazy(() => import('./placeholder/Placeholder')),
  },
}

export function getApp(id: string): AppDef | undefined {
  return apps[id]
}

export function listApps(): AppDef[] {
  return Object.values(apps)
}
