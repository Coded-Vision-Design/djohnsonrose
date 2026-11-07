export type VitalId = 'LCP' | 'CLS' | 'INP' | 'FID' | 'FCP' | 'TTFB'
export type Rating = 'good' | 'needs-improvement' | 'poor'
export type Tone = 'good' | 'warn' | 'poor' | 'neutral'

export const VITAL_THRESHOLDS: Record<VitalId, readonly [number, number]>
export const RATING_COLOURS: Record<Rating, string>
export const RATING_LABELS: Record<Rating, string>
export const TONE_COLOURS: Record<Tone, string>

export type TaskManagerTab = 'processes' | 'performance' | 'build'
export const TASK_MANAGER_TABS: { id: TaskManagerTab; label: string }[]
/** The tab to move to for a key pressed on the tab list, or null. */
export function tabAfterKey(key: string, index: number, count: number): number | null

export function rateVital(id: VitalId, value: number): Rating | null
export function formatDuration(ms: number): string
export function formatBytes(bytes: number): string
export function formatVitalValue(id: VitalId, value: number): string
export function vitalThresholdText(id: VitalId): string

export interface LayoutShiftLike {
  value: number
  startTime: number
  hadRecentInput?: boolean
}
export function clsFromShifts(shifts: LayoutShiftLike[]): number

export interface EventTimingLike {
  interactionId: number
  duration: number
}
export function inpFromEvents(events: EventTimingLike[], interactionCount?: number): number | null

export interface PaintMetric {
  supported: boolean
  value: number | null
  /** The page loaded in a background tab, so its paints do not count. */
  hidden: boolean
}
export interface VitalsReading {
  LCP: PaintMetric
  CLS: { supported: boolean; value: number | null }
  interaction: { id: 'INP' | 'FID'; supported: boolean; value: number | null; under: boolean }
  FCP: PaintMetric
  TTFB: { supported: boolean; value: number | null }
  /** The browser's list of downloads filled up. */
  resourcesFull: boolean
}
export interface VitalsCollector {
  read(): VitalsReading
  stop(): void
}
export interface VitalsEnv {
  PerformanceObserver?: unknown
  performance?: unknown
  document?: unknown
  PerformanceEventTiming?: unknown
}
export function createVitalsCollector(env?: VitalsEnv): VitalsCollector
/** The page's one collector, started on first use. */
export function startVitals(): VitalsCollector

export interface VitalCard {
  id: VitalId
  name: string
  state: 'measured' | 'waiting' | 'unsupported'
  value: string
  rating: Rating | 'none'
  ratingLabel: string
  colour: string | null
  scale: string
  note: string
}
export function vitalCards(reading: VitalsReading): VitalCard[]

export type ResourceGroupId = 'scripts' | 'styles' | 'images' | 'fonts' | 'data' | 'other'
export const RESOURCE_GROUPS: { id: ResourceGroupId; label: string }[]

/** The parts of a PerformanceResourceTiming entry that are read. */
export interface ResourceLike {
  name: string
  initiatorType?: string
  transferSize?: number
  encodedBodySize?: number
  decodedBodySize?: number
  contentType?: string
  deliveryType?: string
}
export function resourceGroup(entry: ResourceLike): ResourceGroupId
export function resourceName(url: string, origin?: string): string

interface Sized {
  transferred: number
  size: number
  transferredText: string
  sizeText: string
}
export interface DownloadGroup extends Sized {
  id: ResourceGroupId
  label: string
  requests: number
  cached: number
}
export interface DownloadFile extends Sized {
  url: string
  name: string
  group: ResourceGroupId
  groupLabel: string
  cached: boolean
}
export interface DownloadSummary {
  groups: DownloadGroup[]
  total: Sized & { requests: number; cached: number; unreported: number }
  largest: DownloadFile[]
  notes: string[]
}
export function summariseDownloads(
  entries: ResourceLike[],
  options?: { origin?: string; navigation?: ResourceLike | null; limit?: number; full?: boolean },
): DownloadSummary

export function appOwnsFile(appId: string, url: string): boolean
export function appFiles(appId: string, entries: ResourceLike[]): { files: number; size: number; transferred: number; text: string }
export function windowStatusLabel(state: string | undefined): string

export interface ProcessRow {
  id: number
  app: string
  title: string
  status: string
  files: string
}
export function processRows(windows: { id: number; app: string; title: string; state?: string }[], entries: ResourceLike[]): ProcessRow[]

export interface JsHeap {
  used: number
  total: number
  limit: number
  text: string
}
export function jsHeap(perf?: { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }): JsHeap | null

export interface CheckResult {
  name: string
  result: string
}
export interface BuildInfo {
  commit: string
  shortCommit: string
  deployedAt: string
  checks:
    | { state: 'read' | 'none'; ranOn: 'pull-request' | 'commit'; results: CheckResult[] }
    | { state: 'unreadable'; ranOn?: undefined; results: CheckResult[] }
}
export function parseBuildInfo(value: unknown): { ok: true; build: BuildInfo } | { ok: false; reason: string }

export type BuildInfoResult =
  | { state: 'deployed'; build: BuildInfo }
  | { state: 'local' }
  | { state: 'unreadable'; reason?: string }
export function loadBuildInfo(
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>,
  url?: string,
): Promise<BuildInfoResult>

export function checkResultLabel(result: string): { label: string; tone: Tone }
export function summariseChecks(results: { result: string }[]): string
export function formatDeployTime(iso: string, options?: { timeZone?: string }): string

export interface BuildView {
  state: 'loading' | 'deployed' | 'local' | 'unreadable'
  title: string
  message: string
  commit: string
  deployed: string
  checksTitle: string
  checksMessage: string
  checks: { name: string; label: string; tone: Tone }[]
}
export function buildView(result: BuildInfoResult | null, options?: { timeZone?: string }): BuildView
