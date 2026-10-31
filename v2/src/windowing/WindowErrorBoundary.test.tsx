import { Suspense, lazy } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WindowErrorBoundary } from './WindowErrorBoundary'

function Broken(): never {
  throw new Error('render failed')
}

describe('WindowErrorBoundary', () => {
  beforeEach(() => {
    // React logs caught errors to the console; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders its children when nothing is wrong', () => {
    render(
      <WindowErrorBoundary>
        <p>app content</p>
      </WindowErrorBoundary>,
    )
    expect(screen.getByText('app content')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('contains a crash so that other windows keep working', () => {
    render(
      <>
        <WindowErrorBoundary>
          <Broken />
        </WindowErrorBoundary>
        <WindowErrorBoundary>
          <p>the other window</p>
        </WindowErrorBoundary>
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('This app could not be opened.')
    expect(screen.getByText('the other window')).toBeInTheDocument()
  })

  it('explains a chunk that no longer exists after a deploy', async () => {
    const Stale = lazy(() =>
      Promise.reject(new TypeError('Failed to fetch dynamically imported module: /v2/assets/Word-abc.js')),
    )
    render(
      <WindowErrorBoundary>
        <Suspense fallback={<p>loading</p>}>
          <Stale />
        </Suspense>
      </WindowErrorBoundary>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(/updated/i)
  })

  it('offers a reload', async () => {
    const onReload = vi.fn()
    render(
      <WindowErrorBoundary onReload={onReload}>
        <Broken />
      </WindowErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledOnce()
  })

  it('closes the window when asked', async () => {
    const onClose = vi.fn()
    render(
      <WindowErrorBoundary onClose={onClose}>
        <Broken />
      </WindowErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('hides Close where there is no window to close', () => {
    render(
      <WindowErrorBoundary>
        <Broken />
      </WindowErrorBoundary>,
    )
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})
