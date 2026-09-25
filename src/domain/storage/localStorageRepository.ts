// ============================================================================
// src/domain/storage/localStorageRepository.ts — StorageRepository over a
// (possibly throwing or missing) Web Storage object (§5.2, §5.3). The storage
// is injected so tests pass jsdom's localStorage or a fake that throws; the
// memory repository reuses the same implementation over a Map.
// ============================================================================
import type { AppData, Timestamp } from '../types'
import { decodeEnvelope, exportJson, parseImport, serializeEnvelope } from './jsonio'
import type { LoadResult, SaveResult, StorageRepository } from './schema'
import { BACKUP_STORAGE_KEY, STORAGE_KEY } from './schema'

export const PROBE_KEY = 'mis-finanzas:probe'

/** The three methods this module needs; `Storage` and a Map-backed fake both satisfy it. */
export type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string') return e.message
  return String(e)
}

/** `QuotaExceededError` by name, or legacy `code` 22 (WebKit/Blink) / 1014 (Firefox). */
export function isQuotaError(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false
  const { name, code } = e as { name?: unknown; code?: unknown }
  return name === 'QuotaExceededError' || code === 22 || code === 1014
}

export function classifySaveError(e: unknown, bytesAttempted: number): SaveResult {
  if (isQuotaError(e)) return { kind: 'quota', bytesAttempted }
  return { kind: 'unavailable', error: errorMessage(e) }
}

/** UTF-16 code units × 2, the approximation every localStorage quota uses. */
function byteLength(s: string | null): number {
  return s === null ? 0 : s.length * 2
}

/** Steps 3–6 of §5.2 over a raw string already read from `key`. Never writes. */
function decodeRaw(raw: string, hasBackup: () => boolean): LoadResult {
  const decoded = decodeEnvelope(raw)
  switch (decoded.kind) {
    case 'ok':
      return { kind: 'ok', data: decoded.data, migratedFrom: decoded.migratedFrom }
    case 'newer-version':
      return { kind: 'newer', raw, foundVersion: decoded.foundVersion }
    case 'invalid-json':
    case 'not-an-envelope':
    case 'invalid-data':
      return { kind: 'corrupt', raw, error: decoded.detail, hasBackup: hasBackup() }
  }
}

/** Full repository over any `StorageLike`. Every access is guarded: the storage may throw at any call. */
export function createRepositoryOverStorage(storage: StorageLike): StorageRepository {
  const read = (key: string): string | null => storage.getItem(key)

  const hasBackup = (): boolean => {
    try {
      return read(BACKUP_STORAGE_KEY) !== null
    } catch {
      return false
    }
  }

  const loadKey = (key: string, backupCheck: () => boolean): LoadResult => {
    let raw: string | null
    try {
      raw = read(key)
    } catch (e) {
      return { kind: 'unavailable', error: errorMessage(e) }
    }
    if (raw === null) return { kind: 'empty' }
    return decodeRaw(raw, backupCheck)
  }

  return {
    load(): LoadResult {
      return loadKey(STORAGE_KEY, hasBackup)
    },

    probeWrite(): SaveResult {
      try {
        storage.setItem(PROBE_KEY, '1')
        storage.removeItem(PROBE_KEY)
        return { kind: 'ok' }
      } catch (e) {
        return classifySaveError(e, 0)
      }
    },

    save(data: AppData, now: Timestamp, opts?: { skipBackup?: boolean }): SaveResult {
      const serialized = serializeEnvelope(data, now)
      const bytes = byteLength(serialized)
      let prev: string | null
      try {
        prev = read(STORAGE_KEY)
      } catch (e) {
        return classifySaveError(e, bytes)
      }
      if (prev !== null && !opts?.skipBackup) {
        // Best-effort: the result of `save` is decided only by the main write.
        try {
          storage.setItem(BACKUP_STORAGE_KEY, prev)
        } catch (e) {
          console.warn('mis-finanzas: could not write the backup copy', errorMessage(e))
        }
      }
      try {
        storage.setItem(STORAGE_KEY, serialized)
      } catch (e) {
        return classifySaveError(e, bytes)
      }
      return { kind: 'ok' }
    },

    restoreBackup(): LoadResult {
      // A corrupt backup has no further copy to offer.
      return loadKey(BACKUP_STORAGE_KEY, () => false)
    },

    readRaw(): string | null {
      try {
        return read(STORAGE_KEY)
      } catch {
        return null
      }
    },

    exportJson,
    parseImport,

    estimateBytes(): number {
      try {
        return byteLength(read(STORAGE_KEY)) + byteLength(read(BACKUP_STORAGE_KEY))
      } catch {
        return 0
      }
    },

    /** Removes only STORAGE_KEY; the backup stays as the user's last resort. */
    clear(): void {
      try {
        storage.removeItem(STORAGE_KEY)
      } catch {
        // Nothing to clear on a storage that throws.
      }
    },
  }
}

/** Repository for a browser where `localStorage` itself is missing or throws on access. */
function createUnavailableRepository(error: string): StorageRepository {
  const unavailable = (): SaveResult => ({ kind: 'unavailable', error })
  return {
    load: () => ({ kind: 'unavailable', error }),
    probeWrite: unavailable,
    save: unavailable,
    restoreBackup: () => ({ kind: 'unavailable', error }),
    readRaw: () => null,
    exportJson,
    parseImport,
    estimateBytes: () => 0,
    clear: () => {},
  }
}

/**
 * `storage` is `window.localStorage` in the app; pass `undefined` (or a fake
 * that throws) in tests. Reading `window.localStorage` can itself throw a
 * `SecurityError`; callers wrap that access and pass `undefined`.
 */
export function createLocalStorageRepository(storage: Storage | undefined): StorageRepository {
  if (storage === undefined) return createUnavailableRepository('localStorage is not available')
  return createRepositoryOverStorage(storage)
}
