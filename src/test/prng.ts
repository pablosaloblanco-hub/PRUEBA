// ============================================================================
// src/test/prng.ts — seeded LCG for deterministic pseudo-random cent values.
// Used by money.test.ts round-trips (§9 «Importes»).
// ============================================================================
import { MAX_CENTS } from '../domain/types'

/** 32-bit LCG (Numerical Recipes constants). */
function lcg(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state
  }
}

/**
 * Returns a generator of integers uniformly-ish distributed in [1, MAX_CENTS].
 * Two 32-bit draws are combined (21 high bits + 32 low bits = 53 bits) so the
 * range covers MAX_CENTS (~2^37) without leaving the safe-integer domain.
 */
export function makePrng(seed: number): () => number {
  const next = lcg(seed)
  return () => {
    const hi = next() & 0x1fffff
    const lo = next()
    const wide = hi * 4294967296 + lo
    return (wide % MAX_CENTS) + 1
  }
}
