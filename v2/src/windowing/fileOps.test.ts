import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DESKTOP,
  RECYCLE_BIN,
  appForFile,
  compressEntry,
  copyText,
  createFolder,
  createTextFile,
  deleteEntry,
  desktopMenuHandlers,
  emptyBin,
  entryProperties,
  explorerSidebar,
  entryDate,
  entryIcon,
  entrySize,
  entryType,
  fileMenuHandlers,
  fileMenuOverrides,
  findEntry,
  folderMenuHandlers,
  folderSummary,
  formatSize,
  freeName,
  joinPath,
  parentPath,
  pasteEntry,
  pasteShortcut,
  removeFromBin,
  renameEntry,
  restoreEntry,
  restoreFileSystem,
  searchFolder,
  sharedPath,
  shareLink,
  sortEntries,
  sortFolder,
  writeTextFile,
  type FileOs,
  type OsFiles,
} from '../../../assets/js/windowing/file-ops.js'

const HOME = 'C:\\Users\\DeVante'
const DOCS = `${HOME}\\Documents`
const WORK = `${DOCS}\\Work`

const fixture = (): OsFiles => ({
  [DESKTOP]: [
    { name: 'notes.txt', type: 'file', icon: 'a', content: 'hello' },
    { name: 'Chrome', type: 'app', app: 'edge', icon: 'c' },
    { name: 'Projects', type: 'folder', path: `${HOME}\\Projects`, icon: 'f' },
    { name: 'Recycle Bin', type: 'folder', path: RECYCLE_BIN, icon: 'b' },
  ],
  [DOCS]: [
    { name: 'Work', type: 'folder', icon: 'f' },
    { name: 'cv.txt', type: 'file', icon: 'a', content: 'cv' },
  ],
  [WORK]: [
    { name: 'plan.txt', type: 'file', icon: 'a', content: 'plan' },
    { name: 'Old', type: 'folder', icon: 'f' },
  ],
  [`${WORK}\\Old`]: [{ name: 'old.txt', type: 'file', icon: 'a', content: 'old' }],
  [`${HOME}\\Projects`]: [],
  [RECYCLE_BIN]: [],
})

const names = (fs: OsFiles, path: string) => fs[path].map((e) => e.name)

describe('appForFile', () => {
  it('opens FL Studio projects in FL Studio', () => {
    expect(appForFile('Demo.flp')).toBe('flstudio')
    expect(appForFile('LOUD.FLP')).toBe('flstudio')
  })

  it('opens everything else in Notepad', () => {
    expect(appForFile('notes.txt')).toBe('notepad')
    expect(appForFile('flp')).toBe('notepad')
  })
})

describe('paths', () => {
  it('joins a name to a folder, and to the drive', () => {
    expect(joinPath(DESKTOP, 'a.txt')).toBe(`${DESKTOP}\\a.txt`)
    expect(joinPath('C:\\', 'Users')).toBe('C:\\Users')
  })

  it('finds a parent, and stops at the drive', () => {
    expect(parentPath(WORK)).toBe(DOCS)
    expect(parentPath('C:\\Users')).toBe('C:\\')
    expect(parentPath('C:\\')).toBe('C:\\')
  })

  it('finds an entry by its full path', () => {
    expect(findEntry(fixture(), `${WORK}\\plan.txt`)?.entry.content).toBe('plan')
    expect(findEntry(fixture(), `${WORK}\\missing.txt`)).toBeNull()
  })
})

describe('freeName', () => {
  const entries = [{ name: 'a.txt' }, { name: 'a - Copy.txt' }, { name: 'Folder' }]

  it('keeps a name nothing else uses', () => {
    expect(freeName(entries, 'b.txt')).toBe('b.txt')
  })

  it('counts up past names already taken', () => {
    expect(freeName(entries, 'a.txt')).toBe('a - Copy (2).txt')
  })

  it('handles a name with no extension', () => {
    expect(freeName(entries, 'Folder')).toBe('Folder - Copy')
  })
})

describe('renameEntry', () => {
  it('keeps a shortcut pointing at a renamed folder', () => {
    const start = fixture()
    start[DESKTOP].push({ name: 'Work link', type: 'folder', path: WORK, icon: 'f' })
    const fs = renameEntry(start, DOCS, 'Work', 'Jobs')
    expect(findEntry(fs, `${DESKTOP}\\Work link`)?.entry.path).toBe(`${DOCS}\\Jobs`)
  })

  it('renames a file and dates the change', () => {
    const fs = renameEntry(fixture(), DESKTOP, 'notes.txt', 'ideas.txt')
    expect(names(fs, DESKTOP)).toContain('ideas.txt')
    expect(fs[DESKTOP][0].modified).toBeGreaterThan(0)
  })

  it('takes a folder’s contents with it', () => {
    const fs = renameEntry(fixture(), DOCS, 'Work', 'Jobs')
    expect(names(fs, `${DOCS}\\Jobs`)).toContain('plan.txt')
    expect(names(fs, `${DOCS}\\Jobs\\Old`)).toContain('old.txt')
    expect(fs[WORK]).toBeUndefined()
  })

  it('ignores an empty, unchanged, taken or illegal name', () => {
    const before = fixture()
    for (const bad of ['', '   ', 'notes.txt', 'Chrome', 'a/b', 'a:b', 'a?b']) {
      expect(renameEntry(before, DESKTOP, 'notes.txt', bad)).toBe(before)
    }
  })

  it('does not change the file system it was given', () => {
    const before = fixture()
    renameEntry(before, DESKTOP, 'notes.txt', 'ideas.txt')
    expect(names(before, DESKTOP)).toContain('notes.txt')
  })
})

describe('deleting and restoring', () => {
  it('moves a file to the Recycle Bin and remembers where from', () => {
    const fs = deleteEntry(fixture(), DESKTOP, 'notes.txt')
    expect(names(fs, DESKTOP)).not.toContain('notes.txt')
    expect(fs[RECYCLE_BIN][0]).toMatchObject({ name: 'notes.txt', originalPath: DESKTOP })
  })

  it('moves a folder’s contents with it', () => {
    const fs = deleteEntry(fixture(), DOCS, 'Work')
    expect(fs[WORK]).toBeUndefined()
    expect(names(fs, `${RECYCLE_BIN}\\Work`)).toContain('plan.txt')
  })

  it('refuses to delete the Recycle Bin', () => {
    const before = fixture()
    expect(deleteEntry(before, DESKTOP, 'Recycle Bin')).toBe(before)
  })

  it('keeps two deleted files of the same name apart', () => {
    let fs = deleteEntry(fixture(), DESKTOP, 'notes.txt')
    fs = createTextFileNamed(fs, DESKTOP, 'notes.txt')
    fs = deleteEntry(fs, DESKTOP, 'notes.txt')
    expect(names(fs, RECYCLE_BIN)).toEqual(['notes.txt', 'notes - Copy.txt'])
  })

  it('restores a file to where it came from, before the Recycle Bin icon', () => {
    const fs = restoreEntry(deleteEntry(fixture(), DESKTOP, 'notes.txt'), 'notes.txt')
    expect(names(fs, DESKTOP).at(-1)).toBe('Recycle Bin')
    expect(names(fs, DESKTOP)).toContain('notes.txt')
    expect(fs[RECYCLE_BIN]).toEqual([])
    expect(findEntry(fs, `${DESKTOP}\\notes.txt`)?.entry.originalPath).toBeUndefined()
  })

  it('restores a folder with its contents', () => {
    const fs = restoreEntry(deleteEntry(fixture(), DOCS, 'Work'), 'Work')
    expect(names(fs, WORK)).toContain('plan.txt')
    expect(names(fs, `${WORK}\\Old`)).toContain('old.txt')
  })

  it('restores to the Desktop when the original folder has gone', () => {
    const start = { ...fixture(), [RECYCLE_BIN]: [{ name: 'a.txt', type: 'file', icon: '', originalPath: 'C:\\Gone' }] }
    expect(names(restoreEntry(start, 'a.txt'), DESKTOP)).toContain('a.txt')
  })

  it('deletes for good, one item or everything', () => {
    let fs = deleteEntry(deleteEntry(fixture(), DOCS, 'Work'), DESKTOP, 'notes.txt')
    fs = removeFromBin(fs, 'notes.txt')
    expect(names(fs, RECYCLE_BIN)).toEqual(['Work'])
    fs = emptyBin(fs)
    expect(fs[RECYCLE_BIN]).toEqual([])
    expect(fs[`${RECYCLE_BIN}\\Work`]).toBeUndefined()
  })
})

describe('cut, copy and paste', () => {
  const clip = (mode: string, name: string, fromPath: string) => ({ mode, name, fromPath })

  it('copies a file, leaving the original', () => {
    const { fs, name } = pasteEntry(fixture(), clip('copy', 'notes.txt', DESKTOP), DOCS)
    expect(name).toBe('notes.txt')
    expect(names(fs, DOCS)).toContain('notes.txt')
    expect(names(fs, DESKTOP)).toContain('notes.txt')
  })

  it('names a copy pasted beside its original', () => {
    const { name } = pasteEntry(fixture(), clip('copy', 'notes.txt', DESKTOP), DESKTOP)
    expect(name).toBe('notes - Copy.txt')
  })

  it('copies a folder with everything inside it', () => {
    const { fs } = pasteEntry(fixture(), clip('copy', 'Work', DOCS), DESKTOP)
    expect(names(fs, `${DESKTOP}\\Work`)).toContain('plan.txt')
    expect(names(fs, `${DESKTOP}\\Work\\Old`)).toContain('old.txt')
    expect(names(fs, WORK)).toContain('plan.txt')
  })

  it('moves on cut', () => {
    const { fs } = pasteEntry(fixture(), clip('cut', 'Work', DOCS), HOME + '\\Projects')
    expect(names(fs, DOCS)).not.toContain('Work')
    expect(names(fs, `${HOME}\\Projects\\Work\\Old`)).toContain('old.txt')
    expect(fs[WORK]).toBeUndefined()
  })

  it('leaves a file alone when cut and pasted into the same folder', () => {
    const before = fixture()
    expect(pasteEntry(before, clip('cut', 'notes.txt', DESKTOP), DESKTOP).fs).toBe(before)
  })

  it('refuses to paste a folder inside itself', () => {
    const before = fixture()
    expect(pasteEntry(before, clip('cut', 'Work', DOCS), `${WORK}\\Old`).fs).toBe(before)
    expect(pasteEntry(before, clip('copy', 'Work', DOCS), WORK).fs).toBe(before)
  })

  it('does nothing when the original has gone', () => {
    const before = fixture()
    expect(pasteEntry(before, clip('copy', 'gone.txt', DESKTOP), DOCS).name).toBeNull()
  })

  it('makes a shortcut that points at the original folder', () => {
    const { fs, name } = pasteShortcut(fixture(), clip('copy', 'Work', DOCS), DESKTOP)
    expect(name).toBe('Work - Shortcut')
    expect(findEntry(fs, `${DESKTOP}\\Work - Shortcut`)?.entry.path).toBe(WORK)
    expect(fs[`${DESKTOP}\\Work - Shortcut`]).toBeUndefined()
  })
})

describe('compressEntry', () => {
  it('makes a zip beside a file that opens as a folder holding a copy', () => {
    const { fs, name } = compressEntry(fixture(), DESKTOP, 'notes.txt', 'zip.webp')
    expect(name).toBe('notes.zip')
    expect(findEntry(fs, `${DESKTOP}\\notes.zip`)?.entry).toMatchObject({ type: 'folder', zipped: true, icon: 'zip.webp' })
    expect(names(fs, `${DESKTOP}\\notes.zip`)).toEqual(['notes.txt'])
    expect(names(fs, DESKTOP)).toContain('notes.txt')
  })

  it('takes everything inside a folder', () => {
    const { fs } = compressEntry(fixture(), DOCS, 'Work', 'zip.webp')
    expect(names(fs, `${DOCS}\\Work.zip\\Work\\Old`)).toEqual(['old.txt'])
  })

  it('does not overwrite an existing zip', () => {
    const first = compressEntry(fixture(), DESKTOP, 'notes.txt', 'zip.webp')
    expect(compressEntry(first.fs, DESKTOP, 'notes.txt', 'zip.webp').name).toBe('notes - Copy.zip')
  })
})

describe('new items', () => {
  it('makes a folder, then a numbered one', () => {
    const first = createFolder(fixture(), DOCS, 'f')
    const second = createFolder(first.fs, DOCS, 'f')
    expect(first.name).toBe('New folder')
    expect(second.name).toBe('New folder (2)')
    expect(second.fs['C:\\Users\\DeVante\\Documents\\New folder (2)']).toEqual([])
  })

  it('makes an empty text file, before the Recycle Bin on the Desktop', () => {
    const { fs, name } = createTextFile(fixture(), DESKTOP, 't')
    expect(name).toBe('New Text Document.txt')
    expect(findEntry(fs, `${DESKTOP}\\${name}`)?.entry.content).toBe('')
    expect(names(fs, DESKTOP).at(-1)).toBe('Recycle Bin')
  })

  it('saves new text over a file, and makes one that is missing', () => {
    let fs = writeTextFile(fixture(), DESKTOP, 'notes.txt', 'changed', 't')
    expect(findEntry(fs, `${DESKTOP}\\notes.txt`)?.entry.content).toBe('changed')
    fs = writeTextFile(fs, DOCS, 'fresh.txt', 'new', 't')
    expect(findEntry(fs, `${DOCS}\\fresh.txt`)?.entry).toMatchObject({ type: 'file', content: 'new', icon: 't' })
  })
})

describe('details', () => {
  it('names types as Windows does', () => {
    expect(entryType({ name: 'a', type: 'folder' })).toBe('File folder')
    expect(entryType({ name: 'a.zip', type: 'folder', zipped: true })).toBe('Compressed (zipped) Folder')
    expect(entryType({ name: 'a.txt', type: 'file' })).toBe('Text Document')
    expect(entryType({ name: 'a.pdf', type: 'app' })).toBe('PDF Document')
    expect(entryType({ name: 'Chrome', type: 'app' })).toBe('Application')
    expect(entryType({ name: 'a - Shortcut', type: 'app', shortcut: true })).toBe('Shortcut')
  })

  it('measures text truly, and everything else steadily', () => {
    expect(entrySize({ name: 'a.txt', type: 'file', content: 'hello' })).toBe(5)
    const app = { name: 'Chrome', type: 'app' }
    expect(entrySize(app)).toBe(entrySize(app))
    expect(entrySize({ name: 'a', type: 'folder' })).toBe(0)
  })

  it('dates an entry from its last change, or steadily', () => {
    expect(entryDate({ name: 'a', type: 'file', modified: 1000 }).getTime()).toBe(1000)
    const file = { name: 'b', type: 'file' }
    expect(entryDate(file).getTime()).toBe(entryDate(file).getTime())
  })

  it('formats sizes', () => {
    expect(formatSize(0)).toBe('')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(2048)).toBe('2.0 KB')
    expect(formatSize(3 * 1024 * 1024)).toBe('3.00 MB')
  })

  it('adds up what a folder holds, and what is below it', () => {
    expect(folderSummary(fixture(), WORK)).toMatchObject({ files: 2, folders: 1 })
    expect(folderSummary(fixture(), WORK).bytes).toBe(7)
    expect(folderSummary(fixture(), 'C:\\Nowhere')).toMatchObject({ files: 0, folders: 0, bytes: 0 })
  })
})

describe('entryProperties', () => {
  const rows = (entry: object, path: string, fs = fixture()) => Object.fromEntries(entryProperties(fs, entry, path))

  it('describes a file', () => {
    const file = { name: 'notes.txt', type: 'file', content: 'hello' }
    expect(rows(file, DESKTOP)).toMatchObject({ 'Type of file': 'Text Document', Location: DESKTOP, Size: '5 B' })
  })

  it('counts what a folder holds', () => {
    expect(rows({ name: 'Work', type: 'folder' }, DOCS)).toMatchObject({ Contains: '2 Files, 1 Folders' })
  })

  it('says where a deleted file came from', () => {
    const file = { name: 'a.txt', type: 'file', originalPath: DESKTOP }
    expect(rows(file, RECYCLE_BIN)['Original location']).toBe(DESKTOP)
  })
})

describe('entryIcon', () => {
  it('keeps an icon that is already a picture', () => {
    expect(entryIcon({ name: 'a.txt', type: 'file', icon: '/img/notepad++.webp' }, '/img/')).toBe('/img/notepad++.webp')
  })

  it('swaps an emoji, or no icon at all, for a Windows picture', () => {
    expect(entryIcon({ name: 'Downloads', type: 'folder', icon: '📁' }, '/img/')).toBe('/img/win11/folder.webp')
    expect(entryIcon({ name: 'Downloads', type: 'folder' }, '/img/')).toBe('/img/win11/folder.webp')
    expect(entryIcon({ name: 'x.webp', type: 'image', icon: '🖼️' }, '/img/')).toBe('/img/win11/image.webp')
    expect(entryIcon({ name: 'clip.mp4', type: 'video', icon: '🎬' }, '/img/')).toBe('/img/movies.webp')
    expect(entryIcon({ name: 'Windows Error.wav', type: 'file', icon: '🎵' }, '/img/')).toBe('/img/win11/music.webp')
    expect(entryIcon({ name: 'pscp.exe', type: 'file', icon: '⚙️' }, '/img/')).toBe('/img/win11/settings.webp')
    expect(entryIcon({ name: 'dark.theme', type: 'file', icon: '🎨' }, '/img/')).toBe('/img/win11/personalize.webp')
  })

  it('falls back to a text document for anything else', () => {
    expect(entryIcon({ name: 'notes', type: 'file', icon: '?' }, '/img/')).toBe('/img/notepad++.webp')
  })
})

describe('explorerSidebar', () => {
  it('shows favourites, and leaves out any that have gone', () => {
    const items = explorerSidebar(fixture(), [`${DOCS}\\cv.txt`, `${DOCS}\\gone.txt`], '/img/')
    expect(items.filter((item) => item.favourite).map((item) => item.label)).toEqual(['cv.txt'])
  })

  it('has no Favourites heading until there are some', () => {
    expect(explorerSidebar(fixture(), [], '/img/').some((item) => item.label === 'Favourites')).toBe(false)
  })

  it('shows whether the bin is full', () => {
    const empty = explorerSidebar(fixture(), [], '/img/').find((item) => item.id === 'recycle')
    const full = explorerSidebar(deleteEntry(fixture(), DESKTOP, 'notes.txt'), [], '/img/').find((item) => item.id === 'recycle')
    expect(empty?.icon).toBe('/img/recyclebinempty.webp')
    expect(full?.icon).toBe('/img/recyclebinfull.webp')
  })
})

describe('sorting', () => {
  const entries = [
    { name: 'b.txt', type: 'file', content: 'x' },
    { name: 'Zeta', type: 'folder' },
    { name: 'a.txt', type: 'file', content: 'xxxx' },
    { name: 'Alpha', type: 'folder' },
  ]

  it('keeps folders first, by name', () => {
    expect(sortEntries(entries, 'name').map((e) => e.name)).toEqual(['Alpha', 'Zeta', 'a.txt', 'b.txt'])
  })

  it('reverses within folders and files', () => {
    expect(sortEntries(entries, 'name', 'desc').map((e) => e.name)).toEqual(['Zeta', 'Alpha', 'b.txt', 'a.txt'])
  })

  it('sorts by size', () => {
    expect(sortEntries(entries, 'size').slice(2).map((e) => e.name)).toEqual(['b.txt', 'a.txt'])
  })

  it('leaves the original list alone', () => {
    sortEntries(entries, 'name')
    expect(entries[0].name).toBe('b.txt')
  })

  it('reorders a folder in place, keeping the Recycle Bin last on the Desktop', () => {
    const fs = sortFolder(fixture(), DESKTOP, 'name')
    expect(names(fs, DESKTOP)).toEqual(['Projects', 'Chrome', 'notes.txt', 'Recycle Bin'])
  })
})

describe('searchFolder', () => {
  it('looks in a folder and everything below it', () => {
    const results = searchFolder(fixture(), DOCS, '.txt')
    expect(results.map((r) => r.name).sort()).toEqual(['cv.txt', 'old.txt', 'plan.txt'])
    expect(results.find((r) => r.name === 'old.txt')?.location).toBe(`${WORK}\\Old`)
  })

  it('finds nothing outside that folder', () => {
    expect(searchFolder(fixture(), WORK, 'cv')).toEqual([])
  })

  it('ignores case, and an empty search', () => {
    expect(searchFolder(fixture(), DOCS, 'PLAN')).toHaveLength(1)
    expect(searchFolder(fixture(), DOCS, '')).toEqual([])
  })
})

describe('sharing', () => {
  it('makes a link that survives the round trip', () => {
    const path = `${DESKTOP}\\my notes & ideas.txt`
    const link = shareLink('https://example.com/v2/', path)
    expect(link.startsWith('https://example.com/v2/#open=')).toBe(true)
    expect(sharedPath(new URL(link).hash)).toBe(path)
  })

  it('finds no path in an ordinary address', () => {
    expect(sharedPath('')).toBeNull()
    expect(sharedPath('#section')).toBeNull()
  })

  it('survives a damaged link', () => {
    expect(sharedPath('#open=%E0%A4%A')).toBeNull()
  })
})

describe('restoreFileSystem', () => {
  const defaults = () => fixture()
  const stored = (fs: object) => JSON.stringify(fs)

  it('uses the defaults when nothing is saved', () => {
    expect(names(restoreFileSystem(null, null, fixture(), 3), DESKTOP)).toContain('notes.txt')
  })

  it('uses the defaults when the saved copy is damaged, or not a file system', () => {
    expect(names(restoreFileSystem('{not json', '3', defaults(), 3), DESKTOP)).toContain('notes.txt')
    expect(names(restoreFileSystem('5', '3', defaults(), 3), DESKTOP)).toContain('notes.txt')
  })

  it('leaves an up-to-date copy alone, so that a deleted item stays deleted', () => {
    const saved = deleteEntry(fixture(), DESKTOP, 'Chrome')
    saved[RECYCLE_BIN] = []
    expect(names(restoreFileSystem(stored(saved), '3', defaults(), 3), DESKTOP)).not.toContain('Chrome')
  })

  it('adds new items to an old copy and keeps the visitor’s own', () => {
    const saved = fixture()
    saved[DESKTOP] = [
      { name: 'mine.txt', type: 'file', icon: 'a', content: 'mine' },
      { name: 'Recycle Bin', type: 'folder', path: RECYCLE_BIN, icon: 'b' },
    ]
    const fs = restoreFileSystem(stored(saved), '1', defaults(), 3)
    expect(names(fs, DESKTOP)).toEqual(['mine.txt', 'notes.txt', 'Chrome', 'Projects', 'Recycle Bin'])
  })

  it('does not bring back what is in the Recycle Bin', () => {
    const saved = deleteEntry(fixture(), DESKTOP, 'Chrome')
    expect(names(restoreFileSystem(stored(saved), '1', defaults(), 3), DESKTOP)).not.toContain('Chrome')
  })

  it('refreshes the text of built-in files in an old copy', () => {
    const saved = fixture()
    saved[DOCS][1] = { name: 'cv.txt', type: 'file', icon: 'a', content: 'out of date' }
    const fs = restoreFileSystem(stored(saved), '1', defaults(), 3)
    expect(findEntry(fs, `${DOCS}\\cv.txt`)?.entry.content).toBe('cv')
  })
})

describe('menu actions', () => {
  const adapter = (over = {}) => {
    let fs = fixture()
    return {
      files: () => fs,
      changeFiles: vi.fn((change) => { fs = change(fs) }),
      clipboard: vi.fn(() => null as null | { mode: string; name: string; fromPath: string }),
      setClipboard: vi.fn(),
      startPins: () => [] as string[],
      favourites: () => [] as string[],
      toggleStartPin: vi.fn(),
      toggleFavourite: vi.fn(),
      openEntry: vi.fn(),
      openLocation: vi.fn(),
      beginRename: vi.fn(),
      showProperties: vi.fn(),
      setWallpaper: vi.fn(),
      toast: vi.fn(),
      playSound: vi.fn(),
      shareBase: 'https://example.com/',
      icons: { zip: 'zip.webp', folder: 'f.webp', text: 't.webp' },
      ...over,
    } as unknown as FileOs
  }
  const entry = { name: 'notes.txt', type: 'file', icon: 'a', content: 'hello' }

  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('marks a file to cut, and to copy', () => {
    const os = adapter()
    const handlers = fileMenuHandlers(os, entry, DESKTOP)
    handlers.cut()
    expect(os.setClipboard).toHaveBeenCalledWith({ mode: 'cut', name: 'notes.txt', fromPath: DESKTOP })
    handlers.copy()
    expect(os.setClipboard).toHaveBeenCalledWith({ mode: 'copy', name: 'notes.txt', fromPath: DESKTOP })
  })

  it('moves a file to the Recycle Bin with a sound', () => {
    const os = adapter()
    fileMenuHandlers(os, entry, DESKTOP).delete()
    expect(names(os.files(), RECYCLE_BIN)).toEqual(['notes.txt'])
    expect(os.playSound).toHaveBeenCalledWith('recycle')
  })

  it('compresses a file beside itself', () => {
    const os = adapter()
    fileMenuHandlers(os, entry, DESKTOP).zip()
    expect(names(os.files(), DESKTOP)).toContain('notes.zip')
  })

  it('copies the quoted path', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await fileMenuHandlers(adapter(), entry, DESKTOP).copyPath()
    expect(writeText).toHaveBeenCalledWith(`"${DESKTOP}\\notes.txt"`)
  })

  it('shares through the device when it can', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })
    const os = adapter()
    await fileMenuHandlers(os, entry, DESKTOP).share()
    expect(share.mock.calls[0][0].url).toContain('#open=')
    expect(os.toast).not.toHaveBeenCalled()
  })

  it('stays quiet when the visitor cancels sharing', async () => {
    const cancelled = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(cancelled) })
    const os = adapter()
    await fileMenuHandlers(os, entry, DESKTOP).share()
    expect(os.toast).not.toHaveBeenCalled()
  })

  it('copies a link where a device cannot share, and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const os = adapter()
    await fileMenuHandlers(os, entry, DESKTOP).share()
    expect(writeText.mock.calls[0][0]).toContain('#open=')
    expect(os.toast).toHaveBeenCalledWith('Link copied')
  })

  it('changes pin and favourite labels once an item is added', () => {
    const full = `${DESKTOP}\\notes.txt`
    const plain = fileMenuOverrides(adapter(), entry, DESKTOP)
    expect(plain.pinStart).toEqual({ label: 'Pin to Start' })
    expect(plain.favourites).toEqual({ label: 'Add to Favourites' })
    const added = fileMenuOverrides(
      adapter({ startPins: () => [full], favourites: () => [full] }),
      entry,
      DESKTOP,
    )
    expect(added.pinStart).toEqual({ label: 'Unpin from Start' })
    expect(added.favourites).toEqual({ label: 'Remove from Favourites' })
  })

  it('only offers a background for pictures', () => {
    const os = adapter()
    expect(fileMenuOverrides(os, entry, DESKTOP).setBackground).toEqual({ hidden: true })
    const picture = { name: 'a.webp', type: 'image', icon: '', url: '/a.webp' }
    expect(fileMenuOverrides(os, picture, DESKTOP).setBackground).toEqual({ hidden: false })
  })

  it('pastes into a folder, and clears a cut once it lands', () => {
    const os = adapter({ clipboard: () => ({ mode: 'cut', name: 'notes.txt', fromPath: DESKTOP }) })
    folderMenuHandlers(os, DOCS).paste()
    expect(names(os.files(), DOCS)).toContain('notes.txt')
    expect(os.setClipboard).toHaveBeenCalledWith(null)
  })

  it('keeps a copy ready to paste again', () => {
    const os = adapter({ clipboard: () => ({ mode: 'copy', name: 'notes.txt', fromPath: DESKTOP }) })
    folderMenuHandlers(os, DOCS).paste()
    expect(os.setClipboard).not.toHaveBeenCalled()
  })

  it('makes a new folder and goes straight to naming it', () => {
    const os = adapter()
    folderMenuHandlers(os, DOCS).newFolder()
    expect(os.beginRename).toHaveBeenCalledWith(expect.objectContaining({ name: 'New folder' }), DOCS)
  })
})

describe('desktop menus', () => {
  const desktopOs = () => {
    let files = fixture()
    return {
      files: () => files,
      changeFiles: (change: (fs: typeof files) => typeof files) => { files = change(files) },
      clipboard: () => null,
      setClipboard: vi.fn(),
      beginRename: vi.fn(),
      icons: { zip: 'z', folder: 'f', text: 't' },
      iconSize: () => 'medium',
      setIconSize: vi.fn(),
      iconsVisible: () => true,
      setIconsVisible: vi.fn(),
      resetIconPositions: vi.fn(),
    } as unknown as FileOs
  }
  const point = { clientX: 1, clientY: 2 }

  it('opens View, and ticks what is in use', () => {
    const show = vi.fn()
    const os = desktopOs()
    desktopMenuHandlers(os, show, point).view()
    const [name, at, handlers, overrides] = show.mock.calls[0]
    expect([name, at]).toEqual(['desktopView', point])
    expect(overrides.iconsMedium.icon).toBe('win11/check.svg')
    expect(overrides.iconsLarge.icon).toBe('win11/view.svg')
    handlers.iconsLarge()
    expect(os.setIconSize).toHaveBeenCalledWith('large')
    handlers.toggleIcons()
    expect(os.setIconsVisible).toHaveBeenCalledWith(false)
  })

  it('sorts the Desktop and lets the icons fall back into place', () => {
    const show = vi.fn()
    const os = desktopOs()
    desktopMenuHandlers(os, show, point).sortBy()
    show.mock.calls[0][2].sortName()
    expect(names(os.files(), DESKTOP)).toEqual(['Projects', 'Chrome', 'notes.txt', 'Recycle Bin'])
    expect(os.resetIconPositions).toHaveBeenCalled()
  })

  it('offers new items, which land on the Desktop', () => {
    const show = vi.fn()
    const os = desktopOs()
    desktopMenuHandlers(os, show, point).new()
    expect(show.mock.calls[0][0]).toBe('newItem')
    show.mock.calls[0][2].newFolder()
    expect(names(os.files(), DESKTOP)).toContain('New folder')
  })
})

describe('copyText', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(copyText('hello')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('reports failure when nothing can copy', async () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('document', { createElement: () => { throw new Error('no') } })
    await expect(copyText('hello')).resolves.toBe(false)
  })
})

function createTextFileNamed(fs: OsFiles, path: string, name: string) {
  return writeTextFile(fs, path, name, '', 't')
}
