#!/usr/bin/env node
// Fails the build when a shipped image or sound is too heavy, or when a .webp
// file is not really WebP (a renamed PNG is several times larger and skips the
// browser's WebP decoder hints). No dependencies, so CI can run it with plain Node.
//
// Usage: node scripts/check-asset-sizes.mjs [repoRoot]
import { readdirSync, statSync, openSync, readSync, closeSync, existsSync } from 'node:fs'
import { join, relative, resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DIRS = ['assets/img', 'portfolio', 'assets/sounds']
export const MAX_BYTES = 2 * 1024 * 1024

// A WebP file starts with "RIFF", a four-byte length, then "WEBP".
export function isWebp(header) {
  return header.length >= 12 && header.toString('latin1', 0, 4) === 'RIFF' && header.toString('latin1', 8, 12) === 'WEBP'
}

function readHeader(path) {
  const fd = openSync(path, 'r')
  try {
    const buf = Buffer.alloc(12)
    const n = readSync(fd, buf, 0, 12, 0)
    return buf.subarray(0, n)
  } finally {
    closeSync(fd)
  }
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else if (entry.isFile()) out.push(path)
  }
  return out
}

/** Every file under the checked folders, as { file, bytes }, with paths relative to root. */
export function listAssets(root, dirs = DIRS) {
  const present = dirs.filter((d) => existsSync(join(root, d)))
  if (present.length === 0) throw new Error(`none of ${dirs.join(', ')} exist under ${root}`)
  return present
    .flatMap((d) => walk(join(root, d)))
    .map((path) => ({ path, file: relative(root, path).split(sep).join('/'), bytes: statSync(path).size }))
}

/** Returns one { file, problem } per rule a file breaks. An empty list means every file passes. */
export function checkAssets(root, { dirs = DIRS, maxBytes = MAX_BYTES } = {}) {
  const problems = []
  for (const { path, file, bytes } of listAssets(root, dirs)) {
    if (bytes > maxBytes) {
      problems.push({ file, problem: `${(bytes / 1048576).toFixed(1)} MB, larger than the ${(maxBytes / 1048576).toFixed(0)} MB limit` })
    }
    if (file.toLowerCase().endsWith('.webp') && !isWebp(readHeader(path))) {
      problems.push({ file, problem: 'not a real WebP (re-encode it, do not rename)' })
    }
  }
  return problems
}

function main() {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'))
  let problems
  let count
  try {
    count = listAssets(root).length
    problems = checkAssets(root)
  } catch (err) {
    console.error(`Asset check could not run: ${err.message}`)
    process.exit(1)
  }
  if (problems.length > 0) {
    console.error(`Asset check failed: ${problems.length} problem(s) in ${count} files`)
    for (const { file, problem } of problems) console.error(`  ${file}: ${problem}`)
    process.exit(1)
  }
  console.log(`Asset check passed: ${count} files under ${DIRS.join(', ')}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
