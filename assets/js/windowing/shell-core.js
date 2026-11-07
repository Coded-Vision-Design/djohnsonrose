// What both builds share besides the windows themselves: the file system, search
// and right-click menus. Plain data in, plain data out, so that neither framework
// can drift from the other. See windowing.js for the same idea.

const RECYCLE_BIN = 'C:\\Recycle Bin';

const isRelative = (value) => typeof value === 'string' && value !== '' && !/^[a-z]+:/i.test(value);

/** An icon is either an emoji, used as it is, or the name of an image. */
const isImage = (icon) => isRelative(icon) && icon.includes('.');

/**
 * Turns data/filesystem.json into entries with this build's paths. The build
 * switch becomes a link to the other build.
 */
export function prepareFileSystem(data, { imgPath, basePath, otherBuild }) {
  const withBase = (value) => (isRelative(value) ? basePath + value : value);

  const prepare = (entry) => {
    if (entry.type === 'buildSwitch') {
      return { name: otherBuild.name, type: 'link', url: otherBuild.url, icon: imgPath + otherBuild.icon };
    }
    const out = { ...entry };
    if (isImage(out.icon)) out.icon = imgPath + out.icon;
    if (out.url) out.url = withBase(out.url);
    if (out.pdfUrl) out.pdfUrl = withBase(out.pdfUrl);
    return out;
  };

  return Object.fromEntries(Object.entries(data).map(([path, entries]) => [path, entries.map(prepare)]));
}

/**
 * Finds apps first, then files. A shortcut with the same name as an app would
 * only repeat it, but a document that opens in that app still counts.
 */
export function searchOs(query, apps, fileSystem, limit = 10) {
  if (!query) return [];
  const needle = query.toLowerCase();
  const matches = (name) => name.toLowerCase().includes(needle);
  const inBin = (path) => path === RECYCLE_BIN || path.startsWith(`${RECYCLE_BIN}\\`);

  const found = apps
    .filter((app) => matches(app.title))
    .map((app) => ({ name: app.title, type: 'app', app: app.id, icon: app.icon, fullPath: '' }));
  const titles = new Set(found.map((app) => app.name));

  for (const [path, entries] of Object.entries(fileSystem)) {
    if (inBin(path)) continue;
    for (const entry of entries) {
      if (matches(entry.name) && !(entry.type === 'app' && titles.has(entry.name))) {
        found.push({ ...entry, fullPath: path });
      }
    }
  }
  return found.slice(0, limit);
}

const withoutStraySeparators = (items) =>
  items.filter((item, index) => {
    if (!item.separator) return true;
    const before = items.slice(0, index).reverse()[0];
    return index > 0 && index < items.length - 1 && !before.separator;
  });

/**
 * Fills in a menu from data/menus.json. Each build supplies what the items do,
 * as handlers by id, and any change to one item, as overrides by id. An override
 * of { hidden: true } drops the item. An item with no action is greyed out, so
 * that nothing in a menu can look as if it works when it does not.
 */
export function buildMenu(menu, imgPath, handlers = {}, overrides = {}) {
  const fill = (item) => {
    if (item.separator) return item;
    const filled = { ...item, ...overrides[item.id] };
    const action = handlers[item.id];
    return { ...filled, icon: imgPath + filled.icon, action, disabled: Boolean(filled.disabled || !action) };
  };
  const shown = (item) => !item.hidden;

  return {
    variant: menu.variant ?? 'modern',
    actions: (menu.actions ?? []).map(fill).filter(shown),
    items: withoutStraySeparators((menu.items ?? []).map(fill).filter(shown)),
  };
}

function menuSize(menu) {
  const classic = menu.variant === 'classic';
  const rows = menu.items.reduce((total, item) => total + (item.separator ? 9 : classic ? 26 : 32), 12);
  return { width: classic ? 240 : 260, height: rows + (menu.actions?.length ? 44 : 0) };
}

/**
 * A CSS url() for a wallpaper or picture. A file name with spaces, quotes or
 * brackets would otherwise end the value early and blank the background.
 */
export function cssUrl(address) {
  const safe = String(address).replace(/[\s"'()\\;]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
  return `url("${safe}")`;
}

/** The taskbar clock. h23 keeps midnight at 00:00, where hour12: false can give 24:00. */
export const clockTime = (date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const clockDate = (date) =>
  date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });

/** The distance between two fingers, or 0 with fewer than two. */
export function fingerGap(touches) {
  if (touches.length < 2) return 0;
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

/**
 * The zoom a pinch has reached. It follows the fingers rather than counting touch
 * events, so the same pinch lands on the same zoom on a fast phone and a slow one.
 */
export function pinchZoom(startZoom, startGap, gap) {
  if (!startGap) return startZoom;
  return Math.min(Math.max(0.7, startZoom * (gap / startGap)), 1.3);
}

/** Where a menu opened at a point goes, kept on screen. */
export function placeMenu(x, y, menu, viewport, above = false) {
  const margin = 8;
  const { width, height } = menuSize(menu);
  return {
    x: Math.max(margin, Math.min(x, viewport.width - width - margin)),
    y: Math.max(margin, Math.min(above ? y - height : y, viewport.height - height - margin)),
  };
}
