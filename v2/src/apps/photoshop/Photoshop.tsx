// Photoshop was a single-screen splash in v1. Same here — a polished brand
// page rather than building a competing canvas to Paint.
export default function Photoshop() {
  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-white">
      <div className="h-8 bg-[#001e36] flex items-center px-3 shrink-0">
        <img src="/assets/img/photoshop.webp" alt="" className="w-4 h-4 mr-2" />
        <span className="text-xs font-medium">Adobe Photoshop 2025</span>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
        <img
          src="/assets/img/photoshop.webp"
          alt=""
          className="w-24 h-24 mb-6 drop-shadow-[0_0_30px_rgba(0,158,219,0.4)]"
        />
        <div className="text-xs uppercase tracking-widest text-[#31a8ff]/80 mb-2">
          Splash · Demo build
        </div>
        <h1 className="text-3xl font-light mb-3">Adobe Photoshop</h1>
        <p className="text-sm opacity-70 max-w-md mb-8">
          The bitmap editor in this OS is{' '}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-paint'))}
            className="underline text-[#31a8ff]"
          >
            Paint
          </button>{' '}
          — it has flood fill, undo/redo, palette, and PNG export. This icon
          is here so the start menu feels complete.
        </p>

        <div className="grid grid-cols-4 gap-2 max-w-md">
          {['Layers', 'Brushes', 'Channels', 'Adjustments'].map((p) => (
            <div
              key={p}
              className="aspect-square rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-[10px] uppercase tracking-wider opacity-60"
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
