import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { WindowErrorBoundary } from './windowing/WindowErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="h-dvh">
      <WindowErrorBoundary>
        <App />
      </WindowErrorBoundary>
    </div>
  </StrictMode>,
)
