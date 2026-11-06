import { useOsStore } from '../store/osStore'

// The PHP version serves sounds from /assets/sounds/. We point at the same
// path so we share the existing sound files instead of duplicating them.
const SOUND_BASE = '/assets/sounds/'

export type SoundType = 'startup' | 'click' | 'error' | 'minimize' | 'open' | 'notify' | 'recycle' | 'uac'

const SOUNDS: Record<SoundType, string> = {
  startup: 'Windows Logon.m4a',
  click: 'click.m4a',
  error: 'Windows Error.m4a',
  minimize: 'Windows Minimize.m4a',
  open: 'Windows Restore.m4a',
  notify: 'Windows Notify.m4a',
  recycle: 'Windows Recycle.m4a',
  uac: 'Windows User Account Control.m4a',
}

const DARK_MODE_VARIANTS = new Set([
  'Windows Background.m4a',
  'Windows Notify.m4a',
  'Windows User Account Control.m4a',
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
