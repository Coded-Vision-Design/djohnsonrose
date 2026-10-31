import { Component, type ReactNode } from 'react'

// Thrown by the browser when a lazy chunk cannot be fetched. Each deploy
// replaces the hashed files, so a tab left open across one will hit this.
const CHUNK_ERROR = /dynamically imported module|importing a module script failed|error loading dynamically/i

interface Props {
  children: ReactNode
  onClose?: () => void
  onReload?: () => void
}

interface State {
  error: Error | null
}

// Contains a failure to one window. React.lazy caches a failed import, so
// retrying cannot help: only a reload picks up the new chunk.
export class WindowErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const { onClose, onReload = () => window.location.reload() } = this.props
    const hint = CHUNK_ERROR.test(error.message)
      ? 'The site has been updated since this page loaded. Reload to get the latest version.'
      : 'Reload the page to try again.'

    return (
      <div
        role="alert"
        className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-black dark:text-white"
      >
        <p className="font-semibold">This app could not be opened.</p>
        <p className="text-xs opacity-70">{hint}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReload}
            className="min-h-[44px] px-4 rounded-sm bg-win-blue text-white text-xs font-semibold"
          >
            Reload
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-sm border border-gray-300 dark:border-white/20 text-xs"
            >
              Close
            </button>
          )}
        </div>
      </div>
    )
  }
}
