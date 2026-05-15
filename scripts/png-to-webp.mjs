import sharp from 'sharp'
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', 'assets', 'img')

function walk(dir) {
  const out = []
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    const st = statSync(p)
    if (st.isDirectory()) out.push(...walk(p))
    else if (f.toLowerCase().endsWith('.png')) out.push(p)
  }
  return out
}

const pngs = walk(ROOT)
console.log(`Found ${pngs.length} PNGs`)

let saved = 0
for (const png of pngs) {
  const webp = png.replace(/\.png$/i, '.webp')
  const before = statSync(png).size
  await sharp(png).webp({ quality: 90, effort: 6, alphaQuality: 95 }).toFile(webp)
  const after = statSync(webp).size
  saved += (before - after)
  unlinkSync(png)
  console.log(`${png.replace(ROOT, '.')}: ${before} → ${after} bytes`)
}
console.log(`\nDone. ${pngs.length} files converted. Saved ${(saved / 1024).toFixed(1)} KB total.`)
