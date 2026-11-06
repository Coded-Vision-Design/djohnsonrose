import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { track } from './telemetry'
import { resetConsentForTests, setConsent } from './consent'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

describe('track', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    resetConsentForTests()
    fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const body = () => JSON.parse(fetchMock.mock.calls[0][1].body as string)

  it('sends the app, the build and a real browser and system once accepted', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE)
    setConsent(true)
    track('System: Information', { description: 'Starting application: Calculator', app: 'calculator' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(body()).toMatchObject({
      action: 'System: Information',
      details: { app: 'calculator', source: 'react' },
      deviceInfo: { os: 'iOS', browser: 'Safari 17' },
    })
  })

  it('sends nothing before the visitor answers, or after they withdraw', () => {
    track('System: Information', { app: 'calculator' })
    setConsent(true)
    setConsent(false)
    track('System: Information', { app: 'notepad' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still sends when session storage is blocked', () => {
    setConsent(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(() => track('Security: Information', {})).not.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(typeof body().details.sessionID).toBe('string')
  })
})
