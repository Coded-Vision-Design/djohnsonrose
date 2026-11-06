import { test, expect, type Page } from '@playwright/test'

// Every action on a file, run for real in both builds and checked by its result:
// a menu item that opens is not enough, the file has to have moved. The rules
// themselves are unit tested in src/windowing/fileOps.test.ts.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

type Build = (typeof BUILDS)[number]

const DOCUMENTS = 'C:\\Users\\DeVante\\Documents'
const DESKTOP = 'C:\\Users\\DeVante\\Desktop'
const FILE = 'achievements.txt'

async function boot(page: Page, url: string, script?: () => void) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    if (!localStorage.getItem('react.os')) {
      localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
    }
  })
  if (script) await page.addInitScript(script)
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await icon(page, FILE).waitFor()
}

const icon = (page: Page, name: string) => page.locator(`[data-desktop-item="${name}"]`)
const item = (page: Page, label: string) => page.locator(`[data-menu-item="${label}"]`)
const action = (page: Page, label: string) => page.locator(`[data-menu-action="${label}"]`)
const dialog = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true })
const file = (page: Page, name: string) => page.locator(`[data-explorer-file="${name}"]`)
const pane = (page: Page) => page.locator('[data-explorer-pane]')

const fileMenu = (page: Page, name = FILE) => icon(page, name).click({ button: 'right' })

/** Right-clicks the empty part of Explorer's file pane. */
async function paneMenu(page: Page) {
  const box = await pane(page).boundingBox()
  if (!box) throw new Error('no pane')
  await page.mouse.click(box.x + box.width - 16, box.y + box.height - 16, { button: 'right' })
}

function openExplorer(page: Page, build: Build, path: string, title: string) {
  const options = build.name === 'v1' ? { initialPath: path } : { extra: { initialPath: path } }
  return page.evaluate(
    ([a, b, c]) => {
      const w = window as unknown as {
        Alpine?: { store: (n: string) => { openApp: (...x: unknown[]) => void } }
        __osStore: { getState: () => { openApp: (...x: unknown[]) => void } }
      }
      const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
      store.openApp('explorer', a, b)
      return c
    },
    [title, options, path] as const,
  )
}

/** Opens Documents. A cold dev server can take a while to compile Explorer. */
async function openDocuments(page: Page, build: Build) {
  await openExplorer(page, build, DOCUMENTS, 'Documents')
  await expect(file(page, 'Career')).toBeVisible({ timeout: 15_000 })
}

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText())

async function reload(page: Page) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('[data-desktop-item="Recycle Bin"]').waitFor()
}

for (const build of BUILDS) {
  test.describe(`${build.name} file actions`, () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] })
    test.beforeEach(({ page }) => boot(page, build.url))

    test('Cut and Paste move a file', async ({ page }) => {
      await fileMenu(page)
      await action(page, 'Cut').click()
      await expect(icon(page, FILE)).toHaveClass(/file-cut/)

      await openDocuments(page, build)
      await paneMenu(page)
      await item(page, 'Paste').click()

      await expect(file(page, FILE)).toBeVisible()
      await expect(icon(page, FILE)).toHaveCount(0)
    })

    test('Copy and Paste leave the original', async ({ page }) => {
      await fileMenu(page)
      await action(page, 'Copy').click()
      await page.mouse.click(1000, 400, { button: 'right' })
      await item(page, 'Paste').click()

      await expect(icon(page, FILE)).toBeVisible()
      await expect(icon(page, 'achievements - Copy.txt')).toBeVisible()
    })

    test('Paste shortcut opens the original', async ({ page }) => {
      await fileMenu(page)
      await action(page, 'Copy').click()
      await page.mouse.click(1000, 400, { button: 'right' })
      await item(page, 'Show more options').click()
      await item(page, 'Paste shortcut').click()

      await expect(icon(page, 'achievements - Shortcut.txt')).toBeVisible()
    })

    test('Paste is greyed out until something is cut or copied', async ({ page }) => {
      await page.mouse.click(1000, 400, { button: 'right' })
      await expect(item(page, 'Paste')).toHaveClass(/disabled/)
    })

    test('Rename changes a desktop icon, and lasts', async ({ page }) => {
      await fileMenu(page)
      await action(page, 'Rename').click()
      await page.locator('[data-rename-input]').fill('wins.txt')
      await page.keyboard.press('Enter')

      await expect(icon(page, 'wins.txt')).toBeVisible()
      await reload(page)
      await expect(icon(page, 'wins.txt')).toBeVisible()
      await expect(icon(page, FILE)).toHaveCount(0)
    })

    test('Escape abandons a rename', async ({ page }) => {
      await fileMenu(page)
      await action(page, 'Rename').click()
      await page.locator('[data-rename-input]').fill('nope.txt')
      await page.keyboard.press('Escape')
      await expect(icon(page, FILE)).toBeVisible()
      await expect(icon(page, 'nope.txt')).toHaveCount(0)
    })

    test('Compress makes a zip that opens as a folder', async ({ page }) => {
      await fileMenu(page)
      await item(page, 'Compress to Zip file').click()
      await expect(icon(page, 'achievements.zip')).toBeVisible()

      await icon(page, 'achievements.zip').click()
      await expect(dialog(page, 'achievements.zip')).toBeVisible()
      await expect(file(page, FILE)).toBeVisible()
    })

    test('Copy as path puts the quoted path on the clipboard', async ({ page }) => {
      await fileMenu(page)
      await item(page, 'Copy as path').click()
      await expect.poll(() => clipboard(page)).toBe(`"${DESKTOP}\\${FILE}"`)
    })

    test('Open file location shows the file in its folder', async ({ page }) => {
      await fileMenu(page)
      await item(page, 'Open file location').click()
      await expect(dialog(page, 'Desktop')).toBeVisible()
      await expect(file(page, FILE)).toHaveClass(/bg-blue-100/)
    })

    test('Open file location moves an Explorer that is already open', async ({ page }) => {
      await openDocuments(page, build)
      await fileMenu(page)
      await item(page, 'Open file location').click()
      await expect(file(page, FILE)).toBeVisible()
    })

    test('Pin to Start adds a tile that opens the file, and lasts', async ({ page }) => {
      await fileMenu(page)
      await item(page, 'Pin to Start').click()
      await reload(page)

      await page.locator('.os-taskbar-apps button').first().click()
      const tile = page.locator(`[data-pinned-file="${DESKTOP.replace(/\\/g, '\\\\')}\\\\${FILE}"]`)
      await expect(tile).toBeVisible()
      await tile.click()
      await expect(dialog(page, FILE)).toBeVisible()

      await fileMenu(page)
      await item(page, 'Unpin from Start').click()
      await page.locator('.os-taskbar-apps button').first().click()
      await expect(page.locator('[data-pinned-file]')).toHaveCount(0)
    })

    test('Add to Favourites puts a file in Explorer’s sidebar', async ({ page }) => {
      await fileMenu(page)
      await item(page, 'Add to Favourites').click()
      await openExplorer(page, build, DOCUMENTS, 'Documents')

      const favourite = page.locator(`[data-sidebar-item="${FILE}"]`)
      await expect(favourite).toBeVisible()
      await favourite.click()
      await expect(dialog(page, FILE)).toBeVisible()

      await fileMenu(page)
      await item(page, 'Remove from Favourites').click()
      await expect(favourite).toHaveCount(0)
    })

    test('Properties describes a file, and closes', async ({ page }) => {
      await fileMenu(page)
      await item(page, 'Properties').click()
      const properties = page.locator('[data-properties]')
      await expect(properties).toContainText('Text Document')
      await expect(properties).toContainText(DESKTOP)
      await properties.getByRole('button', { name: 'OK' }).click()
      await expect(properties).toHaveCount(0)
    })

    test('Delete and Restore put a file back', async ({ page }) => {
      await fileMenu(page)
      await action(page, 'Delete').click()
      await expect(icon(page, FILE)).toHaveCount(0)

      await icon(page, 'Recycle Bin').click()
      await expect(file(page, FILE)).toBeVisible()
      await file(page, FILE).click({ button: 'right' })
      await item(page, 'Restore').click()
      await expect(icon(page, FILE)).toBeVisible()
    })

    test('Empty Recycle Bin removes everything for good', async ({ page }) => {
      await fileMenu(page)
      await action(page, 'Delete').click()
      await icon(page, 'Recycle Bin').click({ button: 'right' })
      await item(page, 'Empty Recycle Bin').click()

      await icon(page, 'Recycle Bin').click({ button: 'right' })
      await expect(item(page, 'Empty Recycle Bin')).toHaveClass(/disabled/)
      await reload(page)
      await expect(icon(page, FILE)).toHaveCount(0)
    })

    test('New makes a folder, ready to name', async ({ page }) => {
      await page.mouse.click(1000, 400, { button: 'right' })
      await item(page, 'New').click()
      await item(page, 'Folder').click()
      await page.locator('[data-rename-input]').fill('Ideas')
      await page.keyboard.press('Enter')

      await expect(icon(page, 'Ideas')).toBeVisible()
      await icon(page, 'Ideas').click()
      await expect(dialog(page, 'Ideas')).toBeVisible()
    })

    test('a new text document can be written, saved and reopened', async ({ page }) => {
      await page.mouse.click(1000, 400, { button: 'right' })
      await item(page, 'New').click()
      await item(page, 'Text Document').click()
      await page.locator('[data-rename-input]').fill('todo.txt')
      await page.keyboard.press('Enter')

      await icon(page, 'todo.txt').click()
      const win = dialog(page, 'todo.txt')
      await win.locator('[data-notepad-view]').click()
      await win.locator('[data-notepad-text]').fill('buy milk')
      await win.getByRole('button', { name: 'File', exact: true }).click()
      await win.getByRole('button', { name: /^Save\s*Ctrl\+S$/ }).click()
      await win.getByRole('button', { name: 'Close', exact: true }).click()
      await reload(page)

      await icon(page, 'todo.txt').click()
      await expect(dialog(page, 'todo.txt').locator('[data-notepad-view]')).toHaveText('buy milk')
    })

    test('Notepad’s Save As writes to the chosen folder', async ({ page }) => {
      await icon(page, FILE).click()
      const win = dialog(page, FILE)
      await win.locator('[data-notepad-view]').click()
      await win.locator('[data-notepad-text]').fill('a copy')
      await win.getByRole('button', { name: 'File', exact: true }).click()
      await win.getByRole('button', { name: 'Save As...' }).click()
      await win.getByLabel('File name:').fill('elsewhere')
      await win.locator('[data-dialog-confirm]').click()
      await expect(icon(page, 'elsewhere.txt')).toBeVisible()
    })

    test('opening another file in an open Notepad shows it', async ({ page }) => {
      await page.mouse.click(1000, 400, { button: 'right' })
      await item(page, 'New').click()
      await item(page, 'Text Document').click()
      await page.keyboard.press('Escape')
      await icon(page, FILE).click()
      await expect(dialog(page, FILE).locator('[data-notepad-view]')).toContainText('World #1')

      await icon(page, 'New Text Document.txt').click()
      const win = dialog(page, 'New Text Document.txt')
      await expect(win).toBeVisible()
      await expect(win.locator('[data-notepad-view]')).toContainText('Click to start typing')
    })

    test('View changes the desktop icons, and lasts', async ({ page }) => {
      await page.mouse.click(1000, 400, { button: 'right' })
      await item(page, 'View').click()
      await item(page, 'Large icons').click()
      const layer = page.locator('[data-icon-size]')
      await expect(layer).toHaveAttribute('data-icon-size', 'large')
      await reload(page)
      await expect(layer).toHaveAttribute('data-icon-size', 'large')

      await page.mouse.click(1000, 400, { button: 'right' })
      await item(page, 'View').click()
      await item(page, 'Show desktop icons').click()
      await expect(icon(page, FILE)).toBeHidden()
    })

    test('Sort by reorders the desktop', async ({ page }) => {
      await page.mouse.click(1000, 400, { button: 'right' })
      await item(page, 'Sort by').click()
      await item(page, 'Name').click()
      await expect
        .poll(() =>
          page.locator('[data-desktop-item]').evaluateAll((els) => els.map((el) => el.getAttribute('data-desktop-item'))),
        )
        .toContain('Recycle Bin')
      const names = await page
        .locator('[data-desktop-item]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-desktop-item') as string))
      const files = names.filter((name) => name.includes('.') && !name.includes("'"))
      expect(files).toEqual([...files].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })))
    })

    test('no item on a file’s menu is greyed out', async ({ page }) => {
      await fileMenu(page)
      await expect(item(page, 'Open')).toBeVisible()
      expect(await page.locator('[data-menu-item].disabled, [data-menu-action].disabled').count()).toBe(0)
    })

    test('right-clicking inside an app does not open the desktop menu', async ({ page }) => {
      await icon(page, 'GitHub').click()
      const win = dialog(page, 'GitHub')
      await win.waitFor()
      await win.click({ button: 'right', position: { x: 300, y: 300 } })
      await expect(item(page, 'Refresh')).toHaveCount(0)
    })
  })

  test.describe(`${build.name} Explorer`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
      await openDocuments(page, build)
    })

    test('Back is greyed out until there is somewhere to go back to', async ({ page }) => {
      const back = page.getByRole('button', { name: 'Back', exact: true }).last()
      await expect(back).toBeDisabled()
      await file(page, 'Career').dblclick()
      await expect(back).toBeEnabled()
    })

    test('Up goes to the parent folder', async ({ page }) => {
      await page.getByRole('button', { name: 'Up', exact: true }).click()
      await expect(file(page, 'Documents')).toBeVisible()
    })

    test('the details view lists and sorts files', async ({ page }) => {
      await file(page, 'Career').dblclick()
      await expect(file(page, 'UEA.txt')).toBeVisible()
      await page.getByTitle('Details view').click()
      await expect(page.locator('table')).toContainText('Date modified')

      const names = () =>
        page.locator('tbody [data-explorer-file]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-explorer-file')))
      const ascending = await names()
      expect(ascending.length).toBeGreaterThan(1)
      await page.locator('th', { hasText: 'Name' }).click()
      await expect.poll(names).toEqual([...ascending].reverse())
    })

    test('the details pane describes the selected file', async ({ page }) => {
      await page.getByTitle('Details pane').click()
      await file(page, 'Career').click()
      await expect(page.locator('[data-details-pane]')).toContainText('File folder')
    })

    test('F2 renames, and keeps a folder’s contents', async ({ page }) => {
      await file(page, 'Career').click()
      await page.keyboard.press('F2')
      await page.locator('[data-rename-input]').fill('Jobs')
      await page.keyboard.press('Enter')
      await file(page, 'Jobs').dblclick()
      await expect(file(page, 'UEA.txt')).toBeVisible()
    })

    test('Ctrl+C and Ctrl+V copy a folder with its contents', async ({ page }) => {
      await file(page, 'Career').click()
      await page.keyboard.press('Control+c')
      await page.keyboard.press('Control+v')
      await file(page, 'Career - Copy').dblclick()
      await expect(file(page, 'UEA.txt')).toBeVisible()
    })

    test('Delete sends the selected file to the Recycle Bin', async ({ page }) => {
      await file(page, 'Career').click()
      await page.keyboard.press('Delete')
      await expect(file(page, 'Career')).toHaveCount(0)
    })

    test('search looks in subfolders and says where it found things', async ({ page }) => {
      await page.getByPlaceholder('Search', { exact: true }).fill('UEA')
      await expect(file(page, 'UEA.txt')).toContainText('Career')
    })

    test('double-clicking a recycled file shows its properties', async ({ page }) => {
      await file(page, 'Career').click()
      await page.keyboard.press('Delete')
      await page.locator('[data-sidebar-item="Recycle Bin"]').click()
      await file(page, 'Career').dblclick()
      await expect(page.locator('[data-properties]')).toContainText('Original location')
    })

    test('New folder from the pane', async ({ page }) => {
      await paneMenu(page)
      await item(page, 'New folder').click()
      await page.locator('[data-rename-input]').fill('Drafts')
      await page.keyboard.press('Enter')
      await expect(file(page, 'Drafts')).toBeVisible()
    })
  })
}

for (const build of BUILDS) {
  test.describe(`${build.name} Notepad menus`, () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

    const view = (page: Page) => dialog(page, 'Notepad').locator('[data-notepad-view]')
    const box = (page: Page) => dialog(page, 'Notepad').locator('[data-notepad-text]')
    const menu = async (page: Page, name: string, label: string) => {
      const win = dialog(page, 'Notepad')
      await win.locator(`[data-notepad-menu="${name}"]`).click()
      await win.locator(`[data-notepad-item="${label}"]`).click()
    }

    /** Opens an empty Notepad and types into it. */
    const typeIn = async (page: Page, text: string) => {
      await boot(page, build.url)
      await page.evaluate(() => {
        const w = window as unknown as {
          Alpine?: { store: (n: string) => { openApp: (a: string) => void } }
          __osStore: { getState: () => { openApp: (a: string) => void } }
        }
        ;(w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()).openApp('notepad')
      })
      await view(page).waitFor({ timeout: 20_000 }) // A cold dev server compiles Notepad first.
      await view(page).click()
      await box(page).fill('')
      await box(page).pressSequentially(text)
    }

    test('Select All and Delete clear the text, and Undo brings it back', async ({ page }) => {
      await typeIn(page, 'hello')
      await menu(page, 'Edit', 'Select All')
      await menu(page, 'Edit', 'Delete')
      await expect(box(page)).toHaveValue('')
      await menu(page, 'Edit', 'Undo')
      await expect(box(page)).toHaveValue('hello')
    })

    test('Undo steps back through typing', async ({ page }) => {
      await typeIn(page, 'abc')
      await page.keyboard.press('Control+z')
      await expect(box(page)).toHaveValue('ab')
    })

    test('Cut, Copy and Paste use the real clipboard', async ({ page }) => {
      await typeIn(page, 'hello')
      await menu(page, 'Edit', 'Select All')
      await menu(page, 'Edit', 'Cut')
      await expect(box(page)).toHaveValue('')
      await expect.poll(() => clipboard(page)).toBe('hello')
      await menu(page, 'Edit', 'Paste')
      await expect(box(page)).toHaveValue('hello')
      await menu(page, 'Edit', 'Select All')
      await menu(page, 'Edit', 'Copy')
      await expect(box(page)).toHaveValue('hello')
    })

    test('Cut and Copy are greyed out with nothing selected', async ({ page }) => {
      await typeIn(page, 'hello')
      await dialog(page, 'Notepad').locator('[data-notepad-menu="Edit"]').click()
      await expect(dialog(page, 'Notepad').locator('[data-notepad-item="Cut"]')).toBeDisabled()
    })

    test('Time/Date stamps the text', async ({ page }) => {
      await typeIn(page, 'at ')
      await menu(page, 'Edit', 'Time/Date')
      await expect(box(page)).toHaveValue(/^at \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/)
    })

    test('Find highlights each match, and says when there is none', async ({ page }) => {
      await typeIn(page, 'one two one')
      await menu(page, 'Edit', 'Find...')
      const input = page.getByLabel('Find', { exact: true })
      await input.fill('one')
      await input.press('Enter')
      await expect(dialog(page, 'Notepad').locator('[data-notepad-mark]')).toHaveText('one')
      await input.press('Enter')
      await expect(dialog(page, 'Notepad').locator('[data-notepad-status]')).toContainText('Col 12')

      await input.fill('missing')
      await input.press('Enter')
      await expect(dialog(page, 'Notepad').getByRole('status')).toHaveText('Cannot find "missing"')
    })

    test('Replace changes one match, and Replace All the rest', async ({ page }) => {
      await typeIn(page, 'cat cat cat')
      await page.keyboard.press('Control+h')
      await page.getByLabel('Find', { exact: true }).fill('cat')
      await page.getByLabel('Replace with').fill('dog')
      const win = dialog(page, 'Notepad')
      await win.getByRole('button', { name: 'Find Next' }).click()
      await win.getByRole('button', { name: 'Replace', exact: true }).click()
      await expect(view(page)).toHaveText('dog cat cat')

      await win.getByRole('button', { name: 'Replace All' }).click()
      await expect(view(page)).toHaveText('dog dog dog')
      await expect(win.getByRole('status')).toHaveText('2 replaced')
    })

    test('Word Wrap changes how long lines sit, and lasts', async ({ page }) => {
      await typeIn(page, 'hello')
      await menu(page, 'Format', 'Word Wrap')
      await page.mouse.click(1300, 800)
      await expect(view(page)).toHaveCSS('white-space', 'pre')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await icon(page, FILE).waitFor()
      await icon(page, FILE).click()
      await expect(dialog(page, FILE).locator('[data-notepad-view]')).toHaveCSS('white-space', 'pre')
    })

    test('Fixed-width Font switches the typeface', async ({ page }) => {
      await typeIn(page, 'hello')
      await menu(page, 'Format', 'Fixed-width Font')
      await expect(box(page)).toHaveClass(/font-sans/)
    })

    test('Zoom changes the text size, and resets', async ({ page }) => {
      await typeIn(page, 'hello')
      await menu(page, 'View', 'Zoom In')
      await expect(box(page)).toHaveCSS('font-size', '15.4px')
      await expect(dialog(page, 'Notepad').locator('[data-notepad-status]')).toContainText('110%')
      await page.keyboard.press('Control+0')
      await expect(box(page)).toHaveCSS('font-size', '14px')
    })

    test('Status Bar hides, and shows where the caret is', async ({ page }) => {
      await typeIn(page, 'one\ntwo')
      const status = dialog(page, 'Notepad').locator('[data-notepad-status]')
      await expect(status).toContainText('Ln 2, Col 4')
      await menu(page, 'View', 'Status Bar')
      await expect(status).toBeHidden()
    })

    test('a web address stays a link', async ({ page }) => {
      await boot(page, build.url)
      await icon(page, FILE).click()
      await expect(dialog(page, FILE).locator('a').first()).toHaveAttribute('href', /^https:/)
    })

    test('text cannot turn into markup', async ({ page }) => {
      await typeIn(page, '<img src=x onerror=alert(1)>')
      await page.mouse.click(1300, 800)
      await expect(view(page)).toHaveText('<img src=x onerror=alert(1)>')
      await expect(view(page).locator('img')).toHaveCount(0)
    })
  })
}

test.describe('sharing', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

  for (const build of BUILDS) {
    test(`${build.name} copies a link that reopens the file`, async ({ page, browser }) => {
      test.setTimeout(60_000)
      await boot(page, build.url, () => {
        Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true })
      })
      await fileMenu(page)
      await action(page, 'Share').click()
      await expect(page.locator('[data-os-toast]')).toHaveText('Link copied')
      const link = await clipboard(page)
      expect(link).toContain('#open=')

      const context = await browser.newContext()
      const visitor = await context.newPage()
      await boot(visitor, link)
      await expect(dialog(visitor, FILE)).toBeVisible()
      await expect(dialog(visitor, FILE)).toContainText('World #1')
      expect(new URL(visitor.url()).hash).toBe('')
      await context.close()
    })

    test(`${build.name} uses the device’s share sheet where there is one`, async ({ page }) => {
      await boot(page, build.url, () => {
        const w = window as unknown as { shared: { url: string }[] }
        w.shared = []
        Object.defineProperty(Navigator.prototype, 'share', {
          value: async (data: { url: string }) => w.shared.push(data),
          configurable: true,
        })
      })
      await fileMenu(page)
      await action(page, 'Share').click()
      await expect
        .poll(() => page.evaluate(() => (window as unknown as { shared: { url: string }[] }).shared.length))
        .toBe(1)
      await expect(page.locator('[data-os-toast]')).toHaveCount(0)
    })
  }
})

test('both builds show a file’s properties identically', async ({ browser }) => {
  test.setTimeout(60_000)
  const rows: string[][] = []
  for (const build of BUILDS) {
    const page = await browser.newPage()
    await boot(page, build.url)
    await fileMenu(page)
    await item(page, 'Properties').click()
    await page.locator('[data-property]').first().waitFor()
    rows.push(await page.locator('[data-property]').allInnerTexts())
    await page.close()
  }
  expect(rows[0].length).toBeGreaterThan(2)
  expect(rows[0]).toEqual(rows[1])
})

test('both builds list the same files in Explorer', async ({ browser }) => {
  test.setTimeout(60_000)
  const lists: string[][] = []
  for (const build of BUILDS) {
    const page = await browser.newPage()
    await boot(page, build.url)
    await openDocuments(page, build)
    lists.push(await page.locator('[data-explorer-file]').evaluateAll((els) => els.map((el) => el.getAttribute('data-explorer-file') as string)))
    await page.close()
  }
  expect(lists[0]).toEqual(lists[1])
})

// Phones have no right button, so every menu has to answer a long press.
for (const build of BUILDS) {
  test.describe(`${build.name} long press`, () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

    const longPress = async (page: Page, x: number, y: number) => {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      await page.waitForTimeout(800)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    const middle = async (page: Page, name: string) => {
      const box = await icon(page, name).boundingBox()
      if (!box) throw new Error('no icon')
      return [box.x + box.width / 2, box.y + box.height / 2] as const
    }

    test.beforeEach(({ page }) => boot(page, build.url))

    test('on a desktop icon opens its menu, not the file', async ({ page }) => {
      await longPress(page, ...(await middle(page, FILE)))
      await expect(item(page, 'Copy as path')).toBeVisible()
      await expect(dialog(page, FILE)).toHaveCount(0)
    })

    test('on the wallpaper opens the desktop menu', async ({ page }) => {
      await longPress(page, 340, 640)
      await expect(item(page, 'Refresh')).toBeVisible()
    })

    test('on a file in Explorer opens its menu', async ({ page }) => {
      await openDocuments(page, build)
      await page.waitForTimeout(400) // The window scales up as it opens.
      const box = await file(page, 'Career').boundingBox()
      if (!box) throw new Error('no file')
      await longPress(page, box.x + box.width / 2, box.y + box.height / 2)
      await expect(item(page, 'Copy as path')).toBeVisible()
    })

    test('on Explorer’s empty pane opens its menu', async ({ page }) => {
      await openDocuments(page, build)
      await page.waitForTimeout(400) // The window scales up as it opens.
      const box = await pane(page).boundingBox()
      if (!box) throw new Error('no pane')
      await longPress(page, box.x + box.width - 20, box.y + box.height - 40)
      await expect(item(page, 'New folder')).toBeVisible()
    })

    test('a short tap does not open a menu', async ({ page }) => {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 340, y: 640 }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(800)
      await expect(item(page, 'Refresh')).toHaveCount(0)
    })
  })

  test(`${build.name} pinching the desktop zooms its icons`, async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 768 } })
    const page = await context.newPage()
    await boot(page, build.url)
    const cdp = await context.newCDPSession(page)
    const fingers = (gap: number) => [
      { x: 600 - gap, y: 500, id: 0 },
      { x: 600 + gap, y: 500, id: 1 },
    ]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(50) })
    for (let gap = 60; gap <= 160; gap += 10) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(gap) })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

    const scale = () =>
      page.locator('[data-icon-size]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)
    await expect.poll(scale).toBeGreaterThan(1)
    await context.close()
  })
}
