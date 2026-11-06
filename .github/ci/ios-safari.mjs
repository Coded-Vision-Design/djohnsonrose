// Both builds in real Mobile Safari on the iOS Simulator, driven by Appium's
// XCUITest driver. Taps, long presses and pinches go through iOS's own touch
// system, as a finger's would, and typing uses the on-screen keyboard.
import { remote } from 'webdriverio'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.OUT ?? 'ios-results'
const ORIGIN = process.env.SITE_ORIGIN ?? 'http://localhost:8765'
const BUILDS = [
  ['v1', `${ORIGIN}/`],
  ['v2', `${ORIGIN}/v2/`],
]
const FILE = 'achievements.txt'

mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const results = []
const ok = (label, pass, detail = '') => {
  results.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
  console.log(results.at(-1))
}

const driver = await remote({
  hostname: '127.0.0.1',
  port: 4723,
  logLevel: 'warn',
  connectionRetryTimeout: 900_000,
  connectionRetryCount: 1,
  capabilities: {
    platformName: 'iOS',
    browserName: 'Safari',
    'appium:automationName': 'XCUITest',
    'appium:udid': process.env.IOS_UDID,
    'appium:platformVersion': process.env.IOS_VERSION,
    'appium:deviceName': process.env.IOS_NAME,
    'appium:connectHardwareKeyboard': false,
    'appium:wdaLaunchTimeout': 900_000,
    'appium:wdaConnectionTimeout': 900_000,
    'appium:newCommandTimeout': 600,
    'appium:webviewConnectTimeout': 60_000,
    'appium:safariIgnoreFraudWarning': true,
  },
})

const contextName = (context) => (typeof context === 'string' ? context : context.id)
async function toWeb() {
  const contexts = (await driver.getContexts()).map(contextName)
  const web = contexts.filter((name) => name.startsWith('WEBVIEW')).at(-1)
  if (!web) throw new Error(`no web context in ${contexts.join(', ')}`)
  await driver.switchContext(web)
}
const toNative = () => driver.switchContext('NATIVE_APP')

async function shot(label) {
  try {
    await driver.saveScreenshot(join(OUT, `${label}.png`))
  } catch {
    // A missing screenshot should not fail the run.
  }
}

/** Where page point (0, 0) sits on screen, measured with one real tap on the wallpaper. */
async function calibrate() {
  const size = await driver.execute(() => {
    window.__touch = null
    addEventListener(
      'touchstart',
      (event) => {
        window.__touch = { x: event.touches[0].clientX, y: event.touches[0].clientY }
      },
      { capture: true, once: true },
    )
    return { width: innerWidth, height: innerHeight }
  })
  const probe = { x: Math.round(size.width * 0.9), y: Math.round(size.height * 0.62) }
  await driver.execute('mobile: tap', probe)
  await sleep(600)
  const touch = await driver.execute(() => window.__touch)
  if (!touch) throw new Error('the calibration tap never reached the page')
  return { dx: probe.x - touch.x, dy: probe.y - touch.y }
}

const centreOf = (selector, part = 'whole') =>
  driver.execute(
    (sel, which) => {
      const el = [...document.querySelectorAll(sel)].find((item) => item.offsetParent)
      if (!el) return null
      const inner =
        which === 'icon'
          ? el.querySelector('img')
          : which === 'label'
            ? [...el.querySelectorAll('*')].find((item) => !item.children.length && item.textContent.trim())
            : el
      const box = (inner ?? el).getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    selector,
    part,
  )

const menuItems = () =>
  driver.execute(() =>
    [...document.querySelectorAll('[data-menu-item]')].filter((item) => item.offsetParent).map((item) => item.dataset.menuItem),
  )

// v1 keeps some dialogs in the page while hidden, so only count those on screen.
const visibleDialogs = () =>
  driver.execute(() => [...document.querySelectorAll('[role="dialog"]')].filter((el) => el.getClientRects().length).length)

/** Records what iOS sends during a gesture, and when a menu opens or closes. */
const startRecording = () =>
  driver.execute(() => {
    const start = performance.now()
    window.__log = []
    window.__stamp = (text) => {
      if (window.__log.length < 40) window.__log.push(`${Math.round(performance.now() - start)}ms ${text}`)
    }
    if (window.__recording) return
    window.__recording = true
    for (const type of ['touchstart', 'touchend', 'touchcancel', 'pointerdown', 'pointerup', 'pointercancel', 'contextmenu', 'dragstart', 'mousedown', 'click']) {
      addEventListener(type, (event) => window.__stamp(`${type} ${event.target?.tagName ?? ''}`), { capture: true, passive: true })
    }
    const menuOpen = () => [...document.querySelectorAll('[data-menu-item]')].some((el) => el.getClientRects().length)
    new MutationObserver(() => {
      const open = menuOpen()
      if (open !== window.__menuOpen) {
        window.__menuOpen = open
        window.__stamp(open ? 'MENU OPEN' : 'menu closed')
      }
    }).observe(document.body, { subtree: true, childList: true, attributes: true })
  })
const recording = () => driver.execute(() => (window.__log ?? []).join(' | '))

const closeMenus = () =>
  driver.execute(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

async function signIn(url) {
  await driver.url(url)
  await driver.execute(() => {
    localStorage.setItem('auth.loggedIn', 'true')
    localStorage.setItem('cookie.consent', 'false')
    localStorage.setItem('react.cookie.consent', 'false')
    localStorage.setItem('react.os', JSON.stringify({ state: { loggedIn: true }, version: 0 }))
  })
  await driver.url(url)
  await driver.waitUntil(
    () => driver.execute((name) => Boolean(document.querySelector(`[data-desktop-item="${name}"]`)), FILE),
    { timeout: 90_000, interval: 500, timeoutMsg: 'the desktop never appeared' },
  )
  await sleep(1500)
}

async function run(name, url) {
  await signIn(url)
  const errors = []
  await driver.execute(() => {
    window.__errors = []
    addEventListener('error', (event) => window.__errors.push(String(event.message).slice(0, 120)))
  })
  const { dx, dy } = await calibrate()
  console.log(`\n=== ${name}: page origin on screen ${dx},${dy}`)
  const screen = (point) => ({ x: Math.round(point.x + dx), y: Math.round(point.y + dy) })
  const tap = async (point) => {
    await driver.execute('mobile: tap', screen(point))
    await sleep(700)
  }
  const hold = async (point) => {
    await driver.execute('mobile: touchAndHold', { ...screen(point), duration: 1.0 })
    await sleep(700)
  }

  // A long press on a desktop icon opens its menu, and not the file.
  await hold(await centreOf(`[data-desktop-item="${FILE}"]`))
  let items = await menuItems()
  ok(`${name} long press on a desktop icon opens its menu`, items.includes('Copy as path'), items.slice(0, 3).join(', '))
  ok(`${name} that long press does not open the file`, (await visibleDialogs()) === 0)
  await shot(`${name}-icon-menu`)
  await closeMenus()
  await sleep(400)

  // A pinch on the desktop zooms the icons, and not the page.
  const before = await driver.execute(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-icon-size]')).transform).a)
  await driver.execute('mobile: pinch', { scale: 1.6, velocity: 1.2 })
  await sleep(1200)
  const after = await driver.execute(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-icon-size]')).transform).a)
  const pageZoom = await driver.execute(() => window.visualViewport?.scale ?? 1)
  ok(`${name} a pinch zooms the desktop icons`, after > before, `${before} to ${after}`)
  ok(`${name} a pinch leaves the page itself alone`, Math.abs(pageZoom - 1) < 0.01, `page zoom ${pageZoom}`)
  await shot(`${name}-pinched`)
  await driver.execute(() => {
    // Back to normal size, so that later points are where the page says they are.
    document.querySelector('[data-icon-size]').style.transform = ''
  })
  await signIn(url)
  const fresh = await calibrate()
  const screenNow = (point) => ({ x: Math.round(point.x + fresh.dx), y: Math.round(point.y + fresh.dy) })

  // A tap on Notepad's text raises the keyboard, and typing on it reaches the text.
  await driver.execute('mobile: tap', screenNow(await centreOf(`[data-desktop-item="${FILE}"]`)))
  await driver.waitUntil(() => driver.execute(() => Boolean(document.querySelector('[data-notepad-view]'))), {
    timeout: 30_000,
    timeoutMsg: 'Notepad never opened',
  })
  await sleep(1200)
  const heading = await driver.execute(() => {
    const box = document.querySelector('[data-notepad-view]').getBoundingClientRect()
    return { x: box.x + 24, y: box.y + 10 }
  })
  await driver.execute('mobile: tap', screenNow(heading))
  await sleep(1500)
  const focused = await driver.execute(() => document.activeElement?.hasAttribute('data-notepad-text') ?? false)
  ok(`${name} a tap on Notepad's text focuses it`, focused)
  await toNative()
  const keyboard = await driver.$('-ios class chain:**/XCUIElementTypeKeyboard').isExisting()
  ok(`${name} the on-screen keyboard appears`, keyboard)
  await shot(`${name}-keyboard`)
  if (keyboard) {
    for (const letter of ['h', 'i']) {
      const key = await driver.$(`-ios predicate string:type == "XCUIElementTypeKey" AND name == "${letter}"`)
      if (await key.isExisting()) await key.click()
    }
  }
  await toWeb()
  await sleep(600)
  const typed = await driver.execute(() => document.querySelector('[data-notepad-text]')?.value ?? '')
  ok(`${name} typing on the keyboard reaches Notepad`, /hi/i.test(typed.slice(0, 8)), JSON.stringify(typed.slice(0, 12)))

  // Explorer: a long press on a file's icon and on its name both open its menu.
  await signIn(url)
  const third = await calibrate()
  const screenThird = (point) => ({ x: Math.round(point.x + third.dx), y: Math.round(point.y + third.dy) })
  await driver.execute('mobile: tap', screenThird(await centreOf('[data-desktop-item="Projects"]')))
  await driver.waitUntil(() => driver.execute(() => Boolean([...document.querySelectorAll('[data-explorer-file]')].find((el) => el.offsetParent))), {
    timeout: 30_000,
    timeoutMsg: 'Explorer never opened',
  })
  await sleep(1200)
  for (const part of ['icon', 'label']) {
    await startRecording()
    await driver.execute('mobile: touchAndHold', { ...screenThird(await centreOf('[data-explorer-file]', part)), duration: 1.0 })
    await sleep(700)
    items = await menuItems()
    const opened = items.includes('Copy as path')
    ok(`${name} long press on a file's ${part} in Explorer opens its menu`, opened, items.slice(0, 3).join(', '))
    if (!opened) console.log(`      what iOS sent: ${await recording()}`)
    await shot(`${name}-explorer-${part}`)
    await closeMenus()
    await sleep(500)
  }

  // Hold a file, then drag it to the Recycle Bin chip: it goes to the bin.
  await driver.execute(() => document.querySelector('[data-place-pill="Recycle Bin"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
  await sleep(500)
  const from = await centreOf('[data-explorer-file="Freelance"]')
  const to = await centreOf('[data-place-pill="Recycle Bin"]')
  if (from && to) {
    const a = screenThird(from)
    const b = screenThird(to)
    await startRecording()
    await driver.execute('mobile: dragFromToForDuration', { duration: 1.0, fromX: a.x, fromY: a.y, toX: b.x, toY: b.y })
    await sleep(900)
    const gone = await driver.execute(() => !document.querySelector('[data-explorer-file="Freelance"]'))
    ok(`${name} a finger carries a file to the Recycle Bin`, gone)
    if (!gone) console.log(`      what iOS sent: ${await recording()}`)
    await shot(`${name}-dragged`)
  } else {
    ok(`${name} a finger carries a file to the Recycle Bin`, false, 'the file or the bin chip is missing')
  }

  errors.push(...(await driver.execute(() => window.__errors ?? [])))
  ok(`${name} no page errors`, errors.length === 0, errors.join(' | '))
}

try {
  const caps = driver.capabilities
  console.log(`Safari on ${caps.deviceName ?? process.env.IOS_NAME}, iOS ${caps.platformVersion ?? process.env.IOS_VERSION}`)
  for (const [name, url] of BUILDS) {
    try {
      await run(name, url)
    } catch (error) {
      ok(`${name} finished`, false, String(error.message).split('\n')[0].slice(0, 200))
      await shot(`${name}-error`)
    }
  }
} finally {
  await driver.deleteSession().catch(() => {})
}

const failed = results.filter((line) => line.startsWith('FAIL')).length
results.push(`\n${results.length - failed} of ${results.length} passed`)
writeFileSync(join(OUT, 'results.txt'), results.join('\n') + '\n')
console.log(results.at(-1))
process.exit(failed ? 1 : 0)
