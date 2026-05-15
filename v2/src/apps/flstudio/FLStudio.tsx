import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// 1:1 port of partials/apps/flstudio.php + assets/js/components/flstudio.js.
// Top hint bar, main toolbar (transport / BPM / mode / time / window
// toggles / visualizer), browser sidebar, MDI area with floating Channel
// Rack + Piano Roll windows, full-bleed Playlist with draggable clips, and
// a bottom Mixer with vertical faders + VU meters.

type ChannelType = 'drum' | 'synth' | 'bass'

interface Channel {
  name: string
  type: ChannelType
  note: number
  color: string
  steps: number[] // 0 or 1, length 16
  volume: number
  muted: boolean
  panned: number
  sampleUrl: string | null
}

interface PlaylistClip {
  id: number
  name: string
  track: number
  startStep: number
  length: number
  type: 'pattern' | 'audio' | 'automation'
  color: string
}

const DEFAULT_CHANNELS: Channel[] = [
  { name: 'Kick', type: 'drum', note: 40, color: '#ff6600', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], volume: 0.8, muted: false, panned: 0, sampleUrl: null },
  { name: 'Clap', type: 'drum', note: 60, color: '#00ccff', steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], volume: 0.7, muted: false, panned: 0, sampleUrl: null },
  { name: 'Hat',  type: 'drum', note: 1000, color: '#ffff00', steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], volume: 0.5, muted: false, panned: 0, sampleUrl: null },
  { name: 'Snare', type: 'drum', note: 200, color: '#ff00ff', steps: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], volume: 0.6, muted: false, panned: 0, sampleUrl: null },
  { name: 'Piano', type: 'synth', note: 261.63, color: '#ffffff', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], volume: 0.5, muted: false, panned: 0, sampleUrl: null },
  { name: 'Guitar', type: 'synth', note: 196.00, color: '#00ff00', steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], volume: 0.4, muted: false, panned: 0, sampleUrl: null },
  { name: 'Sub Bass', type: 'bass', note: 55, color: '#ff0000', steps: [1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0], volume: 0.8, muted: false, panned: 0, sampleUrl: null },
]

const PIANO_NOTES = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.0, 415.30, 440.00, 466.16, 493.88] as const
const BLACK_NOTES = new Set([277.18, 311.13, 369.99, 415.30, 466.16])

const BROWSER_SAMPLES = [
  { name: 'Studio Kick', url: 'https://cdn.freesound.org/previews/171/171104_2392966-lq.mp3' },
  { name: 'Snare Snap', url: 'https://cdn.freesound.org/previews/387/387186_7263311-lq.mp3' },
  { name: 'Closed Hat', url: 'https://cdn.freesound.org/previews/448/448572_9159116-lq.mp3' },
  { name: 'Deep Bass', url: 'https://cdn.freesound.org/previews/264/264828_4931603-lq.mp3' },
]

const BROWSER_PACK = ['Kick 808', 'Snare 909', 'HiHat Closed', 'HiHat Open', 'Clap Tight', 'Perc Wood', 'Sub Bass A', 'Piano C4', 'Guitar Clean'] as const

export default function FLStudio() {
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS)
  const [playlistClips, setPlaylistClips] = useState<PlaylistClip[]>([
    { id: 1, name: 'Pattern 1', track: 1, startStep: 0, length: 32, type: 'pattern', color: '#ff6600' },
    { id: 2, name: 'Impact_FX_01.wav', track: 5, startStep: 16, length: 48, type: 'audio', color: '#00ccff' },
  ])

  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<'pattern' | 'song'>('pattern')
  const [bpm, setBpm] = useState(128)
  const [currentStep, setCurrentStep] = useState(0)
  const [songStep, setSongStep] = useState(0)
  const [masterVolume, setMasterVolume] = useState(0.8)
  const [hintText, setHintText] = useState('Hint: Click steps to toggle sounds')
  const [clock, setClock] = useState(() => new Date())

  const [showChannelRack, setShowChannelRack] = useState(true)
  const [showMixer, setShowMixer] = useState(true)
  const [showPlaylist, setShowPlaylist] = useState(true)
  const [showBrowser] = useState(true)
  const [showPianoRoll, setShowPianoRoll] = useState(false)
  const [pianoRollChannelIdx, setPianoRollChannelIdx] = useState<number | null>(null)

  // Audio refs — kept out of state because they don't drive renders.
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({})

  // ---- Audio engine ----
  const setupAudio = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.setValueAtTime(masterVolume, ctx.currentTime)
    master.connect(ctx.destination)
    audioCtxRef.current = ctx
    masterGainRef.current = master
    return ctx
  }, [masterVolume])

  useEffect(() => {
    const master = masterGainRef.current
    const ctx = audioCtxRef.current
    if (master && ctx) master.gain.setValueAtTime(masterVolume, ctx.currentTime)
  }, [masterVolume])

  const playChannelSound = useCallback(
    (channel: Channel, time: number | null = null) => {
      const ctx = setupAudio()
      const startTime = time ?? ctx.currentTime
      const gain = ctx.createGain()
      const vol = channel.volume
      gain.connect(masterGainRef.current!)

      if (channel.sampleUrl && audioBuffersRef.current[channel.sampleUrl]) {
        const src = ctx.createBufferSource()
        src.buffer = audioBuffersRef.current[channel.sampleUrl]
        src.connect(gain)
        gain.gain.setValueAtTime(vol, startTime)
        src.start(startTime)
        return
      }

      const lower = channel.name.toLowerCase()
      if (channel.type === 'drum') {
        if (lower.includes('kick')) {
          const osc = ctx.createOscillator()
          osc.connect(gain)
          osc.frequency.setValueAtTime(150, startTime)
          osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.1)
          gain.gain.setValueAtTime(vol, startTime)
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1)
          osc.start(startTime)
          osc.stop(startTime + 0.1)
        } else if (lower.includes('hat')) {
          const noise = ctx.createBufferSource()
          const size = ctx.sampleRate * 0.05
          const buf = ctx.createBuffer(1, size, ctx.sampleRate)
          const data = buf.getChannelData(0)
          for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
          noise.buffer = buf
          const filter = ctx.createBiquadFilter()
          filter.type = 'highpass'
          filter.frequency.value = 7000
          noise.connect(filter)
          filter.connect(gain)
          gain.gain.setValueAtTime(vol, startTime)
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05)
          noise.start(startTime)
          noise.stop(startTime + 0.05)
        } else {
          const osc = ctx.createOscillator()
          osc.type = 'triangle'
          osc.connect(gain)
          osc.frequency.setValueAtTime(lower.includes('clap') ? 200 : 150, startTime)
          gain.gain.setValueAtTime(vol, startTime)
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1)
          osc.start(startTime)
          osc.stop(startTime + 0.1)
        }
      } else if (lower.includes('piano')) {
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        osc1.type = 'triangle'
        osc2.type = 'sine'
        osc1.frequency.setValueAtTime(channel.note, startTime)
        osc2.frequency.setValueAtTime(channel.note * 2, startTime)
        osc1.connect(gain)
        osc2.connect(gain)
        gain.gain.setValueAtTime(vol * 0.4, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5)
        osc1.start(startTime)
        osc2.start(startTime)
        osc1.stop(startTime + 0.5)
        osc2.stop(startTime + 0.5)
      } else if (lower.includes('guitar')) {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(channel.note, startTime)
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(2000, startTime)
        filter.frequency.exponentialRampToValueAtTime(400, startTime + 0.3)
        osc.connect(filter)
        filter.connect(gain)
        gain.gain.setValueAtTime(vol * 0.3, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4)
        osc.start(startTime)
        osc.stop(startTime + 0.4)
      } else {
        const osc = ctx.createOscillator()
        osc.connect(gain)
        osc.type = channel.type === 'synth' ? 'sawtooth' : 'sine'
        osc.frequency.setValueAtTime(channel.note || (channel.type === 'bass' ? 55 : 440), startTime)
        gain.gain.setValueAtTime(vol * (channel.type === 'bass' ? 0.6 : 0.3), startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2)
        osc.start(startTime)
        osc.stop(startTime + 0.2)
      }
    },
    [setupAudio],
  )

  // Step scheduler — rAF + lookahead like v1's startPlayback. Refs keep the
  // callback reading the latest state without re-creating the loop.
  const channelsRef = useRef(channels); channelsRef.current = channels
  const bpmRef = useRef(bpm); bpmRef.current = bpm
  const modeRef = useRef(mode); modeRef.current = mode

  useEffect(() => {
    if (!playing) {
      setCurrentStep(0)
      setSongStep(0)
      return
    }
    const ctx = setupAudio()
    if (ctx.state === 'suspended') ctx.resume()

    let nextStepTime = ctx.currentTime
    let raf = 0
    let stepLocal = 0
    let songLocal = 0

    const scheduler = () => {
      const stepDuration = 60 / bpmRef.current / 4
      while (nextStepTime < ctx.currentTime + 0.1) {
        const stepIdx = modeRef.current === 'pattern' ? stepLocal : songLocal % 16
        for (const ch of channelsRef.current) {
          if (ch.steps[stepIdx] === 1 && !ch.muted) playChannelSound(ch, nextStepTime)
        }
        nextStepTime += stepDuration
        if (modeRef.current === 'pattern') {
          stepLocal = (stepLocal + 1) % 16
          setCurrentStep(stepLocal)
        } else {
          songLocal = (songLocal + 1) % 512
          stepLocal = songLocal % 16
          setSongStep(songLocal)
          setCurrentStep(stepLocal)
        }
      }
      raf = requestAnimationFrame(scheduler)
    }
    raf = requestAnimationFrame(scheduler)
    return () => cancelAnimationFrame(raf)
  }, [playing, setupAudio, playChannelSound])

  // ---- Channel mutators ----
  const toggleStep = (ci: number, si: number) => {
    setChannels((prev) => {
      const next = prev.map((c, idx) => {
        if (idx !== ci) return c
        const steps = c.steps.slice()
        steps[si] = steps[si] === 1 ? 0 : 1
        return { ...c, steps }
      })
      const ch = next[ci]
      if (ch.steps[si] === 1 && !playing) playChannelSound(ch)
      setHintText(`Step ${si + 1} ${ch.steps[si] ? 'On' : 'Off'} - ${ch.name}`)
      return next
    })
  }

  const addChannel = () => {
    setChannels((prev) => {
      const colors = ['#ff6600', '#00ccff', '#ffff00', '#ff00ff', '#00ff00', '#ff0000', '#ffffff', '#888888']
      const next: Channel[] = [
        ...prev,
        {
          name: `Sampler ${prev.length + 1}`,
          type: 'synth',
          note: 440,
          color: colors[prev.length % colors.length],
          steps: new Array(16).fill(0),
          volume: 0.5,
          muted: false,
          panned: 0,
          sampleUrl: null,
        },
      ]
      setHintText(`Added new channel: Sampler ${next.length}`)
      return next
    })
  }

  const removeChannel = (ci: number) => {
    setChannels((prev) => {
      if (prev.length <= 1) return prev
      const name = prev[ci].name
      setHintText(`Removed channel: ${name}`)
      return prev.filter((_, i) => i !== ci)
    })
  }

  const soloChannel = (ci: number) => {
    setChannels((prev) => {
      const target = prev[ci]
      const alreadySoloed = prev.every((c, i) => i === ci || c.muted)
      if (alreadySoloed) {
        setHintText('Unmuted all channels')
        return prev.map((c) => ({ ...c, muted: false }))
      }
      setHintText(`Soloed channel: ${target.name}`)
      return prev.map((c, i) => ({ ...c, muted: i !== ci }))
    })
  }

  const setChannelField = <K extends keyof Channel>(ci: number, field: K, value: Channel[K]) => {
    setChannels((prev) => prev.map((c, i) => (i === ci ? { ...c, [field]: value } : c)))
  }

  // ---- Mixer ----
  const mixerTracks = useMemo(
    () => [
      { name: 'MASTER', volume: masterVolume, muted: false, index: 0 } as const,
      ...channels.map((c, i) => ({ name: c.name, volume: c.volume, muted: c.muted, index: i + 1 } as const)),
    ],
    [channels, masterVolume],
  )

  const setTrackVolume = (index: number, value: number) => {
    if (index === 0) {
      setMasterVolume(value)
      setHintText(`MASTER Volume: ${Math.round(value * 100)}%`)
    } else {
      setChannelField(index - 1, 'volume', value)
      setHintText(`${channels[index - 1]?.name ?? '?'} Volume: ${Math.round(value * 100)}%`)
    }
  }

  // ---- Clip dragging in the playlist ----
  const playlistGridRef = useRef<HTMLDivElement>(null)
  const dragClipRef = useRef<{ id: number; offX: number; offY: number } | null>(null)
  const [activeDragId, setActiveDragId] = useState<number | null>(null)

  const startClipDrag = (e: React.MouseEvent, clip: PlaylistClip) => {
    const grid = playlistGridRef.current
    if (!grid) return
    const rect = grid.getBoundingClientRect()
    dragClipRef.current = {
      id: clip.id,
      offX: e.clientX - (rect.left + clip.startStep * 12),
      offY: e.clientY - (rect.top + (clip.track - 1) * 32),
    }
    setActiveDragId(clip.id)
    setHintText(`Dragging: ${clip.name}`)
    e.stopPropagation()
  }

  useEffect(() => {
    if (activeDragId === null) return
    const onMove = (e: MouseEvent) => {
      const d = dragClipRef.current
      const grid = playlistGridRef.current
      if (!d || !grid) return
      const rect = grid.getBoundingClientRect()
      const x = e.clientX - rect.left - d.offX
      const y = e.clientY - rect.top - d.offY
      setPlaylistClips((prev) =>
        prev.map((c) =>
          c.id === d.id
            ? {
                ...c,
                startStep: Math.max(0, Math.round(x / 12)),
                track: Math.max(1, Math.min(20, Math.round(y / 32) + 1)),
              }
            : c,
        ),
      )
    }
    const onUp = () => {
      dragClipRef.current = null
      setActiveDragId(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [activeDragId])

  // ---- Clock + cleanup ----
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(
    () => () => {
      const ctx = audioCtxRef.current
      if (ctx) {
        ctx.close().catch(() => {})
        audioCtxRef.current = null
      }
    },
    [],
  )

  const pianoRollChannel = pianoRollChannelIdx !== null ? channels[pianoRollChannelIdx] : null

  const timeDisplay =
    mode === 'pattern'
      ? `${Math.floor(currentStep / 4) + 1}:${(currentStep % 4) + 1}:00`
      : `${Math.floor(songStep / 16) + 1}:${Math.floor((songStep % 16) / 4) + 1}:${(songStep % 4) + 1}`

  const exportProject = () => {
    setHintText('Exporting project... (recording requires MediaRecorder support)')
    const ctx = setupAudio()
    if (!('MediaRecorder' in window)) return
    const dest = ctx.createMediaStreamDestination()
    masterGainRef.current?.connect(dest)
    const recorder = new MediaRecorder(dest.stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/wav' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'My_FL_Project.wav'
      a.click()
      setHintText('Export complete!')
    }
    recorder.start()
    setPlaying(true)
    setMode('song')
    window.setTimeout(() => recorder.stop(), (60 / bpm) * 32 * 1000)
  }

  return (
    <div
      className="h-full flex flex-col bg-[#202529] text-[#7c868e] select-none overflow-hidden"
      style={{ fontFamily: 'Segoe UI, sans-serif' }}
      onClick={() => {
        const ctx = audioCtxRef.current
        if (ctx && ctx.state === 'suspended') ctx.resume()
      }}
    >
      {/* Hint / menu bar */}
      <div className="h-6 bg-[#181c1f] border-b border-black/40 flex items-center px-2 text-[11px] justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-400">
            <span className="font-bold text-[#ff6600] cursor-default">FL</span>
            <button
              type="button"
              onClick={exportProject}
              className="hover:text-white cursor-pointer px-1 bg-win-blue/20 rounded border border-win-blue/30 text-win-blue"
            >
              EXPORT WAV
            </button>
            {['FILE', 'EDIT', 'ADD', 'VIEW'].map((m) => (
              <span key={m} className="hover:text-white cursor-default">
                {m}
              </span>
            ))}
            <span className="hover:text-white cursor-default text-[#00ccff]">HELP</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="text-[10px] text-gray-500 italic truncate max-w-[300px]">{hintText}</div>
        </div>
        <div className="flex items-center space-x-3 text-[10px]">
          <span>{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Main toolbar */}
      <div className="h-16 bg-[#252a2e] border-b border-black/60 flex items-center px-2 space-x-2 shrink-0 shadow-lg relative z-10">
        {/* Transport */}
        <div className="flex items-center space-x-1 bg-black/30 p-1.5 rounded-sm border border-white/5 shadow-inner h-12">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={`p-1.5 transition-all ${
              playing
                ? 'text-[#00ff00] drop-shadow-[0_0_8px_rgba(0,255,0,0.5)]'
                : 'text-gray-500 hover:text-white'
            }`}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setPlaying(false)}
            className="p-1.5 text-gray-500 hover:text-white transition-all"
            aria-label="Pause"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false)
              setCurrentStep(0)
              setSongStep(0)
            }}
            className="p-1.5 text-gray-500 hover:text-white transition-all"
            aria-label="Stop"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>
          <div className="w-px h-8 bg-white/10 mx-1" />
          <div className="flex flex-col items-center justify-center px-2 min-w-[60px]">
            <div className="text-[9px] text-[#ff6600] font-bold opacity-70 leading-none">BPM</div>
            <input
              type="number"
              value={bpm}
              min={40}
              max={999}
              step={1}
              onChange={(e) => setBpm(Math.max(40, Math.min(999, Number(e.target.value) || 128)))}
              className="bg-transparent text-lg font-mono text-[#ff6600] w-12 text-center focus:outline-none focus:bg-black/20 rounded"
            />
          </div>
        </div>

        {/* PAT / SONG */}
        <div className="flex flex-col space-y-0.5 bg-black/20 p-1 rounded border border-white/5 h-12 justify-center px-3">
          {(['pattern', 'song'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setHintText(`Switched to ${m === 'pattern' ? 'Pattern' : 'Song'} mode`)
              }}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  mode === m ? 'bg-[#ff6600]' : 'bg-gray-600'
                }`}
              />
              <span
                className={`text-[10px] font-bold ${
                  mode === m ? 'text-gray-300' : 'text-gray-500'
                }`}
              >
                {m === 'pattern' ? 'PAT' : 'SONG'}
              </span>
            </button>
          ))}
        </div>

        {/* Time display */}
        <div className="bg-black/50 px-4 h-12 rounded border border-white/10 shadow-inner flex items-center justify-center min-w-[120px]">
          <div className="text-2xl font-mono text-[#00ccff] tracking-widest">{timeDisplay}</div>
        </div>

        {/* Window switchers */}
        <div className="flex items-center space-x-1 bg-black/20 p-1 rounded border border-white/5 h-12">
          <button
            type="button"
            onClick={() => setShowPlaylist((v) => !v)}
            className={`p-2 hover:bg-white/10 rounded transition-colors ${
              showPlaylist ? 'bg-white/10' : ''
            }`}
            title="Playlist"
          >
            <svg
              className={`w-5 h-5 ${showPlaylist ? 'text-[#00ccff]' : 'text-gray-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowChannelRack((v) => !v)}
            className={`p-2 hover:bg-white/10 rounded transition-colors ${
              showChannelRack ? 'bg-white/10' : ''
            }`}
            title="Channel Rack"
          >
            <svg
              className={`w-5 h-5 ${showChannelRack ? 'text-[#ff6600]' : 'text-gray-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowMixer((v) => !v)}
            className={`p-2 hover:bg-white/10 rounded transition-colors ${
              showMixer ? 'bg-white/10' : ''
            }`}
            title="Mixer"
          >
            <svg
              className={`w-5 h-5 ${showMixer ? 'text-gray-300' : 'text-gray-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>

        {/* Visualizer */}
        <div className="flex-grow flex items-center justify-end px-4 space-x-4">
          <div className="flex items-center space-x-1 opacity-40">
            {Array.from({ length: 20 }).map((_, i) => (
              <Bar key={i} playing={playing} />
            ))}
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-grow flex min-h-0 overflow-hidden relative">
        {showBrowser && (
          <div className="w-48 bg-[#1a1f22] border-r border-black/40 flex flex-col shrink-0 text-[11px]">
            <div className="h-7 bg-[#252a2e] flex items-center px-2 font-bold border-b border-black/40 text-gray-400">
              BROWSER
            </div>
            <div className="flex-grow overflow-y-auto p-1 space-y-0.5 text-gray-500">
              <div className="flex items-center space-x-2 p-1 hover:bg-white/5 cursor-default text-gray-300">
                <span>📁</span>
                <span>Samples</span>
              </div>
              <div className="pl-4 space-y-0.5">
                {BROWSER_SAMPLES.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center space-x-2 p-1 hover:bg-white/10 hover:text-white cursor-grab transition-colors rounded"
                    title={s.url}
                  >
                    <span>🔊</span>
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-2 p-1 hover:bg-white/5 cursor-default text-gray-300">
                <span>📁</span>
                <span>Packs</span>
              </div>
              <div className="pl-4 space-y-0.5">
                {BROWSER_PACK.map((p) => (
                  <div
                    key={p}
                    className="flex items-center space-x-2 p-1 hover:bg-white/10 hover:text-white cursor-grab transition-colors rounded"
                  >
                    <span>🔊</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-grow flex flex-col min-w-0 bg-[#121518] relative">
          {showChannelRack && (
            <ChannelRack
              channels={channels}
              currentStep={currentStep}
              playing={playing}
              onClose={() => setShowChannelRack(false)}
              onToggleStep={toggleStep}
              onRemove={removeChannel}
              onSolo={soloChannel}
              onChannelField={setChannelField}
              onAdd={addChannel}
              onOpenPianoRoll={(idx) => {
                setPianoRollChannelIdx(idx)
                setShowPianoRoll(true)
                setHintText(`Opening Piano Roll for ${channels[idx].name}`)
              }}
            />
          )}

          {showPianoRoll && pianoRollChannel && pianoRollChannelIdx !== null && (
            <PianoRoll
              channel={pianoRollChannel}
              onClose={() => setShowPianoRoll(false)}
              onSetNote={(note) => setChannelField(pianoRollChannelIdx, 'note', note)}
              onSetStep={(stepIdx, value) => {
                const steps = pianoRollChannel.steps.slice()
                steps[stepIdx] = value
                setChannelField(pianoRollChannelIdx, 'steps', steps)
              }}
              onPreview={() => playChannelSound(pianoRollChannel)}
            />
          )}

          {showPlaylist && (
            <Playlist
              clips={playlistClips}
              activeDragId={activeDragId}
              playing={playing}
              currentStep={currentStep}
              songStep={songStep}
              mode={mode}
              gridRef={playlistGridRef}
              onStartDrag={startClipDrag}
            />
          )}
        </div>
      </div>

      {/* Mixer */}
      {showMixer && (
        <Mixer
          tracks={mixerTracks}
          playing={playing}
          channels={channels}
          onClose={() => setShowMixer(false)}
          onSetVolume={setTrackVolume}
          onToggleMute={(idx) => {
            if (idx === 0) return
            const ci = idx - 1
            setChannelField(ci, 'muted', !channels[ci].muted)
          }}
          onSolo={(idx) => idx > 0 && soloChannel(idx - 1)}
        />
      )}
    </div>
  )
}

// ---- Sub-components ----

function Bar({ playing }: { playing: boolean }) {
  const [h, setH] = useState(20)
  useEffect(() => {
    if (!playing) {
      setH(8)
      return
    }
    const id = window.setInterval(() => setH(Math.random() * 40 + 5), 120)
    return () => window.clearInterval(id)
  }, [playing])
  return <div className="w-1 bg-[#00ff00]" style={{ height: h, opacity: playing ? 1 : 0.2 }} />
}

function ChannelRack({
  channels,
  currentStep,
  playing,
  onClose,
  onToggleStep,
  onRemove,
  onSolo,
  onChannelField,
  onAdd,
  onOpenPianoRoll,
}: {
  channels: Channel[]
  currentStep: number
  playing: boolean
  onClose: () => void
  onToggleStep: (ci: number, si: number) => void
  onRemove: (ci: number) => void
  onSolo: (ci: number) => void
  onChannelField: <K extends keyof Channel>(ci: number, field: K, value: Channel[K]) => void
  onAdd: () => void
  onOpenPianoRoll: (ci: number) => void
}) {
  return (
    <div className="absolute top-10 left-10 w-[580px] h-[450px] bg-[#2b3339] rounded border border-white/10 shadow-2xl flex flex-col overflow-hidden z-20">
      <div className="h-8 bg-[#32393f] flex items-center px-3 text-[10px] font-bold border-b border-black/40 text-gray-300 justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-[#ff6600]">■</span>
          <span>CHANNEL RACK</span>
        </div>
        <div className="flex space-x-2">
          <button type="button" onClick={onClose} className="hover:text-white" aria-label="Minimize">_</button>
          <button type="button" onClick={onClose} className="hover:text-white text-red-500" aria-label="Close">×</button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-3 space-y-1 bg-[#1e2327]">
        {channels.map((channel, ci) => (
          <div
            key={ci}
            className="flex items-center space-x-3 group hover:bg-white/[0.02] p-1 rounded-sm transition-colors"
            onDoubleClick={() => channel.type !== 'drum' && onOpenPianoRoll(ci)}
          >
            <div className="flex items-center space-x-1 shrink-0">
              <div className="flex flex-col space-y-1 mr-1">
                <button
                  type="button"
                  onClick={() => onChannelField(ci, 'muted', !channel.muted)}
                  title="Mute"
                  className="w-2 h-2 rounded-full bg-black/40 border border-white/5 flex items-center justify-center"
                >
                  <div
                    className={`w-1 h-1 rounded-full ${
                      channel.muted ? 'bg-gray-600' : 'bg-[#00ff00] shadow-[0_0_4px_rgba(0,255,0,0.8)]'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onSolo(ci)}
                  title="Solo"
                  className="w-2 h-2 rounded-full bg-black/40 border border-white/5 flex items-center justify-center"
                >
                  <div
                    className={`w-1 h-1 rounded-full ${
                      channels.every((c, i) => i === ci || c.muted) && !channel.muted
                        ? 'bg-[#ff6600] shadow-[0_0_4px_rgba(255,102,0,0.8)]'
                        : 'bg-gray-600'
                    }`}
                  />
                </button>
              </div>

              <input
                type="text"
                value={channel.name}
                onChange={(e) => onChannelField(ci, 'name', e.target.value)}
                className="w-24 bg-[#32393f] h-7 px-2 text-[10px] rounded border border-black/40 text-gray-300 hover:bg-[#3d454c] focus:bg-black/40 focus:outline-none shadow-sm transition-colors font-bold"
                style={{ borderLeft: `4px solid ${channel.color}` }}
              />

              <div className="flex flex-col items-center">
                <select
                  value={channel.type}
                  onChange={(e) => onChannelField(ci, 'type', e.target.value as ChannelType)}
                  className="bg-transparent text-[9px] text-gray-500 focus:outline-none cursor-pointer hover:text-gray-300 ml-1 font-bold"
                >
                  <option value="drum">DRUM</option>
                  <option value="synth">SYNTH</option>
                  <option value="bass">BASS</option>
                </select>
                {channel.type !== 'drum' && (
                  <input
                    type="number"
                    value={channel.note}
                    onChange={(e) => onChannelField(ci, 'note', Number(e.target.value))}
                    step={10}
                    min={20}
                    max={2000}
                    className="w-10 bg-black/20 rounded text-[8px] text-win-blue focus:outline-none text-center h-4 mt-0.5"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => onRemove(ci)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-1 transition-opacity"
                title="Delete track"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Steps grid */}
            <div className="flex space-x-1.5">
              {channel.steps.map((step, si) => {
                const evenBlock = Math.floor(si / 4) % 2 === 0
                const base =
                  step === 1
                    ? evenBlock
                      ? 'bg-[#ff6600]'
                      : 'bg-[#ff8533]'
                    : evenBlock
                      ? 'bg-[#3d454c]'
                      : 'bg-[#2b3339]'
                const playingHere = playing && currentStep === si
                return (
                  <button
                    key={si}
                    type="button"
                    onClick={() => onToggleStep(ci, si)}
                    aria-label={`${channel.name} step ${si + 1}`}
                    aria-pressed={step === 1}
                    className={`w-7 h-6 rounded-sm cursor-pointer hover:brightness-125 transition-all active:scale-90 shadow-sm ${base} ${
                      step === 1 ? 'shadow-[inset_0_0_8px_rgba(255,255,255,0.3)]' : ''
                    } ${playingHere ? 'ring-2 ring-white/40 brightness-150 z-10' : 'ring-1 ring-black/20'}`}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="h-8 bg-[#1a1f22] border-t border-black/40 flex items-center px-3 justify-between shrink-0">
        <button
          type="button"
          onClick={onAdd}
          className="h-5 px-3 bg-black/40 border border-white/10 rounded-sm flex items-center justify-center text-[10px] hover:bg-white/10 transition-colors text-gray-400 font-bold"
        >
          + ADD CHANNEL
        </button>
        <div className="text-[9px] text-gray-600 font-bold">{channels.length} CHANNELS</div>
      </div>
    </div>
  )
}

function PianoRoll({
  channel,
  onClose,
  onSetNote,
  onSetStep,
  onPreview,
}: {
  channel: Channel
  onClose: () => void
  onSetNote: (n: number) => void
  onSetStep: (stepIdx: number, value: number) => void
  onPreview: () => void
}) {
  return (
    <div className="absolute top-20 left-20 w-[600px] h-[400px] bg-[#2b3339] rounded border border-white/10 shadow-2xl flex flex-col overflow-hidden z-30">
      <div className="h-8 bg-[#32393f] flex items-center px-3 text-[10px] font-bold border-b border-black/40 text-gray-300 justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-[#00ff00]">■</span>
          <span>PIANO ROLL — {channel.name}</span>
        </div>
        <div className="flex space-x-2">
          <button type="button" onClick={onClose} className="hover:text-white">_</button>
          <button type="button" onClick={onClose} className="hover:text-white">×</button>
        </div>
      </div>
      <div className="flex-grow flex overflow-hidden">
        <div className="w-12 bg-[#1a1f22] border-r border-black flex flex-col-reverse">
          {PIANO_NOTES.map((note) => (
            <div
              key={note}
              className={`h-6 border-b border-black flex items-center justify-end px-1 text-[8px] ${
                BLACK_NOTES.has(note) ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              {Math.round(note)}Hz
            </div>
          ))}
        </div>
        <div
          className="flex-grow overflow-auto bg-[#121518] relative"
          style={{
            backgroundImage:
              'linear-gradient(#1e2327 1px, transparent 1px), linear-gradient(90deg, #1e2327 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="absolute inset-0 flex flex-col-reverse">
            {PIANO_NOTES.map((note) => (
              <div key={note} className="h-6 flex">
                {Array.from({ length: 16 }).map((_, si) => (
                  <button
                    key={si}
                    type="button"
                    onClick={() => {
                      onSetNote(note)
                      onSetStep(si, 1)
                      onPreview()
                    }}
                    className="w-6 h-full border-r border-b border-white/5 hover:bg-white/5"
                  >
                    {channel.note === note && channel.steps[si] === 1 && (
                      <div className="w-full h-full bg-[#00ff00]/60 border border-[#00ff00]" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Playlist({
  clips,
  activeDragId,
  playing,
  currentStep,
  songStep,
  mode,
  gridRef,
  onStartDrag,
}: {
  clips: PlaylistClip[]
  activeDragId: number | null
  playing: boolean
  currentStep: number
  songStep: number
  mode: 'pattern' | 'song'
  gridRef: React.RefObject<HTMLDivElement | null>
  onStartDrag: (e: React.MouseEvent, clip: PlaylistClip) => void
}) {
  return (
    <div className="absolute inset-0 bg-[#121518] flex flex-col overflow-hidden">
      <div className="h-8 bg-[#1a1f22] flex items-center px-3 text-[10px] font-bold border-b border-black/40 text-gray-500 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-[#00ccff]">■</span>
          <span>PLAYLIST — ARRANGEMENT</span>
        </div>
      </div>
      <div
        className="flex-grow relative overflow-auto playlist-grid-container"
        style={{
          backgroundImage:
            'linear-gradient(#1e2327 1px, transparent 1px), linear-gradient(90deg, #1e2327 1px, transparent 1px)',
          backgroundSize: '48px 32px',
          backgroundAttachment: 'local',
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-[#1a1f22]/80 border-r border-black/40 z-10 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="h-8 border-b border-black/20 flex items-center px-2 text-[9px] text-gray-500 font-bold"
            >
              Track {i + 1}
            </div>
          ))}
        </div>

        <div ref={gridRef} className="ml-24 min-w-[2000px] h-[640px] relative playlist-grid">
          {clips.map((clip) => (
            <div
              key={clip.id}
              role="button"
              tabIndex={0}
              onMouseDown={(e) => onStartDrag(e, clip)}
              title={clip.name}
              className={`absolute h-7 flex items-center px-2 text-[9px] text-white font-bold rounded-sm border cursor-grab active:cursor-grabbing shadow-lg overflow-hidden ${
                activeDragId === clip.id ? 'z-50 ring-1 ring-white/50 opacity-90' : 'z-10'
              }`}
              style={{
                top: (clip.track - 1) * 32 + 2,
                left: clip.startStep * 12,
                width: clip.length * 12,
                backgroundColor: `${clip.color}44`,
                borderColor: `${clip.color}88`,
              }}
            >
              {clip.type === 'pattern' && (
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent, transparent 12px, white 12px, white 14px)',
                  }}
                />
              )}
              {clip.type === 'audio' && (
                <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path
                    d="M0,50 Q5,20 10,50 T20,50 T30,50 T40,50 T50,50 T60,50 T70,50 T80,50 T90,50 T100,50"
                    stroke="white"
                    fill="none"
                    strokeWidth={1}
                  />
                </svg>
              )}
              {clip.type === 'automation' && (
                <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M0,80 L20,60 L40,70 L60,30 L80,40 L100,10" stroke="white" fill="none" strokeWidth={2} />
                </svg>
              )}
              <span className="relative z-10 truncate">{clip.name}</span>
            </div>
          ))}

          {playing && (
            <div
              className="absolute inset-y-0 w-px bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20 pointer-events-none"
              style={{ left: (mode === 'pattern' ? currentStep : songStep) * 12 }}
            >
              <div className="w-3 h-3 bg-white rotate-45 -translate-x-1.5 -translate-y-1.5 shadow-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Mixer({
  tracks,
  playing,
  channels,
  onClose,
  onSetVolume,
  onToggleMute,
  onSolo,
}: {
  tracks: ReadonlyArray<{ name: string; volume: number; muted: boolean; index: number }>
  playing: boolean
  channels: Channel[]
  onClose: () => void
  onSetVolume: (index: number, value: number) => void
  onToggleMute: (index: number) => void
  onSolo: (index: number) => void
}) {
  return (
    <div className="h-64 bg-[#1a1f22] border-t border-black flex flex-col shrink-0">
      <div className="h-7 bg-[#252a2e] flex items-center px-3 text-[10px] font-bold border-b border-black/40 text-gray-400 justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">■</span>
          <span>MIXER — MASTER</span>
        </div>
        <div className="flex space-x-2">
          <button type="button" onClick={onClose} className="hover:text-white">_</button>
          <button type="button" className="hover:text-white">□</button>
          <button type="button" onClick={onClose} className="hover:text-white">×</button>
        </div>
      </div>
      <div className="flex-grow flex overflow-x-auto p-1 space-x-0.5 bg-[#121518]">
        {tracks.map((track) => (
          <MixerLane
            key={track.index}
            track={track}
            playing={playing}
            channels={channels}
            onSetVolume={(v) => onSetVolume(track.index, v)}
            onToggleMute={() => onToggleMute(track.index)}
            onSolo={() => onSolo(track.index)}
          />
        ))}
      </div>
    </div>
  )
}

function MixerLane({
  track,
  playing,
  channels,
  onSetVolume,
  onToggleMute,
  onSolo,
}: {
  track: { name: string; volume: number; muted: boolean; index: number }
  playing: boolean
  channels: Channel[]
  onSetVolume: (value: number) => void
  onToggleMute: () => void
  onSolo: () => void
}) {
  const isMaster = track.index === 0
  const dragRef = useRef<{ rect: DOMRect } | null>(null)

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = { rect }
    onSetVolume(Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height)))
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      onSetVolume(Math.max(0, Math.min(1, 1 - (e.clientY - d.rect.top) / d.rect.height)))
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onSetVolume])

  const soloed =
    !isMaster &&
    channels.every((c, i) => i === track.index - 1 || c.muted) &&
    channels[track.index - 1] &&
    !channels[track.index - 1].muted

  return (
    <div className="w-[52px] h-full bg-[#202529] flex flex-col items-center border border-black/60 shadow-inner shrink-0 relative overflow-hidden">
      <div className="absolute right-0 top-1 bottom-10 w-2 flex flex-col-reverse space-y-[1px] px-[1px]">
        {Array.from({ length: 15 }).map((_, i) => {
          const colour = i > 12 ? 'bg-red-500' : i > 9 ? 'bg-yellow-500' : 'bg-green-500'
          const dim = i > 12 ? 'bg-red-500/20' : i > 9 ? 'bg-yellow-500/20' : 'bg-green-500/20'
          const lit = playing && Math.random() * 15 > i
          return (
            <div
              key={i}
              className={`flex-grow w-full rounded-sm transition-all duration-75 ${lit ? colour : dim}`}
            />
          )
        })}
      </div>

      <div
        className={`text-[8px] font-bold mt-1 tracking-tighter ${
          isMaster ? 'text-[#ff6600]' : 'text-gray-500'
        }`}
      >
        {track.name}
      </div>

      <div className="flex-grow flex items-center justify-center py-4 w-full px-2">
        <div className="w-6 h-full flex flex-col items-center relative">
          <div
            className="w-1.5 h-full bg-black/60 rounded-full border border-white/5 relative overflow-hidden cursor-pointer"
            onMouseDown={onMouseDown}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-[#00ccff]/20 transition-all duration-200"
              style={{ height: `${track.volume * 100}%` }}
            />
          </div>
          <div
            className="absolute w-8 h-4 bg-[#3d454c] border border-black/60 rounded-sm shadow-lg pointer-events-none flex flex-col items-center justify-center space-y-0.5 z-10"
            style={{ bottom: `calc(${track.volume * 100}% - 8px)` }}
          >
            <div className="w-5 h-[1px] bg-white/20" />
            <div className="w-5 h-[1px] bg-[#00ccff]" />
            <div className="w-5 h-[1px] bg-white/20" />
          </div>
        </div>
      </div>

      <div className="w-full flex justify-center space-x-1 pb-2">
        <button
          type="button"
          onClick={onToggleMute}
          title="Mute"
          className="w-4 h-4 rounded-full bg-black/40 border border-white/5 flex items-center justify-center hover:border-[#00ff00]/50"
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              track.muted ? 'bg-gray-600' : 'bg-[#00ff00] shadow-[0_0_4px_rgba(0,255,0,0.8)]'
            }`}
          />
        </button>
        {!isMaster && (
          <button
            type="button"
            onClick={onSolo}
            title="Solo"
            className="w-4 h-4 rounded-full bg-black/40 border border-white/5 flex items-center justify-center hover:border-[#ff6600]/50"
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                soloed ? 'bg-[#ff6600] shadow-[0_0_4px_rgba(255,102,0,0.8)]' : 'bg-gray-600'
              }`}
            />
          </button>
        )}
      </div>

      <div className="w-full bg-black/40 py-0.5 text-center border-t border-white/5">
        <span className="text-[8px] font-bold text-gray-600">{isMaster ? 'M' : track.index}</span>
      </div>
    </div>
  )
}
