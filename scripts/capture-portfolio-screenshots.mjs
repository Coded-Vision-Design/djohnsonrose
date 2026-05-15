#!/usr/bin/env node
// Portfolio screenshot capture — single source of truth for the thumbnails in
// data/portfolio.json. Run with:
//
//   node scripts/capture-portfolio-screenshots.mjs                # all sites
//   node scripts/capture-portfolio-screenshots.mjs codedvision    # one slug
//
// Best-practice defaults applied:
//   * Chromium, headless, --no-sandbox-friendly args
//   * Desktop viewport 1440x900, mobile iPhone 13 (390x844)
//   * Wait for networkidle + fonts.ready + 500ms cushion
//   * Generic popup/cookie dismisser (clicks Accept/Got it/Close etc.)
//   * Hide consent overlays via CSS for stragglers
//   * scroll-to-top before capture so the hero is framed consistently
//   * PNG capture → sharp → WebP @ quality 82, mozjpeg-style effort 6
//   * Output to portfolio/<slug>.webp + portfolio/<slug>-mobile.webp

import { chromium, devices } from 'playwright'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = join(__dirname, '..')
const OUT = join(REPO, 'portfolio')
mkdirSync(OUT, { recursive: true })

const SITES = [
  // Featured (the 4 the user named).
  { slug: 'codedvisiondesign',     url: 'https://codedvisiondesign.co.uk',     featured: true },
  { slug: 'earthecho',             url: 'https://earthecho.co.uk',             featured: true },
  { slug: 'combatevolvedsports',   url: 'https://combatevolvedsports.com',     featured: true },
  { slug: 'ramstaxis',             url: 'https://ramstaxis.co.uk',             featured: true },

  // Existing archive — refresh every thumbnail in the same pass.
  { slug: 'englishopenbjj',        url: 'https://englishopenbjjchampionships.co.uk' },
  { slug: 'baymotors',             url: 'https://www.baymotors.co.uk' },
  { slug: 'cpttours',              url: 'https://cpttours.co.za' },
  { slug: 'ekbjjdesktop',          url: 'https://ekbjj.com' },
  { slug: 'boulevardlogistics',    url: 'https://boulevardlogistics.co.uk' },
  { slug: 'eurogoatdesktop',       url: 'https://euro-goat.com' },
  { slug: 'bhrrecovery',           url: 'https://bhrrecovery.co.uk' },
  { slug: 'youngsconstructiondesktop', url: 'https://youngsconstructionltd.co.uk' },
  { slug: 'wolvesbjj',             url: 'https://bjjhavering.co.uk' },
  { slug: 'sweetdelights',         url: 'https://hameedahsdelights.com' },
]

// Common consent / popup selectors. Order matters — broader matches last.
const DISMISS_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '#cookie-accept',
  '#cookies-accept',
  '#CybotCookiebotDialogBodyButtonAccept',
  '#accept-cookies, #acceptCookies, .accept-cookies, .cookie-accept',
  'button[aria-label*="Accept" i]',
  'button[aria-label*="Allow" i]',
  'button[aria-label*="Close" i]',
  'button[aria-label*="Got it" i]',
  'button[aria-label*="Dismiss" i]',
  'button:has-text("Accept all")',
  'button:has-text("Accept All")',
  'button:has-text("Accept")',
  'button:has-text("Allow all")',
  'button:has-text("Allow")',
  'button:has-text("I agree")',
  'button:has-text("Got it")',
  'button:has-text("OK")',
  'button:has-text("Continue")',
  'button:has-text("No thanks")',
  '.cc-btn.cc-allow',
  '.cookie-consent button',
  '[class*="cookie" i] button',
  '[class*="consent" i] button',
]

// CSS sledgehammer for stubborn overlays that don't match the dismiss list.
const HIDE_OVERLAY_CSS = `
  [class*="cookie" i],
  [id*="cookie" i],
  [class*="consent" i],
  [id*="consent" i],
  [class*="gdpr" i],
  [id*="gdpr" i],
  [class*="banner" i][class*="bottom" i],
  [class*="newsletter" i][class*="modal" i],
  [aria-label*="cookie" i],
  [role="dialog"][aria-modal="true"],
  iframe[src*="consent" i],
  iframe[src*="cookie" i],
  .grecaptcha-badge,
  #__next-build-watcher,
  [data-vercel-toolbar] { display: none !important; visibility: hidden !important; }
`

async function dismissPopups(page) {
  for (const sel of DISMISS_SELECTORS) {
    try {
      const loc = page.locator(sel).first()
      if (await loc.isVisible({ timeout: 500 }).catch(() => false)) {
        await loc.click({ timeout: 1500 }).catch(() => {})
        await page.waitForTimeout(200)
      }
    } catch {
      /* selector didn't apply on this site — fine */
    }
  }
  await page.addStyleTag({ content: HIDE_OVERLAY_CSS }).catch(() => {})
}

async function stabilize(page) {
  await page.evaluate(() => document.fonts.ready).catch(() => {})
  // Some sites (bjjhavering, bhrrecovery) auto-scroll during hydration to
  // restore a saved position or jump to a hash anchor — that's why their
  // captures used to land mid-page instead of on the hero. We pin the
  // scroll position both *before* the paint wait and *after*, and freeze
  // <html>'s scroll-behavior so any later programmatic scroll snaps back.
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' }).catch(() => {})
  await page.evaluate(() => window.scrollTo(0, 0))

  // Wait until something substantive has actually painted above the fold.
  // Next.js / hydration-heavy sites (earthecho.co.uk was the obvious one)
  // settle networkidle while still rendering an empty body, so a fixed
  // sleep alone caught a white page. Require >120 visible text chars OR
  // an above-the-fold image with non-zero layout.
  await page
    .waitForFunction(
      () => {
        const inViewport = (el) => {
          const r = el.getBoundingClientRect()
          return r.top < window.innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0
        }
        const text = (document.body.innerText || '').trim()
        if (text.length > 120) return true
        const imgs = Array.from(document.images || [])
        return imgs.some((i) => i.complete && i.naturalWidth > 0 && inViewport(i))
      },
      { timeout: 8000 },
    )
    .catch(() => {})

  await page.waitForTimeout(1500) // animation / hero-fade settle

  // Final scroll-to-top after the page has actually painted — catches
  // sessionStorage scroll-restore + IntersectionObserver-triggered jumps.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
}

async function capture(page, site, viewport, suffix = '') {
  await page.setViewportSize(viewport)
  const ctx = `${site.slug}${suffix}`
  process.stdout.write(`  → ${ctx} (${viewport.width}x${viewport.height}) `)

  try {
    await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  } catch (e) {
    console.log(`✗ navigation failed: ${e.message}`)
    return false
  }

  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await dismissPopups(page)
  await stabilize(page)

  const pngBuf = await page.screenshot({ fullPage: false, type: 'png' })
  const outFile = join(OUT, `${site.slug}${suffix}.webp`)
  await sharp(pngBuf).webp({ quality: 82, effort: 6 }).toFile(outFile)

  const bytes = (await sharp(pngBuf).webp({ quality: 82, effort: 6 }).toBuffer()).byteLength
  console.log(`✓ ${(bytes / 1024).toFixed(0)} KB`)
  return true
}

async function main() {
  const filter = process.argv[2]?.toLowerCase()
  const targets = filter ? SITES.filter((s) => s.slug.toLowerCase().includes(filter)) : SITES
  if (targets.length === 0) {
    console.error(`No sites match filter '${filter}'`)
    process.exit(1)
  }

  console.log(`Capturing ${targets.length} sites → ${OUT}\n`)
  const browser = await chromium.launch({ headless: true })

  // Desktop context — fresh per site to keep cookies isolated.
  const desktopVP = { width: 1440, height: 900 }
  const mobileDevice = devices['iPhone 13']

  const results = []

  for (const site of targets) {
    console.log(`◆ ${site.slug}  ${site.url}`)
    const desktopCtx = await browser.newContext({
      viewport: desktopVP,
      deviceScaleFactor: 1,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const desktopPage = await desktopCtx.newPage()
    const okD = await capture(desktopPage, site, desktopVP)
    await desktopCtx.close()

    const mobileCtx = await browser.newContext({ ...mobileDevice })
    const mobilePage = await mobileCtx.newPage()
    const okM = await capture(mobilePage, site, mobileDevice.viewport, '-mobile')
    await mobileCtx.close()

    results.push({ slug: site.slug, desktop: okD, mobile: okM })
  }

  await browser.close()

  console.log('\nSummary:')
  for (const r of results) {
    const tag = r.desktop && r.mobile ? '✓' : r.desktop || r.mobile ? '◯' : '✗'
    console.log(`  ${tag}  ${r.slug.padEnd(28)} desktop=${r.desktop} mobile=${r.mobile}`)
  }
  const allOk = results.every((r) => r.desktop && r.mobile)
  process.exit(allOk ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
