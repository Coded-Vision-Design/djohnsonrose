import { readFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'

// Apps fixed after the review, run for real in both builds. The rules behind
// them are unit tested next to the shared modules in src/windowing/.

const BUILDS = [
  { name: 'v1', url: process.env.V1_URL ?? 'http://localhost:8765/' },
  { name: 'v2', url: `${process.env.V2_ORIGIN ?? 'http://localhost:5173'}/v2/` },
] as const

const portfolio = JSON.parse(
  readFileSync(new URL('../../data/portfolio.json', import.meta.url), 'utf8'),
) as { projects: { title: string; url: string; featured?: boolean; tags?: string[] }[] }

async function boot(page: Page, url: string) {
  await page.addInitScript(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    if (!localStorage.getItem('react.os')) {
      localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
    }
  })
  await page.route('**/api/log.php', (route) => route.fulfill({ status: 204, body: '' }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const w = window as unknown as { Alpine?: { store: (n: string) => unknown }; __osStore?: unknown }
    return !!document.documentElement.dataset.osMode && !!(w.Alpine?.store('os') ?? w.__osStore)
  })
}

/** Calls a store method in either build. */
const call = (page: Page, method: string, ...args: unknown[]) =>
  page.evaluate(
    ([m, a]) => {
      const w = window as unknown as {
        Alpine?: { store: (n: string) => Record<string, (...x: unknown[]) => unknown> }
        __osStore: { getState: () => Record<string, (...x: unknown[]) => unknown> }
      }
      const store = w.Alpine ? w.Alpine.store('os') : w.__osStore.getState()
      return store[m as string](...(a as unknown[]))
    },
    [method, args] as const,
  )

const dialog = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true })

for (const build of BUILDS) {
  test.describe(`${build.name} Calculator`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
      await call(page, 'openApp', 'calculator')
      await expect(dialog(page, 'Calculator').getByRole('button', { name: 'Equals' })).toBeVisible({ timeout: 15_000 })
    })

    const display = (page: Page) => dialog(page, 'Calculator').locator('[data-calc-display]')
    const press = async (page: Page, ...names: string[]) => {
      for (const name of names) await dialog(page, 'Calculator').getByRole('button', { name, exact: true }).click()
    }

    test('a second operator replaces the first: 5 + × 3 = 15', async ({ page }) => {
      await press(page, 'Five', 'Plus', 'Multiply by', 'Three', 'Equals')
      await expect(display(page)).toHaveText('15')
    })

    test('Enter after clicking keys works the sum out', async ({ page }) => {
      await press(page, 'Seven', 'Plus', 'One')
      await page.keyboard.press('Enter')
      await expect(display(page)).toHaveText('8')
    })

    test('typed keys follow Windows: 0.1 + 0.2 = 0.3 and 200 + 10 % = 220', async ({ page }) => {
      await press(page, 'Clear')
      await page.keyboard.type('0.1+0.2')
      await page.keyboard.press('Enter')
      await expect(display(page)).toHaveText('0.3')
      await page.keyboard.press('Escape')
      await page.keyboard.type('200+10%')
      await page.keyboard.press('Enter')
      await expect(display(page)).toHaveText('220')
    })

    test('dividing by zero shows the Windows message, which an operator keeps and Backspace clears', async ({ page }) => {
      await press(page, 'Five', 'Divide by', 'Zero', 'Equals')
      await expect(display(page)).toHaveText('Cannot divide by zero')
      await press(page, 'Plus')
      await expect(display(page)).toHaveText('Cannot divide by zero')
      await page.keyboard.press('Backspace')
      await expect(display(page)).toHaveText('0')
      await press(page, 'Zero', 'Reciprocal')
      await expect(display(page)).toHaveText('Cannot divide by zero')
    })

    test('-5 then Backspace leaves 0', async ({ page }) => {
      await press(page, 'Five', 'Positive negative')
      await expect(display(page)).toHaveText('-5')
      await page.keyboard.press('Backspace')
      await expect(display(page)).toHaveText('0')
    })

    test('digits typed while another window has focus do not reach it', async ({ page }) => {
      await press(page, 'Four')
      await call(page, 'openApp', 'taskmanager')
      await expect(dialog(page, 'Task Manager')).toBeVisible()
      await page.keyboard.type('99')
      await expect(display(page)).toHaveText('4')
    })
  })
}

for (const build of BUILDS) {
  test.describe(`${build.name} Terminal`, () => {
    test.beforeEach(async ({ page }) => {
      await boot(page, build.url)
      await call(page, 'openApp', 'terminal')
      await expect(input(page)).toBeVisible({ timeout: 15_000 })
    })

    const terminal = (page: Page) => dialog(page, 'Terminal')
    const input = (page: Page) => terminal(page).getByRole('textbox')
    const typeCommand = async (page: Page, command: string) => {
      await input(page).fill(command)
      await input(page).press('Enter')
    }
    const lastOutput = (page: Page) => terminal(page).locator('[data-terminal-output]').last()

    test('cd .. from C:\\Users reaches C:\\, and quoted paths with spaces work', async ({ page }) => {
      await typeCommand(page, 'cd ..')
      await typeCommand(page, 'cd ..')
      await expect(terminal(page).getByText('PS C:\\>', { exact: true }).last()).toBeVisible()
      await typeCommand(page, 'cd "Program Files"')
      await expect(terminal(page).getByText('PS C:\\Program Files>', { exact: true }).last()).toBeVisible()
    })

    test('ver, dir, projects and contact tell the truth', async ({ page }) => {
      await typeCommand(page, 'ver')
      await expect(lastOutput(page)).toHaveText(/Version 10\.0\.26200\./)
      await typeCommand(page, 'dir')
      await expect(lastOutput(page)).toContainText('Directory of C:\\Users\\DeVante')
      await expect(lastOutput(page)).not.toContainText('01/02/2026')
      await typeCommand(page, 'projects')
      for (const project of portfolio.projects) await expect(lastOutput(page)).toContainText(project.title)
      await typeCommand(page, 'contact')
      await expect(lastOutput(page)).toContainText('github.com/CodedVisionDesign')
    })

    test('the tab close button closes the Terminal', async ({ page }) => {
      await terminal(page).getByRole('button', { name: 'Close tab' }).click()
      await expect(terminal(page)).toHaveCount(0)
    })
  })
}
