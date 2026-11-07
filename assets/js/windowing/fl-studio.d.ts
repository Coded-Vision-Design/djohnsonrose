export const STEPS_PER_BAR: number
export const MAX_PATTERN_BARS: number
export const TRACKS: number
export const SONG_BARS: number
export const MAX_CHANNELS: number
export const MAX_PATTERNS: number
export const LOWEST_PITCH: number
export const HIGHEST_PITCH: number
export const MIN_BPM: number
export const MAX_BPM: number
export const FL_PROJECT_KEY: string
export const FL_FOLDER: string

export interface FlInstrument {
  id: string
  name: string
  kind: 'drum' | 'synth'
  root: number
  colour: string
}
export const INSTRUMENTS: FlInstrument[]

export interface FlNote {
  step: number
  length: number
  pitch: number
}
export interface FlChannel {
  id: string
  name: string
  instrument: string
  volume: number
  pan: number
  mute: boolean
  solo: boolean
}
export interface FlPattern {
  id: string
  name: string
  bars: number
  colour: string
  notes: Record<string, FlNote[]>
}
export interface FlClip {
  id: string
  patternId: string
  track: number
  bar: number
}
export interface FlProject {
  version: number
  name: string
  bpm: number
  masterVolume: number
  channels: FlChannel[]
  patterns: FlPattern[]
  playlist: FlClip[]
}
export type FlMode = 'pattern' | 'song'
export interface FlHistory {
  past: FlProject[]
  future: FlProject[]
}
export interface FlNoteAt {
  step: number
  pitch: number
}

export function instrumentFor(channel: FlChannel): FlInstrument
export function noteName(pitch: number): string
export function isBlackKey(pitch: number): boolean
export function noteFrequency(pitch: number): number
export function stepSeconds(bpm: number): number
export function positionLabel(step: number): string
export function typingKeyPitch(key: string, octave: number): number | null

export function createEmptyProject(): FlProject
export function createDemoProject(): FlProject
export function patternSteps(pattern: FlPattern | undefined): number

export function stepOn(pattern: FlPattern | undefined, channelId: string, step: number): boolean
export function toggleStep(project: FlProject, patternId: string, channelId: string, step: number): FlProject
export function addNote(project: FlProject, patternId: string, channelId: string, note: FlNote): FlProject
export function removeNote(project: FlProject, patternId: string, channelId: string, at: FlNoteAt): FlProject
export function moveNote(project: FlProject, patternId: string, channelId: string, at: FlNoteAt, to: FlNoteAt): FlProject
export function resizeNote(project: FlProject, patternId: string, channelId: string, at: FlNoteAt, length: number): FlProject
export function clearPattern(project: FlProject, patternId: string): FlProject

export function addPattern(project: FlProject): { project: FlProject; id: string }
export function clonePattern(project: FlProject, patternId: string): { project: FlProject; id: string }
export function renamePattern(project: FlProject, patternId: string, name: string): FlProject
export function deletePattern(project: FlProject, patternId: string): FlProject
export function setPatternBars(project: FlProject, patternId: string, bars: number): FlProject

export function addChannel(project: FlProject, instrumentId: string): FlProject
export function removeChannel(project: FlProject, channelId: string): FlProject
export function updateChannel(project: FlProject, channelId: string, patch: Partial<FlChannel>): FlProject
export function soloChannel(project: FlProject, channelId: string): FlProject
export function audibleChannels(project: FlProject): Set<string>
export function setTempo(project: FlProject, bpm: number | string): FlProject
export function setMasterVolume(project: FlProject, volume: number | string): FlProject
export function renameProject(project: FlProject, name: string): FlProject

export function placeClip(project: FlProject, at: { patternId: string; track: number; bar: number }): FlProject
export function moveClip(project: FlProject, clipId: string, to: { track: number; bar: number }): FlProject
export function removeClip(project: FlProject, clipId: string): FlProject
export function songBars(project: FlProject): number

export function loopSteps(project: FlProject, mode: FlMode, patternId: string): number
export function notesAt(
  project: FlProject,
  mode: FlMode,
  patternId: string,
  step: number,
): { channelId: string; pitch: number; length: number }[]

export function serialiseProject(project: FlProject): string
export function parseProject(text: string | null | undefined): FlProject | null
export function projectFileName(project: FlProject): string
export function saveProjectFile<T extends Record<string, unknown[]>>(
  fs: T,
  project: FlProject,
  name: string,
  icons: { folder: string; file: string },
): T
export function projectFiles<E extends { name: string; type: string; modified?: number }>(fs: Record<string, E[]>): E[]

export function recordEdit(history: FlHistory, project: FlProject): FlHistory
export function undo(history: FlHistory, current: FlProject): { project: FlProject; history: FlHistory } | null
export function redo(history: FlHistory, current: FlProject): { project: FlProject; history: FlHistory } | null

export function encodeWav(channelData: Float32Array[], sampleRate: number): ArrayBuffer

export function playNote(
  ctx: BaseAudioContext,
  out: AudioNode,
  channel: FlChannel,
  pitch: number,
  when: number,
  duration: number,
  velocity?: number,
): void

export interface FlSource {
  project: FlProject
  mode: FlMode
  patternId: string
}
export interface FlEngine {
  readonly playing: boolean
  unlock(): void
  play(): void
  pause(): void
  stop(): void
  toggle(): void
  seek(step: number): void
  position(): number
  levels(): { master: number; channels: Record<string, number> }
  preview(channelId: string, pitch?: number): void
  dispose(): void
}
export function createEngine(
  source: () => FlSource,
  options?: { onChange?: (state: { playing: boolean; step: number }) => void },
): FlEngine
export function renderWav(project: FlProject, mode: FlMode, patternId: string): Promise<Blob>
export function startPainter(root: HTMLElement, engine: FlEngine): () => void

export function beginPianoGesture(
  event: PointerEvent,
  grid: HTMLElement,
  ctx: {
    read(): { project: FlProject; patternId: string; channelId: string }
    write(project: FlProject, record: boolean): void
    top: number
    length(): number
    setLength(length: number): void
    preview(pitch: number): void
  },
): void
export function beginPlaylistGesture(
  event: PointerEvent,
  lanes: HTMLElement,
  ctx: {
    read(): { project: FlProject; patternId: string }
    write(project: FlProject, record: boolean): void
  },
): void

export interface FlMenuItem {
  id?: string
  label?: string
  shortcut?: string
  option?: string
  separator?: boolean
}
export const FL_MENUS: { id: string; label: string; items: FlMenuItem[] }[]
export const FL_PANELS: FlPanel[]
export type FlPanel = 'browser' | 'rack' | 'piano' | 'playlist' | 'mixer'
export type FlViews = Record<FlPanel, boolean>
export const FL_PANEL_LABELS: Record<FlPanel, string>
export const FL_START_VIEWS: FlViews
export const FL_ICONS: Record<'play' | 'pause' | 'stop' | FlPanel, string>
export function startingProject(fileContent: string | null | undefined, saved: string | null | undefined): FlProject
export function menuItemState(
  id: string,
  state: { project: FlProject; patternId: string; history: FlHistory; views: Record<string, boolean> },
): { checked?: boolean; disabled?: boolean }
export function downloadBlob(blob: Blob, name: string): void

export interface FlApp {
  read(): {
    project: FlProject
    mode: FlMode
    patternId: string
    channelId: string
    history: FlHistory
    views: Record<string, boolean>
    fileName: string | null
  }
  commit(project: FlProject, record?: boolean): void
  load(project: FlProject, fileName: string | null): void
  restore(project: FlProject, history: FlHistory): void
  selectPattern(id: string): void
  selectChannel(id: string): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setViews(views: any): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setTab(panel: any): void
  dialog(name: 'open' | 'saveAs' | 'help'): void
  hint(text: string): void
  setFileName(name: string): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changeFiles(change: (fs: any) => any): void
  icons: { folder: string; file: string }
  engine: Pick<FlEngine, 'toggle' | 'stop'>
}
export type FlCommands = Record<string, () => void> & {
  saveNamed(name: string): void
  openFile(entry: { name: string; content?: string }): void
}
export function flCommands(app: FlApp): FlCommands
export const FL_HELP: string[]
export function flShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): string | null
