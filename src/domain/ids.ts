// ============================================================================
// src/domain/ids.ts — id generation. The only domain module (with
// dates.ts#todayLocal) that touches a runtime global (`crypto`), and it is
// injectable so the reducer and tests never depend on it.
// ============================================================================
import type { Id } from './types'

/** The subset of `Crypto` we rely on. `randomUUID` is missing on insecure origins (http://192.168.x.x). */
export type IdCrypto = {
  randomUUID?: () => string
  getRandomValues: (array: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>
}

const HEX: readonly string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

/** RFC 4122 v4 UUID built from 16 random bytes. */
function uuidV4(cryptoObj: IdCrypto): string {
  const bytes = new Uint8Array(16)
  cryptoObj.getRandomValues(bytes)
  // Version nibble (0100) and variant bits (10xx).
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  let out = ''
  for (let i = 0; i < 16; i++) {
    if (i === 4 || i === 6 || i === 8 || i === 10) out += '-'
    out += HEX[bytes[i] ?? 0]
  }
  return out
}

/**
 * New unique id. Uses `crypto.randomUUID` when available, otherwise a v4 UUID
 * built with `crypto.getRandomValues`. The crypto object is read at call time
 * (not at module load) so tests can swap the global or inject their own.
 */
export function newId(cryptoObj: IdCrypto = globalThis.crypto): Id {
  if (typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID()
  return uuidV4(cryptoObj)
}

/** Any non-empty string is a valid id (UUID v4 or seeded 'cat-…'). */
export function isId(x: unknown): x is Id {
  return typeof x === 'string' && x.length > 0
}
