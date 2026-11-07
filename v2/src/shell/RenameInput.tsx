import { useEffect, useRef, useState } from 'react'
import { useOsStore } from '../store/osStore'

/** Edits a name in place. Enter or clicking away keeps it, and Escape cancels. */
export function RenameInput({ name, className }: { name: string; className: string }) {
  const commit = useOsStore((s) => s.commitRename)
  const cancel = useOsStore((s) => s.cancelRename)
  const [value, setValue] = useState(name)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
    // The name without its extension, as Windows selects it.
    const dot = name.lastIndexOf('.')
    input.current?.setSelectionRange(0, dot > 0 ? dot : name.length)
  }, [name])

  return (
    <input
      ref={input}
      type="text"
      aria-label="New name"
      data-rename-input=""
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') commit(value)
        if (e.key === 'Escape') cancel()
      }}
      onBlur={() => commit(value)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={className}
    />
  )
}
