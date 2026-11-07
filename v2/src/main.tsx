import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/globals.css'
import App from './App.tsx'
import { WindowErrorBoundary } from './windowing/WindowErrorBoundary'
import { arriveFromOtherBuild } from './shell/buildSwitch'

// Arriving from v1 by the build switch, the screen it left is the first thing drawn.
arriveFromOtherBuild()

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
