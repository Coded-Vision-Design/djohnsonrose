import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement these; stub them so anything touching them in tests
// doesn't blow up.
if (!('innerWidth' in window) || !window.innerWidth) {
  Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true })
}
if (!('innerHeight' in window) || !window.innerHeight) {
  Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })
}

// Audio.play returns a rejected Promise in jsdom; stub to a resolved no-op.
class FakeAudio {
  src: string
  volume = 1
  constructor(src: string) {
    this.src = src
  }
  play() {
    return Promise.resolve()
  }
}
Object.defineProperty(window, 'Audio', { value: FakeAudio, writable: true })
