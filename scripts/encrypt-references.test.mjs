// Tests for encrypt-references.mjs. Run with: node --test scripts/encrypt-references.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { decryptReferences } from '../assets/js/windowing/references.js'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'encrypt-references.mjs')
const LETTERS = [{ from: 'A Manager', role: 'Head of IT', company: 'Example Ltd', body: 'Recommended.' }]

function encrypt(password, letters = LETTERS) {
  const dir = mkdtempSync(join(tmpdir(), 'references-'))
  try {
    const input = join(dir, 'references.json')
    writeFileSync(input, JSON.stringify(letters))
    return spawnSync(process.execPath, [SCRIPT, input], { input: password, encoding: 'utf8' })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('makes a file both builds can open with the password', async () => {
  const run = encrypt('correct horse\n')
  assert.equal(run.status, 0, run.stderr)
  const { references } = await decryptReferences(JSON.parse(run.stdout), 'correct horse')
  assert.deepEqual(references, LETTERS)
})

test('uses 600,000 PBKDF2 iterations, as OWASP advises for SHA-256', () => {
  const envelope = JSON.parse(encrypt('correct horse').stdout)
  assert.equal(envelope.iterations, 600000)
})

test('a wrong password does not open it', async () => {
  const envelope = JSON.parse(encrypt('correct horse').stdout)
  await assert.rejects(decryptReferences(envelope, 'wrong'))
})

test('refuses an empty password', () => {
  const run = encrypt('\n')
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /Password missing/)
})
