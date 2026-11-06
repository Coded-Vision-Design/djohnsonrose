// The References vault, shared by both builds. The letters are stored
// encrypted (data/references.enc.json, made by scripts/encrypt-references.mjs)
// and only decrypt in the browser once the visitor gives the password. Once
// open they are kept for the session, until the visitor locks the vault or
// signs out of the OS.

export const REFERENCES_KEY = 'references.session';

function b64ToBytes(b64) {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Derives the AES-256-GCM key from the password with PBKDF2 and opens the
 * letters. A wrong password fails the GCM tag check, so this rejects.
 * Resolves to { references, text }.
 */
export async function decryptReferences(envelope, password) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(envelope.salt), iterations: envelope.iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(envelope.iv) }, key, b64ToBytes(envelope.ciphertext),
  );
  const text = new TextDecoder().decode(plaintext);
  const references = JSON.parse(text);
  if (!Array.isArray(references)) throw new Error('The vault does not hold a list of letters.');
  return { references, text };
}

/** The letters opened earlier this session, or null. */
export function savedReferences(storage) {
  try {
    const value = JSON.parse(storage.getItem(REFERENCES_KEY));
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveReferences(storage, text) {
  try {
    storage.setItem(REFERENCES_KEY, text);
  } catch {
    // Blocked storage only means the vault asks again next time.
  }
}

/** Called when the vault is locked and when the visitor signs out of the OS. */
export function forgetReferences(storage) {
  try {
    storage.removeItem(REFERENCES_KEY);
  } catch {
    // Nothing was kept if storage is blocked.
  }
}
