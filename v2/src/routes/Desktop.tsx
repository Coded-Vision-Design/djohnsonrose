import { Link } from 'react-router-dom'

export default function Desktop() {
  return (
    <div className="h-screen w-screen bg-win-bg dark:bg-win-dark text-black dark:text-white p-8">
      <div className="text-sm uppercase tracking-wider opacity-60 mb-2">Phase 0 stub</div>
      <h1 className="text-2xl font-semibold mb-4">Desktop</h1>
      <p className="opacity-70 mb-6">
        Phase 1 will replace this with the real desktop, taskbar, and window manager.
      </p>
      <div className="flex gap-3 flex-wrap">
        <Link to="/" className="px-4 py-2 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20">
          ← Back to login
        </Link>
        <Link to="/app/paint" className="px-4 py-2 rounded bg-win-blue text-white hover:opacity-90">
          Open Paint
        </Link>
        <Link to="/app/calculator" className="px-4 py-2 rounded bg-win-blue text-white hover:opacity-90">
          Open Calculator
        </Link>
      </div>
    </div>
  )
}
