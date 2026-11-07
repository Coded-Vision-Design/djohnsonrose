// The address bar, shared by both builds. Each app has an address of its own,
// app/<id> under the build's base path (/ for v1, /v2/ for v2), and the base
// path itself is the desktop's. The address names the window in front, so that
// it can be shared, bookmarked and reloaded, and Back and Forward move between
// the apps a visitor opened.
//
// An address holds the app and nothing else. A file, folder or web page an app
// was opened with stays in its window: a file's contents cannot go in an
// address, files have share links of their own (sharedPath in file-ops.js), and
// an address should show the same thing however it is reached, by a link, a
// reload or Back. So Back to a Notepad that has been closed opens Notepad
// empty, as its link would.
//
// lib/routes.php, .htaccess and v2's dev server (vite.config.ts) know the same
// addresses, so any other address is a 404 in both builds.

/** The other addresses v1 has always given the desktop. */
const DESKTOP_ALIASES = ['', 'login', 'desktop'];

/** The address of an app, or of the desktop when `app` is null. */
export function addressOf(base, app) {
  return app ? `${base}app/${app}` : base;
}

/**
 * What an address shows: { app } for an app's, { app: null } for the
 * desktop's, or null when it is neither.
 */
export function readAddress(base, pathname, appIds) {
  const root = base.replace(/\/$/, '');
  if (pathname !== root && !pathname.startsWith(`${root}/`)) return null;
  const rest = pathname.slice(root.length).replace(/^\/|\/$/g, '');
  if (DESKTOP_ALIASES.includes(rest)) return { app: null };
  const app = /^app\/([^/]+)$/.exec(rest)?.[1];
  return app && Array.isArray(appIds) && appIds.includes(app) ? { app } : null;
}

/** The app the address should name: the focused window's, unless it is minimised or gone. */
export function addressedApp(windows, focusedWindowId) {
  const win = (windows ?? []).find((w) => w.id === focusedWindowId);
  return win && win.state !== 'minimized' ? win.app : null;
}

/**
 * How the history follows the address, from what the current entry shows
 * (`from`, from readAddress) to `to` (an app, or null for the desktop). Opening
 * an app adds an entry, and so does anything that takes over from the desktop,
 * such as a window restored from the taskbar, so that Back returns to where the
 * visitor was: on a phone, the desktop. Anything else, another window coming
 * forward or the focused one closing or minimising, changes the current entry,
 * so the history does not fill with every click. Returns 'push', 'replace' or
 * null to leave it.
 */
export function historyStep(from, to, opened) {
  const next = to ?? null;
  if (from && from.app === next) return null;
  if (next !== null && (opened || !from || from.app === null)) return 'push';
  return 'replace';
}

/** The page title: the app first, so that a narrow tab still shows it. */
export function pageTitle(baseTitle, appTitle) {
  return appTitle ? `${appTitle} - ${baseTitle}` : baseTitle;
}

/**
 * Shows what Back or Forward reached: an app's window, brought forward,
 * restored or opened, or for the desktop's address, the desktop, with every
 * window minimised as Show desktop does, so that no window is left in front to
 * take the address over again. `store` is either build's window store.
 */
export function showAddressed(store, app) {
  if (!app) {
    store.minimizeAll();
    return;
  }
  const win = store.windows.find((w) => w.app === app);
  if (!win) store.openApp(app);
  else if (win.state === 'minimized') store.toggleMinimize(win.id);
  else store.focusWindow(win.id);
}

/**
 * Keeps the address in step with the windows, and the windows in step with
 * Back and Forward. Each build calls update({ app, opens }) whenever its
 * windows change, with addressedApp's answer and a count of the apps opened so
 * far; the first call is where the page starts, so it changes nothing. Changes
 * made together settle before the address moves, as a minimise passes through
 * the desktop on its way to the next window. `show` gets an app, or null for
 * the desktop, when Back or Forward reaches one of the site's addresses.
 */
export function followAddress({ base, appIds, titleOf = (app) => app, show, win = window }) {
  const baseTitle = win.document.title;
  let shown = null;
  let latest = null;
  let queued = false;
  let stopped = false;

  const settle = () => {
    queued = false;
    if (stopped || !latest) return;
    const next = latest;
    if (next.app === shown.app && next.opens === shown.opens) return;
    const step = historyStep(readAddress(base, win.location.pathname, appIds), next.app, next.opens !== shown.opens);
    shown = next;
    if (step === 'push') win.history.pushState(null, '', addressOf(base, next.app));
    else if (step === 'replace') win.history.replaceState(win.history.state, '', addressOf(base, next.app));
    win.document.title = pageTitle(baseTitle, next.app && titleOf(next.app));
  };

  const onPopState = () => {
    const reached = readAddress(base, win.location.pathname, appIds);
    if (reached) show(reached.app);
  };
  win.addEventListener('popstate', onPopState);

  return {
    update({ app, opens }) {
      if (stopped) return;
      const state = { app: app ?? null, opens: opens ?? 0 };
      if (!shown) {
        shown = state;
        return;
      }
      latest = state;
      if (!queued) {
        queued = true;
        queueMicrotask(settle);
      }
    },
    stop() {
      stopped = true;
      win.removeEventListener('popstate', onPopState);
    },
  };
}
