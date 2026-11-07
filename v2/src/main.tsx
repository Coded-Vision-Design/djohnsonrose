import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/globals.css'
import App from './App.tsx'
import { WindowErrorBoundary } from './windowing/WindowErrorBoundary'
import { startVitals } from '../../assets/js/windowing/metrics.js'

// Task Manager's Web Vitals are watched from the start, so that early interactions count.
startVitals()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/v2">
      <div className="h-dvh">
        <WindowErrorBoundary>
          <App />
        </WindowErrorBoundary>
      </div>
    </BrowserRouter>
  </StrictMode>,
)
