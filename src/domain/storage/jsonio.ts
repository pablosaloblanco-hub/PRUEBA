// ============================================================================
// src/domain/storage/jsonio.ts — envelope guard, export and import (§4.8) plus
// the shared decode pipeline both repositories use for `load` (§5.2 steps 3–6).
// Pure TypeScript; never touches storage or the clock.
// ============================================================================
import type { AppData, Timestamp } from '../types'
import { validateAppData } from '../validate'
import { MIGRATIONS, runMigrations } from './migrations'
import type { ImportResult, Migration, PersistedEnvelope, PersistedV1 } from './schema'
import { APP_TAG, SCHEMA_VERSION } from './schema'

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/** `app === 'mis-finanzas'`, `schemaVersion` integer ≥ 1 (`'1'` and `1.5` fail) and `data` an object. */
export function isPersistedEnvelope(x: unknown): x is PersistedEnvelope {
  if (!isRecord(x)) return false
  if (x.app !== APP_TAG) return false
  const version = x.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return false
  return isRecord(x.data)
}

export function buildEnvelope(data: AppData, now: Timestamp): PersistedV1 {
  return { app: APP_TAG, schemaVersion: SCHEMA_VERSION, savedAt: now, data }
}

/** Pretty-printed (2 spaces) envelope for «Exportar copia (JSON)»; `savedAt = now` keeps it deterministic. */
export function exportJson(data: AppData, now: Timestamp): string {
  return JSON.stringify(buildEnvelope(data, now), null, 2)
}

/** Compact envelope for localStorage (§5.1: no pretty-print). */
export function serializeEnvelope(data: AppData, now: Timestamp): string {
  return JSON.stringify(buildEnvelope(data, now))
}

export type DecodeResult =
  | { kind: 'ok'; data: AppData; warnings: string[]; migratedFrom: number | null; schemaVersion: number }
  | { kind: 'invalid-json'; detail: string }
  | { kind: 'not-an-envelope'; detail: string }
  | { kind: 'newer-version'; foundVersion: number }
  | { kind: 'invalid-data'; detail: string }

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Injectable migration chain (tests drive the runner with a synthetic one); production uses `MIGRATIONS`. */
export type DecodeOptions = {
  migrations?: readonly Migration[]
  /** Version the chain must reach; defaults to SCHEMA_VERSION. */
  target?: number
}

/**
 * JSON.parse → isPersistedEnvelope → version check → migrations → validateAppData.
 * `load` maps every failure to `corrupt` (or `newer`); `parseImport` to its `ImportError`.
 */
export function decodeEnvelope(json: string, opts: DecodeOptions = {}): DecodeResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (e) {
    return { kind: 'invalid-json', detail: errorMessage(e) }
  }
  if (!isPersistedEnvelope(parsed)) {
    return { kind: 'not-an-envelope', detail: 'not a Mis Finanzas envelope' }
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    return { kind: 'newer-version', foundVersion: parsed.schemaVersion }
  }
  const target = opts.target ?? SCHEMA_VERSION
  const migrated = runMigrations(parsed, opts.migrations ?? MIGRATIONS, target)
  if (!migrated.ok) {
    const err = migrated.error
    // `newer` cannot happen with the default target (checked above); keep the mapping total anyway.
    const detail = err.kind === 'newer' ? `schema version ${err.foundVersion} is newer than ${target}` : err.detail
    return { kind: 'invalid-data', detail }
  }
  const validated = validateAppData(migrated.value.envelope.data)
  if (!validated.ok) return { kind: 'invalid-data', detail: validated.error }
  return {
    kind: 'ok',
    data: validated.value.data,
    warnings: validated.value.warnings,
    migratedFrom: migrated.value.migratedFrom,
    schemaVersion: parsed.schemaVersion,
  }
}

/** Validates and migrates an imported file; never persists (§4.8). `too-large` is decided by the UI before reading. */
export function parseImport(json: string): ImportResult {
  const decoded = decodeEnvelope(json)
  switch (decoded.kind) {
    case 'ok':
      return {
        kind: 'ok',
        data: decoded.data,
        preview: {
          transactions: decoded.data.transactions.length,
          categories: decoded.data.categories.length,
          budgets: decoded.data.budgets.length,
          schemaVersion: decoded.schemaVersion,
          warnings: decoded.warnings,
        },
      }
    case 'invalid-json':
      return { kind: 'invalid', error: 'invalid-json', detail: decoded.detail }
    case 'not-an-envelope':
      return { kind: 'invalid', error: 'not-an-envelope', detail: decoded.detail }
    case 'newer-version':
      return {
        kind: 'invalid',
        error: 'newer-version',
        detail: `schema version ${decoded.foundVersion} is newer than ${SCHEMA_VERSION}`,
      }
    case 'invalid-data':
      return { kind: 'invalid', error: 'invalid-data', detail: decoded.detail }
  }
}
