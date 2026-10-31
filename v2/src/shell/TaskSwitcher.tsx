import { useOsStore } from '../store/osStore'
import { getApp } from '../apps/registry'

// Phones show one app at a time, so this replaces overlapping windows as the
// way to move between them. Most recently used comes first.
export function TaskSwitcher() {
  const open = useOsStore((s) => s.taskSwitcherOpen)
  const windows = useOsStore((s) => s.windows)
  const openApp = useOsStore((s) => s.openApp)
  const closeWindow = useOsStore((s) => s.closeWindow)
  const toggleTaskSwitcher = useOsStore((s) => s.toggleTaskSwitcher)

  if (!open) return null

  const recent = [...windows].sort((a, b) => b.z - a.z)

  return (
    <div className="os-task-switcher" role="dialog" aria-label="Open apps">
      <div className="os-task-switcher-head">
        <h2>Open apps</h2>
        <button type="button" className="os-task-clear" onClick={toggleTaskSwitcher}>
          Done
        </button>
      </div>
      {recent.length === 0 ? (
        <p className="os-task-empty">No apps are open.</p>
      ) : (
        <div className="os-task-switcher-list">
          {recent.map((win) => (
            <div key={win.id} className="os-task-row">
              <button type="button" className="os-task-card" onClick={() => openApp(win.app)}>
                <img src={getApp(win.app)?.icon} alt="" />
                <span>{win.title}</span>
              </button>
              <button
                type="button"
                className="os-task-close"
                aria-label={`Close ${win.title}`}
                onClick={() => closeWindow(win.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
