// ============================================================================
// src/domain/storage/migrations.ts — the ordered, contiguous migration chain
// (empty in v1) and the pure runner that walks it (§5.4). No React, no DOM.
// ============================================================================
import type { Result } from '../types'
import type { Migration, PersistedEnvelope } from './schema'
import { SCHEMA_VERSION } from './schema'

/**
 * Registered migrations, contiguous and ordered: `MIGRATIONS[i]` goes from
 * `i + 1` to `i + 2`, so `MIGRATIONS.length === SCHEMA_VERSION - 1`.
 * v2 (P1) would add `archived: false` to categories and `recurringRules: []`.
 */
export const MIGRATIONS: readonly Migration[] = []

export type MigrationOutcome = {
  envelope: PersistedEnvelope
  /** Version the envelope was read at, or null when no migration ran. */
  migratedFrom: number | null
}

export type MigrationError =
  /** The envelope comes from a future version of the app. */
  | { kind: 'newer'; foundVersion: number }
  /** No registered step starts at `from`. */
  | { kind: 'missing-step'; from: number; detail: string }
  /** A step threw or returned an envelope that is not at `to`. */
  | { kind: 'failed'; from: number; detail: string }

/** Returns null when every step is `from → from + 1` and each one starts where the previous ended. */
export function findChainGap(migrations: readonly Migration[]): string | null {
  for (let i = 0; i < migrations.length; i++) {
    const m = migrations[i]
    if (m === undefined) continue
    if (!Number.isInteger(m.from) || !Number.isInteger(m.to)) {
      return `migration ${i} has non-integer versions (${m.from} → ${m.to})`
    }
    if (m.to !== m.from + 1) return `migration ${i} is not a single step (${m.from} → ${m.to})`
    const prev = migrations[i - 1]
    if (prev !== undefined && prev.to !== m.from) {
      return `migration ${i} starts at ${m.from} but the previous one ends at ${prev.to}`
    }
  }
  return null
}

/** True when the chain is contiguous and, if not empty, ends exactly at `target`. */
export function isContiguousChain(migrations: readonly Migration[], target: number = SCHEMA_VERSION): boolean {
  if (findChainGap(migrations) !== null) return false
  const last = migrations[migrations.length - 1]
  return last === undefined || last.to === target
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Applies the registered steps in order from `envelope.schemaVersion` up to
 * `target`. Never throws: a missing step or a throwing/misbehaving step is an
 * error the caller maps to `corrupt` (load) or `invalid-data` (import).
 */
export function runMigrations(
  envelope: PersistedEnvelope,
  migrations: readonly Migration[] = MIGRATIONS,
  target: number = SCHEMA_VERSION,
): Result<MigrationOutcome, MigrationError> {
  const start = envelope.schemaVersion
  if (start > target) return { ok: false, error: { kind: 'newer', foundVersion: start } }
  if (start === target) return { ok: true, value: { envelope, migratedFrom: null } }

  let current = envelope
  let version = start
  while (version < target) {
    const step = migrations.find((m) => m.from === version)
    if (step === undefined) {
      return {
        ok: false,
        error: { kind: 'missing-step', from: version, detail: `no migration from version ${version}` },
      }
    }
    let next: PersistedEnvelope
    try {
      next = step.migrate(current)
    } catch (e) {
      return {
        ok: false,
        error: { kind: 'failed', from: version, detail: `migration ${version} → ${step.to} threw: ${errorMessage(e)}` },
      }
    }
    if (typeof next !== 'object' || next === null || next.schemaVersion !== step.to) {
      return {
        ok: false,
        error: {
          kind: 'failed',
          from: version,
          detail: `migration ${version} → ${step.to} did not return an envelope at version ${step.to}`,
        },
      }
    }
    current = next
    version = step.to
  }
  return { ok: true, value: { envelope: current, migratedFrom: start } }
}
