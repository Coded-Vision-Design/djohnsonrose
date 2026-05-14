import { Link, useParams } from 'react-router-dom'

export default function AppRoute() {
  const { name } = useParams<{ name: string }>()
  return (
    <div className="h-screen w-screen bg-win-bg dark:bg-win-dark text-black dark:text-white p-8">
      <div className="text-sm uppercase tracking-wider opacity-60 mb-2">Phase 0 stub</div>
      <h1 className="text-2xl font-semibold mb-2">App: {name}</h1>
      <p className="opacity-70 mb-6">
        Phase 2 onward replaces this with the lazy-loaded app component.
      </p>
      <Link to="/desktop" className="px-4 py-2 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20">
        ← Back to desktop
      </Link>
    </div>
  )
}
