import { afterEach, describe, expect, it, vi } from 'vitest'
import { isId, newId } from './ids'
import type { IdCrypto } from './ids'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/** Captured before any global stubbing so the fallback never recurses into the stub. */
const REAL_CRYPTO = globalThis.crypto

/** A crypto without randomUUID (insecure origin), backed by the real getRandomValues. */
function insecureCrypto(): IdCrypto {
  return { getRandomValues: (a) => REAL_CRYPTO.getRandomValues(a) }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('newId', () => {
  it('uses crypto.randomUUID when it exists', () => {
    const spy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('11111111-2222-4333-8444-555555555555')
    expect(newId()).toBe('11111111-2222-4333-8444-555555555555')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('produces v4 UUIDs by default', () => {
    expect(newId()).toMatch(UUID_V4)
  })

  it('falls back to getRandomValues when randomUUID is removed from the global', () => {
    const getRandomValues = vi.fn((a: Uint8Array<ArrayBuffer>) => REAL_CRYPTO.getRandomValues(a))
    vi.stubGlobal('crypto', { getRandomValues })
    const id = newId()
    expect(id).toMatch(UUID_V4)
    expect(getRandomValues).toHaveBeenCalledTimes(1)
  })

  it('falls back when an injected crypto has no randomUUID', () => {
    const id = newId(insecureCrypto())
    expect(id).toMatch(UUID_V4)
  })

  it('fallback sets the version and variant bits deterministically', () => {
    const fixed: IdCrypto = {
      getRandomValues: (a) => {
        a.fill(0xff)
        return a
      },
    }
    expect(newId(fixed)).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
    const zeros: IdCrypto = {
      getRandomValues: (a) => {
        a.fill(0)
        return a
      },
    }
    expect(newId(zeros)).toBe('00000000-0000-4000-8000-000000000000')
  })

  it('generates 100k unique ids (randomUUID path)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100_000; i++) seen.add(newId())
    expect(seen.size).toBe(100_000)
  })

  it('generates 100k unique ids (fallback path)', () => {
    const c = insecureCrypto()
    const seen = new Set<string>()
    for (let i = 0; i < 100_000; i++) seen.add(newId(c))
    expect(seen.size).toBe(100_000)
  })
})

describe('isId', () => {
  it('accepts non-empty strings', () => {
    expect(isId('cat-ocio')).toBe(true)
    expect(isId(newId())).toBe(true)
  })
  it('rejects empty strings and non-strings', () => {
    expect(isId('')).toBe(false)
    expect(isId(null)).toBe(false)
    expect(isId(undefined)).toBe(false)
    expect(isId(12)).toBe(false)
    expect(isId({})).toBe(false)
  })
})
