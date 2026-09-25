// ============================================================================
// src/domain/storage/memoryRepository.ts — the same StorageRepository contract
// over a Map: tests and the fallback when localStorage is unavailable (§5.5).
// ============================================================================
import { createRepositoryOverStorage } from './localStorageRepository'
import type { StorageLike } from './localStorageRepository'
import type { StorageRepository } from './schema'
import { STORAGE_KEY } from './schema'

export type MemoryRepository = StorageRepository & {
  /** The backing map, exposed so tests can inspect every key (main, backup, probe). */
  readonly entries: ReadonlyMap<string, string>
}

/** `initialRaw`, when given, is stored under STORAGE_KEY verbatim (a serialized envelope or garbage). */
export function createMemoryRepository(initialRaw?: string): MemoryRepository {
  const map = new Map<string, string>()
  if (initialRaw !== undefined) map.set(STORAGE_KEY, initialRaw)
  const storage: StorageLike = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
  return { ...createRepositoryOverStorage(storage), entries: map }
}
