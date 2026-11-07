export interface BrowserTab {
  id: number
  url: string
  title: string
  back: string[]
  forward: string[]
}

export interface BrowserProject {
  title: string
  featured?: boolean
  tags?: unknown
}

export const HOME_URL: string
export const HOME_TITLE: string

export function isExternal(url: string): boolean
export function normaliseAddress(text: string): string
export function siteName(url: string): string
export function tabTitle(url: string): string
export function siteToVisit(app: string, extra: { initialUrl?: unknown } | null | undefined): string | null
export function newTab(id: number, address?: string): BrowserTab
export function navigateTab(tab: BrowserTab, address: string): BrowserTab
export function tabBack(tab: BrowserTab): BrowserTab
export function tabForward(tab: BrowserTab): BrowserTab
export function featuredProjects<T extends BrowserProject>(projects: T[] | null | undefined): T[]
export function projectTags(project: BrowserProject | null | undefined): string[]
