#!/usr/bin/env node
// Renders scripts/share-card.html to assets/img/share-card.png, the 1200x630
// image that og:image and twitter:image point at in both builds and on /cv.
// PNG rather than WebP, as not every network reads WebP previews. Run with:
//
//   node scripts/make-share-image.mjs
//
// Uses the root devDependencies (playwright, sharp). Rerun it after changing
// the card or the photo it shows (assets/img/profile.webp).

import { chromium } from 'playwright'
import sharp from 'sharp'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CARD = pathToFileURL(join(__dirname, 'share-card.html')).href
const OUT = join(__dirname, '..', 'assets', 'img', 'share-card.png')

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.goto(CARD)
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((img) => img.decode())]))
  const shot = await page.screenshot({ type: 'png' })
  const info = await sharp(shot).png({ compressionLevel: 9, palette: true, quality: 90, dither: 0.6 }).toFile(OUT)
  console.log(`Wrote ${OUT} (${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB)`)
} finally {
  await browser.close()
}
