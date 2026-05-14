import { Routes, Route } from 'react-router-dom'
import Login from './routes/Login'
import Desktop from './routes/Desktop'
import AppRoute from './routes/AppRoute'
import { ThemeBridge } from './shell/ThemeBridge'

export default function App() {
  return (
    <>
      <ThemeBridge />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/desktop" element={<Desktop />} />
        <Route path="/app/:name" element={<AppRoute />} />
      </Routes>
    </>
  )
}
