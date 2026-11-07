import { Routes, Route } from 'react-router-dom'
import Login from './routes/Login'
import Desktop from './routes/Desktop'
import AppRoute from './routes/AppRoute'
import { ThemeBridge } from './shell/ThemeBridge'

export default function App() {
  return (
    <>
      <a href="#main-content" className="os-skip-link">
        Skip to main content
      </a>
      <ThemeBridge />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/desktop" element={<Desktop />} />
        <Route path="/app/:name" element={<AppRoute />} />
        {/* Any other address shows the desktop rather than a blank page. */}
        <Route path="*" element={<Desktop />} />
      </Routes>
    </>
  )
}
