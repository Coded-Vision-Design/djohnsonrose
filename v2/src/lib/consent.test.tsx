import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readConsent, setConsent, useConsent, resetConsentForTests } from './consent'
import { CookieBanner } from '../shell/CookieBanner'

function Probe() {
  const consent = useConsent()
  return <div data-testid="consent">{String(consent)}</div>
}

describe('consent', () => {
  beforeEach(() => {
    localStorage.clear()
    resetConsentForTests()
  })
  afterEach(() => vi.restoreAllMocks())

  it('is unknown until the visitor chooses, then remembers the choice', () => {
    expect(readConsent()).toBeNull()
    setConsent(true)
    expect(readConsent()).toBe(true)
    expect(localStorage.getItem('react.cookie.consent')).toBe('true')
    setConsent(false)
    expect(readConsent()).toBe(false)
  })

  it('tells every reader at once, so Settings never shows a stale choice', () => {
    render(<Probe />)
    expect(screen.getByTestId('consent')).toHaveTextContent('null')
    act(() => setConsent(true))
    expect(screen.getByTestId('consent')).toHaveTextContent('true')
  })

  it('still works, for this visit, when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(readConsent()).toBeNull()
    expect(() => setConsent(true)).not.toThrow()
    expect(readConsent()).toBe(true)
  })
})

describe('CookieBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    resetConsentForTests()
  })
  afterEach(() => vi.restoreAllMocks())

  it('says what is recorded, links the privacy notice, and goes once answered', async () => {
    render(<CookieBanner />)
    const banner = screen.getByRole('dialog', { name: 'Cookie consent' })
    expect(banner).toHaveTextContent(
      'If you accept, the site records which apps you open and a shortened IP address, and may load Google Analytics. Records are kept for 90 days.',
    )
    expect(banner).not.toHaveTextContent('No personal data')
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy')
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(screen.queryByRole('dialog', { name: 'Cookie consent' })).toBeNull()
    expect(readConsent()).toBe(true)
  })

  it('does not show once the visitor has chosen', () => {
    setConsent(false)
    render(<CookieBanner />)
    expect(screen.queryByRole('dialog', { name: 'Cookie consent' })).toBeNull()
  })

  it('renders, rather than crashing the page, when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    render(<CookieBanner />)
    expect(screen.getByRole('dialog', { name: 'Cookie consent' })).toBeInTheDocument()
  })
})
