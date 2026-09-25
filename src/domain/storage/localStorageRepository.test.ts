// ============================================================================
// src/domain/storage/localStorageRepository.test.ts — §10.1 row: jsdom's real
// localStorage plus a fake Storage that throws on demand. Covers load in every
// kind (never writing), probeWrite, save sequence/backup/skipBackup, error
// classification, restoreBackup, estimateBytes and clear.
// ============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fixtureData, loadFixtureV1 } from '../../test/fixtures'
import { seedData } from '../seed'
import type { AppData } from '../types'
import { exportJson, serializeEnvelope } from './jsonio'
import {
  PROBE_KEY,
  classifySaveError,
  createLocalStorageRepository,
  createRepositoryOverStorage,
  isQuotaError,
} from './localStorageRepository'
import { createMemoryRepository } from './memoryRepository'
import { BACKUP_STORAGE_KEY, STORAGE_KEY } from './schema'

const NOW = 1_783_900_800_000
const LATER = NOW + 60_000

type Call = { method: 'getItem' | 'setItem' | 'removeItem'; key: string; value?: string }
type Throws = Partial<Record<Call['method'], (key: string) => unknown>>

/** Map-backed Storage whose methods can be made to throw; records every call in order. */
function fakeStorage(throws: Throws = {}, initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial))
  const calls: Call[] = []
  const storage: Storage = {
    get length() {
      return map.size
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    clear: () => map.clear(),
    getItem(key: string) {
      calls.push({ method: 'getItem', key })
      const fail = throws.getItem?.(key)
      if (fail !== undefined) throw fail
      return map.get(key) ?? null
    },
    setItem(key: string, value: string) {
      calls.push({ method: 'setItem', key, value })
      const fail = throws.setItem?.(key)
      if (fail !== undefined) throw fail
      map.set(key, value)
    },
    removeItem(key: string) {
      calls.push({ method: 'removeItem', key })
      const fail = throws.removeItem?.(key)
      if (fail !== undefined) throw fail
      map.delete(key)
    },
  }
  return { storage, map, calls }
}

const quotaByName = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError')
const quotaByCode22 = () => ({ name: 'SomethingElse', code: 22, message: 'code 22' })
const quotaByCode1014 = () => ({ name: 'NS_ERROR_DOM_QUOTA_REACHED', code: 1014, message: 'firefox' })
const securityError = () => new DOMException('The operation is insecure.', 'SecurityError')

const fixtureRaw = (): string => JSON.stringify(loadFixtureV1())
const writes = (calls: Call[]): Call[] => calls.filter((c) => c.method !== 'getItem')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('load (jsdom localStorage)', () => {
  it('empty when the key is absent', () => {
    const repo = createLocalStorageRepository(window.localStorage)
    expect(repo.load()).toEqual({ kind: 'empty' })
  })

  it('ok with the fixture data and migratedFrom null', () => {
    window.localStorage.setItem(STORAGE_KEY, fixtureRaw())
    const repo = createLocalStorageRepository(window.localStorage)
    const result = repo.load()
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.data).toEqual(fixtureData())
    expect(result.migratedFrom).toBeNull()
  })

  it('never writes, whatever the outcome', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
    const repo = createLocalStorageRepository(window.localStorage)
    expect(repo.load().kind).toBe('empty')
    window.localStorage.setItem(STORAGE_KEY, '{bad')
    setItem.mockClear()
    expect(repo.load().kind).toBe('corrupt')
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadFixtureV1(), schemaVersion: 9 }))
    setItem.mockClear()
    expect(repo.load().kind).toBe('newer')
    window.localStorage.setItem(STORAGE_KEY, fixtureRaw())
    setItem.mockClear()
    expect(repo.load().kind).toBe('ok')
    expect(setItem).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
  })

  it.each([
    ['truncated JSON', '{"app":"mis-finanzas","schemaVersion":1,"data":{'],
    ['different app', JSON.stringify({ ...loadFixtureV1(), app: 'otra' })],
    ['data not an object', JSON.stringify({ ...loadFixtureV1(), data: 'x' })],
    ['transactions not an array', JSON.stringify({ ...loadFixtureV1(), data: { ...fixtureData(), transactions: {} } })],
    ['float amount', JSON.stringify(envelopeWithFirstTx({ amountCents: 12.5 }))],
    ['string amount', JSON.stringify(envelopeWithFirstTx({ amountCents: '1250' }))],
    ['negative amount', JSON.stringify(envelopeWithFirstTx({ amountCents: -3 }))],
    ['invalid date', JSON.stringify(envelopeWithFirstTx({ date: '2025-02-29' }))],
    ['schemaVersion 0', JSON.stringify({ ...loadFixtureV1(), schemaVersion: 0 })],
    ['schemaVersion 1.5', JSON.stringify({ ...loadFixtureV1(), schemaVersion: 1.5 })],
    ['schemaVersion "1"', JSON.stringify({ ...loadFixtureV1(), schemaVersion: '1' })],
  ])('corrupt for %s, keeping the raw payload untouched', (_label, raw) => {
    window.localStorage.setItem(STORAGE_KEY, raw)
    const repo = createLocalStorageRepository(window.localStorage)
    const result = repo.load()
    expect(result.kind).toBe('corrupt')
    if (result.kind !== 'corrupt') return
    expect(result.raw).toBe(raw)
    expect(result.error.length).toBeGreaterThan(0)
    expect(result.hasBackup).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it('corrupt reports hasBackup when a backup key exists', () => {
    window.localStorage.setItem(STORAGE_KEY, '{bad')
    window.localStorage.setItem(BACKUP_STORAGE_KEY, fixtureRaw())
    const result = createLocalStorageRepository(window.localStorage).load()
    expect(result).toMatchObject({ kind: 'corrupt', raw: '{bad', hasBackup: true })
  })

  it('newer for a future schemaVersion, with raw and foundVersion', () => {
    const raw = JSON.stringify({ ...loadFixtureV1(), schemaVersion: 2 })
    window.localStorage.setItem(STORAGE_KEY, raw)
    const result = createLocalStorageRepository(window.localStorage).load()
    expect(result).toEqual({ kind: 'newer', raw, foundVersion: 2 })
  })
})

function envelopeWithFirstTx(patch: Record<string, unknown>) {
  const data = fixtureData()
  const [first, ...rest] = data.transactions
  return { ...loadFixtureV1(), data: { ...data, transactions: [{ ...first, ...patch }, ...rest] } }
}

describe('load (unavailable storage)', () => {
  it('storage undefined → unavailable everywhere and no throw', () => {
    const repo = createLocalStorageRepository(undefined)
    expect(repo.load()).toMatchObject({ kind: 'unavailable' })
    expect(repo.probeWrite()).toMatchObject({ kind: 'unavailable' })
    expect(repo.save(seedData(NOW), NOW)).toMatchObject({ kind: 'unavailable' })
    expect(repo.restoreBackup()).toMatchObject({ kind: 'unavailable' })
    expect(repo.readRaw()).toBeNull()
    expect(repo.estimateBytes()).toBe(0)
    expect(() => repo.clear()).not.toThrow()
    expect(repo.parseImport(repo.exportJson(fixtureData(), NOW))).toMatchObject({ kind: 'ok' })
  })

  it('getItem throwing SecurityError → unavailable with the message', () => {
    const { storage, calls } = fakeStorage({ getItem: securityError })
    const repo = createLocalStorageRepository(storage)
    const result = repo.load()
    expect(result).toEqual({ kind: 'unavailable', error: 'The operation is insecure.' })
    expect(writes(calls)).toEqual([])
  })

  it('getItem throwing a non-Error value → unavailable with String(value)', () => {
    const { storage } = fakeStorage({ getItem: () => 'nope' })
    expect(createLocalStorageRepository(storage).load()).toEqual({ kind: 'unavailable', error: 'nope' })
  })

  it('backup check that throws counts as no backup', () => {
    const { storage } = fakeStorage(
      { getItem: (key) => (key === BACKUP_STORAGE_KEY ? securityError() : undefined) },
      { [STORAGE_KEY]: '{bad' },
    )
    expect(createLocalStorageRepository(storage).load()).toMatchObject({ kind: 'corrupt', hasBackup: false })
  })
})

describe('probeWrite', () => {
  it('ok on a writable storage, leaving no probe key behind', () => {
    const { storage, map, calls } = fakeStorage()
    expect(createLocalStorageRepository(storage).probeWrite()).toEqual({ kind: 'ok' })
    expect(map.has(PROBE_KEY)).toBe(false)
    expect(calls).toEqual([
      { method: 'setItem', key: PROBE_KEY, value: '1' },
      { method: 'removeItem', key: PROBE_KEY },
    ])
  })

  it('ok on jsdom localStorage', () => {
    expect(createLocalStorageRepository(window.localStorage).probeWrite()).toEqual({ kind: 'ok' })
    expect(window.localStorage.getItem(PROBE_KEY)).toBeNull()
  })

  it.each([
    ['name QuotaExceededError', quotaByName],
    ['code 22', quotaByCode22],
    ['code 1014', quotaByCode1014],
  ])('quota (%s) with bytesAttempted 0 while load stays ok', (_label, make) => {
    const { storage } = fakeStorage({ setItem: make }, { [STORAGE_KEY]: fixtureRaw() })
    const repo = createLocalStorageRepository(storage)
    expect(repo.probeWrite()).toEqual({ kind: 'quota', bytesAttempted: 0 })
    expect(repo.load().kind).toBe('ok')
  })

  it('unavailable for any other exception (setItem or removeItem)', () => {
    const a = fakeStorage({ setItem: securityError })
    expect(createLocalStorageRepository(a.storage).probeWrite()).toEqual({
      kind: 'unavailable',
      error: 'The operation is insecure.',
    })
    const b = fakeStorage({ removeItem: () => new Error('cannot remove') })
    expect(createLocalStorageRepository(b.storage).probeWrite()).toEqual({ kind: 'unavailable', error: 'cannot remove' })
  })
})

describe('save', () => {
  it('writes a compact envelope with savedAt = now under STORAGE_KEY (no backup on first save)', () => {
    const { storage, map, calls } = fakeStorage()
    const repo = createLocalStorageRepository(storage)
    const data = fixtureData()
    expect(repo.save(data, NOW)).toEqual({ kind: 'ok' })
    expect(map.get(STORAGE_KEY)).toBe(serializeEnvelope(data, NOW))
    expect(map.has(BACKUP_STORAGE_KEY)).toBe(false)
    expect(writes(calls)).toEqual([{ method: 'setItem', key: STORAGE_KEY, value: serializeEnvelope(data, NOW) }])
    expect(repo.load()).toMatchObject({ kind: 'ok', data, migratedFrom: null })
  })

  it('copies the previous payload to the backup BEFORE overwriting the main key', () => {
    const { storage, map, calls } = fakeStorage({}, { [STORAGE_KEY]: 'PREVIOUS' })
    const repo = createLocalStorageRepository(storage)
    const data = seedData(NOW)
    expect(repo.save(data, LATER)).toEqual({ kind: 'ok' })
    expect(calls).toEqual([
      { method: 'getItem', key: STORAGE_KEY },
      { method: 'setItem', key: BACKUP_STORAGE_KEY, value: 'PREVIOUS' },
      { method: 'setItem', key: STORAGE_KEY, value: serializeEnvelope(data, LATER) },
    ])
    expect(map.get(BACKUP_STORAGE_KEY)).toBe('PREVIOUS')
    expect(map.get(STORAGE_KEY)).toBe(serializeEnvelope(data, LATER))
  })

  it('on jsdom localStorage the backup holds the previous good state', () => {
    const repo = createLocalStorageRepository(window.localStorage)
    const first = fixtureData()
    const second = seedData(NOW)
    repo.save(first, NOW)
    repo.save(second, LATER)
    expect(window.localStorage.getItem(BACKUP_STORAGE_KEY)).toBe(serializeEnvelope(first, NOW))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(serializeEnvelope(second, LATER))
    expect(repo.restoreBackup()).toMatchObject({ kind: 'ok', data: first })
  })

  it('skipBackup leaves the backup untouched', () => {
    const { storage, map, calls } = fakeStorage({}, { [STORAGE_KEY]: '{bad', [BACKUP_STORAGE_KEY]: 'GOOD' })
    const repo = createLocalStorageRepository(storage)
    expect(repo.save(seedData(NOW), NOW, { skipBackup: true })).toEqual({ kind: 'ok' })
    expect(map.get(BACKUP_STORAGE_KEY)).toBe('GOOD')
    expect(writes(calls)).toEqual([{ method: 'setItem', key: STORAGE_KEY, value: serializeEnvelope(seedData(NOW), NOW) }])
  })

  it('backup write that throws by quota does not prevent the main write (console.warn, result ok)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { storage, map } = fakeStorage(
      { setItem: (key) => (key === BACKUP_STORAGE_KEY ? quotaByName() : undefined) },
      { [STORAGE_KEY]: 'PREVIOUS', [BACKUP_STORAGE_KEY]: 'OLD' },
    )
    const repo = createLocalStorageRepository(storage)
    expect(repo.save(seedData(NOW), NOW)).toEqual({ kind: 'ok' })
    expect(map.get(STORAGE_KEY)).toBe(serializeEnvelope(seedData(NOW), NOW))
    expect(map.get(BACKUP_STORAGE_KEY)).toBe('OLD')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['name QuotaExceededError', quotaByName],
    ['code 22', quotaByCode22],
    ['code 1014', quotaByCode1014],
  ])('main write failing by quota (%s) → quota with bytesAttempted = length × 2', (_label, make) => {
    const { storage, map } = fakeStorage({ setItem: (key) => (key === STORAGE_KEY ? make() : undefined) }, { [STORAGE_KEY]: 'PREVIOUS' })
    const repo = createLocalStorageRepository(storage)
    const data = fixtureData()
    const result = repo.save(data, NOW)
    expect(result).toEqual({ kind: 'quota', bytesAttempted: serializeEnvelope(data, NOW).length * 2 })
    // The backup was still taken and the main key keeps the previous payload.
    expect(map.get(BACKUP_STORAGE_KEY)).toBe('PREVIOUS')
    expect(map.get(STORAGE_KEY)).toBe('PREVIOUS')
  })

  it('main write failing with SecurityError → unavailable', () => {
    const { storage } = fakeStorage({ setItem: securityError })
    expect(createLocalStorageRepository(storage).save(seedData(NOW), NOW)).toEqual({
      kind: 'unavailable',
      error: 'The operation is insecure.',
    })
  })

  it('getItem throwing during save → unavailable without any write', () => {
    const { storage, calls } = fakeStorage({ getItem: securityError })
    expect(createLocalStorageRepository(storage).save(seedData(NOW), NOW)).toMatchObject({ kind: 'unavailable' })
    expect(writes(calls)).toEqual([])
  })

  it('getItem throwing a quota-shaped error during save → quota', () => {
    const { storage } = fakeStorage({ getItem: quotaByName })
    expect(createLocalStorageRepository(storage).save(seedData(NOW), NOW)).toMatchObject({ kind: 'quota' })
  })
})

describe('error classification helpers', () => {
  it('isQuotaError recognizes name, code 22 and code 1014 only', () => {
    expect(isQuotaError(quotaByName())).toBe(true)
    expect(isQuotaError(quotaByCode22())).toBe(true)
    expect(isQuotaError(quotaByCode1014())).toBe(true)
    expect(isQuotaError(securityError())).toBe(false)
    expect(isQuotaError(new Error('x'))).toBe(false)
    expect(isQuotaError(null)).toBe(false)
    expect(isQuotaError('QuotaExceededError')).toBe(false)
    expect(isQuotaError({ code: 23 })).toBe(false)
  })

  it('classifySaveError maps quota and everything else', () => {
    expect(classifySaveError(quotaByName(), 10)).toEqual({ kind: 'quota', bytesAttempted: 10 })
    expect(classifySaveError(securityError(), 10)).toEqual({ kind: 'unavailable', error: 'The operation is insecure.' })
    expect(classifySaveError({ message: 'plain object' }, 0)).toEqual({ kind: 'unavailable', error: 'plain object' })
    expect(classifySaveError(42, 0)).toEqual({ kind: 'unavailable', error: '42' })
    expect(classifySaveError(undefined, 0)).toEqual({ kind: 'unavailable', error: 'undefined' })
  })
})

describe('restoreBackup', () => {
  it('empty when there is no backup', () => {
    expect(createLocalStorageRepository(window.localStorage).restoreBackup()).toEqual({ kind: 'empty' })
  })

  it('ok with the same validation as load, and never writes', () => {
    window.localStorage.setItem(STORAGE_KEY, '{bad')
    window.localStorage.setItem(BACKUP_STORAGE_KEY, fixtureRaw())
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const result = createLocalStorageRepository(window.localStorage).restoreBackup()
    expect(result).toMatchObject({ kind: 'ok', data: fixtureData(), migratedFrom: null })
    expect(setItem).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{bad')
  })

  it('corrupt (hasBackup false) when the backup is unreadable, newer when it is from the future', () => {
    window.localStorage.setItem(BACKUP_STORAGE_KEY, '{bad')
    const repo = createLocalStorageRepository(window.localStorage)
    expect(repo.restoreBackup()).toMatchObject({ kind: 'corrupt', raw: '{bad', hasBackup: false })
    window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify({ ...loadFixtureV1(), schemaVersion: 3 }))
    expect(repo.restoreBackup()).toMatchObject({ kind: 'newer', foundVersion: 3 })
  })

  it('unavailable when the storage throws', () => {
    const { storage } = fakeStorage({ getItem: securityError })
    expect(createLocalStorageRepository(storage).restoreBackup()).toMatchObject({ kind: 'unavailable' })
  })
})

describe('readRaw, estimateBytes, clear, exportJson, parseImport', () => {
  it('readRaw returns the raw main payload or null', () => {
    const repo = createLocalStorageRepository(window.localStorage)
    expect(repo.readRaw()).toBeNull()
    window.localStorage.setItem(STORAGE_KEY, '{bad')
    expect(repo.readRaw()).toBe('{bad')
    const { storage } = fakeStorage({ getItem: securityError })
    expect(createLocalStorageRepository(storage).readRaw()).toBeNull()
  })

  it('estimateBytes sums both keys at 2 bytes per code unit', () => {
    const repo = createLocalStorageRepository(window.localStorage)
    expect(repo.estimateBytes()).toBe(0)
    window.localStorage.setItem(STORAGE_KEY, 'abcd')
    expect(repo.estimateBytes()).toBe(8)
    window.localStorage.setItem(BACKUP_STORAGE_KEY, 'xyz')
    expect(repo.estimateBytes()).toBe(14)
    window.localStorage.setItem(PROBE_KEY, 'ignored')
    expect(repo.estimateBytes()).toBe(14)
    const { storage } = fakeStorage({ getItem: securityError })
    expect(createLocalStorageRepository(storage).estimateBytes()).toBe(0)
  })

  it('clear removes only the main key and keeps the backup', () => {
    window.localStorage.setItem(STORAGE_KEY, 'main')
    window.localStorage.setItem(BACKUP_STORAGE_KEY, 'backup')
    const repo = createLocalStorageRepository(window.localStorage)
    repo.clear()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(BACKUP_STORAGE_KEY)).toBe('backup')
    expect(repo.load()).toEqual({ kind: 'empty' })
    const { storage } = fakeStorage({ removeItem: securityError })
    expect(() => createLocalStorageRepository(storage).clear()).not.toThrow()
  })

  it('exportJson and parseImport delegate to jsonio', () => {
    const repo = createLocalStorageRepository(window.localStorage)
    const data = fixtureData()
    expect(repo.exportJson(data, NOW)).toBe(exportJson(data, NOW))
    const imported = repo.parseImport(repo.exportJson(data, NOW))
    expect(imported).toMatchObject({ kind: 'ok', data, preview: { transactions: 12, warnings: [] } })
    expect(repo.parseImport('{bad')).toMatchObject({ kind: 'invalid', error: 'invalid-json' })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('createMemoryRepository', () => {
  it('starts empty and round-trips a save', () => {
    const repo = createMemoryRepository()
    expect(repo.load()).toEqual({ kind: 'empty' })
    expect(repo.probeWrite()).toEqual({ kind: 'ok' })
    const data: AppData = fixtureData()
    expect(repo.save(data, NOW)).toEqual({ kind: 'ok' })
    expect(repo.load()).toMatchObject({ kind: 'ok', data })
    expect(repo.readRaw()).toBe(serializeEnvelope(data, NOW))
    expect(repo.entries.get(STORAGE_KEY)).toBe(serializeEnvelope(data, NOW))
    expect(repo.estimateBytes()).toBe(serializeEnvelope(data, NOW).length * 2)
  })

  it('accepts an initial raw payload (valid or garbage) and follows the same backup rules', () => {
    const good = createMemoryRepository(fixtureRaw())
    expect(good.load()).toMatchObject({ kind: 'ok', data: fixtureData() })
    good.save(seedData(NOW), NOW)
    expect(good.entries.get(BACKUP_STORAGE_KEY)).toBe(fixtureRaw())
    expect(good.restoreBackup()).toMatchObject({ kind: 'ok', data: fixtureData() })
    good.clear()
    expect(good.load()).toEqual({ kind: 'empty' })
    expect(good.entries.has(BACKUP_STORAGE_KEY)).toBe(true)

    const bad = createMemoryRepository('{bad')
    expect(bad.load()).toMatchObject({ kind: 'corrupt', raw: '{bad', hasBackup: false })
    expect(bad.restoreBackup()).toEqual({ kind: 'empty' })
  })

  it('createRepositoryOverStorage works over jsdom localStorage too', () => {
    const repo = createRepositoryOverStorage(window.localStorage)
    repo.save(seedData(NOW), NOW)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(serializeEnvelope(seedData(NOW), NOW))
  })
})
