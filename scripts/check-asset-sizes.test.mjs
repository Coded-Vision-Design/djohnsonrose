// Tests for check-asset-sizes.mjs. Run with: node --test scripts/check-asset-sizes.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { checkAssets, isWebp, MAX_BYTES } from './check-asset-sizes.mjs'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-asset-sizes.mjs')

// The smallest header the check reads: RIFF, a length, then WEBP.
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'asset-check-'))
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), body)
  }
  return root
}

const run = (root) => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

test('isWebp knows a real WebP header from a PNG', () => {
  assert.equal(isWebp(WEBP), true)
  assert.equal(isWebp(PNG), false)
  assert.equal(isWebp(Buffer.from('RIFF')), false)
})

test('passes small real files in every checked folder', () => {
  const root = fixture({
    'assets/img/icon.webp': WEBP,
    'assets/img/win11/nested.webp': WEBP,
    'assets/img/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'portfolio/site.webp': WEBP,
    'assets/sounds/click.m4a': Buffer.alloc(1000),
  })
  try {
    assert.deepEqual(checkAssets(root), [])
    const out = run(root)
    assert.equal(out.status, 0, out.stderr)
    assert.match(out.stdout, /5 files/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('allows a file at the limit and fails one byte over', () => {
  const root = fixture({
    'assets/sounds/at-limit.m4a': Buffer.alloc(MAX_BYTES),
    'assets/sounds/over.m4a': Buffer.alloc(MAX_BYTES + 1),
  })
  try {
    const problems = checkAssets(root)
    assert.deepEqual(problems.map((p) => p.file), ['assets/sounds/over.m4a'])
    assert.match(problems[0].problem, /larger than/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('fails a .webp that is really a PNG, whatever the case of its extension', () => {
  const root = fixture({
    'assets/img/fake.webp': PNG,
    'portfolio/SHOUTY.WEBP': PNG,
    'assets/img/tiny.webp': Buffer.from('RIFF'),
    'assets/img/real-png.png': PNG,
  })
  try {
    const files = checkAssets(root).map((p) => p.file).sort()
    assert.deepEqual(files, ['assets/img/fake.webp', 'assets/img/tiny.webp', 'portfolio/SHOUTY.WEBP'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('exits non-zero and names every offender', () => {
  const root = fixture({
    'assets/img/fake.webp': PNG,
    'portfolio/huge.webp': Buffer.concat([WEBP, Buffer.alloc(MAX_BYTES)]),
  })
  try {
    const out = run(root)
    assert.equal(out.status, 1)
    assert.match(out.stderr, /assets\/img\/fake\.webp: not a real WebP/)
    assert.match(out.stderr, /portfolio\/huge\.webp: .*larger than/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('skips a missing folder but fails when none of them exist', () => {
  const partial = fixture({ 'assets/img/icon.webp': WEBP })
  const empty = mkdtempSync(join(tmpdir(), 'asset-check-'))
  try {
    assert.deepEqual(checkAssets(partial), [])
    assert.throws(() => checkAssets(empty), /none of/)
    assert.equal(run(empty).status, 1)
  } finally {
    rmSync(partial, { recursive: true, force: true })
    rmSync(empty, { recursive: true, force: true })
  }
})
