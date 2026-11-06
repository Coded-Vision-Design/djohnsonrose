import { useOsStore } from '../store/osStore'
import { getApp } from '../apps/registry'
import { SIGN_IN_MIN_MS, whenAssetsReady } from '../../../assets/js/windowing/shell-ui.js'

/**
 * Resolves once the pictures the desktop shows first are ready: the wallpaper,
 * Start and the taskbar's pinned apps. The same list as v1's desktopAssets()
 * in shell.js, so that signing in takes as long in both builds.
 */
export function whenDesktopReady(): Promise<void> {
  const { settings, pinnedApps } = useOsStore.getState()
  const icons = pinnedApps.map((id) => getApp(id)?.icon)
  return whenAssetsReady([settings.wallpaper, '/assets/img/startmenu.webp', ...icons], {
    minMs: SIGN_IN_MIN_MS,
  })
}
