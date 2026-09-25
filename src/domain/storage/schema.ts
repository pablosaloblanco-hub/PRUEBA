// ============================================================================
// src/domain/storage/schema.ts — persisted envelope, keys, results and the
// repository contract (§3.2). Pure types and constants; no React, no DOM.
// ============================================================================
import type { AppData, Timestamp } from '../types'

export const APP_TAG = 'mis-finanzas' as const
export const SCHEMA_VERSION = 1 as const
export const STORAGE_KEY = 'mis-finanzas'
export const BACKUP_STORAGE_KEY = 'mis-finanzas:backup'
export const THEME_MIRROR_KEY = 'mis-finanzas:theme' // P1-13

/** Lo que se escribe en localStorage y lo que se exporta como JSON. `data` es unknown hasta validar. */
export type PersistedEnvelope = {
  app: typeof APP_TAG
  schemaVersion: number
  /** Epoch ms del guardado/exportación; informativo. */
  savedAt: Timestamp
  data: unknown
}

/** Envelope validado en la versión actual. */
export type PersistedV1 = {
  app: typeof APP_TAG
  schemaVersion: 1
  savedAt: Timestamp
  data: AppData
}

/** Migración pura y total de `from` a `to` (= from + 1). Se registra una sola vez. */
export type Migration = {
  from: number
  to: number
  migrate: (raw: PersistedEnvelope) => PersistedEnvelope
}

export type LoadResult =
  | { kind: 'ok'; data: AppData; migratedFrom: number | null }
  | { kind: 'empty' }                                                    // primer uso → sembrar
  | { kind: 'corrupt'; raw: string; error: string; hasBackup: boolean }  // JSON roto / validación fallida
  | { kind: 'newer'; raw: string; foundVersion: number }                 // export de una versión futura
  | { kind: 'unavailable'; error: string }                               // localStorage lanza

export type SaveResult =
  | { kind: 'ok' }
  | { kind: 'quota'; bytesAttempted: number }
  | { kind: 'unavailable'; error: string }

export type ImportPreview = {
  transactions: number
  categories: number
  budgets: number
  schemaVersion: number
  /** Avisos de normalización de validateAppData (§4.4), en español, para mostrar bajo la vista previa. */
  warnings: string[]
}

export type ImportError = 'invalid-json' | 'not-an-envelope' | 'newer-version' | 'invalid-data' | 'too-large'
export type ImportResult =
  | { kind: 'ok'; data: AppData; preview: ImportPreview }
  | { kind: 'invalid'; error: ImportError; detail: string }

export type StorageRepository = {
  /** Solo lee; nunca escribe (§5.2). */
  load(): LoadResult
  /** Sonda de escritura (§5.2 paso 1): setItem + removeItem de 'mis-finanzas:probe'. El store la llama tras load(). */
  probeWrite(): SaveResult
  /** `now` alimenta `savedAt` (inyectado por el store: `deps.now()`). `skipBackup` omite la copia previa (§5.3); solo desde la recuperación. */
  save(data: AppData, now: Timestamp, opts?: { skipBackup?: boolean }): SaveResult
  /** Carga desde BACKUP_STORAGE_KEY con la misma validación. Nunca escribe. */
  restoreBackup(): LoadResult
  /** Cadena cruda de STORAGE_KEY (para «Descargar datos en bruto»). */
  readRaw(): string | null
  /** Envelope PersistedV1 serializado con 2 espacios; `savedAt = now` (determinista en tests). */
  exportJson(data: AppData, now: Timestamp): string
  /** Valida + migra; NO persiste (el UI confirma y luego despacha data/replace). */
  parseImport(json: string): ImportResult
  /** Bytes aproximados ocupados: suma de STORAGE_KEY y BACKUP_STORAGE_KEY (length * 2 cada una). */
  estimateBytes(): number
  clear(): void
}
