import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  FL_FOLDER,
  FL_HELP,
  FL_ICONS,
  FL_MENUS,
  FL_PANELS,
  FL_PANEL_LABELS,
  FL_PROJECT_KEY,
  FL_START_VIEWS,
  INSTRUMENTS,
  MAX_BPM,
  MIN_BPM,
  SONG_BARS,
  TRACKS,
  beginPianoGesture,
  beginPlaylistGesture,
  createEngine,
  flCommands,
  flShortcut,
  instrumentFor,
  isBlackKey,
  menuItemState,
  noteName,
  patternSteps,
  positionLabel,
  projectFiles,
  recordEdit,
  removeChannel,
  renamePattern,
  renameProject,
  serialiseProject,
  setMasterVolume,
  setTempo,
  soloChannel,
  startPainter,
  startingProject,
  stepOn,
  toggleStep,
  typingKeyPitch,
  updateChannel,
  type FlCommands,
  type FlEngine,
  type FlHistory,
  type FlMenuItem,
  type FlMode,
  type FlPanel,
  type FlProject,
  type FlViews,
} from '../../../../assets/js/windowing/fl-studio.js'
import { useOsStore } from '../../store/osStore'
import { useCurrentWindow } from '../../windowing/WindowContext'

// FL Studio. Everything it does lives in assets/js/windowing/fl-studio.js,
// which v1 shares, so this file only draws the screen and keeps React state.

const IMG = '/assets/img/'
const ICONS = { folder: `${IMG}win11/folder.webp`, file: `${IMG}fl%20studio.webp` }
const TOP_PITCH = 96
const BOTTOM_PITCH = 24
const PITCHES = Array.from({ length: TOP_PITCH - BOTTOM_PITCH + 1 }, (_, i) => TOP_PITCH - i)
const BARS = Array.from({ length: SONG_BARS }, (_, i) => i)
const TRACK_LIST = Array.from({ length: TRACKS }, (_, i) => i)

const vars = (values: Record<string, string | number>) => values as CSSProperties

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fillRule="evenodd">
      <path d={path} />
    </svg>
  )
}

function MenuEntry({
  entry,
  state,
  onRun,
}: {
  entry: FlMenuItem
  state: { checked?: boolean; disabled?: boolean }
  onRun: (id: string) => void
}) {
  return (
    <button
      type="button"
      role={state.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={state.checked}
      className="fl-menu-item"
      data-fl-command={entry.id}
      disabled={state.disabled}
      onClick={() => onRun(entry.id!)}
    >
      <span>{state.checked ? '✓' : ''}</span>
      <span>{entry.label}</span>
      <span className="fl-menu-key">{entry.shortcut}</span>
    </button>
  )
}

function readSaved() {
  try {
    return localStorage.getItem(FL_PROJECT_KEY)
  } catch {
    return null
  }
}

export default function FLStudio() {
  const win = useCurrentWindow()
  const opened = win.extra as { content?: string } | undefined
  const fileSystem = useOsStore((s) => s.fileSystem)

  const [project, setProject] = useState<FlProject>(() => startingProject(opened?.content ?? null, readSaved()))
  const [history, setHistory] = useState<FlHistory>({ past: [], future: [] })
  const [mode, setMode] = useState<FlMode>('pattern')
  const [patternId, setPatternId] = useState(() => project.patterns[0].id)
  const [channelId, setChannelId] = useState(() => project.channels[0].id)
  const [views, setViews] = useState<FlViews>(FL_START_VIEWS)
  const [tab, setTab] = useState<FlPanel>('rack')
  const [menu, setMenu] = useState<string | null>(null)
  const [hint, setHint] = useState('Press Space to play. Click the steps to change the beat.')
  const [playing, setPlaying] = useState(false)
  const [dialog, setDialog] = useState<'open' | 'saveAs' | 'help' | null>(null)
  const [saveName, setSaveName] = useState('')
  const [fileName, setFileName] = useState<string | null>(() => (opened?.content ? win.title : null))
  const [noteLength, setNoteLength] = useState(2)

  // The engine and the gestures read the latest state through these.
  const live = useRef({ project, mode, patternId, channelId, history, views, fileName, noteLength })
  useLayoutEffect(() => {
    live.current = { project, mode, patternId, channelId, history, views, fileName, noteLength }
  })

  const root = useRef<HTMLDivElement>(null)
  const engineRef = useRef<FlEngine | null>(null)
  const commandsRef = useRef<FlCommands | null>(null)

  // Keeps working through a reload.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(FL_PROJECT_KEY, serialiseProject(project))
      } catch {
        // Private windows can refuse storage, which only loses the autosave.
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [project])

  const commit = useCallback((next: FlProject, record = true) => {
    const current = live.current.project
    if (next === current) return
    if (record) setHistory((past) => recordEdit(past, current))
    live.current = { ...live.current, project: next }
    setProject(next)
  }, [])

  // The audio engine and the commands exist while FL Studio is open.
  useEffect(() => {
    const engine = createEngine(() => live.current, { onChange: (state) => setPlaying(state.playing) })
    engineRef.current = engine
    commandsRef.current = flCommands({
        read: () => live.current,
        commit,
        load: (next, name) => {
          live.current = { ...live.current, project: next, patternId: next.patterns[0].id, channelId: next.channels[0].id }
          setProject(next)
          setHistory({ past: [], future: [] })
          setPatternId(next.patterns[0].id)
          setChannelId(next.channels[0].id)
          setFileName(name)
        },
        restore: (next, past) => {
          live.current = { ...live.current, project: next }
          setProject(next)
          setHistory(past)
        },
        selectPattern: (id) => {
          live.current = { ...live.current, patternId: id }
          setPatternId(id)
        },
        selectChannel: (id) => {
          live.current = { ...live.current, channelId: id }
          setChannelId(id)
        },
        setViews: (next: FlViews) => {
          live.current = { ...live.current, views: next }
          setViews(next)
        },
        setTab: (panel: FlPanel) => setTab(panel),
        dialog: (name) => {
          if (name === 'saveAs') setSaveName(live.current.project.name)
          setDialog(name)
        },
        hint: setHint,
        setFileName,
        changeFiles: (change) => useOsStore.getState().changeFiles(change),
        icons: ICONS,
        engine,
      })
    const stopPainting = startPainter(root.current!, engine)
    return () => {
      stopPainting()
      engine.dispose()
      engineRef.current = null
      commandsRef.current = null
    }
  }, [commit])

  const run = useCallback((id: string) => {
    setMenu(null)
    commandsRef.current?.[id]?.()
  }, [])

  // FL Studio's shortcuts and typing keyboard, while its window has focus.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (useOsStore.getState().focusedWindowId !== win.id) return
      if ((event.target as Element).closest?.('input, select, textarea')) return
      const command = flShortcut(event)
      if (command) {
        event.preventDefault()
        run(command)
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
      const pitch = typingKeyPitch(event.key, 5)
      if (pitch !== null) engineRef.current?.preview(live.current.channelId, pitch)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run, win.id])

  const pattern = project.patterns.find((item) => item.id === patternId) ?? project.patterns[0]
  const channel = project.channels.find((item) => item.id === channelId) ?? project.channels[0]
  const steps = Array.from({ length: patternSteps(pattern) }, (_, i) => i)
  const savedFiles = projectFiles(fileSystem) as { name: string; content?: string }[]

  // The piano roll opens at the channel's own pitch.
  const pianoBody = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const body = pianoBody.current
    if (!body || (!views.piano && tab !== 'piano')) return
    const row = parseFloat(getComputedStyle(body).getPropertyValue('--fl-row-h')) || 14
    body.scrollTop = (TOP_PITCH - instrumentFor(channel).root) * row - body.clientHeight / 2
  }, [channel, views.piano, tab])

  const openPiano = (id: string) => {
    setChannelId(id)
    live.current = { ...live.current, channelId: id }
    setViews((current) => ({ ...current, piano: true }))
    setTab('piano')
    engineRef.current?.preview(id)
  }

  const step = (id: string, index: number) => {
    const next = toggleStep(project, pattern.id, id, index)
    commit(next)
    if (!playing && stepOn(next.patterns.find((item) => item.id === pattern.id), id, index)) engineRef.current?.preview(id)
  }

  const grid = useRef<HTMLDivElement>(null)
  const lanes = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={root}
      className="fl-app"
      data-fl-tab={tab}
      onPointerDown={() => engineRef.current?.unlock()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="fl-menubar">
        <span className="fl-logo">FL</span>
        <nav className="fl-menus" aria-label="FL Studio menu">
          {FL_MENUS.map((item) => (
            <div key={item.id} className="fl-menu">
              <button
                type="button"
                className="fl-menu-button"
                data-fl-menu={item.label}
                aria-haspopup="menu"
                aria-expanded={menu === item.id}
                onClick={() => setMenu(menu === item.id ? null : item.id)}
              >
                {item.label}
              </button>
              {menu === item.id && (
                <>
                  <div className="fl-menu-shield" onPointerDown={() => setMenu(null)} />
                  <div className="fl-menu-list" role="menu">
                    {item.items.map((entry, index) =>
                      entry.separator ? (
                        <div key={index} className="fl-menu-sep" role="separator" />
                      ) : (
                        <MenuEntry
                          key={entry.id}
                          entry={entry}
                          state={menuItemState(entry.id!, { project, patternId: pattern.id, history, views })}
                          onRun={run}
                        />
                      ),
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>
        <input
          key={project.name}
          className="fl-project-name"
          aria-label="Project name"
          defaultValue={project.name}
          onBlur={(event) => commit(renameProject(project, event.target.value))}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
        <span className="fl-hint" role="status">
          {hint}
        </span>
      </div>

      <div className="fl-toolbar">
        <div className="fl-group">
          <button
            type="button"
            className="fl-tool fl-play"
            data-fl-play=""
            aria-pressed={playing}
            aria-label={playing ? 'Pause' : 'Play'}
            title="Play or pause (Space)"
            onClick={() => engineRef.current?.toggle()}
          >
            <Icon path={playing ? FL_ICONS.pause : FL_ICONS.play} />
          </button>
          <button type="button" className="fl-tool" data-fl-stop="" aria-label="Stop" title="Stop" onClick={() => engineRef.current?.stop()}>
            <Icon path={FL_ICONS.stop} />
          </button>
        </div>
        <div className="fl-group" role="group" aria-label="Play mode">
          {(['pattern', 'song'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="fl-tool"
              data-fl-mode={value}
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value)
                engineRef.current?.seek(0)
              }}
            >
              {value === 'pattern' ? 'PAT' : 'SONG'}
            </button>
          ))}
        </div>
        <div className="fl-group fl-tempo">
          <button type="button" className="fl-tool" aria-label="Slower" onClick={() => commit(setTempo(project, project.bpm - 1), false)}>
            −
          </button>
          <input
            key={project.bpm}
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            defaultValue={project.bpm}
            aria-label="Tempo in beats per minute"
            data-fl-bpm=""
            onBlur={(event) => commit(setTempo(project, event.target.value), false)}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
          <button type="button" className="fl-tool" aria-label="Faster" onClick={() => commit(setTempo(project, project.bpm + 1), false)}>
            +
          </button>
        </div>
        <output className="fl-lcd" data-fl-position="" aria-label="Song position">
          {positionLabel(0)}
        </output>
        <label className="fl-group">
          <span className="fl-label">Master</span>
          <input
            type="range"
            className="fl-range"
            min={0}
            max={1}
            step={0.01}
            value={project.masterVolume}
            aria-label="Master volume"
            onChange={(event) => commit(setMasterVolume(project, event.target.value), false)}
          />
        </label>
        <div className="fl-group">
          <select
            className="fl-select"
            aria-label="Pattern"
            data-fl-pattern=""
            value={pattern.id}
            onChange={(event) => setPatternId(event.target.value)}
          >
            {project.patterns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button type="button" className="fl-tool" aria-label="New pattern" title="New pattern (F4)" onClick={() => run('newPattern')}>
            +
          </button>
        </div>
        <div className="fl-group fl-views" role="group" aria-label="Windows">
          {FL_PANELS.map((panel) => (
            <button
              key={panel}
              type="button"
              className="fl-tool"
              data-fl-view={panel}
              aria-pressed={views[panel]}
              aria-label={FL_PANEL_LABELS[panel]}
              title={FL_PANEL_LABELS[panel]}
              onClick={() => run(`view:${panel}`)}
            >
              <Icon path={FL_ICONS[panel]} />
            </button>
          ))}
        </div>
      </div>

      <div className="fl-tabs" role="tablist" aria-label="Windows">
        {FL_PANELS.map((panel) => (
          <button
            key={panel}
            type="button"
            role="tab"
            className="fl-tab"
            data-fl-tab-button={panel}
            aria-selected={tab === panel}
            onClick={() => setTab(panel)}
          >
            {FL_PANEL_LABELS[panel]}
          </button>
        ))}
      </div>

      <div className="fl-body">
        <aside className="fl-panel fl-browser" data-fl-panel="browser" data-open={views.browser} aria-label="Browser">
          <div className="fl-panel-head">Browser</div>
          <div className="fl-browser-list">
            <p className="fl-browser-group">Instruments</p>
            {INSTRUMENTS.map((instrument) => (
              <div key={instrument.id} className="fl-browser-item">
                <button
                  type="button"
                  className="fl-browser-preview"
                  data-fl-instrument={instrument.id}
                  title={`Hear ${instrument.name}`}
                  onClick={() => {
                    const existing = project.channels.find((item) => item.instrument === instrument.id)
                    if (existing) engineRef.current?.preview(existing.id)
                    else setHint(`Press + to add ${instrument.name} to the channel rack`)
                  }}
                >
                  <span className="fl-swatch" style={vars({ '--c': instrument.colour })} />
                  {instrument.name}
                </button>
                <button
                  type="button"
                  className="fl-browser-add"
                  data-fl-add={instrument.id}
                  aria-label={`Add ${instrument.name} to the channel rack`}
                  onClick={() => run(`add:${instrument.id}`)}
                >
                  +
                </button>
              </div>
            ))}
            <p className="fl-browser-group">Projects</p>
            <button type="button" className="fl-browser-file" onClick={() => run('openDemo')}>
              Demo
            </button>
            {savedFiles.map((entry) => (
              <button key={entry.name} type="button" className="fl-browser-file" data-fl-file={entry.name} onClick={() => commandsRef.current?.openFile(entry)}>
                {entry.name}
              </button>
            ))}
          </div>
        </aside>

        <div className="fl-workspace">
          <section className="fl-panel fl-rack" data-fl-panel="rack" data-open={views.rack} aria-label="Channel rack">
            <div className="fl-panel-head">
              <span>Channel rack</span>
              <input
                key={pattern.id + pattern.name}
                className="fl-select"
                aria-label="Pattern name"
                defaultValue={pattern.name}
                onBlur={(event) => commit(renamePattern(project, pattern.id, event.target.value))}
                onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
              />
              <select
                className="fl-select fl-push"
                aria-label="Pattern length"
                data-fl-bars=""
                value={pattern.bars}
                onChange={(event) => run(`bars:${event.target.value}`)}
              >
                {[1, 2, 4].map((bars) => (
                  <option key={bars} value={bars}>
                    {bars} bar{bars > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="fl-rack-body">
              {project.channels.map((item) => {
                const colour = instrumentFor(item).colour
                return (
                  <div key={item.id} className="fl-row" data-fl-channel={item.id} data-selected={item.id === channel.id}>
                    <div className="fl-row-head">
                      <button
                        type="button"
                        className="fl-led"
                        aria-pressed={!item.mute}
                        aria-label={`${item.name} on`}
                        title="Mute"
                        onClick={() => commit(updateChannel(project, item.id, { mute: !item.mute }))}
                      />
                      <input
                        type="range"
                        className="fl-knob"
                        min={0}
                        max={1}
                        step={0.01}
                        value={item.volume}
                        aria-label={`${item.name} volume`}
                        onChange={(event) => commit(updateChannel(project, item.id, { volume: Number(event.target.value) }), false)}
                      />
                      <button
                        type="button"
                        className="fl-channel-name"
                        style={vars({ '--c': colour })}
                        data-fl-channel-name={item.id}
                        title="Open in the piano roll"
                        onClick={() => openPiano(item.id)}
                      >
                        {item.name}
                      </button>
                    </div>
                    <div className="fl-steps">
                      {steps.map((index) => (
                        <button
                          key={index}
                          type="button"
                          className="fl-step"
                          data-fl-step={index}
                          data-fl-col={mode === 'pattern' ? index : undefined}
                          data-beat={Math.floor(index / 4) % 2}
                          aria-pressed={stepOn(pattern, item.id, index)}
                          aria-label={`${item.name} step ${index + 1}`}
                          onClick={() => step(item.id, index)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="fl-panel-foot">
              <select
                className="fl-select"
                aria-label="Add a channel"
                value=""
                onChange={(event) => event.target.value && run(`add:${event.target.value}`)}
              >
                <option value="">Add a channel...</option>
                {INSTRUMENTS.map((instrument) => (
                  <option key={instrument.id} value={instrument.id}>
                    {instrument.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="fl-button"
                disabled={project.channels.length <= 1}
                onClick={() => commit(removeChannel(project, channel.id))}
              >
                Remove {channel.name}
              </button>
              <span className="fl-count">{project.channels.length} channels</span>
            </div>
          </section>

          <section className="fl-panel fl-piano" data-fl-panel="piano" data-open={views.piano} aria-label="Piano roll">
            <div className="fl-panel-head">
              <span>Piano roll</span>
              <span className="fl-label">Channel</span>
              <select
                className="fl-select"
                aria-label="Piano roll channel"
                value={channel.id}
                onChange={(event) => setChannelId(event.target.value)}
              >
                {project.channels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <span className="fl-label">Sound</span>
              <select
                className="fl-select"
                aria-label="Instrument"
                value={channel.instrument}
                onChange={(event) => commit(updateChannel(project, channel.id, { instrument: event.target.value }))}
              >
                {INSTRUMENTS.map((instrument) => (
                  <option key={instrument.id} value={instrument.id}>
                    {instrument.name}
                  </option>
                ))}
              </select>
              <span className="fl-panel-sub fl-push">{pattern.name}</span>
            </div>
            <div ref={pianoBody} className="fl-piano-body">
              <div className="fl-keys">
                {PITCHES.map((pitch) => (
                  <button
                    key={pitch}
                    type="button"
                    className="fl-key"
                    data-black={isBlackKey(pitch)}
                    aria-label={noteName(pitch)}
                    onPointerDown={() => engineRef.current?.preview(channel.id, pitch)}
                  >
                    {pitch % 12 === 0 ? noteName(pitch) : ''}
                  </button>
                ))}
              </div>
              <div
                ref={grid}
                className="fl-grid"
                data-fl-grid=""
                style={vars({ '--steps': steps.length, '--rows': PITCHES.length })}
                onPointerDown={(event) =>
                  beginPianoGesture(event.nativeEvent, grid.current!, {
                    read: () => ({ project: live.current.project, patternId: pattern.id, channelId: channel.id }),
                    write: (next, record) => commit(next, record),
                    top: TOP_PITCH,
                    length: () => live.current.noteLength,
                    setLength: setNoteLength,
                    preview: (pitch) => engineRef.current?.preview(channel.id, pitch),
                  })
                }
              >
                <div className="fl-playhead" />
                {(pattern.notes[channel.id] ?? [])
                  .filter((note) => note.pitch >= BOTTOM_PITCH && note.pitch <= TOP_PITCH)
                  .map((note) => (
                    <div
                      key={`${note.step}:${note.pitch}`}
                      className="fl-note"
                      data-fl-note={`${note.step}:${note.pitch}`}
                      style={vars({ '--s': note.step, '--l': note.length, '--r': TOP_PITCH - note.pitch })}
                    >
                      {noteName(note.pitch)}
                      <span className="fl-note-edge" data-fl-edge="" />
                    </div>
                  ))}
              </div>
            </div>
          </section>

          <section className="fl-panel fl-playlist" data-fl-panel="playlist" data-open={views.playlist} aria-label="Playlist">
            <div className="fl-panel-head">
              <span>Playlist</span>
              <span className="fl-panel-sub">Click a bar to place {pattern.name}</span>
            </div>
            <div className="fl-playlist-body">
              <div className="fl-corner" />
              <div className="fl-ruler">
                {BARS.map((bar) => (
                  <button
                    key={bar}
                    type="button"
                    className="fl-bar-number"
                    aria-label={`Play the song from bar ${bar + 1}`}
                    onClick={() => {
                      setMode('song')
                      engineRef.current?.seek(bar * 16)
                    }}
                  >
                    {bar + 1}
                  </button>
                ))}
              </div>
              <div className="fl-tracks">
                {TRACK_LIST.map((track) => (
                  <div key={track} className="fl-track-name">
                    Track {track + 1}
                  </div>
                ))}
              </div>
              <div
                ref={lanes}
                className="fl-lanes"
                data-fl-lanes=""
                style={vars({ '--bars': SONG_BARS, '--tracks': TRACKS })}
                onPointerDown={(event) =>
                  beginPlaylistGesture(event.nativeEvent, lanes.current!, {
                    read: () => ({ project: live.current.project, patternId: pattern.id }),
                    write: (next, record) => commit(next, record),
                  })
                }
              >
                <div className="fl-playhead" />
                {project.playlist.map((clip) => {
                  const clipPattern = project.patterns.find((item) => item.id === clip.patternId)
                  if (!clipPattern) return null
                  return (
                    <div
                      key={clip.id}
                      className="fl-clip"
                      data-fl-clip={clip.id}
                      title={`${clipPattern.name}: drag to move, click to remove`}
                      style={vars({ '--t': clip.track, '--b': clip.bar, '--w': clipPattern.bars, '--c': clipPattern.colour })}
                    >
                      {clipPattern.name}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="fl-panel fl-mixer" data-fl-panel="mixer" data-open={views.mixer} aria-label="Mixer">
        <div className="fl-panel-head">Mixer</div>
        <div className="fl-mixer-body">
          <div className="fl-strip fl-strip-master">
            <span className="fl-strip-name">Master</span>
            <input
              type="range"
              className="fl-fader"
              min={0}
              max={1}
              step={0.01}
              value={project.masterVolume}
              aria-label="Master fader"
              onChange={(event) => commit(setMasterVolume(project, event.target.value), false)}
            />
            <div className="fl-meter" data-fl-meter="master" />
          </div>
          {project.channels.map((item) => (
            <div key={item.id} className="fl-strip" data-fl-strip={item.id}>
              <span className="fl-strip-name" style={vars({ '--c': instrumentFor(item).colour })}>
                {item.name}
              </span>
              <input
                type="range"
                className="fl-fader"
                min={0}
                max={1}
                step={0.01}
                value={item.volume}
                aria-label={`${item.name} fader`}
                onChange={(event) => commit(updateChannel(project, item.id, { volume: Number(event.target.value) }), false)}
              />
              <div className="fl-meter" data-fl-meter={item.id} />
              <input
                type="range"
                className="fl-pan"
                min={-1}
                max={1}
                step={0.05}
                value={item.pan}
                aria-label={`${item.name} pan`}
                onChange={(event) => commit(updateChannel(project, item.id, { pan: Number(event.target.value) }), false)}
              />
              <div className="fl-strip-buttons">
                <button
                  type="button"
                  className="fl-mute"
                  aria-pressed={item.mute}
                  aria-label={`Mute ${item.name}`}
                  onClick={() => commit(updateChannel(project, item.id, { mute: !item.mute }))}
                >
                  M
                </button>
                <button
                  type="button"
                  className="fl-solo"
                  aria-pressed={item.solo}
                  aria-label={`Solo ${item.name}`}
                  onClick={() => commit(soloChannel(project, item.id))}
                >
                  S
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {dialog && (
        <div className="fl-dialog-backdrop" onPointerDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          {dialog === 'help' && (
            <div className="fl-dialog" role="dialog" aria-label="Keyboard shortcuts">
              <h2>Using FL Studio</h2>
              <ul>
                {FL_HELP.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="fl-dialog-actions">
                <button type="button" className="fl-button" onClick={() => setDialog(null)}>
                  Close
                </button>
              </div>
            </div>
          )}
          {dialog === 'open' && (
            <div className="fl-dialog" role="dialog" aria-label="Open project">
              <h2>Open a project from Documents\FL Studio</h2>
              {savedFiles.length ? (
                savedFiles.map((entry) => (
                  <button
                    key={entry.name}
                    type="button"
                    className="fl-browser-file"
                    data-fl-file={entry.name}
                    onClick={() => {
                      setDialog(null)
                      commandsRef.current?.openFile(entry)
                    }}
                  >
                    {entry.name}
                  </button>
                ))
              ) : (
                <p className="fl-empty">Nothing saved yet. Use File, Save to keep a project here.</p>
              )}
              <div className="fl-dialog-actions">
                <button type="button" className="fl-button" onClick={() => setDialog(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {dialog === 'saveAs' && (
            <form
              className="fl-dialog"
              role="dialog"
              aria-label="Save project as"
              onSubmit={(event) => {
                event.preventDefault()
                setDialog(null)
                commit(renameProject(project, saveName))
                commandsRef.current?.saveNamed(saveName)
              }}
            >
              <h2>Save as, in {FL_FOLDER}</h2>
              <input aria-label="File name" value={saveName} autoFocus onChange={(event) => setSaveName(event.target.value)} />
              <div className="fl-dialog-actions">
                <button type="button" className="fl-button" onClick={() => setDialog(null)}>
                  Cancel
                </button>
                <button type="submit" className="fl-button">
                  Save
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

