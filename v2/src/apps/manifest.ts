import data from '../../../data/apps.json'

export interface AppManifestEntry {
  id: string
  title: string
  icon: string
  size: { w: number; h: number }
}

// data/apps.json is the one list of apps, shared with v1 (see
// partials/shell.php) so that titles, sizes and pins cannot drift apart.
export const appManifest: Record<string, AppManifestEntry> = Object.fromEntries(
  data.apps.map((app) => [app.id, app]),
)

export const pinnedApps: string[] = data.pinned

export const startPinnedApps: string[] = data.startPinned

export function getManifestEntry(id: string): AppManifestEntry | undefined {
  return Object.hasOwn(appManifest, id) ? appManifest[id] : undefined
}
