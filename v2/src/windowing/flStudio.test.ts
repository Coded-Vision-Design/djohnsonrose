import { describe, it, expect } from 'vitest'
import {
  INSTRUMENTS,
  MAX_CHANNELS,
  SONG_BARS,
  STEPS_PER_BAR,
  TRACKS,
  addChannel,
  addNote,
  addPattern,
  audibleChannels,
  clonePattern,
  createDemoProject,
  createEmptyProject,
  deletePattern,
  FL_FOLDER,
  FL_MENUS,
  encodeWav,
  flCommands,
  flShortcut,
  menuItemState,
  startingProject,
  type FlHistory,
  loopSteps,
  moveClip,
  moveNote,
  noteFrequency,
  noteName,
  notesAt,
  parseProject,
  placeClip,
  positionLabel,
  projectFileName,
  projectFiles,
  recordEdit,
  redo,
  removeChannel,
  removeClip,
  removeNote,
  resizeNote,
  saveProjectFile,
  serialiseProject,
  setPatternBars,
  soloChannel,
  songBars,
  stepOn,
  stepSeconds,
  toggleStep,
  typingKeyPitch,
  undo,
  updateChannel,
  type FlProject,
} from '../../../assets/js/windowing/fl-studio.js'

const empty = () => createEmptyProject()
const firstPattern = (project: FlProject) => project.patterns[0].id

describe('notes and time', () => {
  it('names notes the way FL Studio does', () => {
    expect(noteName(60)).toBe('C5')
    expect(noteName(61)).toBe('C#5')
    expect(noteName(57)).toBe('A4')
  })

  it('tunes A4 to 440 Hz', () => {
    expect(noteFrequency(69)).toBeCloseTo(440)
    expect(noteFrequency(81)).toBeCloseTo(880)
  })

  it('makes a step a sixteenth note at the tempo', () => {
    expect(stepSeconds(120)).toBeCloseTo(0.125)
    expect(stepSeconds(60)).toBeCloseTo(0.25)
  })

  it('shows the position as bar, beat and step, counting from one', () => {
    expect(positionLabel(0)).toBe('1:1:1')
    expect(positionLabel(5)).toBe('1:2:2')
    expect(positionLabel(STEPS_PER_BAR * 2 + 15)).toBe('3:4:4')
  })

  it('maps the typing keyboard to a piano, as FL Studio does', () => {
    expect(typingKeyPitch('z', 5)).toBe(60)
    expect(typingKeyPitch('s', 5)).toBe(61)
    expect(typingKeyPitch('q', 5)).toBe(72)
    expect(typingKeyPitch('Z', 5)).toBe(60)
    expect(typingKeyPitch('1', 5)).toBeNull()
  })
})

describe('the demo project', () => {
  it('plays a song of whole patterns across the playlist', () => {
    const demo = createDemoProject()
    expect(demo.channels.length).toBeGreaterThanOrEqual(6)
    expect(demo.playlist.length).toBeGreaterThan(4)
    expect(songBars(demo)).toBe(8)
    expect(parseProject(serialiseProject(demo))).toEqual(demo)
  })

  it('uses only instruments the engine can play', () => {
    const ids = new Set(INSTRUMENTS.map((instrument) => instrument.id))
    for (const channel of createDemoProject().channels) expect(ids.has(channel.instrument)).toBe(true)
  })
})

describe('the step sequencer', () => {
  it('turns a step on at the channel’s own pitch', () => {
    const project = empty()
    const channel = project.channels[0]
    const next = toggleStep(project, firstPattern(project), channel.id, 4)
    expect(stepOn(next.patterns[0], channel.id, 4)).toBe(true)
    const root = INSTRUMENTS.find((item) => item.id === channel.instrument)!.root
    expect(next.patterns[0].notes[channel.id]).toEqual([{ step: 4, length: 1, pitch: root }])
  })

  it('turns a step off again, along with any chord starting there', () => {
    let project = empty()
    const id = project.channels[0].id
    project = addNote(project, firstPattern(project), id, { step: 2, length: 2, pitch: 60 })
    project = addNote(project, firstPattern(project), id, { step: 2, length: 2, pitch: 64 })
    project = toggleStep(project, firstPattern(project), id, 2)
    expect(stepOn(project.patterns[0], id, 2)).toBe(false)
  })

  it('leaves the original project untouched', () => {
    const project = empty()
    toggleStep(project, firstPattern(project), project.channels[0].id, 0)
    expect(project.patterns[0].notes[project.channels[0].id] ?? []).toEqual([])
  })

  it('ignores a step outside the pattern', () => {
    const project = empty()
    expect(toggleStep(project, firstPattern(project), project.channels[0].id, 99)).toBe(project)
  })
})

describe('the piano roll', () => {
  const setUp = () => {
    const project = empty()
    return { project, pattern: firstPattern(project), channel: project.channels[0].id }
  }

  it('adds a note, replacing any that starts at the same place', () => {
    const { project, pattern, channel } = setUp()
    let next = addNote(project, pattern, channel, { step: 0, length: 2, pitch: 60 })
    next = addNote(next, pattern, channel, { step: 0, length: 4, pitch: 60 })
    expect(next.patterns[0].notes[channel]).toEqual([{ step: 0, length: 4, pitch: 60 }])
  })

  it('keeps notes inside the pattern and the keyboard', () => {
    const { project, pattern, channel } = setUp()
    const next = addNote(project, pattern, channel, { step: 14, length: 9, pitch: 300 })
    expect(next.patterns[0].notes[channel]).toEqual([{ step: 14, length: 2, pitch: 108 }])
  })

  it('removes, moves and resizes a note', () => {
    const { project, pattern, channel } = setUp()
    let next = addNote(project, pattern, channel, { step: 0, length: 2, pitch: 60 })
    next = moveNote(next, pattern, channel, { step: 0, pitch: 60 }, { step: 3, pitch: 62 })
    expect(next.patterns[0].notes[channel]).toEqual([{ step: 3, length: 2, pitch: 62 }])
    next = resizeNote(next, pattern, channel, { step: 3, pitch: 62 }, 5)
    expect(next.patterns[0].notes[channel]).toEqual([{ step: 3, length: 5, pitch: 62 }])
    next = removeNote(next, pattern, channel, { step: 3, pitch: 62 })
    expect(next.patterns[0].notes[channel]).toEqual([])
  })

  it('does nothing when the note is not there', () => {
    const { project, pattern, channel } = setUp()
    expect(removeNote(project, pattern, channel, { step: 1, pitch: 1 })).toBe(project)
  })
})

describe('patterns', () => {
  it('adds, clones and deletes patterns, taking their clips with them', () => {
    let project = empty()
    const first = firstPattern(project)
    project = toggleStep(project, first, project.channels[0].id, 0)
    const added = addPattern(project)
    expect(added.project.patterns).toHaveLength(2)
    const cloned = clonePattern(added.project, first)
    expect(cloned.project.patterns[2].notes).toEqual(cloned.project.patterns[0].notes)
    expect(cloned.project.patterns[2].name).toBe('Pattern 1 (copy)')
    const placed = placeClip(cloned.project, { patternId: cloned.id, track: 0, bar: 0 })
    const removed = deletePattern(placed, cloned.id)
    expect(removed.patterns).toHaveLength(2)
    expect(removed.playlist).toEqual([])
  })

  it('never deletes the last pattern', () => {
    const project = empty()
    expect(deletePattern(project, firstPattern(project))).toBe(project)
  })

  it('drops notes that no longer fit when a pattern gets shorter', () => {
    let project = empty()
    const pattern = firstPattern(project)
    const channel = project.channels[0].id
    project = setPatternBars(project, pattern, 2)
    project = addNote(project, pattern, channel, { step: 20, length: 2, pitch: 60 })
    project = addNote(project, pattern, channel, { step: 14, length: 6, pitch: 62 })
    project = setPatternBars(project, pattern, 1)
    expect(project.patterns[0].notes[channel]).toEqual([{ step: 14, length: 2, pitch: 62 }])
  })
})

describe('channels and the mixer', () => {
  it('adds a channel for an instrument, up to the limit', () => {
    let project = empty()
    project = addChannel(project, 'lead')
    expect(project.channels.at(-1)).toMatchObject({ instrument: 'lead', name: 'Lead' })
    for (let i = 0; i < MAX_CHANNELS + 2; i += 1) project = addChannel(project, 'kick')
    expect(project.channels).toHaveLength(MAX_CHANNELS)
  })

  it('removes a channel and its notes, but never the last one', () => {
    let project = addChannel(empty(), 'bass')
    const id = project.channels[1].id
    project = toggleStep(project, firstPattern(project), id, 0)
    project = removeChannel(project, id)
    expect(project.channels.map((channel) => channel.id)).not.toContain(id)
    expect(project.patterns[0].notes[id]).toBeUndefined()
    const single = createEmptyProject()
    while (single.channels.length > 1) single.channels.pop()
    expect(removeChannel(single, single.channels[0].id)).toBe(single)
  })

  it('keeps volume and pan in range', () => {
    const project = empty()
    const next = updateChannel(project, project.channels[0].id, { volume: 3, pan: -9 })
    expect(next.channels[0]).toMatchObject({ volume: 1, pan: -1 })
  })

  it('solos one channel, and a second click clears the solo', () => {
    const project = empty()
    const id = project.channels[1].id
    const soloed = soloChannel(project, id)
    expect([...audibleChannels(soloed)]).toEqual([id])
    expect(audibleChannels(soloChannel(soloed, id)).size).toBe(project.channels.length)
  })

  it('leaves muted channels out', () => {
    const project = empty()
    const muted = updateChannel(project, project.channels[0].id, { mute: true })
    expect(audibleChannels(muted).has(project.channels[0].id)).toBe(false)
  })
})

describe('the playlist', () => {
  it('places a clip, replacing whatever it would overlap on that track', () => {
    let project = setPatternBars(empty(), 'p1', 2)
    project = placeClip(project, { patternId: 'p1', track: 0, bar: 0 })
    project = placeClip(project, { patternId: 'p1', track: 0, bar: 1 })
    expect(project.playlist.map((clip) => clip.bar)).toEqual([1])
    project = placeClip(project, { patternId: 'p1', track: 1, bar: 0 })
    expect(project.playlist).toHaveLength(2)
  })

  it('keeps clips on the grid', () => {
    const project = placeClip(empty(), { patternId: 'p1', track: TRACKS + 4, bar: SONG_BARS + 9 })
    expect(project.playlist[0]).toMatchObject({ track: TRACKS - 1, bar: SONG_BARS - 1 })
  })

  it('moves and removes a clip', () => {
    let project = placeClip(empty(), { patternId: 'p1', track: 0, bar: 0 })
    const id = project.playlist[0].id
    project = moveClip(project, id, { track: 2, bar: 3 })
    expect(project.playlist[0]).toMatchObject({ track: 2, bar: 3 })
    expect(removeClip(project, id).playlist).toEqual([])
  })

  it('measures the song to the end of its last clip', () => {
    expect(songBars(empty())).toBe(1)
    const project = placeClip(setPatternBars(empty(), 'p1', 2), { patternId: 'p1', track: 0, bar: 3 })
    expect(songBars(project)).toBe(5)
  })
})

describe('what plays when', () => {
  it('plays a pattern’s notes at their steps', () => {
    let project = empty()
    const id = project.channels[0].id
    project = toggleStep(project, 'p1', id, 4)
    expect(notesAt(project, 'pattern', 'p1', 4)).toEqual([{ channelId: id, pitch: project.patterns[0].notes[id][0].pitch, length: 1 }])
    expect(notesAt(project, 'pattern', 'p1', 5)).toEqual([])
    expect(loopSteps(project, 'pattern', 'p1')).toBe(STEPS_PER_BAR)
  })

  it('plays each clip’s pattern from where the clip starts in the song', () => {
    let project = empty()
    const id = project.channels[0].id
    project = toggleStep(project, 'p1', id, 0)
    project = placeClip(project, { patternId: 'p1', track: 0, bar: 2 })
    expect(notesAt(project, 'song', 'p1', 0)).toEqual([])
    expect(notesAt(project, 'song', 'p1', STEPS_PER_BAR * 2)).toHaveLength(1)
    expect(loopSteps(project, 'song', 'p1')).toBe(STEPS_PER_BAR * 3)
  })
})

describe('saving and opening', () => {
  it('reads back what it saved', () => {
    const project = createDemoProject()
    expect(parseProject(serialiseProject(project))).toEqual(project)
  })

  it('refuses something that is not a project', () => {
    expect(parseProject('not json')).toBeNull()
    expect(parseProject('{"hello":1}')).toBeNull()
    expect(parseProject(null)).toBeNull()
  })

  it('repairs out-of-range values instead of trusting them', () => {
    const project = createEmptyProject()
    const broken = JSON.parse(serialiseProject(project))
    broken.bpm = 9000
    broken.channels[0].instrument = 'banjo'
    broken.channels[0].name = '<img src=x onerror=alert(1)>'.repeat(10)
    broken.playlist = [{ id: 'k1', patternId: 'missing', track: 0, bar: 0 }]
    const repaired = parseProject(JSON.stringify(broken))!
    expect(repaired.bpm).toBe(240)
    expect(repaired.channels[0].instrument).toBe('kick')
    expect(repaired.channels[0].name.length).toBeLessThanOrEqual(32)
    expect(repaired.playlist).toEqual([])
  })
})

describe('project files', () => {
  const icons = { folder: 'folder.webp', file: 'fl.webp' }
  const documents = 'C:\\Users\\DeVante\\Documents'

  it('saves into Documents\\FL Studio, making the folder the first time', () => {
    const fs: Record<string, unknown[]> = saveProjectFile({ [documents]: [] } as Record<string, unknown[]>, createDemoProject(), 'Demo.flp', icons)
    expect(fs[documents]).toEqual([expect.objectContaining({ name: 'FL Studio', type: 'folder', icon: 'folder.webp' })])
    expect(fs[FL_FOLDER]).toEqual([expect.objectContaining({ name: 'Demo.flp', type: 'file', icon: 'fl.webp' })])
    expect(parseProject((fs[FL_FOLDER][0] as { content: string }).content)).toEqual(createDemoProject())
  })

  it('overwrites a project saved under the same name', () => {
    const first = saveProjectFile({ [documents]: [] } as Record<string, unknown[]>, createEmptyProject(), 'Song.flp', icons)
    const second = saveProjectFile(first, createDemoProject(), 'Song.flp', icons)
    expect(second[FL_FOLDER]).toHaveLength(1)
    expect(second[documents]).toHaveLength(1)
  })

  it('lists only projects, newest first', () => {
    const fs = {
      [FL_FOLDER]: [
        { name: 'old.flp', type: 'file', modified: 1 },
        { name: 'notes.txt', type: 'file', modified: 9 },
        { name: 'new.flp', type: 'file', modified: 5 },
      ],
    }
    expect(projectFiles(fs).map((entry) => entry.name)).toEqual(['new.flp', 'old.flp'])
    expect(projectFiles({})).toEqual([])
  })

  it('names the file after the project, without characters Windows refuses', () => {
    expect(projectFileName({ ...createEmptyProject(), name: 'My: "Song"?' })).toBe('My Song.flp')
    expect(projectFileName({ ...createEmptyProject(), name: '***' })).toBe('Untitled.flp')
  })
})

describe('flShortcut', () => {
  const key = (k: string, extra: Partial<{ ctrlKey: boolean; altKey: boolean }> = {}) =>
    flShortcut({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...extra })

  it('plays and pauses with Space, as FL Studio does', () => {
    expect(key(' ')).toBe('playPause')
  })

  it('saves, undoes and exports with Ctrl', () => {
    expect(key('s', { ctrlKey: true })).toBe('save')
    expect(key('Z', { ctrlKey: true })).toBe('undo')
    expect(key('r', { ctrlKey: true })).toBe('exportWav')
  })

  it('ignores other keys', () => {
    expect(key('a')).toBeNull()
    expect(key('q', { ctrlKey: true })).toBeNull()
  })
})

describe('startingProject', () => {
  it('opens the file it was given first', () => {
    const file = serialiseProject({ ...createEmptyProject(), name: 'From file' })
    expect(startingProject(file, serialiseProject(createDemoProject())).name).toBe('From file')
  })

  it('carries on with the last project when there is no file', () => {
    expect(startingProject(null, serialiseProject({ ...createEmptyProject(), name: 'Last' })).name).toBe('Last')
  })

  it('starts with the demo when nothing usable was saved', () => {
    expect(startingProject('broken', 'also broken').name).toBe('Demo')
  })
})

describe('menuItemState', () => {
  const state = (over: Partial<Parameters<typeof menuItemState>[1]> = {}) => ({
    project: createDemoProject(),
    patternId: 'p1',
    history: { past: [], future: [] },
    views: { browser: true, rack: true, piano: false, playlist: true, mixer: true },
    ...over,
  })

  it('greys out undo and redo until there is something to undo or redo', () => {
    expect(menuItemState('undo', state()).disabled).toBe(true)
    expect(menuItemState('undo', state({ history: { past: [createEmptyProject()], future: [] } })).disabled).toBe(false)
    expect(menuItemState('redo', state()).disabled).toBe(true)
  })

  it('ticks the open windows and the pattern’s length', () => {
    expect(menuItemState('view:rack', state()).checked).toBe(true)
    expect(menuItemState('view:piano', state()).checked).toBe(false)
    expect(menuItemState('bars:1', state()).checked).toBe(true)
    expect(menuItemState('bars:4', state({ patternId: 'p2' })).checked).toBe(true)
  })

  it('stops the last pattern being deleted', () => {
    expect(menuItemState('deletePattern', state({ project: createEmptyProject() })).disabled).toBe(true)
    expect(menuItemState('deletePattern', state()).disabled).toBe(false)
  })
})

describe('flCommands', () => {
  const setUp = (project = createDemoProject()) => {
    const calls: string[] = []
    const app = {
      project,
      history: { past: [] as FlProject[], future: [] as FlProject[] },
      patternId: 'p1',
      channelId: project.channels[0].id,
      fileName: null as string | null,
      views: { browser: true, rack: true, piano: false, playlist: true, mixer: true } as Record<string, boolean>,
      files: { 'C:\\Users\\DeVante\\Documents': [] } as Record<string, unknown[]>,
    }
    const adapter = {
      read: () => ({ ...app, mode: 'pattern' as const }),
      commit: (next: FlProject, record = true) => {
        if (record) app.history = recordEdit(app.history, app.project)
        app.project = next
      },
      load: (next: FlProject, fileName: string | null) => {
        app.project = next
        app.fileName = fileName
        app.history = { past: [], future: [] }
        app.patternId = next.patterns[0].id
        calls.push('load')
      },
      restore: (next: FlProject, history: FlHistory) => {
        app.project = next
        app.history = history
      },
      selectPattern: (id: string) => {
        app.patternId = id
      },
      selectChannel: (id: string) => {
        app.channelId = id
      },
      setViews: (views: Record<string, boolean>) => {
        app.views = views
      },
      setTab: (tab: string) => calls.push(`tab:${tab}`),
      dialog: (name: string) => calls.push(`dialog:${name}`),
      hint: (text: string) => calls.push(`hint:${text}`),
      setFileName: (name: string) => {
        app.fileName = name
      },
      changeFiles: (change: (fs: Record<string, unknown[]>) => Record<string, unknown[]>) => {
        app.files = change(app.files)
      },
      icons: { folder: 'folder.webp', file: 'fl.webp' },
      exportWav: () => calls.push('export'),
      engine: { toggle: () => calls.push('toggle'), stop: () => calls.push('stop'), preview: () => {} },
    }
    return { app, calls, commands: flCommands(adapter) }
  }

  it('has a command for every menu item', () => {
    const { commands } = setUp()
    for (const menu of FL_MENUS) {
      for (const item of menu.items) if (item.id) expect(typeof commands[item.id]).toBe('function')
    }
  })

  it('adds a channel and selects it', () => {
    const { app, commands } = setUp()
    commands['add:pad']()
    expect(app.project.channels.at(-1)!.instrument).toBe('pad')
    expect(app.channelId).toBe(app.project.channels.at(-1)!.id)
  })

  it('undoes and redoes an edit', () => {
    const { app, commands } = setUp()
    commands['add:pad']()
    commands.undo()
    expect(app.project.channels.some((channel) => channel.instrument === 'pad')).toBe(false)
    commands.redo()
    expect(app.project.channels.some((channel) => channel.instrument === 'pad')).toBe(true)
  })

  it('makes a new pattern and selects it, and deletes it again', () => {
    const { app, commands } = setUp()
    commands.newPattern()
    expect(app.patternId).toBe(app.project.patterns.at(-1)!.id)
    commands.deletePattern()
    expect(app.project.patterns).toHaveLength(4)
    expect(app.project.patterns.some((pattern) => pattern.id === app.patternId)).toBe(true)
  })

  it('saves to Documents\\FL Studio under the project’s name', () => {
    const { app, commands } = setUp()
    commands.save()
    expect(app.fileName).toBe('Demo.flp')
    expect((app.files[FL_FOLDER] as { name: string }[]).map((entry) => entry.name)).toEqual(['Demo.flp'])
  })

  it('opens and closes windows from the View menu', () => {
    const { app, commands, calls } = setUp()
    commands['view:piano']()
    expect(app.views.piano).toBe(true)
    expect(calls).toContain('tab:piano')
    commands['view:piano']()
    expect(app.views.piano).toBe(false)
  })

  it('starts a new project from scratch', () => {
    const { app, commands, calls } = setUp()
    commands.newProject()
    expect(calls).toEqual(expect.arrayContaining(['stop', 'load']))
    expect(app.project.playlist).toEqual([])
  })
})

describe('undo and redo', () => {
  it('steps back and forward through edits', () => {
    const first = empty()
    const second = toggleStep(first, 'p1', first.channels[0].id, 0)
    let history = recordEdit({ past: [], future: [] }, first)
    const back = undo(history, second)!
    expect(back.project).toBe(first)
    history = back.history
    const forward = redo(history, back.project)!
    expect(forward.project).toBe(second)
  })

  it('has nothing to undo or redo at the start', () => {
    expect(undo({ past: [], future: [] }, empty())).toBeNull()
    expect(redo({ past: [], future: [] }, empty())).toBeNull()
  })

  it('keeps at most 50 steps', () => {
    let history = { past: [] as FlProject[], future: [] as FlProject[] }
    for (let i = 0; i < 60; i += 1) history = recordEdit(history, empty())
    expect(history.past).toHaveLength(50)
  })
})

describe('encodeWav', () => {
  it('writes a 16-bit stereo WAV header', () => {
    const left = new Float32Array([0, 0.5, -0.5])
    const right = new Float32Array([0, 1, -1])
    const view = new DataView(encodeWav([left, right], 44100))
    const text = (offset: number) => String.fromCharCode(...new Uint8Array(view.buffer, offset, 4))
    expect(text(0)).toBe('RIFF')
    expect(text(8)).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(2)
    expect(view.getUint32(24, true)).toBe(44100)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(3 * 2 * 2)
  })

  it('interleaves the channels and clips loud samples', () => {
    const view = new DataView(encodeWav([new Float32Array([0.5, 2]), new Float32Array([-0.5, -2])], 8000))
    expect(view.getInt16(44, true)).toBe(16383)
    expect(view.getInt16(46, true)).toBe(-16384)
    expect(view.getInt16(48, true)).toBe(32767)
    expect(view.getInt16(50, true)).toBe(-32768)
  })

  it('writes an empty file for no audio', () => {
    expect(new DataView(encodeWav([new Float32Array(0)], 44100)).getUint32(40, true)).toBe(0)
  })
})
