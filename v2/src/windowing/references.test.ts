import { describe, it, expect, beforeEach } from 'vitest'
import {
  REFERENCES_KEY,
  decryptReferences,
  forgetReferences,
  savedReferences,
  type ReferencesEnvelope,
} from '../../../assets/js/windowing/references.js'

// The References vault in both builds: opening the letters, keeping them for
// the session, and forgetting them when the visitor signs out of the OS.

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))

/** Encrypts like scripts/encrypt-references.mjs, with few rounds to keep the test quick. */
async function seal(plaintext: string, password: string): Promise<ReferencesEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 1000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)))
  return { v: 1, alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: 1000, salt: toB64(salt), iv: toB64(iv), ciphertext: toB64(ciphertext) }
}

const LETTERS = [{ from: 'A Manager', role: 'Head of IT', company: 'Example Ltd', body: 'Recommended.' }]

describe('decryptReferences', () => {
  it('opens the letters with the right password', async () => {
    const envelope = await seal(JSON.stringify(LETTERS), 'right')
    const out = await decryptReferences(envelope, 'right')
    expect(out.references).toEqual(LETTERS)
    expect(JSON.parse(out.text)).toEqual(LETTERS)
  })

  it('opens an empty vault as an empty list', async () => {
    const envelope = await seal('[]', 'right')
    expect((await decryptReferences(envelope, 'right')).references).toEqual([])
  })

  it('refuses a wrong password', async () => {
    const envelope = await seal(JSON.stringify(LETTERS), 'right')
    await expect(decryptReferences(envelope, 'wrong')).rejects.toThrow()
  })
})

describe('the unlocked letters in this session', () => {
  beforeEach(() => sessionStorage.clear())

  it('reads back what was saved', () => {
    sessionStorage.setItem(REFERENCES_KEY, JSON.stringify(LETTERS))
    expect(savedReferences(sessionStorage)).toEqual(LETTERS)
  })

  it('ignores nothing, broken text and anything that is not a list', () => {
    expect(savedReferences(sessionStorage)).toBeNull()
    sessionStorage.setItem(REFERENCES_KEY, '{not json')
    expect(savedReferences(sessionStorage)).toBeNull()
    sessionStorage.setItem(REFERENCES_KEY, '{"from":"x"}')
    expect(savedReferences(sessionStorage)).toBeNull()
  })

  it('forgets them on sign-out, and copes with storage that throws', () => {
    sessionStorage.setItem(REFERENCES_KEY, JSON.stringify(LETTERS))
    forgetReferences(sessionStorage)
    expect(sessionStorage.getItem(REFERENCES_KEY)).toBeNull()
    const broken = { removeItem: () => { throw new Error('blocked') }, getItem: () => { throw new Error('blocked') } }
    expect(() => forgetReferences(broken)).not.toThrow()
    expect(savedReferences(broken)).toBeNull()
  })
})
