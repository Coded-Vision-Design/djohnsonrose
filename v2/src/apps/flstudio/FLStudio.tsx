import { useEffect, useRef, useState } from 'react'

// FL Studio DAW port: step sequencer, mixer, browser, transport, animated
// waveform canvas. The sequencer maps the 16 steps to the WebAudio API so
// every click is audible — turn it on in Quick Settings if you have sound
// muted.

interface Track {
  id: string
  name: string
  color: string
  /** 16-step pattern. */
  steps: boolean[]
  freq: number
  type: OscillatorType
  volume: number
}

const STEPS = 16

const makeTrack = (
  id: string,
  name: string,
  color: string,
  freq: number,
  type: OscillatorType = 'sine',
): Track => ({
  id,
  name,
  color,
  steps: Array.from({ length: STEPS }, () => false),
  freq,
  type,
  volume: 0.5,
})

const DEFAULT_TRACKS: Track[] = [
  makeTrack('kick', 'Kick', '#ff5e5b', 60, 'sine'),
  makeTrack('snare', 'Snare', '#ffd166', 220, 'square'),
  makeTrack('hat', 'Hi-Hat', '#06d6a0', 880, 'triangle'),
  makeTrack('bass', 'Bass', '#118ab2', 110, 'sawtooth'),
  makeTrack('lead', 'Lead', '#a663cc', 660, 'square'),
]

// Seed with a basic 4-on-the-floor + offbeat hat pattern.
DEFAULT_TRACKS[0].steps = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false]
DEFAULT_TRACKS[1].steps = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false]
DEFAULT_TRACKS[2].steps = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false]
DEFAULT_TRACKS[3].steps = [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, false]

const BROWSER_FOLDERS = [
  '📁 Drum kits',
  '📁 808s & Bass',
  '📁 Synths',
  '📁 Vocals',
  '📁 FX & Risers',
  '📁 Loops',
  '🎹 VST Plugins',
  '🎚 Mixer presets',
  '⭐ Favourites',
]

export default function FLStudio() {
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS)
  const [bpm, setBpm] = useState(120)
  const [playing, setPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Step toggler
  const toggleStep = (trackIdx: number, stepIdx: number) => {
    setTracks((prev) =>
      prev.map((t, i) =>
        i === trackIdx ? { ...t, steps: t.steps.map((s, si) => (si === stepIdx ? !s : s)) } : t,
      ),
    )
  }

  // Audio engine — set up an AudioContext lazily so we honour autoplay rules.
  const getCtx = () => {
    if (!audioCtxRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtxRef.current = new Ctor()
    }
    return audioCtxRef.current!
  }

  const playStep = (step: number) => {
    const ctx = getCtx()
    const t = ctx.currentTime
    for (const track of tracks) {
      if (!track.steps[step]) continue
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = track.type
      osc.frequency.value = track.freq
      gain.gain.setValueAtTime(track.volume, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.2)
    }
  }

  useEffect(() => {
    if (!playing) return
    // 16th-note interval at the configured BPM.
    const interval = 60000 / bpm / 4
    const id = window.setInterval(() => {
      setCurrentStep((s) => {
        const next = (s + 1) % STEPS
        playStep(next)
        return next
      })
    }, interval)
    return () => window.clearInterval(id)
    // playStep closes over tracks/bpm via state; new effect each change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, bpm, tracks])

  // Waveform animation on a canvas.
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return
    let raf = 0
    const draw = (time: number) => {
      const w = cvs.width
      const h = cvs.height
      ctx.clearRect(0, 0, w, h)
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, '#ff7a00')
      grad.addColorStop(1, '#ffcc66')
      ctx.strokeStyle = grad
      ctx.lineWidth = 2
      ctx.beginPath()
      const intensity = playing ? 28 : 6
      for (let x = 0; x < w; x++) {
        const v =
          Math.sin(x * 0.05 + time * 0.003) * intensity +
          Math.sin(x * 0.13 + time * 0.005) * (intensity / 2)
        ctx.lineTo(x, h / 2 + v)
      }
      ctx.stroke()
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const setVolume = (id: string, v: number) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, volume: v } : t)))
  }

  const togglePlay = () => {
    if (!playing) {
      // Resume context on first user gesture.
      const ctx = getCtx()
      if (ctx.state === 'suspended') ctx.resume()
      setCurrentStep(-1) // so first tick plays step 0
    }
    setPlaying((p) => !p)
  }

  const stop = () => {
    setPlaying(false)
    setCurrentStep(0)
  }

  const clear = () => {
    setTracks((prev) => prev.map((t) => ({ ...t, steps: Array.from({ length: STEPS }, () => false) })))
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-white select-none">
      {/* Title bar */}
      <div className="h-8 bg-black flex items-center px-3 shrink-0 border-b border-orange-500/40">
        <img src="/assets/img/fl studio.webp" alt="" className="w-4 h-4 mr-2" />
        <span className="text-xs font-semibold">FL Studio 24 — Producer Edition</span>
        <span className="ml-auto text-[10px] opacity-60">Project: portfolio.flp</span>
      </div>

      {/* Transport */}
      <div className="h-12 bg-[#252525] border-b border-orange-500/30 flex items-center px-3 space-x-3 shrink-0">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-8 rounded font-bold ${
            playing ? 'bg-orange-500 text-black' : 'bg-white/10 hover:bg-white/20'
          }`}
          title="Play/Pause"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          onClick={stop}
          className="w-10 h-8 rounded bg-white/10 hover:bg-white/20"
          title="Stop"
        >
          ■
        </button>
        <div className="flex items-center space-x-2 text-xs">
          <span className="opacity-70">BPM</span>
          <input
            type="number"
            min={40}
            max={240}
            value={bpm}
            onChange={(e) => setBpm(Math.max(40, Math.min(240, Number(e.target.value) || 120)))}
            className="w-16 bg-black border border-orange-500/40 px-2 py-0.5 rounded text-orange-300 font-mono text-center"
          />
        </div>
        <div className="font-mono text-orange-400 tabular-nums">
          {playing ? '⏵ ' : '⏸ '} {String(Math.floor(currentStep / 4) + 1).padStart(2, '0')}.{String((currentStep % 4) + 1).padStart(2, '0')}
        </div>
        <button
          type="button"
          onClick={clear}
          className="ml-auto px-3 py-1 rounded text-xs bg-white/10 hover:bg-white/20"
        >
          Clear pattern
        </button>
      </div>

      {/* Waveform */}
      <div className="h-16 bg-black/60 border-b border-orange-500/30 shrink-0">
        <canvas ref={canvasRef} width={1200} height={64} className="w-full h-full" />
      </div>

      <div className="flex-grow flex min-h-0">
        {/* Browser */}
        <div className="w-48 bg-[#1f1f1f] border-r border-orange-500/30 shrink-0 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider opacity-60 border-b border-white/10">
            Browser
          </div>
          {BROWSER_FOLDERS.map((f) => (
            <div
              key={f}
              className="px-3 py-1.5 text-xs hover:bg-white/5 cursor-default border-b border-white/5"
            >
              {f}
            </div>
          ))}
        </div>

        {/* Step sequencer */}
        <div className="flex-grow overflow-auto p-3">
          <div className="text-[10px] uppercase tracking-wider opacity-60 mb-2">
            Channel rack · 16-step pattern
          </div>
          <table className="w-full border-separate" style={{ borderSpacing: '4px' }}>
            <thead>
              <tr>
                <th className="text-left text-[10px] opacity-60 font-normal pl-1">Track</th>
                {Array.from({ length: STEPS }).map((_, i) => (
                  <th
                    key={i}
                    className={`text-[9px] font-normal w-7 ${
                      i % 4 === 0 ? 'opacity-100 text-orange-400' : 'opacity-40'
                    }`}
                  >
                    {i + 1}
                  </th>
                ))}
                <th className="text-[10px] opacity-60 font-normal pl-2">Vol</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((t, ti) => (
                <tr key={t.id}>
                  <td className="text-xs font-medium pr-2 whitespace-nowrap">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </td>
                  {t.steps.map((on, si) => (
                    <td key={si}>
                      <button
                        type="button"
                        onClick={() => toggleStep(ti, si)}
                        className={`w-7 h-7 rounded-sm border transition-colors ${
                          on ? 'border-orange-500' : 'border-white/10 hover:border-white/30'
                        } ${
                          playing && currentStep === si ? 'ring-2 ring-orange-300/70' : ''
                        } ${si % 4 === 0 && !on ? 'bg-white/5' : ''}`}
                        style={{ backgroundColor: on ? t.color : undefined }}
                        aria-pressed={on}
                        aria-label={`${t.name} step ${si + 1}`}
                      />
                    </td>
                  ))}
                  <td className="pl-2">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={t.volume}
                      onChange={(e) => setVolume(t.id, Number(e.target.value))}
                      className="w-16"
                      aria-label={`${t.name} volume`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 text-[10px] uppercase tracking-wider opacity-60 mb-2">Mixer</div>
          <div className="flex gap-3">
            {tracks.map((t) => (
              <div
                key={t.id}
                className="flex flex-col items-center bg-white/5 rounded p-3 w-20 border border-white/10"
              >
                <div className="text-[10px] font-medium opacity-90 mb-1 truncate w-full text-center">
                  {t.name}
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={t.volume}
                  onChange={(e) => setVolume(t.id, Number(e.target.value))}
                  className="rotate-[-90deg] w-20 my-6"
                  aria-label={`${t.name} mixer fader`}
                />
                <div className="text-[10px] font-mono opacity-70 mt-1">
                  {Math.round(t.volume * 100)}%
                </div>
                <div
                  className="w-8 h-1 mt-1 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
              </div>
            ))}
            <div className="flex flex-col items-center bg-white/5 rounded p-3 w-20 border border-orange-500/40">
              <div className="text-[10px] font-bold text-orange-400 mb-1">MASTER</div>
              <input type="range" min={0} max={1} defaultValue={0.8} step={0.01} className="rotate-[-90deg] w-20 my-6" />
              <div className="text-[10px] font-mono text-orange-400">80%</div>
              <div className="w-8 h-1 mt-1 rounded-full bg-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="h-6 bg-black/60 border-t border-orange-500/30 flex items-center px-3 shrink-0 text-[10px] opacity-70 justify-between">
        <span>WebAudio backend · 44.1 kHz · 5 channels</span>
        <span>v24.2.0 · CPU 12%</span>
      </div>
    </div>
  )
}
