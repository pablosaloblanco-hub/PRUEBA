// ============================================================================
// src/test/fixtures.ts — builders and loaders for the canonical §3.7 fixture.
// Pure helpers for unit and component tests; every call returns fresh objects.
// ============================================================================
import type { AppData, Budget, Category, Transaction } from '../domain/types'
import v1 from '../domain/storage/__fixtures__/v1.json'

/** Structural twin of `PersistedEnvelope` (§3.2) so this file has no dependency on storage/schema.ts. */
export type FixtureEnvelope = {
  app: 'mis-finanzas'
  schemaVersion: number
  savedAt: number
  data: unknown
}

/** `today` every §3.7 derived number is computed against (a Friday; September 2026 has 30 days). */
export const FIXTURE_TODAY = '2026-09-25'

/** Deep clone through JSON: the fixture only holds plain JSON data. */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let txCounter = 0
let catCounter = 0
let budgetCounter = 0

/** A valid expense transaction with sensible defaults; override any field. */
export function tx(overrides: Partial<Transaction> = {}): Transaction {
  txCounter++
  return {
    id: `tx-${txCounter}`,
    type: 'expense',
    amountCents: 1000,
    date: '2026-09-10',
    categoryId: 'cat-alimentacion',
    note: '',
    createdAt: 1_783_000_000_000 + txCounter,
    updatedAt: 1_783_000_000_000 + txCounter,
    ...overrides,
  }
}

/** A valid non-builtIn expense category with sensible defaults; override any field. */
export function cat(overrides: Partial<Category> = {}): Category {
  catCounter++
  return {
    id: `cat-test-${catCounter}`,
    name: `Categoría ${catCounter}`,
    type: 'expense',
    icon: '📦',
    color: 'blue',
    sortOrder: 100 + catCounter,
    builtIn: false,
    ...overrides,
  }
}

/** A valid per-category budget with sensible defaults; override any field. */
export function budget(overrides: Partial<Budget> = {}): Budget {
  budgetCounter++
  return {
    id: `budget-test-${budgetCounter}`,
    categoryId: 'cat-alimentacion',
    limitCents: 10000,
    ...overrides,
  }
}

/** The §3.7 envelope exactly as stored in `__fixtures__/v1.json` (fresh deep copy). */
export function loadFixtureV1(): FixtureEnvelope {
  return deepClone(v1) as FixtureEnvelope
}

/** The §3.7 `AppData` (fresh deep copy; safe to mutate in a test). */
export function fixtureData(): AppData {
  return deepClone(v1.data) as AppData
}
