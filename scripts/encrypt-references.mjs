#!/usr/bin/env node
// Encrypt references for the locked Vault app.
//
// Usage:
//   echo '<password>' | node scripts/encrypt-references.mjs path/to/references.json > data/references.enc.json
//
// references.json is an array of { from, role, company, body } objects.
// The output is a small JSON envelope { v, salt, iv, ciphertext } where each
// value is base64. The browser-side ReferencesVault uses Web Crypto with the
// same AES-256-GCM + PBKDF2(SHA-256, 200k) parameters to decrypt.

import { readFileSync } from 'node:fs'
import { webcrypto as crypto } from 'node:crypto'

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Usage: echo <password> | node scripts/encrypt-references.mjs <input.json>')
    process.exit(1)
  }
  const password = (await readStdin()).trim()
  if (!password) {
    console.error('Password missing (pipe via stdin).')
    process.exit(1)
  }
  const plaintextJson = readFileSync(inputPath, 'utf8')
  JSON.parse(plaintextJson) // sanity check

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintextJson)),
  )

  const envelope = {
    v: 1,
    alg: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: 200000,
    salt: b64(salt),
    iv: b64(iv),
    ciphertext: b64(ciphertext),
  }
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n')
}

function b64(u8) {
  return Buffer.from(u8).toString('base64')
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (c) => (data += c))
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

main().catch((e) => {
  console.error('encrypt-references failed:', e)
  process.exit(1)
})
