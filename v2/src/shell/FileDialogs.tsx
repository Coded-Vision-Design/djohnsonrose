import { useEffect } from 'react'
import { entryProperties } from '../../../assets/js/windowing/file-ops.js'
import { useOsStore } from '../store/osStore'

// The same markup as partials/file-dialogs.php.
export function PropertiesDialog() {
  const properties = useOsStore((s) => s.properties)
  const close = useOsStore((s) => s.closeProperties)
  const fileSystem = useOsStore((s) => s.fileSystem)

  useEffect(() => {
    if (!properties) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [properties, close])

  if (!properties) return null
  const { entry, path } = properties
  const rows = entryProperties(fileSystem, entry, path)

  return (
    <div
      className="fixed inset-0 z-15000 flex items-center justify-center bg-black/20 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${entry.name} Properties`}
        data-properties=""
        className="w-full max-w-sm rounded-lg border border-black/10 bg-white shadow-2xl text-black dark:border-white/10 dark:bg-[#2b2b2b] dark:text-white"
      >
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-2 dark:border-white/5">
          <span className="truncate text-xs font-semibold">{entry.name} Properties</span>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-red-500 hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-center space-x-3">
            {entry.icon?.includes('.') ? (
              <img src={entry.icon} alt="" className="h-10 w-10 object-contain" />
            ) : (
              <span className="text-3xl">{entry.icon || '📄'}</span>
            )}
            <span className="min-w-0 break-all text-sm font-medium">{entry.name}</span>
          </div>
          <dl className="space-y-2 border-t border-black/5 pt-3 text-xs dark:border-white/5">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-2" data-property={label}>
                <dt className="opacity-60">{label}:</dt>
                <dd className="min-w-0 break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex justify-end border-t border-black/5 p-3 dark:border-white/5">
          <button
            type="button"
            onClick={close}
            className="min-h-11 rounded-sm bg-win-blue px-8 py-1.5 text-xs text-white hover:brightness-110"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export function Toast() {
  const toast = useOsStore((s) => s.toast)
  if (!toast) return null
  return (
    <div
      role="status"
      data-os-toast=""
      className="fixed bottom-16 right-4 z-15000 rounded-lg border border-black/10 bg-white px-4 py-3 text-xs text-black shadow-2xl dark:border-white/10 dark:bg-[#2b2b2b] dark:text-white"
    >
      {toast}
    </div>
  )
}
