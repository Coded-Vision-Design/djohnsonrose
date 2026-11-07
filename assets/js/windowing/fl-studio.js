// FL Studio, shared by both builds. Everything here is framework-neutral: the
// project model and every edit to it (pure functions that return a new
// project), the instruments, the audio engine and its scheduler, the WAV
// export, and a painter for the parts of the screen that move while playing.
// Each build only draws the screen and calls these, so the two cannot differ
// in how anything works.

import { parentPath, writeTextFile } from './file-ops.js';

// ---- Constants ---------------------------------------------------------------

export const STEPS_PER_BAR = 16;
export const MAX_PATTERN_BARS = 4;
export const TRACKS = 8;
export const SONG_BARS = 32;
export const MAX_CHANNELS = 16;
export const MAX_PATTERNS = 24;
export const LOWEST_PITCH = 12;
export const HIGHEST_PITCH = 108;
export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const FL_PROJECT_KEY = 'fl.project';
export const FL_FOLDER = 'C:\\Users\\DeVante\\Documents\\FL Studio';
const HISTORY_LIMIT = 50;
const NAME_LIMIT = 32;

/** Built-in instruments. Drums play their own sound at root and shift with pitch. */
export const INSTRUMENTS = [
  { id: 'kick', name: 'Kick', kind: 'drum', root: 48, colour: '#f28c28' },
  { id: 'clap', name: 'Clap', kind: 'drum', root: 51, colour: '#3fb4e6' },
  { id: 'snare', name: 'Snare', kind: 'drum', root: 50, colour: '#e64a8a' },
  { id: 'hat', name: 'Hat', kind: 'drum', root: 54, colour: '#e6d23f' },
  { id: 'openhat', name: 'Open Hat', kind: 'drum', root: 58, colour: '#c9b83a' },
  { id: 'perc', name: 'Perc', kind: 'drum', root: 49, colour: '#a07ce6' },
  { id: 'bass', name: 'Bass', kind: 'synth', root: 36, colour: '#e64a3f' },
  { id: 'keys', name: 'Keys', kind: 'synth', root: 60, colour: '#f2f2f2' },
  { id: 'lead', name: 'Lead', kind: 'synth', root: 72, colour: '#6ad65a' },
  { id: 'pad', name: 'Pad', kind: 'synth', root: 60, colour: '#5ad6c4' },
  { id: 'pluck', name: 'Pluck', kind: 'synth', root: 72, colour: '#e6a03f' },
];

const PATTERN_COLOURS = ['#5f9b3a', '#3a7e9b', '#9b3a6e', '#9b7a3a', '#5a3a9b', '#3a9b84', '#9b4a3a', '#7a9b3a'];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ---- Small helpers -----------------------------------------------------------

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const toNumber = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const instrumentById = (id) => INSTRUMENTS.find((item) => item.id === id);
export const instrumentFor = (channel) => instrumentById(channel.instrument) ?? INSTRUMENTS[0];

function nextId(prefix, items) {
  const used = new Set(items.map((item) => item.id));
  let n = items.length + 1;
  while (used.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

function freeName(base, items) {
  const names = new Set(items.map((item) => item.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

const cleanName = (value, fallback) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_LIMIT);
  return text || fallback;
};

// ---- Notes and time ------------------------------------------------------------

/** FL Studio's names, where middle C (MIDI 60) is C5. */
export function noteName(pitch) {
  return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12)}`;
}

export const isBlackKey = (pitch) => NOTE_NAMES[pitch % 12].includes('#');

export function noteFrequency(pitch) {
  return 440 * 2 ** ((pitch - 69) / 12);
}

/** A step is a sixteenth note. */
export function stepSeconds(bpm) {
  return 60 / bpm / 4;
}

export function positionLabel(step) {
  const whole = Math.max(0, Math.floor(step));
  const bar = Math.floor(whole / STEPS_PER_BAR) + 1;
  const beat = Math.floor((whole % STEPS_PER_BAR) / 4) + 1;
  return `${bar}:${beat}:${(whole % 4) + 1}`;
}

const TYPING_ROWS = ['zsxdcvgbhnjm', 'q2w3er5t6y7u'];

/** FL Studio's typing keyboard: the bottom row is one octave and Q starts the next. */
export function typingKeyPitch(key, octave) {
  const lower = String(key).toLowerCase();
  for (const [row, keys] of TYPING_ROWS.entries()) {
    const index = keys.indexOf(lower);
    if (index >= 0 && lower.length === 1) return clamp((octave + row) * 12 + index, LOWEST_PITCH, HIGHEST_PITCH);
  }
  return null;
}

// ---- Projects --------------------------------------------------------------------

function makeChannel(instrumentId, channels) {
  const instrument = instrumentById(instrumentId) ?? INSTRUMENTS[0];
  return {
    id: nextId('c', channels),
    name: freeName(instrument.name, channels),
    instrument: instrument.id,
    volume: 0.8,
    pan: 0,
    mute: false,
    solo: false,
  };
}

function makePattern(patterns, name) {
  const id = nextId('p', patterns);
  return {
    id,
    name: name ?? freeName(`Pattern ${patterns.length + 1}`, patterns),
    bars: 1,
    colour: PATTERN_COLOURS[patterns.length % PATTERN_COLOURS.length],
    notes: {},
  };
}

export function createEmptyProject() {
  let channels = [];
  for (const id of ['kick', 'clap', 'hat', 'snare']) channels = [...channels, makeChannel(id, channels)];
  return {
    version: 1,
    name: 'Untitled',
    bpm: 130,
    masterVolume: 0.8,
    channels,
    patterns: [makePattern([])],
    playlist: [],
  };
}

const steps = (list, length, pitch) => list.map((step) => ({ step, length, pitch }));
const chord = (step, length, pitches) => pitches.map((pitch) => ({ step, length, pitch }));

/** A short house loop in A minor, so there is something to hear straight away. */
export function createDemoProject() {
  let channels = [];
  for (const id of ['kick', 'clap', 'hat', 'openhat', 'bass', 'keys', 'lead']) channels = [...channels, makeChannel(id, channels)];
  const [kick, clap, hat, openhat, bass, keys, lead] = channels.map((channel) => channel.id);

  const bassBar = (root, bar) => steps([0, 3, 6, 8, 11, 14].map((step) => bar * 16 + step), 2, root);
  const progression = [
    [57, 60, 64],
    [57, 60, 65],
    [55, 60, 64],
    [55, 59, 62],
  ];
  const stabs = progression.flatMap((pitches, bar) => [2, 6, 10, 14].flatMap((step) => chord(bar * 16 + step, 2, pitches)));
  const melody = [
    [0, 4, 76], [4, 2, 74], [6, 2, 72], [8, 6, 69],
    [16, 4, 77], [20, 2, 76], [22, 2, 74], [24, 6, 72],
    [32, 4, 76], [36, 2, 79], [38, 2, 76], [40, 6, 72],
    [48, 4, 74], [52, 2, 72], [54, 2, 71], [56, 8, 69],
  ].map(([step, length, pitch]) => ({ step, length, pitch }));

  const patterns = [
    { id: 'p1', name: 'Drums', bars: 1, colour: PATTERN_COLOURS[0], notes: {
      [kick]: steps([0, 4, 8, 12], 1, 48),
      [clap]: steps([4, 12], 1, 51),
      [hat]: steps([2, 6, 10, 14], 1, 54),
      [openhat]: steps([14], 1, 58),
    } },
    { id: 'p2', name: 'Bass', bars: 4, colour: PATTERN_COLOURS[1], notes: {
      [bass]: [...bassBar(33, 0), ...bassBar(29, 1), ...bassBar(36, 2), ...bassBar(31, 3)],
    } },
    { id: 'p3', name: 'Chords', bars: 4, colour: PATTERN_COLOURS[2], notes: { [keys]: stabs } },
    { id: 'p4', name: 'Melody', bars: 4, colour: PATTERN_COLOURS[3], notes: { [lead]: melody } },
  ];

  const playlist = [];
  const clip = (patternId, track, bar) => playlist.push({ id: `k${playlist.length + 1}`, patternId, track, bar });
  for (let bar = 0; bar < 8; bar += 1) clip('p1', 0, bar);
  clip('p2', 1, 0);
  clip('p2', 1, 4);
  clip('p3', 2, 0);
  clip('p3', 2, 4);
  clip('p4', 3, 4);

  return { version: 1, name: 'Demo', bpm: 124, masterVolume: 0.8, channels, patterns, playlist };
}

// ---- Editing helpers -----------------------------------------------------------------

const patternById = (project, patternId) => project.patterns.find((pattern) => pattern.id === patternId);
export const patternSteps = (pattern) => (pattern?.bars ?? 1) * STEPS_PER_BAR;

function withPattern(project, patternId, change) {
  const pattern = patternById(project, patternId);
  if (!pattern) return project;
  const next = change(pattern);
  if (next === pattern) return project;
  return { ...project, patterns: project.patterns.map((item) => (item.id === patternId ? next : item)) };
}

function withNotes(project, patternId, channelId, change) {
  if (!project.channels.some((channel) => channel.id === channelId)) return project;
  return withPattern(project, patternId, (pattern) => {
    const current = pattern.notes[channelId] ?? [];
    const next = change(current, pattern);
    if (next === current) return pattern;
    const sorted = [...next].sort((a, b) => a.step - b.step || a.pitch - b.pitch);
    return { ...pattern, notes: { ...pattern.notes, [channelId]: sorted } };
  });
}

const sameNote = (note, at) => note.step === at.step && note.pitch === at.pitch;

function fitNote(note, pattern) {
  const total = patternSteps(pattern);
  const step = clamp(Math.round(note.step), 0, total - 1);
  return {
    step,
    length: clamp(Math.round(note.length), 1, total - step),
    pitch: clamp(Math.round(note.pitch), LOWEST_PITCH, HIGHEST_PITCH),
  };
}

// ---- Step sequencer -------------------------------------------------------------------

export function stepOn(pattern, channelId, step) {
  return (pattern?.notes[channelId] ?? []).some((note) => note.step === step);
}

export function toggleStep(project, patternId, channelId, step) {
  const channel = project.channels.find((item) => item.id === channelId);
  const pattern = patternById(project, patternId);
  if (!channel || !pattern || step < 0 || step >= patternSteps(pattern)) return project;
  return withNotes(project, patternId, channelId, (notes) =>
    notes.some((note) => note.step === step)
      ? notes.filter((note) => note.step !== step)
      : [...notes, { step, length: 1, pitch: instrumentFor(channel).root }],
  );
}

// ---- Piano roll ----------------------------------------------------------------------------

export function addNote(project, patternId, channelId, note) {
  return withNotes(project, patternId, channelId, (notes, pattern) => {
    const fitted = fitNote(note, pattern);
    return [...notes.filter((item) => !sameNote(item, fitted)), fitted];
  });
}

export function removeNote(project, patternId, channelId, at) {
  return withNotes(project, patternId, channelId, (notes) =>
    notes.some((note) => sameNote(note, at)) ? notes.filter((note) => !sameNote(note, at)) : notes,
  );
}

export function moveNote(project, patternId, channelId, at, to) {
  return withNotes(project, patternId, channelId, (notes, pattern) => {
    const note = notes.find((item) => sameNote(item, at));
    if (!note) return notes;
    const moved = fitNote({ ...note, step: to.step, pitch: to.pitch }, pattern);
    return [...notes.filter((item) => item !== note && !sameNote(item, moved)), moved];
  });
}

export function resizeNote(project, patternId, channelId, at, length) {
  return withNotes(project, patternId, channelId, (notes, pattern) => {
    const note = notes.find((item) => sameNote(item, at));
    if (!note) return notes;
    return notes.map((item) => (item === note ? fitNote({ ...note, length }, pattern) : item));
  });
}

export function clearPattern(project, patternId) {
  return withPattern(project, patternId, (pattern) => ({ ...pattern, notes: {} }));
}

// ---- Patterns -------------------------------------------------------------------------------

export function addPattern(project) {
  if (project.patterns.length >= MAX_PATTERNS) return { project, id: project.patterns.at(-1).id };
  const pattern = makePattern(project.patterns);
  return { project: { ...project, patterns: [...project.patterns, pattern] }, id: pattern.id };
}

export function clonePattern(project, patternId) {
  const source = patternById(project, patternId);
  if (!source || project.patterns.length >= MAX_PATTERNS) return { project, id: patternId };
  const pattern = {
    ...makePattern(project.patterns, freeName(cleanName(`${source.name} (copy)`, 'Pattern'), project.patterns)),
    bars: source.bars,
    notes: structuredClone(source.notes),
  };
  return { project: { ...project, patterns: [...project.patterns, pattern] }, id: pattern.id };
}

export function renamePattern(project, patternId, name) {
  return withPattern(project, patternId, (pattern) => ({ ...pattern, name: cleanName(name, pattern.name) }));
}

export function deletePattern(project, patternId) {
  if (project.patterns.length <= 1 || !patternById(project, patternId)) return project;
  return {
    ...project,
    patterns: project.patterns.filter((pattern) => pattern.id !== patternId),
    playlist: project.playlist.filter((clip) => clip.patternId !== patternId),
  };
}

export function setPatternBars(project, patternId, bars) {
  const length = clamp(Math.round(bars), 1, MAX_PATTERN_BARS);
  return withPattern(project, patternId, (pattern) => {
    if (pattern.bars === length) return pattern;
    const shorter = { ...pattern, bars: length };
    const notes = Object.fromEntries(
      Object.entries(pattern.notes).map(([channelId, list]) => [
        channelId,
        list.filter((note) => note.step < patternSteps(shorter)).map((note) => fitNote(note, shorter)),
      ]),
    );
    return { ...shorter, notes };
  });
}

// ---- Channels and mixer ---------------------------------------------------------------------

export function addChannel(project, instrumentId) {
  if (project.channels.length >= MAX_CHANNELS) return project;
  return { ...project, channels: [...project.channels, makeChannel(instrumentId, project.channels)] };
}

export function removeChannel(project, channelId) {
  if (project.channels.length <= 1 || !project.channels.some((channel) => channel.id === channelId)) return project;
  return {
    ...project,
    channels: project.channels.filter((channel) => channel.id !== channelId),
    patterns: project.patterns.map((pattern) => {
      const notes = { ...pattern.notes };
      delete notes[channelId];
      return { ...pattern, notes };
    }),
  };
}

export function updateChannel(project, channelId, patch) {
  return {
    ...project,
    channels: project.channels.map((channel) => {
      if (channel.id !== channelId) return channel;
      const next = { ...channel, ...patch };
      return {
        ...next,
        name: cleanName(next.name, channel.name),
        instrument: instrumentById(next.instrument) ? next.instrument : channel.instrument,
        volume: clamp(toNumber(next.volume, channel.volume), 0, 1),
        pan: clamp(toNumber(next.pan, channel.pan), -1, 1),
        mute: Boolean(next.mute),
        solo: Boolean(next.solo),
      };
    }),
  };
}

/** Solo one channel. Soloing it again lets every channel play. */
export function soloChannel(project, channelId) {
  const target = project.channels.find((channel) => channel.id === channelId);
  if (!target) return project;
  const already = target.solo && project.channels.every((channel) => channel.id === channelId || !channel.solo);
  return { ...project, channels: project.channels.map((channel) => ({ ...channel, solo: !already && channel.id === channelId })) };
}

export function audibleChannels(project) {
  const soloed = project.channels.filter((channel) => channel.solo);
  const playing = soloed.length ? soloed : project.channels;
  return new Set(playing.filter((channel) => !channel.mute).map((channel) => channel.id));
}

export function setTempo(project, bpm) {
  return { ...project, bpm: clamp(Math.round(toNumber(bpm, project.bpm)), MIN_BPM, MAX_BPM) };
}

export function setMasterVolume(project, volume) {
  return { ...project, masterVolume: clamp(toNumber(volume, project.masterVolume), 0, 1) };
}

export function renameProject(project, name) {
  return { ...project, name: cleanName(name, project.name) };
}

// ---- Playlist ----------------------------------------------------------------------------------

const clipBars = (project, clip) => patternById(project, clip.patternId)?.bars ?? 1;
const overlaps = (a, aBars, b, bBars) => a.track === b.track && a.bar < b.bar + bBars && b.bar < a.bar + aBars;

function fitClip(project, clip) {
  const bars = clipBars(project, clip);
  return { ...clip, track: clamp(Math.round(clip.track), 0, TRACKS - 1), bar: clamp(Math.round(clip.bar), 0, SONG_BARS - bars) };
}

/** Places a pattern on the playlist, replacing whatever it would overlap on that track. */
export function placeClip(project, { patternId, track, bar }) {
  if (!patternById(project, patternId)) return project;
  const clip = fitClip(project, { id: nextId('k', project.playlist), patternId, track, bar });
  const bars = clipBars(project, clip);
  const kept = project.playlist.filter((other) => !overlaps(clip, bars, other, clipBars(project, other)));
  return { ...project, playlist: [...kept, clip] };
}

export function moveClip(project, clipId, { track, bar }) {
  const clip = project.playlist.find((item) => item.id === clipId);
  if (!clip) return project;
  const moved = fitClip(project, { ...clip, track, bar });
  const bars = clipBars(project, moved);
  const kept = project.playlist.filter((other) => other.id !== clipId && !overlaps(moved, bars, other, clipBars(project, other)));
  return { ...project, playlist: [...kept, moved] };
}

export function removeClip(project, clipId) {
  return { ...project, playlist: project.playlist.filter((clip) => clip.id !== clipId) };
}

export function songBars(project) {
  return Math.max(1, ...project.playlist.map((clip) => clip.bar + clipBars(project, clip)));
}

// ---- What plays when -----------------------------------------------------------------------------

export function loopSteps(project, mode, patternId) {
  return mode === 'song' ? songBars(project) * STEPS_PER_BAR : patternSteps(patternById(project, patternId) ?? project.patterns[0]);
}

function patternNotesAt(project, pattern, step, out) {
  for (const channel of project.channels) {
    for (const note of pattern.notes[channel.id] ?? []) {
      if (note.step === step) out.push({ channelId: channel.id, pitch: note.pitch, length: note.length });
    }
  }
}

/** Every note that starts at a step of the pattern, or of the song. */
export function notesAt(project, mode, patternId, step) {
  const out = [];
  if (mode !== 'song') {
    const pattern = patternById(project, patternId) ?? project.patterns[0];
    patternNotesAt(project, pattern, step, out);
    return out;
  }
  for (const clip of project.playlist) {
    const pattern = patternById(project, clip.patternId);
    const local = step - clip.bar * STEPS_PER_BAR;
    if (pattern && local >= 0 && local < patternSteps(pattern)) patternNotesAt(project, pattern, local, out);
  }
  return out;
}

// ---- Saving and opening ----------------------------------------------------------------------------

export function serialiseProject(project) {
  return JSON.stringify(project);
}

/** Reads a saved project, repairing anything out of range. Returns null if it is not one. */
export function parseProject(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.channels) || !Array.isArray(data.patterns)) return null;

  const channels = [];
  for (const raw of data.channels.slice(0, MAX_CHANNELS)) {
    if (!raw || typeof raw !== 'object') continue;
    const fallback = makeChannel(instrumentById(raw.instrument) ? raw.instrument : 'kick', channels);
    const id = typeof raw.id === 'string' && /^c\d{1,4}$/.test(raw.id) && !channels.some((c) => c.id === raw.id) ? raw.id : fallback.id;
    channels.push({
      id,
      name: cleanName(raw.name, fallback.name),
      instrument: fallback.instrument,
      volume: clamp(toNumber(raw.volume, 0.8), 0, 1),
      pan: clamp(toNumber(raw.pan, 0), -1, 1),
      mute: Boolean(raw.mute),
      solo: Boolean(raw.solo),
    });
  }
  if (!channels.length) return null;

  const patterns = [];
  for (const raw of data.patterns.slice(0, MAX_PATTERNS)) {
    if (!raw || typeof raw !== 'object') continue;
    const base = makePattern(patterns);
    const id = typeof raw.id === 'string' && /^p\d{1,4}$/.test(raw.id) && !patterns.some((p) => p.id === raw.id) ? raw.id : base.id;
    const pattern = {
      id,
      name: cleanName(raw.name, base.name),
      bars: clamp(Math.round(toNumber(raw.bars, 1)), 1, MAX_PATTERN_BARS),
      colour: /^#[0-9a-f]{6}$/i.test(raw.colour) ? raw.colour : base.colour,
      notes: {},
    };
    for (const channel of channels) {
      const list = raw.notes && Array.isArray(raw.notes[channel.id]) ? raw.notes[channel.id] : [];
      const notes = [];
      for (const note of list.slice(0, 1024)) {
        if (!note || !Number.isFinite(note.step) || !Number.isFinite(note.pitch)) continue;
        if (note.step < 0 || note.step >= patternSteps(pattern)) continue;
        const fitted = fitNote({ step: note.step, length: toNumber(note.length, 1), pitch: note.pitch }, pattern);
        if (!notes.some((item) => sameNote(item, fitted))) notes.push(fitted);
      }
      if (notes.length) pattern.notes[channel.id] = notes.sort((a, b) => a.step - b.step || a.pitch - b.pitch);
    }
    patterns.push(pattern);
  }
  if (!patterns.length) return null;

  let project = {
    version: 1,
    name: cleanName(data.name, 'Untitled'),
    bpm: clamp(Math.round(toNumber(data.bpm, 130)), MIN_BPM, MAX_BPM),
    masterVolume: clamp(toNumber(data.masterVolume, 0.8), 0, 1),
    channels,
    patterns,
    playlist: [],
  };
  for (const raw of Array.isArray(data.playlist) ? data.playlist.slice(0, 512) : []) {
    if (!raw || !patternById(project, raw.patternId)) continue;
    const before = project.playlist.length;
    project = placeClip(project, { patternId: raw.patternId, track: toNumber(raw.track, 0), bar: toNumber(raw.bar, 0) });
    if (project.playlist.length > before && typeof raw.id === 'string' && /^k\d{1,4}$/.test(raw.id) && !project.playlist.some((clip) => clip.id === raw.id)) {
      project.playlist[project.playlist.length - 1].id = raw.id;
    }
  }
  return project;
}

/** Saves a project into Documents\FL Studio, making the folder if needed. */
export function saveProjectFile(fs, project, name, icons) {
  let next = fs;
  if (!next[FL_FOLDER]) {
    const parent = parentPath(FL_FOLDER);
    const folder = { name: 'FL Studio', type: 'folder', icon: icons.folder, modified: Date.now() };
    next = { ...next, [parent]: [...(next[parent] ?? []).filter((entry) => entry.name !== 'FL Studio'), folder], [FL_FOLDER]: [] };
  }
  return writeTextFile(next, FL_FOLDER, name, serialiseProject(project), icons.file);
}

/** Saved projects, newest first. */
export function projectFiles(fs) {
  return (fs[FL_FOLDER] ?? [])
    .filter((entry) => entry.type === 'file' && /\.flp$/i.test(entry.name))
    .sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
}

export function projectFileName(project) {
  const safe = project.name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'Untitled';
  return `${safe}.flp`;
}

// ---- Undo and redo --------------------------------------------------------------------------------------

export function recordEdit(history, project) {
  return { past: [...history.past, project].slice(-HISTORY_LIMIT), future: [] };
}

export function undo(history, current) {
  if (!history.past.length) return null;
  return {
    project: history.past.at(-1),
    history: { past: history.past.slice(0, -1), future: [current, ...history.future].slice(0, HISTORY_LIMIT) },
  };
}

export function redo(history, current) {
  if (!history.future.length) return null;
  return {
    project: history.future[0],
    history: { past: [...history.past, current].slice(-HISTORY_LIMIT), future: history.future.slice(1) },
  };
}

// ---- WAV --------------------------------------------------------------------------------------------------

/** 16-bit PCM WAV from one Float32Array per channel. */
export function encodeWav(channelData, sampleRate) {
  const channels = channelData.length;
  const frames = channelData[0]?.length ?? 0;
  const bytes = frames * channels * 2;
  const buffer = new ArrayBuffer(44 + bytes);
  const view = new DataView(buffer);
  const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, bytes, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = clamp(channelData[channel][frame], -1, 1);
      view.setInt16(offset, (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0, true);
      offset += 2;
    }
  }
  return buffer;
}

// ---- Instruments ------------------------------------------------------------------------------------------

const noiseBuffers = new WeakMap();
function noise(ctx) {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 22222;
    for (let i = 0; i < data.length; i += 1) {
      // A fixed seed, so exports are the same every time.
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
    noiseBuffers.set(ctx, buffer);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function envelope(ctx, when, { attack = 0.003, peak = 1, decay = 0.2, sustain = 0, hold = 0, release = 0.05 }) {
  const gain = ctx.createGain();
  const g = gain.gain;
  g.setValueAtTime(0.0001, when);
  g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), when + attack);
  const settled = Math.max(peak * sustain, 0.0001);
  g.exponentialRampToValueAtTime(settled, when + attack + decay);
  const end = when + Math.max(attack + decay, hold);
  if (sustain > 0) g.setValueAtTime(settled, end);
  g.exponentialRampToValueAtTime(0.0001, end + release);
  return { gain, end: end + release };
}

function oscillator(ctx, type, frequency, when, detune = 0) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, when);
  osc.detune.setValueAtTime(detune, when);
  return osc;
}

function filter(ctx, type, frequency, q = 0.7) {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

function run(sources, when, end) {
  for (const source of sources) {
    source.start(when);
    source.stop(end + 0.02);
  }
}

const VOICES = {
  kick(ctx, out, { when, ratio, velocity }) {
    const osc = oscillator(ctx, 'sine', 160 * ratio, when);
    osc.frequency.exponentialRampToValueAtTime(42 * ratio, when + 0.11);
    const { gain, end } = envelope(ctx, when, { attack: 0.002, peak: velocity, decay: 0.42 });
    osc.connect(gain).connect(out);
    const click = noise(ctx);
    const clickEnv = envelope(ctx, when, { attack: 0.001, peak: velocity * 0.25, decay: 0.012 });
    click.connect(filter(ctx, 'highpass', 2500)).connect(clickEnv.gain).connect(out);
    run([osc], when, end);
    run([click], when, clickEnv.end);
  },
  snare(ctx, out, { when, ratio, velocity }) {
    const body = oscillator(ctx, 'triangle', 190 * ratio, when);
    body.frequency.exponentialRampToValueAtTime(140 * ratio, when + 0.08);
    const bodyEnv = envelope(ctx, when, { peak: velocity * 0.6, decay: 0.1 });
    body.connect(bodyEnv.gain).connect(out);
    const hiss = noise(ctx);
    const hissEnv = envelope(ctx, when, { peak: velocity * 0.7, decay: 0.18 });
    hiss.connect(filter(ctx, 'highpass', 1800 * ratio)).connect(hissEnv.gain).connect(out);
    run([body], when, bodyEnv.end);
    run([hiss], when, hissEnv.end);
  },
  clap(ctx, out, { when, ratio, velocity }) {
    const hiss = noise(ctx);
    const band = filter(ctx, 'bandpass', 1200 * ratio, 0.9);
    const gain = ctx.createGain();
    const g = gain.gain;
    g.setValueAtTime(0.0001, when);
    for (const offset of [0, 0.011, 0.022]) {
      g.setValueAtTime(velocity * 0.9, when + offset);
      g.exponentialRampToValueAtTime(0.05, when + offset + 0.009);
    }
    g.setValueAtTime(velocity * 0.8, when + 0.031);
    g.exponentialRampToValueAtTime(0.0001, when + 0.22);
    hiss.connect(band).connect(gain).connect(out);
    run([hiss], when, when + 0.22);
  },
  hat(ctx, out, { when, ratio, velocity }) {
    const hiss = noise(ctx);
    const { gain, end } = envelope(ctx, when, { attack: 0.001, peak: velocity * 0.45, decay: 0.045 });
    hiss.connect(filter(ctx, 'highpass', 7500 * ratio)).connect(gain).connect(out);
    run([hiss], when, end);
  },
  openhat(ctx, out, { when, ratio, velocity }) {
    const hiss = noise(ctx);
    const { gain, end } = envelope(ctx, when, { attack: 0.002, peak: velocity * 0.4, decay: 0.32 });
    hiss.connect(filter(ctx, 'highpass', 6800 * ratio)).connect(gain).connect(out);
    run([hiss], when, end);
  },
  perc(ctx, out, { when, ratio, velocity }) {
    const osc = oscillator(ctx, 'sine', 820 * ratio, when);
    osc.frequency.exponentialRampToValueAtTime(560 * ratio, when + 0.05);
    const { gain, end } = envelope(ctx, when, { attack: 0.001, peak: velocity * 0.7, decay: 0.07 });
    osc.connect(gain).connect(out);
    run([osc], when, end);
  },
  bass(ctx, out, { when, frequency, duration, velocity }) {
    const saw = oscillator(ctx, 'sawtooth', frequency, when);
    const sub = oscillator(ctx, 'sine', frequency, when);
    const low = filter(ctx, 'lowpass', 900, 6);
    low.frequency.setValueAtTime(1600, when);
    low.frequency.exponentialRampToValueAtTime(380, when + 0.18);
    const { gain, end } = envelope(ctx, when, { attack: 0.004, peak: velocity * 0.55, decay: 0.12, sustain: 0.75, hold: duration, release: 0.06 });
    saw.connect(low).connect(gain).connect(out);
    sub.connect(gain);
    run([saw, sub], when, end);
  },
  keys(ctx, out, { when, frequency, duration, velocity }) {
    const tone = oscillator(ctx, 'triangle', frequency, when);
    const bell = oscillator(ctx, 'sine', frequency * 2, when);
    const bellEnv = envelope(ctx, when, { attack: 0.002, peak: 0.35, decay: 0.25 });
    const { gain, end } = envelope(ctx, when, { attack: 0.004, peak: velocity * 0.45, decay: 0.9, sustain: 0.25, hold: duration, release: 0.25 });
    tone.connect(gain).connect(out);
    bell.connect(bellEnv.gain).connect(gain);
    run([tone], when, end);
    run([bell], when, bellEnv.end);
  },
  lead(ctx, out, { when, frequency, duration, velocity }) {
    const left = oscillator(ctx, 'sawtooth', frequency, when, -8);
    const right = oscillator(ctx, 'sawtooth', frequency, when, 8);
    const low = filter(ctx, 'lowpass', 2600, 3);
    const { gain, end } = envelope(ctx, when, { attack: 0.01, peak: velocity * 0.32, decay: 0.15, sustain: 0.7, hold: duration, release: 0.12 });
    left.connect(low);
    right.connect(low);
    low.connect(gain).connect(out);
    run([left, right], when, end);
  },
  pad(ctx, out, { when, frequency, duration, velocity }) {
    const voices = [-12, 0, 12].map((cents) => oscillator(ctx, 'sawtooth', frequency, when, cents));
    const low = filter(ctx, 'lowpass', 1300, 0.8);
    const { gain, end } = envelope(ctx, when, { attack: 0.3, peak: velocity * 0.2, decay: 0.3, sustain: 0.85, hold: duration, release: 0.7 });
    for (const voice of voices) voice.connect(low);
    low.connect(gain).connect(out);
    run(voices, when, end);
  },
  pluck(ctx, out, { when, frequency, duration, velocity }) {
    const osc = oscillator(ctx, 'square', frequency, when);
    const low = filter(ctx, 'lowpass', 3200, 4);
    low.frequency.setValueAtTime(3200, when);
    low.frequency.exponentialRampToValueAtTime(320, when + 0.25);
    const { gain, end } = envelope(ctx, when, { attack: 0.002, peak: velocity * 0.32, decay: 0.32, hold: Math.min(duration, 0.4), release: 0.08 });
    osc.connect(low).connect(gain).connect(out);
    run([osc], when, end);
  },
};

/** Plays one note of a channel's instrument into a node at an audio time. */
export function playNote(ctx, out, channel, pitch, when, duration, velocity = 0.9) {
  const instrument = instrumentFor(channel);
  VOICES[instrument.id](ctx, out, {
    when,
    duration,
    velocity,
    frequency: noteFrequency(pitch),
    ratio: 2 ** ((pitch - instrument.root) / 12),
  });
}

// ---- Mixing ---------------------------------------------------------------------------------------------------

function buildMixer(ctx, withMeters) {
  const master = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.ratio.value = 12;
  master.connect(limiter).connect(ctx.destination);
  const masterMeter = withMeters ? ctx.createAnalyser() : null;
  if (masterMeter) {
    masterMeter.fftSize = 512;
    limiter.connect(masterMeter);
  }
  const strips = new Map();
  const strip = (channelId) => {
    let found = strips.get(channelId);
    if (!found) {
      const input = ctx.createGain();
      const panner = ctx.createStereoPanner();
      const meter = withMeters ? ctx.createAnalyser() : null;
      input.connect(panner).connect(master);
      if (meter) {
        meter.fftSize = 512;
        panner.connect(meter);
      }
      found = { input, panner, meter, level: 0 };
      strips.set(channelId, found);
    }
    return found;
  };
  let applied = null;
  const apply = (project, smooth = true) => {
    if (smooth && project === applied) return;
    applied = project;
    const audible = audibleChannels(project);
    const now = ctx.currentTime;
    const set = (param, value) => (smooth ? param.setTargetAtTime(value, now, 0.015) : param.setValueAtTime(value, now));
    set(master.gain, project.masterVolume);
    for (const channel of project.channels) {
      const { input, panner } = strip(channel.id);
      set(input.gain, audible.has(channel.id) ? channel.volume : 0);
      set(panner.pan, channel.pan);
    }
    for (const [channelId, found] of strips) {
      if (!project.channels.some((channel) => channel.id === channelId)) {
        found.input.disconnect();
        strips.delete(channelId);
      }
    }
  };
  return { master, masterMeter, strip, strips, apply };
}

function scheduleNotes(ctx, mixer, project, mode, patternId, step, when) {
  const seconds = stepSeconds(project.bpm);
  for (const note of notesAt(project, mode, patternId, step)) {
    const channel = project.channels.find((item) => item.id === note.channelId);
    if (channel) playNote(ctx, mixer.strip(channel.id).input, channel, note.pitch, when, note.length * seconds);
  }
}

// ---- Engine ---------------------------------------------------------------------------------------------------------

const LOOKAHEAD = 0.12;
const TICK_MS = 25;

/**
 * The live engine. `source` returns what to play now, as { project, mode,
 * patternId }, so edits made while playing are heard straight away.
 */
export function createEngine(source, { onChange } = {}) {
  let ctx = null;
  let mixer = null;
  let timer = 0;
  let playing = false;
  let nextStep = 0;
  let nextTime = 0;
  let resumeStep = 0;
  let queue = [];
  let shown = 0;

  const notify = () => onChange?.({ playing, step: shown });

  function audio() {
    if (!ctx) {
      const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!Context) return null;
      ctx = new Context({ latencyHint: 'interactive' });
      mixer = buildMixer(ctx, true);
      mixer.apply(source().project, false);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tick() {
    const { project, mode, patternId } = source();
    mixer.apply(project);
    const length = loopSteps(project, mode, patternId);
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      if (nextStep >= length) nextStep = 0;
      scheduleNotes(ctx, mixer, project, mode, patternId, nextStep, nextTime);
      queue.push({ time: nextTime, step: nextStep });
      nextTime += stepSeconds(project.bpm);
      nextStep += 1;
    }
  }

  /** The step being heard now. */
  function position() {
    if (!playing || !ctx) return shown;
    const now = ctx.currentTime;
    while (queue.length > 1 && queue[1].time <= now) queue.shift();
    if (queue.length && queue[0].time <= now) shown = queue[0].step;
    return shown;
  }

  function play() {
    if (playing || !audio()) return;
    playing = true;
    nextStep = resumeStep;
    nextTime = ctx.currentTime + 0.05;
    queue = [];
    // Exact, not a glide: nothing is sounding yet, and a channel muted while
    // stopped must not leak its first note while its fader falls.
    mixer.apply(source().project, false);
    tick();
    timer = setInterval(tick, TICK_MS);
    notify();
  }

  function pause() {
    if (!playing) return;
    resumeStep = position();
    clearInterval(timer);
    playing = false;
    queue = [];
    notify();
  }

  return {
    get playing() {
      return playing;
    },
    /** Starts the audio on the first tap, as browsers require. */
    unlock() {
      audio();
    },
    play,
    pause,
    stop() {
      clearInterval(timer);
      playing = false;
      resumeStep = 0;
      shown = 0;
      queue = [];
      notify();
    },
    toggle() {
      if (playing) pause();
      else play();
    },
    /** Moves the playhead, whether or not it is playing. */
    seek(step) {
      resumeStep = Math.max(0, Math.floor(step));
      shown = resumeStep;
      if (playing) {
        nextStep = resumeStep;
        nextTime = ctx.currentTime + 0.03;
        queue = [];
      }
      notify();
    },
    position,
    /** Peak levels from 0 to 1, falling back slowly as a real meter does. */
    levels() {
      const result = { master: 0, channels: {} };
      if (!mixer) return result;
      const read = (meter, previous) => {
        if (!meter) return 0;
        const data = new Float32Array(meter.fftSize);
        meter.getFloatTimeDomainData(data);
        let peak = 0;
        for (const value of data) peak = Math.max(peak, Math.abs(value));
        return Math.max(Math.min(peak, 1), previous * 0.86);
      };
      mixer.masterLevel = read(mixer.masterMeter, mixer.masterLevel ?? 0);
      result.master = mixer.masterLevel;
      for (const [channelId, found] of mixer.strips) {
        found.level = read(found.meter, found.level);
        result.channels[channelId] = found.level;
      }
      return result;
    },
    /** Plays one note now, to hear a channel or a key. */
    preview(channelId, pitch) {
      if (!audio()) return;
      const { project } = source();
      const channel = project.channels.find((item) => item.id === channelId);
      if (!channel) return;
      mixer.apply(project, false);
      const target = pitch ?? instrumentFor(channel).root;
      playNote(ctx, mixer.strip(channel.id).input, channel, target, ctx.currentTime + 0.01, stepSeconds(project.bpm) * 2);
    },
    dispose() {
      clearInterval(timer);
      playing = false;
      ctx?.close().catch(() => {});
      ctx = null;
      mixer = null;
    },
  };
}

/** Renders the song, or one pattern, to a WAV file. */
export async function renderWav(project, mode, patternId) {
  const Offline = globalThis.OfflineAudioContext ?? globalThis.webkitOfflineAudioContext;
  if (!Offline) throw new Error('This browser cannot render audio.');
  const rate = 44100;
  const length = loopSteps(project, mode, patternId);
  const seconds = length * stepSeconds(project.bpm) + 1.5;
  const ctx = new Offline(2, Math.ceil(seconds * rate), rate);
  const mixer = buildMixer(ctx, false);
  mixer.apply(project, false);
  for (let step = 0; step < length; step += 1) {
    scheduleNotes(ctx, mixer, project, mode, patternId, step, step * stepSeconds(project.bpm) + 0.01);
  }
  const rendered = await ctx.startRendering();
  const wav = encodeWav([rendered.getChannelData(0), rendered.getChannelData(1)], rate);
  return new Blob([wav], { type: 'audio/wav' });
}

// ---- Painting the moving parts ---------------------------------------------------------------------------------------

/**
 * Keeps the playhead, step lights, position and meters moving without asking
 * the framework to redraw. Each build marks these with data attributes.
 */
export function startPainter(root, engine) {
  let frame = 0;
  let lastStep = -1;
  let lastLit = -1;
  const paint = () => {
    const step = engine.position();
    // Steps only light up while playing, as in FL Studio.
    const lit = engine.playing ? step : -1;
    if (step !== lastStep || lit !== lastLit) {
      lastStep = step;
      lastLit = lit;
      root.style.setProperty('--fl-pos', String(step));
      for (const el of root.querySelectorAll('[data-fl-col][data-now]')) el.removeAttribute('data-now');
      for (const el of root.querySelectorAll(`[data-fl-col="${lit}"]`)) el.setAttribute('data-now', '');
      for (const el of root.querySelectorAll('[data-fl-position]')) el.textContent = positionLabel(step);
    }
    const levels = engine.levels();
    for (const el of root.querySelectorAll('[data-fl-meter]')) {
      const id = el.getAttribute('data-fl-meter');
      const level = id === 'master' ? levels.master : (levels.channels[id] ?? 0);
      el.style.setProperty('--level', level.toFixed(3));
    }
    frame = requestAnimationFrame(paint);
  };
  frame = requestAnimationFrame(paint);
  return () => cancelAnimationFrame(frame);
}

// ---- Pointer gestures, shared so mouse and touch work the same in both builds ----

const cssNumber = (el, name) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || 1;

function track(element, event, onMove, onEnd) {
  element.setPointerCapture?.(event.pointerId);
  const end = (e) => {
    element.removeEventListener('pointermove', onMove);
    element.removeEventListener('pointerup', end);
    element.removeEventListener('pointercancel', end);
    onEnd(e);
  };
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerup', end);
  element.addEventListener('pointercancel', end);
}

/**
 * Piano roll. Click empty space to add a note, and drag right to lengthen it.
 * Drag a note to move it, drag its right edge to resize it, and click it, or
 * right-click it, to remove it. One gesture is one step of undo.
 *
 * ctx: { read() -> { project, patternId, channelId }, write(project, record),
 *        top: the highest pitch shown, length() / setLength(n), preview(pitch) }
 */
export function beginPianoGesture(event, grid, ctx) {
  const stepWidth = cssNumber(grid, '--fl-note-w');
  const rowHeight = cssNumber(grid, '--fl-row-h');
  const cell = (e) => {
    const box = grid.getBoundingClientRect();
    return {
      step: Math.max(0, Math.floor((e.clientX - box.left) / stepWidth)),
      pitch: clamp(ctx.top - Math.floor((e.clientY - box.top) / rowHeight), LOWEST_PITCH, HIGHEST_PITCH),
    };
  };
  const start = cell(event);
  const noteEl = event.target.closest?.('[data-fl-note]');
  const origin = noteEl ? (([step, pitch]) => ({ step, pitch }))(noteEl.getAttribute('data-fl-note').split(':').map(Number)) : null;
  let recorded = false;
  const write = (project) => {
    ctx.write(project, !recorded);
    recorded = true;
  };

  if (origin && event.button === 2) {
    const { project, patternId, channelId } = ctx.read();
    write(removeNote(project, patternId, channelId, origin));
    return;
  }
  if (event.button > 0) return;

  const mode = !origin ? 'draw' : event.target.closest('[data-fl-edge]') ? 'resize' : 'move';
  let current = origin;
  let moved = false;

  track(
    grid,
    event,
    (e) => {
      if (!moved && Math.hypot(e.clientX - event.clientX, e.clientY - event.clientY) < 5) return;
      moved = true;
      const { project, patternId, channelId } = ctx.read();
      const here = cell(e);
      if (mode === 'draw' || mode === 'resize') {
        let base = project;
        if (!current) {
          current = start;
          base = addNote(project, patternId, channelId, { ...start, length: 1 });
          ctx.preview(start.pitch);
        }
        const length = Math.max(1, here.step - current.step + 1);
        write(resizeNote(base, patternId, channelId, current, length));
        ctx.setLength(length);
      } else {
        const total = patternSteps(project.patterns.find((pattern) => pattern.id === patternId));
        const to = {
          step: clamp(origin.step + here.step - start.step, 0, total - 1),
          pitch: clamp(origin.pitch + here.pitch - start.pitch, LOWEST_PITCH, HIGHEST_PITCH),
        };
        if (to.step === current.step && to.pitch === current.pitch) return;
        if (to.pitch !== current.pitch) ctx.preview(to.pitch);
        write(moveNote(project, patternId, channelId, current, to));
        current = to;
      }
    },
    (e) => {
      if (e.type === 'pointercancel' || moved) return;
      const { project, patternId, channelId } = ctx.read();
      if (mode === 'draw') {
        write(addNote(project, patternId, channelId, { ...start, length: ctx.length() }));
        ctx.preview(start.pitch);
      } else {
        write(removeNote(project, patternId, channelId, origin));
      }
    },
  );
}

/**
 * Playlist. Click an empty bar to place the selected pattern there. Drag a
 * clip to move it, and click it, or right-click it, to remove it.
 *
 * ctx: { read() -> { project, patternId }, write(project, record) }
 */
export function beginPlaylistGesture(event, lanes, ctx) {
  const barWidth = cssNumber(lanes, '--fl-bar');
  const trackHeight = cssNumber(lanes, '--fl-track');
  const cell = (e) => {
    const box = lanes.getBoundingClientRect();
    return { bar: Math.floor((e.clientX - box.left) / barWidth), track: Math.floor((e.clientY - box.top) / trackHeight) };
  };
  const start = cell(event);
  const clipId = event.target.closest?.('[data-fl-clip]')?.getAttribute('data-fl-clip') ?? null;
  const origin = clipId ? ctx.read().project.playlist.find((clip) => clip.id === clipId) : null;
  let recorded = false;
  const write = (project) => {
    ctx.write(project, !recorded);
    recorded = true;
  };

  if (origin && event.button === 2) {
    write(removeClip(ctx.read().project, clipId));
    return;
  }
  if (event.button > 0) return;

  let moved = false;
  track(
    lanes,
    event,
    (e) => {
      if (!moved && Math.hypot(e.clientX - event.clientX, e.clientY - event.clientY) < 5) return;
      moved = true;
      if (!origin) return;
      const here = cell(e);
      const { project } = ctx.read();
      const clip = project.playlist.find((item) => item.id === clipId);
      const to = { track: origin.track + here.track - start.track, bar: origin.bar + here.bar - start.bar };
      if (clip && (clip.track !== to.track || clip.bar !== to.bar)) write(moveClip(project, clipId, to));
    },
    (e) => {
      if (e.type === 'pointercancel' || moved) return;
      const { project, patternId } = ctx.read();
      if (origin) write(removeClip(project, clipId));
      else if (start.bar >= 0 && start.track >= 0 && start.track < TRACKS && start.bar < SONG_BARS) {
        write(placeClip(project, { patternId, track: start.track, bar: start.bar }));
      }
    },
  );
}

// ---- Commands shared by the menus --------------------------------------------------------------------------------

export const FL_MENUS = [
  { id: 'file', label: 'File', items: [
    { id: 'newProject', label: 'New' },
    { id: 'openDemo', label: 'Open demo project' },
    { id: 'open', label: 'Open...', shortcut: 'Ctrl+O' },
    { separator: true },
    { id: 'save', label: 'Save', shortcut: 'Ctrl+S' },
    { id: 'saveAs', label: 'Save as...' },
    { separator: true },
    { id: 'exportWav', label: 'Export WAV file...', shortcut: 'Ctrl+R' },
  ] },
  { id: 'edit', label: 'Edit', items: [
    { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
    { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y' },
    { separator: true },
    { id: 'clearPattern', label: 'Clear pattern' },
  ] },
  { id: 'add', label: 'Add', items: INSTRUMENTS.map((instrument) => ({ id: `add:${instrument.id}`, label: instrument.name })) },
  { id: 'patterns', label: 'Patterns', items: [
    { id: 'newPattern', label: 'New pattern', shortcut: 'F4' },
    { id: 'clonePattern', label: 'Clone pattern' },
    { id: 'deletePattern', label: 'Delete pattern' },
    { separator: true },
    { id: 'bars:1', label: 'Length: 1 bar' },
    { id: 'bars:2', label: 'Length: 2 bars' },
    { id: 'bars:4', label: 'Length: 4 bars' },
  ] },
  { id: 'view', label: 'View', items: [
    { id: 'view:playlist', label: 'Playlist', shortcut: 'F5', option: 'playlist' },
    { id: 'view:rack', label: 'Channel rack', shortcut: 'F6', option: 'rack' },
    { id: 'view:piano', label: 'Piano roll', shortcut: 'F7', option: 'piano' },
    { id: 'view:mixer', label: 'Mixer', shortcut: 'F9', option: 'mixer' },
    { id: 'view:browser', label: 'Browser', shortcut: 'Alt+F8', option: 'browser' },
  ] },
  { id: 'help', label: 'Help', items: [{ id: 'help', label: 'Keyboard shortcuts' }] },
];

export const FL_PANELS = ['browser', 'rack', 'piano', 'playlist', 'mixer'];

/** What is open at first, as in FL Studio: the mixer and piano roll wait to be asked for. */
export const FL_START_VIEWS = { browser: true, rack: true, piano: false, playlist: true, mixer: false };

export const FL_PANEL_LABELS = {
  browser: 'Browser',
  rack: 'Channel rack',
  piano: 'Piano roll',
  playlist: 'Playlist',
  mixer: 'Mixer',
};

/** 24px icon paths, so both builds draw the same symbols. */
export const FL_ICONS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
  stop: 'M6 6h12v12H6z',
  browser: 'M3 5h7l2 2h9v12H3z',
  rack: 'M3 5h18v3H3zm0 5.5h18v3H3zM3 16h18v3H3z',
  piano: 'M2 4h20v16H2zm3 2v8h2V6zm5 0v8h2V6zm5 0v8h2V6z',
  playlist: 'M3 5h8v4H3zm10 0h8v4h-8zM3 11h12v4H3zm0 6h6v3H3zm8 0h10v3H11z',
  mixer: 'M5 3h2v18H5zm6 0h2v18h-2zm6 0h2v18h-2zM3 14h6v3H3zm6-7h6v3H9zm6 5h6v3h-6z',
};

/** The file it was opened with, then the last project, then the demo. */
export function startingProject(fileContent, saved) {
  return parseProject(fileContent) ?? parseProject(saved) ?? createDemoProject();
}

/** Whether a menu item is ticked or greyed out. */
export function menuItemState(id, { project, patternId, history, views }) {
  const pattern = project.patterns.find((item) => item.id === patternId);
  if (id === 'undo') return { disabled: !history.past.length };
  if (id === 'redo') return { disabled: !history.future.length };
  if (id === 'deletePattern') return { disabled: project.patterns.length <= 1 };
  if (id === 'newPattern' || id === 'clonePattern') return { disabled: project.patterns.length >= MAX_PATTERNS };
  if (id.startsWith('add:')) return { disabled: project.channels.length >= MAX_CHANNELS };
  if (id.startsWith('view:')) return { checked: Boolean(views[id.slice(5)]) };
  if (id.startsWith('bars:')) return { checked: pattern?.bars === Number(id.slice(5)) };
  return {};
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Every menu command and shortcut, through a small adapter each build supplies:
 * read() -> { project, mode, patternId, channelId, history, views, fileName },
 * commit(project, record), load(project, fileName), restore(project, history),
 * selectPattern(id), selectChannel(id), setViews(views), setTab(panel),
 * dialog(name), hint(text), setFileName(name), changeFiles(change), icons
 * and engine.
 */
export function flCommands(app) {
  const read = () => app.read();
  const edit = (project, message) => {
    app.commit(project, true);
    if (message) app.hint(message);
  };
  const saveNamed = (name) => {
    const { project } = read();
    const fileName = projectFileName({ name: String(name).replace(/\.flp$/i, '') });
    app.changeFiles((fs) => saveProjectFile(fs, project, fileName, app.icons));
    app.setFileName(fileName);
    app.hint(`Saved ${fileName} to Documents\\FL Studio`);
  };
  const load = (project, fileName, message) => {
    app.engine.stop();
    app.load(project, fileName);
    app.hint(message);
  };
  const history = (step, message) => {
    const { history: past, project } = read();
    const result = step(past, project);
    if (!result) return;
    app.restore(result.project, result.history);
    app.hint(message);
  };

  const commands = {
    playPause: () => app.engine.toggle(),
    stop: () => app.engine.stop(),
    newProject: () => load(createEmptyProject(), null, 'New project. Click the steps to start a beat.'),
    openDemo: () => load(createDemoProject(), null, 'Opened the demo project. Press Space to play it.'),
    open: () => app.dialog('open'),
    save: () => {
      const { project, fileName } = read();
      saveNamed(fileName ?? projectFileName(project));
    },
    saveAs: () => app.dialog('saveAs'),
    exportWav: async () => {
      const { project, mode, patternId } = read();
      const base = projectFileName(project).replace(/\.flp$/, '');
      app.hint(`Rendering ${mode === 'song' ? 'the song' : 'the pattern'} to WAV...`);
      try {
        downloadBlob(await renderWav(project, mode, patternId), `${base}.wav`);
        app.hint(`Exported ${base}.wav`);
      } catch (error) {
        app.hint(`Could not export: ${error.message}`);
      }
    },
    undo: () => history(undo, 'Undone'),
    redo: () => history(redo, 'Redone'),
    clearPattern: () => {
      const { project, patternId } = read();
      edit(clearPattern(project, patternId), 'Cleared the pattern');
    },
    newPattern: () => {
      const result = addPattern(read().project);
      edit(result.project, 'Added a pattern');
      app.selectPattern(result.id);
    },
    clonePattern: () => {
      const { project, patternId } = read();
      const result = clonePattern(project, patternId);
      edit(result.project, 'Cloned the pattern');
      app.selectPattern(result.id);
    },
    deletePattern: () => {
      const { project, patternId } = read();
      const next = deletePattern(project, patternId);
      if (next === project) return;
      const index = project.patterns.findIndex((pattern) => pattern.id === patternId);
      edit(next, 'Deleted the pattern');
      app.selectPattern(next.patterns[Math.max(0, index - 1)].id);
    },
    help: () => app.dialog('help'),
    /** Not on a menu: the Save as and Open dialogs call these. */
    saveNamed,
    openFile: (entry) => {
      const project = parseProject(entry.content);
      if (!project) app.hint(`${entry.name} is not a project FL Studio can open`);
      else load(project, entry.name, `Opened ${entry.name}`);
    },
  };
  for (const bars of [1, 2, 4]) {
    commands[`bars:${bars}`] = () => {
      const { project, patternId } = read();
      edit(setPatternBars(project, patternId, bars), `Pattern length: ${bars} bar${bars > 1 ? 's' : ''}`);
    };
  }
  for (const instrument of INSTRUMENTS) {
    commands[`add:${instrument.id}`] = () => {
      const { project } = read();
      const next = addChannel(project, instrument.id);
      if (next === project) {
        app.hint(`The channel rack holds up to ${MAX_CHANNELS} channels`);
        return;
      }
      edit(next, `Added ${instrument.name}`);
      app.selectChannel(next.channels.at(-1).id);
    };
  }
  for (const panel of FL_PANELS) {
    commands[`view:${panel}`] = () => {
      const { views } = read();
      const open = !views[panel];
      app.setViews({ ...views, [panel]: open });
      if (open) app.setTab(panel);
    };
  }
  return commands;
}

export const FL_HELP = [
  'Space: play or pause. Stop goes back to the start.',
  'Click a step to switch it on or off. Click a channel name to open its piano roll.',
  'Piano roll: click to add a note and drag to lengthen it. Drag a note to move it, drag its right edge to resize it, and click it to remove it.',
  'Playlist: click an empty bar to place the selected pattern. Drag a clip to move it, and click it to remove it.',
  'Typing keyboard: Z to M plays the selected channel, Q to U the octave above.',
  'Ctrl+S saves to Documents\\FL Studio, Ctrl+Z undoes and Ctrl+Y redoes.',
];

/** The command for a key press while FL Studio has focus, or null. */
export function flShortcut({ key, ctrlKey, metaKey, altKey }) {
  const command = ctrlKey || metaKey;
  if (command) return { s: 'save', o: 'open', z: 'undo', y: 'redo', r: 'exportWav' }[key.toLowerCase()] ?? null;
  if (altKey && key === 'F8') return 'view:browser';
  return { ' ': 'playPause', F4: 'newPattern', F5: 'view:playlist', F6: 'view:rack', F7: 'view:piano', F9: 'view:mixer' }[key] ?? null;
}
