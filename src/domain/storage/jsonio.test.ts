// ============================================================================
// src/domain/storage/jsonio.test.ts — §10.1 «storage/jsonio» row: exportJson
// shape, every ImportError (except too-large, decided by the UI), round-trip
// with warnings [] and preview counts/warnings under normalization.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { fixtureData, loadFixtureV1, tx } from '../../test/fixtures'
import { seedData } from '../seed'
import type { AppData } from '../types'
import { MAX_NOTE_LENGTH } from '../types'
import { buildEnvelope, decodeEnvelope, exportJson, isPersistedEnvelope, parseImport, serializeEnvelope } from './jsonio'
import { MIGRATIONS } from './migrations'
import type { ImportError, Migration } from './schema'
import { APP_TAG, SCHEMA_VERSION } from './schema'

const NOW = 1_783_900_800_000

describe('buildEnvelope / exportJson', () => {
  it('buildEnvelope tags the data with app, SCHEMA_VERSION and savedAt = now', () => {
    const data = fixtureData()
    const envelope = buildEnvelope(data, NOW)
    expect(envelope).toEqual({ app: APP_TAG, schemaVersion: SCHEMA_VERSION, savedAt: NOW, data })
    expect(envelope.data).toBe(data)
  })

  it('exportJson is the envelope pretty-printed with 2 spaces and savedAt === now', () => {
    const data = fixtureData()
    const json = exportJson(data, NOW)
    expect(json).toBe(JSON.stringify(buildEnvelope(data, NOW), null, 2))
    expect(json.startsWith('{\n  "app": "mis-finanzas",\n  "schemaVersion": 1,\n  "savedAt": 1783900800000,\n  "data": {')).toBe(true)
    const parsed = JSON.parse(json) as { savedAt: number; schemaVersion: number; data: unknown }
    expect(parsed.savedAt).toBe(NOW)
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.data).toEqual(data)
  })

  it('exportJson is deterministic for the same now', () => {
    expect(exportJson(fixtureData(), NOW)).toBe(exportJson(fixtureData(), NOW))
    expect(exportJson(fixtureData(), NOW)).not.toBe(exportJson(fixtureData(), NOW + 1))
  })

  it('serializeEnvelope is compact (no pretty-print) and equivalent', () => {
    const data = fixtureData()
    const compact = serializeEnvelope(data, NOW)
    expect(compact).not.toContain('\n')
    expect(JSON.parse(compact)).toEqual(JSON.parse(exportJson(data, NOW)))
    expect(compact.length).toBeLessThan(exportJson(data, NOW).length)
  })
})

describe('isPersistedEnvelope', () => {
  it('accepts the canonical fixture and a freshly built envelope', () => {
    expect(isPersistedEnvelope(loadFixtureV1())).toBe(true)
    expect(isPersistedEnvelope(buildEnvelope(seedData(NOW), NOW))).toBe(true)
  })

  it.each([
    ['null', null],
    ['array', []],
    ['string', 'mis-finanzas'],
    ['number', 1],
    ['empty object', {}],
    ['wrong app', { ...loadFixtureV1(), app: 'other-app' }],
    ['missing app', { schemaVersion: 1, savedAt: 1, data: {} }],
    ['schemaVersion 0', { ...loadFixtureV1(), schemaVersion: 0 }],
    ['schemaVersion 1.5', { ...loadFixtureV1(), schemaVersion: 1.5 }],
    ['schemaVersion "1"', { ...loadFixtureV1(), schemaVersion: '1' }],
    ['schemaVersion negative', { ...loadFixtureV1(), schemaVersion: -1 }],
    ['schemaVersion missing', { app: APP_TAG, savedAt: 1, data: {} }],
    ['data null', { ...loadFixtureV1(), data: null }],
    ['data array', { ...loadFixtureV1(), data: [] }],
    ['data string', { ...loadFixtureV1(), data: 'x' }],
    ['data missing', { app: APP_TAG, schemaVersion: 1, savedAt: 1 }],
  ])('rejects %s', (_label, value) => {
    expect(isPersistedEnvelope(value)).toBe(false)
  })

  it('accepts a future schemaVersion (the version check is a separate step)', () => {
    expect(isPersistedEnvelope({ ...loadFixtureV1(), schemaVersion: 99 })).toBe(true)
  })
})

describe('parseImport', () => {
  const expectError = (json: string, error: ImportError): string => {
    const result = parseImport(json)
    expect(result.kind).toBe('invalid')
    if (result.kind !== 'invalid') return ''
    expect(result.error).toBe(error)
    expect(typeof result.detail).toBe('string')
    expect(result.detail.length).toBeGreaterThan(0)
    return result.detail
  }

  it('invalid-json for truncated or non-JSON text', () => {
    expectError('{bad', 'invalid-json')
    expectError('', 'invalid-json')
    expectError('not json at all', 'invalid-json')
    expectError(exportJson(fixtureData(), NOW).slice(0, 200), 'invalid-json')
  })

  it('not-an-envelope for valid JSON that is not a Mis Finanzas envelope', () => {
    expectError('null', 'not-an-envelope')
    expectError('[]', 'not-an-envelope')
    expectError('"mis-finanzas"', 'not-an-envelope')
    expectError('{}', 'not-an-envelope')
    expectError(JSON.stringify({ ...loadFixtureV1(), app: 'otra-app' }), 'not-an-envelope')
    expectError(JSON.stringify({ ...loadFixtureV1(), data: 'x' }), 'not-an-envelope')
    expectError(JSON.stringify({ ...loadFixtureV1(), data: [] }), 'not-an-envelope')
    expectError(JSON.stringify({ ...loadFixtureV1(), schemaVersion: 0 }), 'not-an-envelope')
    expectError(JSON.stringify({ ...loadFixtureV1(), schemaVersion: 1.5 }), 'not-an-envelope')
    expectError(JSON.stringify({ ...loadFixtureV1(), schemaVersion: '1' }), 'not-an-envelope')
  })

  it('newer-version when schemaVersion > SCHEMA_VERSION, naming the version', () => {
    const detail = expectError(JSON.stringify({ ...loadFixtureV1(), schemaVersion: SCHEMA_VERSION + 1 }), 'newer-version')
    expect(detail).toContain(String(SCHEMA_VERSION + 1))
    expectError(JSON.stringify({ ...loadFixtureV1(), schemaVersion: 42 }), 'newer-version')
  })

  it('invalid-data when validateAppData rejects, carrying its English detail', () => {
    const base = loadFixtureV1()
    const data = base.data as AppData
    expect(expectError(JSON.stringify({ ...base, data: { ...data, transactions: 'nope' } }), 'invalid-data')).toContain(
      'transactions',
    )
    const floatAmount = { ...data, transactions: [{ ...data.transactions[0], amountCents: 12.5 }] }
    expectError(JSON.stringify({ ...base, data: floatAmount }), 'invalid-data')
    const stringAmount = { ...data, transactions: [{ ...data.transactions[0], amountCents: '1250' }] }
    expectError(JSON.stringify({ ...base, data: stringAmount }), 'invalid-data')
    const negativeAmount = { ...data, transactions: [{ ...data.transactions[0], amountCents: -3 }] }
    expectError(JSON.stringify({ ...base, data: negativeAmount }), 'invalid-data')
    const badDate = { ...data, transactions: [{ ...data.transactions[0], date: '2026-9-3' }] }
    expectError(JSON.stringify({ ...base, data: badDate }), 'invalid-data')
    const duplicated = { ...data, transactions: [data.transactions[0], data.transactions[0]] }
    expect(expectError(JSON.stringify({ ...base, data: duplicated }), 'invalid-data')).toContain('duplicate')
    expectError(JSON.stringify({ ...base, data: { transactions: [], categories: [] } }), 'invalid-data')
  })

  it('never returns too-large (the UI rejects > 10 MB files before reading them)', () => {
    const big = exportJson({ ...fixtureData(), transactions: [] }, NOW)
    expect(parseImport(big).kind).toBe('ok')
  })

  it('round-trips the fixture: deep-equal data, warnings [] and exact preview counts', () => {
    const data = fixtureData()
    const result = parseImport(exportJson(data, NOW))
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.data).toEqual(data)
    expect(result.data).not.toBe(data)
    expect(result.preview).toEqual({
      transactions: 12,
      categories: 15,
      budgets: 2,
      schemaVersion: 1,
      warnings: [],
    })
  })

  it('round-trips the seed and the raw v1.json file', () => {
    const seed = seedData(NOW)
    const fromSeed = parseImport(exportJson(seed, NOW))
    expect(fromSeed.kind).toBe('ok')
    if (fromSeed.kind !== 'ok') return
    expect(fromSeed.data).toEqual(seed)
    expect(fromSeed.preview).toMatchObject({ transactions: 0, categories: 15, budgets: 0, warnings: [] })

    const fromFile = parseImport(JSON.stringify(loadFixtureV1()))
    expect(fromFile.kind).toBe('ok')
    if (fromFile.kind !== 'ok') return
    expect(fromFile.data).toEqual(fixtureData())
  })

  it('a second export of the imported data is byte-identical to the first', () => {
    const first = exportJson(fixtureData(), NOW)
    const imported = parseImport(first)
    expect(imported.kind).toBe('ok')
    if (imported.kind !== 'ok') return
    expect(exportJson(imported.data, NOW)).toBe(first)
  })

  it('preview carries the normalization warnings and counts the normalized data', () => {
    const data = fixtureData()
    const longNote = 'x'.repeat(MAX_NOTE_LENGTH + 20)
    const orphan = tx({ id: 'orphan', categoryId: 'cat-does-not-exist' })
    const mismatched = tx({ id: 'mismatched', type: 'expense', categoryId: 'cat-nomina' })
    const verbose = tx({ id: 'verbose', note: longNote })
    const withProblems: AppData = {
      ...data,
      transactions: [...data.transactions, orphan, mismatched, verbose],
      budgets: [...data.budgets, { id: 'dup-total', categoryId: null, limitCents: 5 }],
      settings: { ...data.settings, currency: 'euros' },
    }
    const result = parseImport(exportJson(withProblems, NOW))
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.preview.transactions).toBe(15)
    expect(result.preview.categories).toBe(15)
    expect(result.preview.budgets).toBe(2)
    expect(result.preview.warnings.length).toBe(5)
    for (const warning of result.preview.warnings) expect(warning.length).toBeGreaterThan(0)
    const byId = new Map(result.data.transactions.map((t) => [t.id, t]))
    expect(byId.get('orphan')?.categoryId).toBe('cat-otros-gastos')
    expect(byId.get('mismatched')?.categoryId).toBe('cat-otros-gastos')
    expect(byId.get('verbose')?.note.length).toBe(MAX_NOTE_LENGTH)
    expect(result.data.settings.currency).toBe('EUR')
    expect(result.data.budgets.map((b) => b.id)).toEqual(['b-ocio', 'b-total'])
  })
})

describe('decodeEnvelope', () => {
  it('reports the original schemaVersion and migratedFrom null at the current version', () => {
    const decoded = decodeEnvelope(JSON.stringify(loadFixtureV1()))
    expect(decoded.kind).toBe('ok')
    if (decoded.kind !== 'ok') return
    expect(decoded.schemaVersion).toBe(1)
    expect(decoded.migratedFrom).toBeNull()
    expect(decoded.warnings).toEqual([])
    expect(decoded.data).toEqual(fixtureData())
  })

  it('maps each failure to its kind', () => {
    expect(decodeEnvelope('{').kind).toBe('invalid-json')
    expect(decodeEnvelope('{}').kind).toBe('not-an-envelope')
    expect(decodeEnvelope(JSON.stringify({ ...loadFixtureV1(), schemaVersion: 7 }))).toEqual({
      kind: 'newer-version',
      foundVersion: 7,
    })
    expect(decodeEnvelope(JSON.stringify({ ...loadFixtureV1(), data: { transactions: [] } })).kind).toBe('invalid-data')
  })

  it('uses the registered MIGRATIONS by default (no-op at the current version)', () => {
    expect(decodeEnvelope(JSON.stringify(loadFixtureV1()), { migrations: MIGRATIONS })).toMatchObject({
      kind: 'ok',
      migratedFrom: null,
    })
  })

  it('maps a failing migration chain to invalid-data (§5.2 step 5: missing step or throwing step)', () => {
    const json = JSON.stringify(loadFixtureV1()) // schemaVersion 1
    // Missing step: the chain has to reach 2 but no migration starts at 1.
    const missing = decodeEnvelope(json, { migrations: [], target: 2 })
    expect(missing).toEqual({ kind: 'invalid-data', detail: 'no migration from version 1' })

    // Throwing step: the step from 1 to 2 blows up.
    const boom: Migration = {
      from: 1,
      to: 2,
      migrate: () => {
        throw new Error('boom')
      },
    }
    const thrown = decodeEnvelope(json, { migrations: [boom], target: 2 })
    expect(thrown.kind).toBe('invalid-data')
    if (thrown.kind !== 'invalid-data') return
    expect(thrown.detail).toBe('migration 1 → 2 threw: boom')

    // A step that does not land on `to` is also a failure.
    const wrongTarget: Migration = { from: 1, to: 2, migrate: (raw) => raw }
    expect(decodeEnvelope(json, { migrations: [wrongTarget], target: 2 })).toEqual({
      kind: 'invalid-data',
      detail: 'migration 1 → 2 did not return an envelope at version 2',
    })

    // A step that works is applied before validation and reported as migratedFrom.
    const good: Migration = { from: 1, to: 2, migrate: (raw) => ({ ...raw, schemaVersion: 2 }) }
    expect(decodeEnvelope(json, { migrations: [good], target: 2 })).toMatchObject({
      kind: 'ok',
      migratedFrom: 1,
      schemaVersion: 1,
      data: fixtureData(),
    })
  })

  it('keeps the newer mapping total when the runner is driven below the envelope version', () => {
    // Unreachable with the default target (checked before migrating); an injected lower target exercises it.
    expect(decodeEnvelope(JSON.stringify(loadFixtureV1()), { migrations: [], target: 0 })).toEqual({
      kind: 'invalid-data',
      detail: 'schema version 1 is newer than 0',
    })
  })
})
