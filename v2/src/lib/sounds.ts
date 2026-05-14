import { useOsStore } from '../store/osStore'

// The PHP version serves sounds from /assets/sounds/. We point at the same
// path so we share the existing wav files instead of duplicating them.
const SOUND_BASE = '/assets/sounds/'

export type SoundType = 'startup' | 'click' | 'error' | 'minimize' | 'open' | 'notify' | 'recycle' | 'uac'

const SOUNDS: Record<SoundType, string> = {
  startup: 'Windows Logon.wav',
  click: 'click.wav',
  error: 'Windows Error.wav',
  minimize: 'Windows Minimize.wav',
  open: 'Windows Restore.wav',
  notify: 'Windows Notify.wav',
  recycle: 'Windows Recycle.wav',
  uac: 'Windows User Account Control.wav',
}

const DARK_MODE_VARIANTS = new Set([
  'Windows Background.wav',
  'Windows Notify.wav',
  'Windows User Account Control.wav',
])

export function playSound(type: SoundType) {
  const { settings } = useOsStore.getState()
  if (!settings.sound) return

  const fileName = SOUNDS[type]
  if (!fileName) return

  const folder = settings.theme === 'dark' && DARK_MODE_VARIANTS.has(fileName) ? 'dm/' : ''
  const audio = new Audio(`${SOUND_BASE}${folder}${fileName}`)
  audio.volume = settings.volume / 100
  audio.play().catch(() => {
    /* autoplay blocked — first interaction will unlock */
  })
}
