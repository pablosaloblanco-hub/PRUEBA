// ============================================================================
// src/domain/storage/migrations.test.ts — §10.1 «storage/migrations» row:
// synthetic 0→1→2 chain, missing/throwing steps, newer versions, contiguity
// of MIGRATIONS, bad schemaVersion values and every __fixtures__/v*.json.
// ============================================================================
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fixtureData, loadFixtureV1 } from '../../test/fixtures'
import { validateAppData } from '../validate'
import { decodeEnvelope, isPersistedEnvelope, parseImport } from './jsonio'
import { MIGRATIONS, findChainGap, isContiguousChain, runMigrations } from './migrations'
import { createMemoryRepository } from './memoryRepository'
import type { Migration, PersistedEnvelope } from './schema'
import { APP_TAG, SCHEMA_VERSION } from './schema'

type Rec = Record<string, unknown>

/** A v0 envelope: v0 had no `budgets` and stored `settings.currency` as `money`. */
function v0Envelope(): PersistedEnvelope {
  const data = fixtureData() as unknown as Rec
  const { budgets: _budgets, settings, ...rest } = data
  const { currency, ...otherSettings } = settings as Rec
  return {
    app: APP_TAG,
    schemaVersion: 0,
    savedAt: 1,
    data: { ...rest, settings: { ...otherSettings, money: currency } },
  }
}

const step0to1: Migration = {
  from: 0,
  to: 1,
  migrate: (raw) => {
    const data = raw.data as Rec
    const settings = data.settings as Rec
    const { money, ...otherSettings } = settings
    return {
      ...raw,
      schemaVersion: 1,
      data: { ...data, budgets: [], settings: { ...otherSettings, currency: money } },
    }
  },
}

/** The documented v2 example (§5.4): `archived: false` on categories and `recurringRules: []`. */
const step1to2: Migration = {
  from: 1,
  to: 2,
  migrate: (raw) => {
    const data = raw.data as Rec
    const categories = (data.categories as Rec[]).map((c) => ({ ...c, archived: false }))
    return { ...raw, schemaVersion: 2, data: { ...data, categories, recurringRules: [] } }
  },
}

const chain: readonly Migration[] = [step0to1, step1to2]

describe('runMigrations with a synthetic 0→1→2 chain', () => {
  it('walks every step in order and reports migratedFrom', () => {
    const result = runMigrations(v0Envelope(), chain, 2)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.migratedFrom).toBe(0)
    expect(result.value.envelope.schemaVersion).toBe(2)
    const data = result.value.envelope.data as Rec
    expect(data.budgets).toEqual([])
    expect(data.recurringRules).toEqual([])
    expect((data.settings as Rec).currency).toBe('EUR')
    expect((data.settings as Rec).money).toBeUndefined()
    for (const c of data.categories as Rec[]) expect(c.archived).toBe(false)
  })

  it('stops at an intermediate target', () => {
    const result = runMigrations(v0Envelope(), chain, 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.envelope.schemaVersion).toBe(1)
    expect(result.value.migratedFrom).toBe(0)
    // The 0→1 output is a valid v1 payload.
    expect(validateAppData(result.value.envelope.data).ok).toBe(true)
  })

  it('returns the same envelope and migratedFrom null when already at target', () => {
    const envelope = loadFixtureV1() as PersistedEnvelope
    const result = runMigrations(envelope, chain, 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.envelope).toBe(envelope)
    expect(result.value.migratedFrom).toBeNull()
  })

  it('does not mutate the input envelope', () => {
    const envelope = v0Envelope()
    const before = JSON.stringify(envelope)
    runMigrations(envelope, chain, 2)
    expect(JSON.stringify(envelope)).toBe(before)
  })

  it('fails with missing-step when a step is absent', () => {
    const result = runMigrations(v0Envelope(), [step0to1], 2)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatchObject({ kind: 'missing-step', from: 1 })
    expect(result.error.kind === 'missing-step' && result.error.detail).toContain('1')
  })

  it('fails with missing-step when the chain is empty (default MIGRATIONS) and the version is older', () => {
    const result = runMigrations(v0Envelope())
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('missing-step')
  })

  it('fails with failed when a step throws mid-chain', () => {
    const throwing: Migration = {
      from: 1,
      to: 2,
      migrate: () => {
        throw new Error('boom')
      },
    }
    const result = runMigrations(v0Envelope(), [step0to1, throwing], 2)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatchObject({ kind: 'failed', from: 1 })
    expect(result.error.kind === 'failed' && result.error.detail).toContain('boom')
  })

  it('fails with failed when a step throws a non-Error value', () => {
    const throwing: Migration = {
      from: 0,
      to: 1,
      migrate: () => {
        throw 'plain string'
      },
    }
    const result = runMigrations(v0Envelope(), [throwing], 1)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind === 'failed' && result.error.detail).toContain('plain string')
  })

  it('fails with failed when a step returns an envelope at the wrong version', () => {
    const lying: Migration = { from: 0, to: 1, migrate: (raw) => ({ ...raw, schemaVersion: 5 }) }
    const result = runMigrations(v0Envelope(), [lying], 1)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatchObject({ kind: 'failed', from: 0 })
  })

  it('fails with failed when a step returns something that is not an envelope', () => {
    const broken: Migration = { from: 0, to: 1, migrate: () => null as unknown as PersistedEnvelope }
    const result = runMigrations(v0Envelope(), [broken], 1)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('failed')
  })

  it('returns newer when the envelope version is above the target', () => {
    const envelope: PersistedEnvelope = { ...(loadFixtureV1() as PersistedEnvelope), schemaVersion: 3 }
    const result = runMigrations(envelope, chain, 2)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'newer', foundVersion: 3 })
  })
})

describe('MIGRATIONS registry', () => {
  it('is contiguous and has SCHEMA_VERSION − 1 entries', () => {
    expect(MIGRATIONS.length).toBe(SCHEMA_VERSION - 1)
    expect(findChainGap(MIGRATIONS)).toBeNull()
    expect(isContiguousChain(MIGRATIONS)).toBe(true)
    MIGRATIONS.forEach((m, i) => {
      expect(m.from).toBe(i + 1)
      expect(m.to).toBe(i + 2)
    })
  })

  it('accepts the synthetic chain as contiguous up to 2', () => {
    expect(findChainGap(chain)).toBeNull()
    expect(isContiguousChain(chain, 2)).toBe(true)
    expect(isContiguousChain(chain, 3)).toBe(false)
  })

  it('detects a gap between steps', () => {
    const gapped: Migration[] = [step0to1, { from: 2, to: 3, migrate: (r) => r }]
    expect(findChainGap(gapped)).toMatch(/starts at 2/)
    expect(isContiguousChain(gapped, 3)).toBe(false)
  })

  it('detects a multi-version step', () => {
    const wide: Migration[] = [{ from: 0, to: 2, migrate: (r) => r }]
    expect(findChainGap(wide)).toMatch(/single step/)
  })

  it('detects non-integer versions', () => {
    const fractional: Migration[] = [{ from: 0.5, to: 1.5, migrate: (r) => r }]
    expect(findChainGap(fractional)).toMatch(/non-integer/)
  })
})

describe('schemaVersion 0, 1.5 and "1"', () => {
  const badVersions: unknown[] = [0, 1.5, '1']

  it.each(badVersions)('%j fails isPersistedEnvelope', (version) => {
    const envelope = { ...loadFixtureV1(), schemaVersion: version }
    expect(isPersistedEnvelope(envelope)).toBe(false)
  })

  it.each(badVersions)('%j → not-an-envelope on import', (version) => {
    const json = JSON.stringify({ ...loadFixtureV1(), schemaVersion: version })
    const result = parseImport(json)
    expect(result).toMatchObject({ kind: 'invalid', error: 'not-an-envelope' })
  })

  it.each(badVersions)('%j → corrupt on load', (version) => {
    const raw = JSON.stringify({ ...loadFixtureV1(), schemaVersion: version })
    const load = createMemoryRepository(raw).load()
    expect(load).toMatchObject({ kind: 'corrupt', raw, hasBackup: false })
  })
})

describe('historical fixtures', () => {
  // vitest runs from the project root (vite.config.ts); the fixture folder is resolved from there.
  const dir = resolve(process.cwd(), 'src', 'domain', 'storage', '__fixtures__')
  const files = readdirSync(dir).filter((name) => /^v\d+\.json$/.test(name))

  it('has at least the v1 fixture', () => {
    expect(files).toContain('v1.json')
  })

  it.each(files)('%s migrates to SCHEMA_VERSION and validates without warnings', (file) => {
    const raw = readFileSync(join(dir, file), 'utf8')
    const decoded = decodeEnvelope(raw)
    expect(decoded.kind).toBe('ok')
    if (decoded.kind !== 'ok') return
    expect(decoded.warnings).toEqual([])
    expect(decoded.schemaVersion).toBe(Number(file.slice(1, -5)))
    const parsed = JSON.parse(raw) as PersistedEnvelope
    expect(isPersistedEnvelope(parsed)).toBe(true)
    const migrated = runMigrations(parsed)
    expect(migrated.ok).toBe(true)
    if (!migrated.ok) return
    expect(migrated.value.envelope.schemaVersion).toBe(SCHEMA_VERSION)
    expect(validateAppData(migrated.value.envelope.data).ok).toBe(true)
  })

  it('v1 with extra fields migrates, validates and drops them silently', () => {
    const envelope = loadFixtureV1()
    const data = envelope.data as Rec
    const transactions = (data.transactions as Rec[]).map((t) => ({ ...t, tags: ['x'], legacy: 1 }))
    const categories = (data.categories as Rec[]).map((c) => ({ ...c, archived: false }))
    const budgets = (data.budgets as Rec[]).map((b) => ({ ...b, rollover: true }))
    const settings = { ...(data.settings as Rec), experimental: true }
    const withExtras = {
      ...envelope,
      unknownTopLevel: 'ignored',
      data: { ...data, transactions, categories, budgets, settings, recurringRules: [] },
    }
    const result = decodeEnvelope(JSON.stringify(withExtras))
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.warnings).toEqual([])
    expect(result.migratedFrom).toBeNull()
    expect(result.data).toEqual(fixtureData())
    expect('recurringRules' in result.data).toBe(false)
  })
})
