// What can be done to a file, shared by both builds. Each operation takes the
// mock file system and returns a new one, and the right-click menus run on the
// same code through a small adapter, so neither framework can behave differently.

export const DESKTOP = 'C:\\Users\\DeVante\\Desktop';
export const RECYCLE_BIN = 'C:\\Recycle Bin';

const ILLEGAL_NAME = /[\\/:*?"<>|]/;

export const joinPath = (path, name) => (path.endsWith('\\') ? path + name : `${path}\\${name}`);

export function parentPath(path) {
  const parts = path.split('\\').filter(Boolean);
  return parts.length <= 2 ? 'C:\\' : parts.slice(0, -1).join('\\');
}

/** Where a folder keeps its contents. A shortcut points somewhere else. */
export const folderPath = (entry, parent) => entry.path ?? joinPath(parent, entry.name);

/** A folder that is not a shortcut has contents to carry when it moves. */
const hasContents = (entry) => entry.type === 'folder' && !entry.path;

const isRecycleBin = (entry) => entry.name === 'Recycle Bin';
const isWithin = (path, root) => path === root || path.startsWith(joinPath(root, ''));

export function findEntry(fs, fullPath) {
  const path = parentPath(fullPath);
  const name = fullPath.split('\\').filter(Boolean).pop();
  const entry = (fs[path] ?? []).find((item) => item.name === name);
  return entry ? { entry, path } : null;
}

function splitName(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
}

/** A name for a copy that nothing in the folder uses. */
export function freeName(entries, name) {
  const taken = (candidate) => entries.some((entry) => entry.name === candidate);
  if (!taken(name)) return name;
  const [stem, extension] = splitName(name);
  let candidate = `${stem} - Copy${extension}`;
  for (let count = 2; taken(candidate); count++) candidate = `${stem} - Copy (${count})${extension}`;
  return candidate;
}

function numberedName(entries, stem, extension = '') {
  const taken = (candidate) => entries.some((entry) => entry.name === candidate);
  let candidate = stem + extension;
  for (let count = 2; taken(candidate); count++) candidate = `${stem} (${count})${extension}`;
  return candidate;
}

/** New items go before the Recycle Bin, so that it stays last on the Desktop. */
function addEntry(entries, entry) {
  const bin = entries.findIndex(isRecycleBin);
  if (bin === -1) return [...entries, entry];
  return [...entries.slice(0, bin), entry, ...entries.slice(bin)];
}

const withoutEntry = (entries, name) => entries.filter((entry) => entry.name !== name);

function rekey(path, from, to) {
  return path === from ? to : joinPath(to, path.slice(joinPath(from, '').length));
}

/** Moves a folder's contents, and repoints any shortcut to them. */
function moveContents(fs, from, to) {
  const next = {};
  for (const [path, entries] of Object.entries(fs)) {
    const moved = entries.map((entry) =>
      entry.path && isWithin(entry.path, from) ? { ...entry, path: rekey(entry.path, from, to) } : entry,
    );
    next[isWithin(path, from) ? rekey(path, from, to) : path] = moved;
  }
  return next;
}

function copyContents(fs, from, to) {
  const next = { ...fs };
  for (const [path, entries] of Object.entries(fs)) {
    if (isWithin(path, from)) next[rekey(path, from, to)] = entries.map((entry) => ({ ...entry }));
  }
  return next;
}

function dropContents(fs, root) {
  return Object.fromEntries(Object.entries(fs).filter(([path]) => !isWithin(path, root)));
}

export function renameEntry(fs, path, name, newName) {
  const clean = newName.trim();
  const entries = fs[path] ?? [];
  const entry = entries.find((item) => item.name === name);
  const refused =
    !entry || !clean || clean === name || ILLEGAL_NAME.test(clean) || entries.some((item) => item.name === clean);
  if (refused) return fs;

  const renamed = entries.map((item) => (item === entry ? { ...item, name: clean, modified: Date.now() } : item));
  const next = { ...fs, [path]: renamed };
  return hasContents(entry) ? moveContents(next, joinPath(path, name), joinPath(path, clean)) : next;
}

export function deleteEntry(fs, path, name) {
  const entry = (fs[path] ?? []).find((item) => item.name === name);
  if (!entry || isRecycleBin(entry) || path === RECYCLE_BIN) return fs;

  const bin = fs[RECYCLE_BIN] ?? [];
  const binName = freeName(bin, name);
  const next = {
    ...fs,
    [path]: withoutEntry(fs[path], name),
    [RECYCLE_BIN]: [...bin, { ...entry, name: binName, originalName: name, originalPath: path }],
  };
  return hasContents(entry) ? moveContents(next, joinPath(path, name), joinPath(RECYCLE_BIN, binName)) : next;
}

export function restoreEntry(fs, name) {
  const entry = (fs[RECYCLE_BIN] ?? []).find((item) => item.name === name);
  if (!entry) return fs;

  const { originalName, originalPath, ...restored } = entry;
  const target = originalPath && fs[originalPath] ? originalPath : DESKTOP;
  const free = freeName(fs[target] ?? [], originalName ?? name);
  const next = {
    ...fs,
    [RECYCLE_BIN]: withoutEntry(fs[RECYCLE_BIN], name),
    [target]: addEntry(fs[target] ?? [], { ...restored, name: free }),
  };
  return hasContents(entry) ? moveContents(next, joinPath(RECYCLE_BIN, name), joinPath(target, free)) : next;
}

export function removeFromBin(fs, name) {
  const next = { ...fs, [RECYCLE_BIN]: withoutEntry(fs[RECYCLE_BIN] ?? [], name) };
  return dropContents(next, joinPath(RECYCLE_BIN, name));
}

export function emptyBin(fs) {
  return (fs[RECYCLE_BIN] ?? []).reduce((next, entry) => removeFromBin(next, entry.name), fs);
}

export function pasteEntry(fs, { mode, name, fromPath }, target) {
  const entry = (fs[fromPath] ?? []).find((item) => item.name === name);
  if (!entry) return { fs, name: null };

  const source = joinPath(fromPath, name);
  if (hasContents(entry) && isWithin(target, source)) return { fs, name: null };
  if (mode === 'cut' && fromPath === target) return { fs, name };

  const free = freeName(fs[target] ?? [], name);
  const destination = joinPath(target, free);
  const pasted = { ...entry, name: free, modified: Date.now() };

  if (mode === 'cut') {
    const next = {
      ...fs,
      [fromPath]: withoutEntry(fs[fromPath], name),
      [target]: addEntry(fs[target] ?? [], pasted),
    };
    return { fs: hasContents(entry) ? moveContents(next, source, destination) : next, name: free };
  }
  const next = { ...fs, [target]: addEntry(fs[target] ?? [], pasted) };
  return { fs: hasContents(entry) ? copyContents(next, source, destination) : next, name: free };
}

export function pasteShortcut(fs, { name, fromPath }, target) {
  const entry = (fs[fromPath] ?? []).find((item) => item.name === name);
  if (!entry) return { fs, name: null };

  const [stem, extension] = splitName(name);
  const free = numberedName(fs[target] ?? [], `${stem} - Shortcut`, extension);
  const shortcut = { ...entry, name: free, shortcut: true, modified: Date.now() };
  if (entry.type === 'folder') shortcut.path = folderPath(entry, fromPath);
  return { fs: { ...fs, [target]: addEntry(fs[target] ?? [], shortcut) }, name: free };
}

/** A zip is a folder holding a copy, which is how Windows shows one. */
export function compressEntry(fs, path, name, icon) {
  const entry = (fs[path] ?? []).find((item) => item.name === name);
  if (!entry) return { fs, name: null };

  const [stem] = entry.type === 'folder' ? [name] : splitName(name);
  const zipName = freeName(fs[path], `${stem}.zip`);
  const zipPath = joinPath(path, zipName);
  const zip = { name: zipName, type: 'folder', icon, zipped: true, modified: Date.now() };
  const next = { ...fs, [path]: addEntry(fs[path], zip), [zipPath]: [{ ...entry }] };
  return {
    fs: hasContents(entry) ? copyContents(next, joinPath(path, name), joinPath(zipPath, name)) : next,
    name: zipName,
  };
}

export function createFolder(fs, path, icon) {
  const name = numberedName(fs[path] ?? [], 'New folder');
  const folder = { name, type: 'folder', icon, modified: Date.now() };
  return {
    fs: { ...fs, [path]: addEntry(fs[path] ?? [], folder), [joinPath(path, name)]: [] },
    name,
  };
}

export function createTextFile(fs, path, icon) {
  const name = numberedName(fs[path] ?? [], 'New Text Document', '.txt');
  const file = { name, type: 'file', icon, content: '', modified: Date.now() };
  return { fs: { ...fs, [path]: addEntry(fs[path] ?? [], file) }, name };
}

export function writeTextFile(fs, path, name, content, icon) {
  const entries = fs[path] ?? [];
  const saved = { name, type: 'file', icon, content, modified: Date.now() };
  const exists = entries.some((item) => item.name === name);
  const next = exists
    ? entries.map((item) => (item.name === name ? { ...item, content, modified: saved.modified } : item))
    : addEntry(entries, saved);
  return { ...fs, [path]: next };
}

// ---- Details ---------------------------------------------------------------

const TYPE_BY_EXTENSION = [
  [/\.pdf$/, 'PDF Document'],
  [/\.txt$/, 'Text Document'],
  [/\.docx?$/, 'Microsoft Word Document'],
  [/\.xlsx$/, 'Microsoft Excel Worksheet'],
  [/\.pptx$/, 'Microsoft PowerPoint Presentation'],
  [/\.psd$/, 'Adobe Photoshop Image'],
  [/\.flp$/, 'FL Studio Project'],
  [/\.(mp4|webm)$/, 'Video file'],
  [/\.(mp3|wav)$/, 'Audio file'],
  [/\.(webp|png|jpe?g)$/, 'Image'],
];

const ICON_BY_EXTENSION = [
  [/\.(webp|png|jpe?g|gif)$/, 'win11/image.webp'],
  [/\.(mp4|webm|mov)$/, 'movies.webp'],
  [/\.(mp3|wav)$/, 'win11/music.webp'],
  [/\.pdf$/, 'pdf.webp'],
  [/\.zip$/, 'win11/zipfolder.webp'],
  [/\.(exe|dll|msi)$/, 'win11/settings.webp'],
  [/\.theme$/, 'win11/personalize.webp'],
];

/**
 * The picture for an entry. Old saved file systems and a few built-in files
 * still name an emoji, which Explorer never shows: they get a Windows image
 * for their type instead.
 */
export function entryIcon(entry, imgPath) {
  const icon = entry.icon ?? '';
  if (icon.startsWith('/') || /\.(webp|svg|png|jpe?g|gif)$/i.test(icon)) return icon;
  if (entry.type === 'folder') return `${imgPath}win11/folder.webp`;
  if (entry.type === 'image') return `${imgPath}win11/image.webp`;
  if (entry.type === 'video') return `${imgPath}movies.webp`;
  const lower = entry.name.toLowerCase();
  const match = ICON_BY_EXTENSION.find(([pattern]) => pattern.test(lower));
  return imgPath + (match ? match[1] : 'notepad++.webp');
}

/** The app a file opens in: projects in FL Studio, everything else in Notepad. */
export function appForFile(name) {
  return /\.flp$/i.test(name) ? 'flstudio' : 'notepad';
}

export function entryType(entry) {
  if (entry.shortcut) return 'Shortcut';
  if (entry.zipped) return 'Compressed (zipped) Folder';
  if (entry.type === 'folder') return 'File folder';
  const lower = entry.name.toLowerCase();
  const match = TYPE_BY_EXTENSION.find(([pattern]) => pattern.test(lower));
  if (match) return match[1];
  if (entry.type === 'app') return 'Application';
  if (entry.type === 'image') return 'Image';
  if (entry.type === 'video') return 'Video file';
  return 'File';
}

function hashName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** Text is measured. Anything else has a size that stays the same each visit. */
export function entrySize(entry) {
  if (entry.type === 'folder') return 0;
  if (typeof entry.content === 'string') return new TextEncoder().encode(entry.content).length;
  return (hashName(entry.name) % 4900000) + 4096;
}

const NEWEST_SEEDED_FILE = Date.UTC(2026, 9, 1);
const TWO_YEARS = 730 * 24 * 60 * 60 * 1000;

export function entryDate(entry) {
  if (entry.modified) return new Date(entry.modified);
  return new Date(NEWEST_SEEDED_FILE - hashName(entry.name) % TWO_YEARS);
}

export function formatSize(bytes) {
  if (bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDate(date) {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function folderSummary(fs, root) {
  const summary = { files: 0, folders: 0, bytes: 0 };
  for (const [path, entries] of Object.entries(fs)) {
    if (!isWithin(path, root)) continue;
    for (const entry of entries) {
      if (entry.type === 'folder') summary.folders++;
      else summary.files++;
      summary.bytes += entrySize(entry);
    }
  }
  return summary;
}

export function sortEntries(entries, key, direction = 'asc') {
  const compare = {
    name: (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
    type: (a, b) => entryType(a).localeCompare(entryType(b)),
    date: (a, b) => entryDate(a).getTime() - entryDate(b).getTime(),
    size: (a, b) => entrySize(a) - entrySize(b),
  }[key];
  return [...entries].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (b.type === 'folder' && a.type !== 'folder') return 1;
    return direction === 'asc' ? compare(a, b) : -compare(a, b);
  });
}

export function sortFolder(fs, path, key, direction = 'asc') {
  const entries = fs[path] ?? [];
  const sorted = sortEntries(entries.filter((entry) => !isRecycleBin(entry)), key, direction);
  return { ...fs, [path]: [...sorted, ...entries.filter(isRecycleBin)] };
}

/** Searches a folder and everything below it, as Explorer does. */
export function searchFolder(fs, root, query) {
  if (!query) return [];
  const needle = query.toLowerCase();
  const found = [];
  for (const [path, entries] of Object.entries(fs)) {
    if (!isWithin(path, root)) continue;
    for (const entry of entries) {
      if (entry.name.toLowerCase().includes(needle)) found.push({ ...entry, location: path });
    }
  }
  return found;
}

/** The rows of a Properties dialog. */
export function entryProperties(fs, entry, path) {
  const rows = [['Type of file', entryType(entry)], ['Location', path]];
  if (entry.type === 'folder') {
    const { files, folders, bytes } = folderSummary(fs, folderPath(entry, path));
    rows.push(['Size', formatSize(bytes) || '0 bytes']);
    rows.push(['Contains', `${files} Files, ${folders} Folders`]);
  } else {
    rows.push(['Size', formatSize(entrySize(entry)) || '0 bytes']);
  }
  if (entry.originalPath) rows.push(['Original location', entry.originalPath]);
  if (entry.app) rows.push(['Opens with', entry.app]);
  rows.push(['Modified', formatDate(entryDate(entry))]);
  return rows;
}

const SIDEBAR = [
  { id: 'home', label: 'Home', icon: 'thispc.webp', path: 'C:\\Users\\DeVante' },
  { id: 'desktop', label: 'Desktop', icon: 'win11/desktop.webp', path: DESKTOP },
  { id: 'documents', label: 'Documents', icon: 'win11/documents.webp', path: 'C:\\Users\\DeVante\\Documents' },
  { id: 'downloads', label: 'Downloads', icon: 'win11/downloads.webp', path: 'C:\\Users\\DeVante\\Downloads' },
  { id: 'pictures', label: 'Pictures', icon: 'win11/pictures.webp', path: 'C:\\Users\\DeVante\\Pictures' },
  { id: 'projects', label: 'Projects', icon: 'win11/folder.webp', path: 'C:\\Users\\DeVante\\Projects' },
];

/** Explorer's sidebar, with the visitor's favourites and the bin's current icon. */
export function explorerSidebar(fs, favourites, imgPath) {
  const bin = fs[RECYCLE_BIN]?.length ? 'recyclebinfull.webp' : 'recyclebinempty.webp';
  const pinned = favourites
    .map((full) => ({ full, found: findEntry(fs, full) }))
    .filter(({ found }) => found)
    .map(({ full, found }) => ({
      id: full,
      label: found.entry.name,
      icon: found.entry.icon,
      entry: found.entry,
      path: found.path,
      favourite: true,
    }));
  return [
    { type: 'header', label: 'Pinned' },
    ...SIDEBAR.map((item) => ({ ...item, icon: imgPath + item.icon })),
    { id: 'recycle', label: 'Recycle Bin', icon: imgPath + bin, path: RECYCLE_BIN },
    ...(pinned.length ? [{ type: 'header', label: 'Favourites' }, ...pinned] : []),
    { type: 'header', label: 'This PC' },
    { id: 'pc', label: "DeVanté's PC", icon: `${imgPath}thispc.webp`, path: 'C:\\' },
    { id: 'cdrive', label: 'C: Drive', icon: `${imgPath}win11/drive_c.webp`, path: 'C:\\', indent: true },
  ];
}

// ---- Saved copies ----------------------------------------------------------

/** Adds anything new to an old saved copy, and refreshes built-in text. */
function upgradeSaved(saved, defaults) {
  const binned = (saved[RECYCLE_BIN] ?? []).map((entry) => entry.originalName ?? entry.name);
  const next = { ...saved };
  for (const [path, entries] of Object.entries(defaults)) {
    let folder = next[path] ?? [];
    for (const entry of entries) {
      const existing = folder.find((item) => item.name === entry.name);
      if (existing && typeof entry.content === 'string') {
        folder = folder.map((item) => (item === existing ? { ...item, content: entry.content } : item));
      } else if (!existing && !binned.includes(entry.name)) {
        folder = addEntry(folder, entry);
      }
    }
    next[path] = folder;
  }
  return next;
}

/**
 * Reads back a visitor's saved file system. Each upgrade runs once, so an item a
 * visitor then deletes stays deleted. Damaged data falls back to the defaults.
 */
export function restoreFileSystem(text, savedVersion, defaults, version) {
  let saved = null;
  try {
    saved = JSON.parse(text);
  } catch {
    return defaults;
  }
  if (!saved || typeof saved !== 'object') return defaults;
  return (Number(savedVersion) || 1) < version ? upgradeSaved(saved, defaults) : saved;
}

// ---- The clipboard and sharing ---------------------------------------------

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    } catch {
      return false;
    }
  }
}

export const shareLink = (base, fullPath) => `${base}#open=${encodeURIComponent(fullPath)}`;

export function sharedPath(hash) {
  const match = /^#open=(.+)$/.exec(hash);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function shareEntry(os, entry, fullPath) {
  const url = shareLink(os.shareBase, fullPath);
  if (navigator.share) {
    try {
      await navigator.share({ title: entry.name, url });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  os.toast((await copyText(url)) ? 'Link copied' : 'Could not copy the link');
}

// ---- What the menus do -----------------------------------------------------

export const isPicture = (entry) =>
  entry.type === 'image' || /\.(webp|jpe?g)$/.test((entry.name ?? '').toLowerCase());

/**
 * The actions behind a file's menus. `os` is each build's adapter: it reads and
 * changes the file system and opens things, and all the rules live here.
 */
export function fileMenuHandlers(os, entry, path) {
  const full = joinPath(path, entry.name);
  return {
    open: () => os.openEntry(entry, path),
    openLocation: () => os.openLocation(path, entry.name),
    cut: () => os.setClipboard({ mode: 'cut', name: entry.name, fromPath: path }),
    copy: () => os.setClipboard({ mode: 'copy', name: entry.name, fromPath: path }),
    rename: () => os.beginRename(entry, path),
    share: () => shareEntry(os, entry, full),
    delete: () => {
      os.changeFiles((fs) => deleteEntry(fs, path, entry.name));
      os.playSound('recycle');
    },
    deleteForever: () => {
      os.changeFiles((fs) => removeFromBin(fs, entry.name));
      os.playSound('recycle');
    },
    empty: () => {
      os.changeFiles(emptyBin);
      os.playSound('recycle');
    },
    restore: () => os.changeFiles((fs) => restoreEntry(fs, entry.name)),
    pinStart: () => os.toggleStartPin(full),
    favourites: () => os.toggleFavourite(full),
    zip: () => os.changeFiles((fs) => compressEntry(fs, path, entry.name, os.icons.zip).fs),
    copyPath: () => copyText(`"${full}"`),
    properties: () => os.showProperties(entry, path),
    setBackground: () => os.setWallpaper(entry.url),
  };
}

export function fileMenuOverrides(os, entry, path) {
  const full = joinPath(path, entry.name);
  return {
    pinStart: { label: os.startPins().includes(full) ? 'Unpin from Start' : 'Pin to Start' },
    favourites: { label: os.favourites().includes(full) ? 'Remove from Favourites' : 'Add to Favourites' },
    setBackground: { hidden: !isPicture(entry) },
  };
}

/** Which menu a file gets, as the Recycle Bin and what is in it have their own. */
export function fileMenuFor(os, entry, path) {
  const handlers = fileMenuHandlers(os, entry, path);
  const overrides = fileMenuOverrides(os, entry, path);
  if (path === RECYCLE_BIN) return { name: 'recycledFile', handlers, overrides: {} };
  if (isRecycleBin(entry)) {
    const empty = { disabled: !(os.files()[RECYCLE_BIN] ?? []).length };
    return { name: 'recycleBin', handlers, overrides: { ...overrides, empty } };
  }
  return { name: 'file', handlers, overrides };
}

/** The actions behind a folder's background: the Desktop, or Explorer's pane. */
export function folderMenuHandlers(os, path) {
  const create = (make) => () => {
    let made = null;
    os.changeFiles((fs) => {
      const result = make(fs);
      made = result.name;
      return result.fs;
    });
    os.beginRename((os.files()[path] ?? []).find((entry) => entry.name === made), path);
  };
  return {
    paste: () => {
      const clip = os.clipboard();
      if (!clip) return;
      os.changeFiles((fs) => pasteEntry(fs, clip, path).fs);
      if (clip.mode === 'cut') os.setClipboard(null);
    },
    pasteShortcut: () => {
      const clip = os.clipboard();
      if (clip) os.changeFiles((fs) => pasteShortcut(fs, clip, path).fs);
    },
    newFolder: create((fs) => createFolder(fs, path, os.icons.folder)),
    newTextFile: create((fs) => createTextFile(fs, path, os.icons.text)),
  };
}

export const folderMenuOverrides = (os) => ({
  paste: { disabled: !os.clipboard() },
  pasteShortcut: { disabled: !os.clipboard() },
});

/**
 * The Desktop's own actions. `show` is each build's way of opening a menu, as
 * View, Sort by and New each lead to one of their own.
 */
export function desktopMenuHandlers(os, show, point) {
  const folder = folderMenuHandlers(os, DESKTOP);
  const sortBy = (key) => () => {
    os.changeFiles((fs) => sortFolder(fs, DESKTOP, key));
    os.resetIconPositions();
  };
  const tick = (active) => ({ icon: active ? 'win11/check.svg' : 'win11/view.svg' });
  return {
    ...folder,
    view: () =>
      show(
        'desktopView',
        point,
        {
          iconsLarge: () => os.setIconSize('large'),
          iconsMedium: () => os.setIconSize('medium'),
          iconsSmall: () => os.setIconSize('small'),
          toggleIcons: () => os.setIconsVisible(!os.iconsVisible()),
        },
        {
          iconsLarge: tick(os.iconSize() === 'large'),
          iconsMedium: tick(os.iconSize() === 'medium'),
          iconsSmall: tick(os.iconSize() === 'small'),
          toggleIcons: tick(os.iconsVisible()),
        },
      ),
    sortBy: () =>
      show('desktopSort', point, {
        sortName: sortBy('name'),
        sortSize: sortBy('size'),
        sortType: sortBy('type'),
        sortDate: sortBy('date'),
      }),
    new: () => show('newItem', point, folder),
    autoArrange: () => os.resetIconPositions(),
  };
}
