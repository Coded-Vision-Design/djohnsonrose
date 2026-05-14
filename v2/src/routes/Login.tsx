import { Link } from 'react-router-dom'

export default function Login() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-win-dark text-white">
      <div className="text-sm uppercase tracking-wider opacity-60 mb-2">Phase 0 stub</div>
      <h1 className="text-3xl font-semibold mb-6">Portfolio OS — React (v2)</h1>
      <Link to="/desktop" className="px-6 py-2 rounded bg-win-blue hover:opacity-90 transition">
        Sign in
      </Link>
      <p className="mt-8 text-xs opacity-50">
        Routes: <code>/</code> · <code>/desktop</code> · <code>/app/:name</code>
      </p>
    </div>
  )
}
