export const COPILOT_ENDPOINT: string
export const QUESTION_MAX: number
export const JOB_MIN: number
export const JOB_MAX: number
export const HISTORY_TURNS: number
export const HISTORY_TEXT_MAX: number
export const SUGGESTED_QUESTIONS: string[]
export const COPILOT_TABS: CopilotTab[]
export const MISSING_SOURCE: string

export type CopilotTab = 'chat' | 'match'

export type CitationTarget =
  | { type: 'cv'; anchor: string }
  | { type: 'file'; path: string }
  | { type: 'folder'; path: string }
  | { type: 'app'; app: string }

export interface Citation {
  id: string
  title: string
  target: CitationTarget
}

/** One message in the chat. Errors are shown but never sent back as history. */
export interface ChatTurn {
  role: 'user' | 'assistant' | 'error'
  text: string
}

export interface ChatReply {
  answer: string
  covered: boolean
  grounded: boolean
  citations: Citation[]
}

export type Strength = 'strong' | 'partial' | 'none'

export interface Requirement {
  requirement: string
  strength: Strength
  note: string
  citations: Citation[]
}

export interface CvRole {
  id: string
  title: string
  company: string
  location: string
  period: string
  highlights?: string[]
}

export interface CvProject {
  id: string
  title: string
  description: string
  tags: string[]
  url: string
}

export interface CvSkillGroup {
  id: string
  label: string
  items: { name: string; matched: boolean }[]
}

export interface CvCertificateGroup {
  id: string
  issuer: string
  years: string
  names: string[]
}

export interface TailoredCv {
  name: string
  headline: string
  location: string
  email: string
  website: string
  linkedin: string
  summary: string
  generated: { text: string; citations: Citation[] } | null
  roles: CvRole[]
  otherRoles: CvRole[]
  projects: CvProject[]
  skills: CvSkillGroup[]
  education: { title: string; issuer: string }[]
  certificates: CvCertificateGroup[]
}

export interface MatchReply {
  requirements: Requirement[]
  gaps: string[]
  summary: { text: string; citations: Citation[]; generated: true } | null
  cv: TailoredCv
}

export interface ChatBody {
  task: 'chat'
  question: string
  history: ChatTurn[]
}

export interface MatchBody {
  task: 'match'
  job: string
}

export class CopilotError extends Error {
  constructor(status: number, code: string, message: string)
  status: number
  code: string
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export function copilotUrl(basePath?: string): string
export function questionProblem(text: string): string
export function jobProblem(text: string): string
export function historyFor(messages: ChatTurn[]): ChatTurn[]
export function countLabel(text: string, max: number): string
export function copilotTabAfterKey(tab: CopilotTab, key: string): CopilotTab | null
export function chatBody(question: string, messages: ChatTurn[]): ChatBody
export function matchBody(job: string): MatchBody
export function askCopilot(body: ChatBody, options?: { fetcher?: Fetcher; basePath?: string; signal?: AbortSignal }): Promise<ChatReply>
export function askCopilot(body: MatchBody, options?: { fetcher?: Fetcher; basePath?: string; signal?: AbortSignal }): Promise<MatchReply>
export function copilotStatus(options?: { fetcher?: Fetcher; basePath?: string }): Promise<'on' | 'off' | 'unknown'>
export function citationKind(citation: Citation): CitationTarget['type'] | ''
export function citationKindLabel(citation: Citation): string
export function citationHint(citation: Citation): string
export function citationHref(citation: Citation, basePath?: string): string | null
export function openCitation<E>(
  citation: Citation,
  handlers: {
    fileSystem: Record<string, E[]>
    openEntry: (entry: E, path: string) => void
    openApp: (app: string) => void
    openUrl: (href: string) => void
    basePath?: string
  },
): boolean
export function strengthLabel(strength: Strength): string
export function matchCounts(requirements: Pick<Requirement, 'strength'>[]): Record<Strength, number>
export function matchCountsText(requirements: Pick<Requirement, 'strength'>[]): string
export function tailoredCvHtml(cv: TailoredCv): string
export function tailoredCvFileName(cv: Pick<TailoredCv, 'name'>): string
export function saveTailoredCv(cv: TailoredCv, doc?: Document): string
export function watchCvFrame(frame: HTMLIFrameElement | null): () => void
export function printTailoredCv(frame: HTMLIFrameElement | null): boolean
