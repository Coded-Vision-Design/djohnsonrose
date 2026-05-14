import { useOsStore } from '../../store/osStore'

// v1's FL Studio is a 500-line mock DAW with mixer, sequencer, and waveform
// canvas. Porting it 1:1 wasn't worth the day budget for Phase 4, so this
// ships a branded "Coming soon" splash that points to the v1 version for
// anyone curious. Phase 5 may revisit if there's slack.
export default function FLStudio() {
  const openApp = useOsStore((s) => s.openApp)

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#101019] via-[#1a1a2e] to-[#000] text-white">
      <div className="h-9 flex items-center px-4 shrink-0 border-b border-white/10 bg-black/40">
        <img src="/assets/img/fl studio.webp" alt="" className="w-5 h-5 mr-2" />
        <span className="text-sm font-semibold">FL Studio 24 — Producer Edition</span>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
        <img
          src="/assets/img/fl studio.webp"
          alt=""
          className="w-24 h-24 mb-6 drop-shadow-[0_0_30px_rgba(255,144,0,0.5)]"
        />
        <div className="text-xs uppercase tracking-widest text-orange-300/80 mb-2">
          Phase 4 stub · in the wings
        </div>
        <h1 className="text-3xl font-light mb-3">Coming soon</h1>
        <p className="text-sm opacity-70 max-w-md mb-8 leading-relaxed">
          The full DAW port lands later. It's the heaviest single component in
          the v1 portfolio — a mock mixer, step sequencer, and waveform canvas
          — and trimming the rest of the React refactor to fit it would have
          hurt the wider migration timeline.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-md">
          {(['Mixer', 'Sequencer', 'Browser'] as const).map((s) => (
            <div
              key={s}
              className="aspect-square rounded-lg border border-white/10 bg-white/5 flex flex-col items-center justify-center text-[10px] uppercase tracking-wider opacity-60"
            >
              <div className="text-2xl mb-2 opacity-50">
                {s === 'Mixer' ? '🎚' : s === 'Sequencer' ? '🥁' : '🎼'}
              </div>
              {s}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 rounded bg-orange-500/90 hover:bg-orange-500 text-black font-medium text-xs"
          >
            Try v1's FL Studio →
          </a>
          <button
            type="button"
            onClick={() => openApp('settings')}
            className="px-5 py-2 rounded bg-white/10 hover:bg-white/20 text-white font-medium text-xs"
          >
            Back to Settings
          </button>
        </div>

        <div className="mt-12 text-[10px] opacity-40">
          Image-Line · 1998–2026
        </div>
      </div>
    </div>
  )
}
