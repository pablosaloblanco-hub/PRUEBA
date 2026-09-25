// ============================================================================
// src/domain/storage/store.test.ts — §10.1 «storage/store» row: seeding, the
// reduce → save → notify order (exactly one save per accepted action, with
// deps.now()), rejected/no-op actions, stable snapshots, save failures,
// migrated re-save, readonly on corrupt/newer/unavailable, recovery that never
// touches the backup, and reloadFromStorage.
// ============================================================================
import { describe, expect, it, vi } from 'vitest'
import { fixtureData, loadFixtureV1 } from '../../test/fixtures'
import type { Action } from '../actions'
import { seedData } from '../seed'
import type { AppData } from '../types'
import { serializeEnvelope } from './jsonio'
import { createLocalStorageRepository } from './localStorageRepository'
import { createMemoryRepository } from './memoryRepository'
import type { LoadResult, SaveResult, StorageRepository } from './schema'
import { BACKUP_STORAGE_KEY, STORAGE_KEY } from './schema'
import { createStore } from './store'

const NOW = 1_783_900_800_000
const TODAY = '2026-09-25'
const deps = { now: () => NOW, today: () => TODAY }

const addTx = (id: string, now = NOW): Action => ({
  type: 'transaction/add',
  id,
  input: { type: 'expense', amountCents: 1250, date: '2026-09-25', categoryId: 'cat-alimentacion', note: 'Café' },
  now,
})
/** Rejected by the reducer: `cat-nomina` is an income category. */
const rejectedTx: Action = {
  type: 'transaction/add',
  id: 'bad',
  input: { type: 'expense', amountCents: 1250, date: '2026-09-25', categoryId: 'cat-nomina', note: '' },
  now: NOW,
}
/** A no-op: removing a budget that does not exist returns the same state reference. */
const noopAction: Action = { type: 'budget/remove', id: 'does-not-exist' }

const fixtureRaw = (): string => JSON.stringify(loadFixtureV1())

/** Wraps a repo with spies on save/probeWrite/restoreBackup and optional overrides. */
function spyRepo(base: StorageRepository, overrides: Partial<StorageRepository> = {}) {
  const repo: StorageRepository = { ...base, ...overrides }
  const save = vi.spyOn(repo, 'save')
  const probeWrite = vi.spyOn(repo, 'probeWrite')
  const restoreBackup = vi.spyOn(repo, 'restoreBackup')
  return { repo, save, probeWrite, restoreBackup }
}

describe('startup', () => {
  it('empty storage → seeds and saves once, mode normal', () => {
    const memory = createMemoryRepository()
    const { repo, save, probeWrite } = spyRepo(memory)
    const store = createStore(repo, deps)
    expect(store.getSnapshot()).toEqual(seedData(NOW))
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(store.getSnapshot(), NOW, undefined)
    expect(probeWrite).toHaveBeenCalledTimes(1)
    expect(memory.load()).toMatchObject({ kind: 'ok', data: seedData(NOW) })
    expect(memory.entries.has(BACKUP_STORAGE_KEY)).toBe(false)
    expect(store.getPersistence()).toEqual({
      error: null,
      load: { kind: 'empty' },
      lastSavedAt: NOW,
      mode: 'normal',
      backupUnreadable: false,
    })
  })

  it('ok load → snapshot is the stored data, no save, probe called after load', () => {
    const memory = createMemoryRepository(fixtureRaw())
    const order: string[] = []
    const { repo, save } = spyRepo(memory, {
      load: () => {
        order.push('load')
        return memory.load()
      },
      probeWrite: () => {
        order.push('probe')
        return memory.probeWrite()
      },
    })
    const store = createStore(repo, deps)
    expect(store.getSnapshot()).toEqual(fixtureData())
    expect(save).not.toHaveBeenCalled()
    expect(order).toEqual(['load', 'probe'])
    expect(store.getPersistence()).toMatchObject({ mode: 'normal', error: null, lastSavedAt: null })
    expect(store.getPersistence().load).toMatchObject({ kind: 'ok', migratedFrom: null })
  })

  it('migrated load → re-saves immediately, moving the ORIGINAL payload to the backup', () => {
    const memory = createMemoryRepository('ORIGINAL-PRE-MIGRATION')
    const migratedLoad: LoadResult = { kind: 'ok', data: fixtureData(), migratedFrom: 0 }
    const { repo, save } = spyRepo(memory, { load: () => migratedLoad })
    const store = createStore(repo, deps)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(migratedLoad.data, NOW, undefined)
    expect(memory.entries.get(BACKUP_STORAGE_KEY)).toBe('ORIGINAL-PRE-MIGRATION')
    expect(memory.entries.get(STORAGE_KEY)).toBe(serializeEnvelope(fixtureData(), NOW))
    expect(store.getPersistence()).toMatchObject({ mode: 'normal', lastSavedAt: NOW, error: null })
    expect(store.getPersistence().load).toMatchObject({ kind: 'ok', migratedFrom: 0 })
  })

  it('corrupt load → readonly with seedData in memory, probed once and nothing written', () => {
    const memory = createMemoryRepository('{bad')
    const { repo, save, probeWrite } = spyRepo(memory)
    const store = createStore(repo, deps)
    expect(store.getSnapshot()).toEqual(seedData(NOW))
    expect(save).not.toHaveBeenCalled()
    expect(probeWrite).toHaveBeenCalledTimes(1)
    expect(store.getPersistence()).toMatchObject({ mode: 'readonly', error: null, backupUnreadable: false })
    expect(store.getPersistence().load).toMatchObject({ kind: 'corrupt', raw: '{bad', hasBackup: false })
    expect(memory.entries.get(STORAGE_KEY)).toBe('{bad')
    expect(memory.entries.has('mis-finanzas:probe')).toBe(false)
  })

  it('newer load → readonly with seedData in memory, probed once and nothing written', () => {
    const raw = JSON.stringify({ ...loadFixtureV1(), schemaVersion: 2 })
    const memory = createMemoryRepository(raw)
    const { repo, save, probeWrite } = spyRepo(memory)
    const store = createStore(repo, deps)
    expect(store.getSnapshot()).toEqual(seedData(NOW))
    expect(save).not.toHaveBeenCalled()
    expect(probeWrite).toHaveBeenCalledTimes(1)
    expect(store.getPersistence().mode).toBe('readonly')
    expect(store.getPersistence().load).toEqual({ kind: 'newer', raw, foundVersion: 2 })
    expect(memory.entries.get(STORAGE_KEY)).toBe(raw)
  })

  it('unavailable load (no localStorage) → readonly; the probe runs after load (§5.6) but never saves', () => {
    const { repo, save, probeWrite } = spyRepo(createLocalStorageRepository(undefined))
    const store = createStore(repo, deps)
    expect(store.getSnapshot()).toEqual(seedData(NOW))
    expect(save).not.toHaveBeenCalled()
    expect(probeWrite).toHaveBeenCalledTimes(1)
    expect(probeWrite).toHaveReturnedWith(expect.objectContaining({ kind: 'unavailable' }))
    expect(store.getPersistence().mode).toBe('readonly')
    expect(store.getPersistence().load).toMatchObject({ kind: 'unavailable' })
  })

  it('always calls load() and then probeWrite(), in that order, whatever the load says (§5.6)', () => {
    const inputs: [string, string | undefined][] = [
      ['empty', undefined],
      ['ok', fixtureRaw()],
      ['corrupt', '{bad'],
      ['newer', JSON.stringify({ ...loadFixtureV1(), schemaVersion: 9 })],
    ]
    for (const [kind, initial] of inputs) {
      const memory = createMemoryRepository(initial)
      const calls: string[] = []
      const repo: StorageRepository = {
        ...memory,
        load: () => {
          calls.push('load')
          return memory.load()
        },
        probeWrite: () => {
          calls.push('probe')
          return memory.probeWrite()
        },
        save: (data, now, opts) => {
          calls.push('save')
          return memory.save(data, now, opts)
        },
      }
      const store = createStore(repo, deps)
      expect(store.getPersistence().load?.kind, kind).toBe(kind)
      expect(calls.slice(0, 2), kind).toEqual(['load', 'probe'])
      expect(calls.includes('save'), kind).toBe(kind === 'empty')
    }
  })

  it('a quota or unavailable probe after a corrupt/newer load leaves the readonly store untouched', () => {
    const quota: SaveResult = { kind: 'quota', bytesAttempted: 0 }
    const unavailable: SaveResult = { kind: 'unavailable', error: 'probe failed' }
    for (const probe of [quota, unavailable]) {
      const corruptStore = createStore(spyRepo(createMemoryRepository('{bad'), { probeWrite: () => probe }).repo, deps)
      expect(corruptStore.getPersistence()).toMatchObject({ mode: 'readonly', error: null })
      expect(corruptStore.getPersistence().load).toMatchObject({ kind: 'corrupt', raw: '{bad' })

      const newerRaw = JSON.stringify({ ...loadFixtureV1(), schemaVersion: 2 })
      const newerStore = createStore(spyRepo(createMemoryRepository(newerRaw), { probeWrite: () => probe }).repo, deps)
      expect(newerStore.getPersistence()).toMatchObject({ mode: 'readonly', error: null })
      expect(newerStore.getPersistence().load).toEqual({ kind: 'newer', raw: newerRaw, foundVersion: 2 })
    }
  })

  it('probe unavailable → treated as an unavailable load: readonly, data still read', () => {
    const memory = createMemoryRepository(fixtureRaw())
    const probe: SaveResult = { kind: 'unavailable', error: 'probe failed' }
    const { repo, save } = spyRepo(memory, { probeWrite: () => probe })
    const store = createStore(repo, deps)
    expect(store.getSnapshot()).toEqual(fixtureData())
    expect(store.getPersistence().mode).toBe('readonly')
    expect(store.getPersistence().load).toEqual({ kind: 'unavailable', error: 'probe failed' })
    expect(store.getPersistence().error).toBeNull()
    store.dispatch(addTx('a'))
    expect(save).not.toHaveBeenCalled()
  })

  it('probe quota → normal with persistence.error = quota; the next successful save clears it', () => {
    const memory = createMemoryRepository(fixtureRaw())
    const quota: SaveResult = { kind: 'quota', bytesAttempted: 0 }
    const { repo, save } = spyRepo(memory, { probeWrite: () => quota })
    const store = createStore(repo, deps)
    expect(store.getPersistence()).toMatchObject({ mode: 'normal', error: quota })
    expect(store.getPersistence().load).toMatchObject({ kind: 'ok' })
    store.dispatch(addTx('a'))
    expect(save).toHaveBeenCalledTimes(1)
    expect(store.getPersistence().error).toBeNull()
  })

  it('loadOverride keeps the original unavailable LoadResult on the memory fallback store', () => {
    const original: LoadResult = { kind: 'unavailable', error: 'SecurityError' }
    const memory = createMemoryRepository()
    const store = createStore(memory, deps, { loadOverride: original })
    expect(store.getPersistence().mode).toBe('normal')
    expect(store.getPersistence().load).toBe(original)
    expect(memory.load()).toMatchObject({ kind: 'ok' })
    expect(store.dispatch(addTx('a')).ok).toBe(true)
    expect(memory.load()).toMatchObject({ kind: 'ok', data: store.getSnapshot() })
  })
})

describe('dispatch', () => {
  it('accepted action: reduce → save once (with deps.now()) → notify, in that order', () => {
    const memory = createMemoryRepository(fixtureRaw())
    const events: string[] = []
    const { repo, save } = spyRepo(memory, {
      save: (data, now, opts) => {
        events.push('save')
        return memory.save(data, now, opts)
      },
    })
    const clock = vi.fn(() => NOW + 5)
    const store = createStore(repo, { now: clock, today: () => TODAY })
    const listener = vi.fn(() => events.push('notify'))
    store.subscribe(listener)
    const before = store.getSnapshot()

    const result = store.dispatch(addTx('new-1'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(events).toEqual(['save', 'notify'])
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(result.value, NOW + 5, undefined)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).toBe(result.value)
    expect(store.getSnapshot()).not.toBe(before)
    expect(store.getSnapshot().transactions).toHaveLength(13)
    expect(store.getPersistence()).toMatchObject({ error: null, lastSavedAt: NOW + 5, mode: 'normal' })
    expect(memory.load()).toMatchObject({ kind: 'ok', data: result.value })
    // The normal sequence moved the previous payload to the backup.
    expect(memory.entries.get(BACKUP_STORAGE_KEY)).toBe(fixtureRaw())
  })

  it('saves exactly once per action even with several subscribers (StrictMode double subscribe)', () => {
    const { repo, save } = spyRepo(createMemoryRepository(fixtureRaw()))
    const store = createStore(repo, deps)
    const a = vi.fn()
    const b = vi.fn()
    store.subscribe(a)
    store.subscribe(b)
    store.dispatch(addTx('x'))
    store.dispatch(addTx('y'))
    expect(save).toHaveBeenCalledTimes(2)
    expect(a).toHaveBeenCalledTimes(2)
    expect(b).toHaveBeenCalledTimes(2)
  })

  it('rejected action: returns the error, no save, no notify, same snapshot', () => {
    const { repo, save } = spyRepo(createMemoryRepository(fixtureRaw()))
    const store = createStore(repo, deps)
    const listener = vi.fn()
    store.subscribe(listener)
    const before = store.getSnapshot()
    const persistenceBefore = store.getPersistence()
    const result = store.dispatch(rejectedTx)
    expect(result).toEqual({ ok: false, error: 'category-type-mismatch' })
    expect(save).not.toHaveBeenCalled()
    expect(listener).not.toHaveBeenCalled()
    expect(store.getSnapshot()).toBe(before)
    expect(store.getPersistence()).toBe(persistenceBefore)
  })

  it('no-op action (same state reference): ok, no save, no notify', () => {
    const { repo, save } = spyRepo(createMemoryRepository(fixtureRaw()))
    const store = createStore(repo, deps)
    const listener = vi.fn()
    store.subscribe(listener)
    const before = store.getSnapshot()
    const result = store.dispatch(noopAction)
    expect(result).toEqual({ ok: true, value: before })
    expect(save).not.toHaveBeenCalled()
    expect(listener).not.toHaveBeenCalled()
    expect(store.getSnapshot()).toBe(before)
  })

  it('getSnapshot and getPersistence return the same references across 100 calls without dispatch', () => {
    const store = createStore(createMemoryRepository(fixtureRaw()), deps)
    const snapshot = store.getSnapshot()
    const persistence = store.getPersistence()
    for (let i = 0; i < 100; i++) {
      expect(store.getSnapshot()).toBe(snapshot)
      expect(store.getPersistence()).toBe(persistence)
    }
    store.dispatch(rejectedTx)
    store.dispatch(noopAction)
    expect(store.getSnapshot()).toBe(snapshot)
  })

  it('unsubscribe stops notifications', () => {
    const store = createStore(createMemoryRepository(fixtureRaw()), deps)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.dispatch(addTx('a'))
    unsubscribe()
    store.dispatch(addTx('b'))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('save failure keeps the new state, notifies and sets persistence.error; a later success clears it', () => {
    const memory = createMemoryRepository(fixtureRaw())
    let fail: SaveResult | null = { kind: 'quota', bytesAttempted: 1234 }
    const { repo } = spyRepo(memory, { save: (data, now, opts) => fail ?? memory.save(data, now, opts) })
    let tick = NOW
    const store = createStore(repo, { now: () => ++tick, today: () => TODAY })
    const listener = vi.fn()
    store.subscribe(listener)

    const first = store.dispatch(addTx('a'))
    expect(first.ok).toBe(true)
    expect(store.getSnapshot().transactions).toHaveLength(13)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getPersistence().error).toEqual({ kind: 'quota', bytesAttempted: 1234 })
    expect(store.getPersistence().lastSavedAt).toBeNull()
    expect(store.getPersistence().mode).toBe('normal')
    expect(memory.load()).toMatchObject({ kind: 'ok', data: fixtureData() })

    fail = { kind: 'unavailable', error: 'broken' }
    store.dispatch(addTx('b'))
    expect(store.getPersistence().error).toEqual({ kind: 'unavailable', error: 'broken' })
    expect(store.getSnapshot().transactions).toHaveLength(14)

    fail = null
    store.dispatch(addTx('c'))
    expect(store.getPersistence().error).toBeNull()
    expect(store.getPersistence().lastSavedAt).toBe(tick)
    expect(store.getSnapshot().transactions).toHaveLength(15)
    expect(memory.load()).toMatchObject({ kind: 'ok', data: store.getSnapshot() })
  })

  it('in readonly mode dispatch reduces and notifies but never saves', () => {
    const memory = createMemoryRepository('{bad')
    const { repo, save } = spyRepo(memory)
    const store = createStore(repo, deps)
    const listener = vi.fn()
    store.subscribe(listener)
    const result = store.dispatch(addTx('a'))
    expect(result.ok).toBe(true)
    expect(store.getSnapshot().transactions).toHaveLength(1)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(save).not.toHaveBeenCalled()
    expect(store.getPersistence().mode).toBe('readonly')
    expect(memory.entries.get(STORAGE_KEY)).toBe('{bad')
    expect(store.dispatch(rejectedTx).ok).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('data/reset in normal mode follows the normal save sequence: previous state goes to the backup', () => {
    const memory = createMemoryRepository(fixtureRaw())
    const store = createStore(memory, deps)
    store.dispatch({ type: 'data/reset', now: NOW })
    expect(store.getSnapshot()).toEqual(seedData(NOW))
    expect(memory.entries.get(BACKUP_STORAGE_KEY)).toBe(fixtureRaw())
    expect(memory.entries.get(STORAGE_KEY)).toBe(serializeEnvelope(seedData(NOW), NOW))
  })

  it('data/replace persists the imported data', () => {
    const memory = createMemoryRepository()
    const store = createStore(memory, deps)
    const imported: AppData = fixtureData()
    expect(store.dispatch({ type: 'data/replace', data: imported }).ok).toBe(true)
    expect(store.getSnapshot()).toBe(imported)
    expect(memory.load()).toMatchObject({ kind: 'ok', data: imported })
  })
})

describe('recover', () => {
  /** The real corrupt layout: garbage under the main key, the last good copy under the backup key. */
  const corruptWithBackup = () => {
    const good = serializeEnvelope(fixtureData(), NOW - 1)
    const memory = memoryFrom(
      new Map([
        [STORAGE_KEY, '{bad'],
        [BACKUP_STORAGE_KEY, good],
      ]),
    )
    return { memory, good }
  }

  /** A memory repository pre-populated with several keys. */
  function memoryFrom(entries: Map<string, string>) {
    const repo = createMemoryRepository()
    // `entries` is the live backing map of the repository.
    const live = repo.entries as Map<string, string>
    for (const [k, v] of entries) live.set(k, v)
    return repo
  }

  it("restore-backup with a readable backup: snapshot = backup, save with skipBackup, backup untouched, mode normal", () => {
    const { memory, good } = corruptWithBackup()
    const { repo, save, restoreBackup } = spyRepo(memory)
    const store = createStore(repo, deps)
    expect(store.getPersistence().load).toMatchObject({ kind: 'corrupt', hasBackup: true })
    expect(store.getPersistence().mode).toBe('readonly')
    const listener = vi.fn()
    store.subscribe(listener)

    store.recover('restore-backup')
    expect(restoreBackup).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).toEqual(fixtureData())
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(store.getSnapshot(), NOW, { skipBackup: true })
    expect(memory.entries.get(BACKUP_STORAGE_KEY)).toBe(good)
    expect(memory.entries.get(STORAGE_KEY)).toBe(serializeEnvelope(fixtureData(), NOW))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getPersistence()).toMatchObject({ mode: 'normal', backupUnreadable: false, error: null, lastSavedAt: NOW })
    expect(store.getPersistence().load).toMatchObject({ kind: 'ok', migratedFrom: null })

    // Back to normal: later dispatches persist with the normal sequence.
    store.dispatch(addTx('after'))
    expect(save).toHaveBeenCalledTimes(2)
    expect(memory.load()).toMatchObject({ kind: 'ok', data: store.getSnapshot() })
  })

  it('reset: snapshot = seedData, save with skipBackup, backup untouched, mode normal', () => {
    const { memory, good } = corruptWithBackup()
    const { repo, save } = spyRepo(memory)
    const store = createStore(repo, deps)
    const listener = vi.fn()
    store.subscribe(listener)
    store.recover('reset')
    expect(store.getSnapshot()).toEqual(seedData(NOW))
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(store.getSnapshot(), NOW, { skipBackup: true })
    expect(memory.entries.get(BACKUP_STORAGE_KEY)).toBe(good)
    expect(memory.entries.get(STORAGE_KEY)).toBe(serializeEnvelope(seedData(NOW), NOW))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getPersistence()).toMatchObject({ mode: 'normal', backupUnreadable: false })
  })

  it('reset from a newer payload also keeps the backup intact', () => {
    const memory = memoryFrom(
      new Map([
        [STORAGE_KEY, JSON.stringify({ ...loadFixtureV1(), schemaVersion: 5 })],
        [BACKUP_STORAGE_KEY, 'KEEP-ME'],
      ]),
    )
    const store = createStore(memory, deps)
    expect(store.getPersistence().load?.kind).toBe('newer')
    store.recover('reset')
    expect(memory.entries.get(BACKUP_STORAGE_KEY)).toBe('KEEP-ME')
    expect(store.getPersistence().mode).toBe('normal')
  })

  it.each([
    ['garbage backup', '{bad'],
    ['newer backup', JSON.stringify({ ...loadFixtureV1(), schemaVersion: 9 })],
    ['invalid data in backup', JSON.stringify({ ...loadFixtureV1(), data: { transactions: 1 } })],
  ])('restore-backup with an unreadable backup (%s) stays readonly, sets backupUnreadable and saves nothing', (_label, backup) => {
    const memory = memoryFrom(
      new Map([
        [STORAGE_KEY, '{bad'],
        [BACKUP_STORAGE_KEY, backup],
      ]),
    )
    const { repo, save } = spyRepo(memory)
    const store = createStore(repo, deps)
    const listener = vi.fn()
    store.subscribe(listener)
    store.recover('restore-backup')
    expect(store.getSnapshot()).toEqual(seedData(NOW))
    expect(save).not.toHaveBeenCalled()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getPersistence()).toMatchObject({ mode: 'readonly', backupUnreadable: true })
    expect(store.getPersistence().load).toMatchObject({ kind: 'corrupt' })
    expect(memory.entries.get(STORAGE_KEY)).toBe('{bad')
    expect(memory.entries.get(BACKUP_STORAGE_KEY)).toBe(backup)
    // Reset still works afterwards and clears the flag.
    store.recover('reset')
    expect(store.getPersistence()).toMatchObject({ mode: 'normal', backupUnreadable: false })
    expect(memory.entries.get(BACKUP_STORAGE_KEY)).toBe(backup)
  })

  it('restore-backup with no backup at all is also unreadable', () => {
    const memory = createMemoryRepository('{bad')
    const store = createStore(memory, deps)
    store.recover('restore-backup')
    expect(store.getPersistence()).toMatchObject({ mode: 'readonly', backupUnreadable: true })
  })

  it('a save failure during recover keeps the restored state and exposes the error', () => {
    const { memory } = corruptWithBackup()
    const { repo } = spyRepo(memory, { save: () => ({ kind: 'quota', bytesAttempted: 7 }) })
    const store = createStore(repo, deps)
    store.recover('restore-backup')
    expect(store.getSnapshot()).toEqual(fixtureData())
    expect(store.getPersistence()).toMatchObject({ mode: 'normal', error: { kind: 'quota', bytesAttempted: 7 } })
  })
})

describe('reloadFromStorage', () => {
  it('re-reads the repository, replaces the snapshot and notifies', () => {
    const memory = createMemoryRepository(fixtureRaw())
    const store = createStore(memory, deps)
    const listener = vi.fn()
    store.subscribe(listener)
    const before = store.getSnapshot()
    // Another tab wrote a different payload.
    memory.save(seedData(NOW), NOW + 1)
    store.reloadFromStorage()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).not.toBe(before)
    expect(store.getSnapshot()).toEqual(seedData(NOW))
    expect(store.getPersistence()).toMatchObject({ mode: 'normal', error: null })
  })

  it('switches to readonly when the storage became corrupt, and back when it is fixed', () => {
    const memory = createMemoryRepository(fixtureRaw())
    const { repo, save } = spyRepo(memory)
    const store = createStore(repo, deps)
    ;(memory.entries as Map<string, string>).set(STORAGE_KEY, '{bad')
    store.reloadFromStorage()
    expect(store.getPersistence().mode).toBe('readonly')
    expect(store.getPersistence().load).toMatchObject({ kind: 'corrupt' })
    expect(store.getSnapshot()).toEqual(seedData(NOW))
    ;(memory.entries as Map<string, string>).set(STORAGE_KEY, fixtureRaw())
    store.reloadFromStorage()
    expect(store.getPersistence().mode).toBe('normal')
    expect(store.getSnapshot()).toEqual(fixtureData())
    expect(save).not.toHaveBeenCalled()
  })

  it('seeds and saves again when the storage was cleared', () => {
    const memory = createMemoryRepository(fixtureRaw())
    const store = createStore(memory, deps)
    memory.clear()
    store.reloadFromStorage()
    expect(store.getSnapshot()).toEqual(seedData(NOW))
    expect(store.getPersistence().load).toEqual({ kind: 'empty' })
    expect(memory.load()).toMatchObject({ kind: 'ok', data: seedData(NOW) })
  })
})
