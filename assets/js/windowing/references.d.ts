export interface ReferencesEnvelope {
  v: number
  alg: string
  kdf: string
  iterations: number
  salt: string
  iv: string
  ciphertext: string
}

export interface Reference {
  from: string
  role?: string
  company?: string
  body: string
}

export const REFERENCES_KEY: string

export function decryptReferences(
  envelope: ReferencesEnvelope,
  password: string,
): Promise<{ references: Reference[]; text: string }>
export function savedReferences(storage: Pick<Storage, 'getItem'>): Reference[] | null
export function saveReferences(storage: Pick<Storage, 'setItem'>, text: string): void
export function forgetReferences(storage: Pick<Storage, 'removeItem'>): void
