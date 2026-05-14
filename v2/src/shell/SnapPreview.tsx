import { useOsStore } from '../store/osStore'

// Translucent overlay shown while dragging a window near a screen edge — mirrors
// the original Alpine `snapPreview` from os/shell.js.
export function SnapPreview() {
  const snap = useOsStore((s) => s.snapPreview)
  if (!snap.show) return null
  return (
    <div
      className="absolute pointer-events-none rounded-lg border-2 border-win-blue bg-win-blue/20 transition-all"
      style={{ left: snap.x, top: snap.y, width: snap.w, height: snap.h }}
    />
  )
}
