import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/globals.css'
import App from './App.tsx'
import { WindowErrorBoundary } from './windowing/WindowErrorBoundary'

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
