// ============================================================================
// src/domain/fixture-derived.test.ts — final sanity gate over the canonical
// §3.7 fixture: every derived number the spec cites (F3, F5, F6, F7 and the
// §10.2/§10.3 strings) is recomputed here from the real domain functions with
// today = '2026-09-25'. If any of these fail, the acceptance criteria of §2.1
// cannot hold, whatever the UI does.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { FIXTURE_TODAY, fixtureData, loadFixtureV1 } from '../test/fixtures'
import { formatCents, largestRemainderPercents } from './money'
import {
  BudgetStatus,
  budgetProgress,
  expensesByCategory,
  filterTransactions,
  foldOthers,
  monthKpis,
  monthlyTrend,
  summarizeMonth,
  totalBalance,
} from './queries'
import type { MonthSummary } from './queries'
import { reduce } from './reducer'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from './seed'
import { parseImport } from './storage/jsonio'
import type { AppData, Category, Id } from './types'
import { assertInvariants, validateAppData } from './validate'

const today = FIXTURE_TODAY
const data: AppData = fixtureData()
const txs = data.transactions
const cats = data.categories
const catMap: ReadonlyMap<Id, Category> = new Map(cats.map((c) => [c.id, c]))

/** Intl may emit NBSP / narrow NBSP; compare on a normalized copy (§9). */
const norm = (s: string): string => s.replace(/\s/g, ' ')
const eur = (cents: number, opts?: Parameters<typeof formatCents>[2]): string =>
  norm(formatCents(cents, 'EUR', opts))

const ROW_CREATED_BASE = 1_782_864_000_000
const DAY_MS = 86_400_000

/** The three rows of the §3.7 «Cifras derivadas» table. */
const EXPECTED_MONTHS: readonly MonthSummary[] = [
  { month: '2026-07', incomeCents: 120000, expenseCents: 75000, balanceCents: 45000, transactionCount: 3 },
  { month: '2026-08', incomeCents: 120000, expenseCents: 67750, balanceCents: 52250, transactionCount: 4 },
  { month: '2026-09', incomeCents: 120000, expenseCents: 84320, balanceCents: 35680, transactionCount: 5 },
]

describe('§3.7 fixture: structure', () => {
  it('is the envelope { app, schemaVersion: 1, savedAt: 1_783_900_800_000 }', () => {
    const env = loadFixtureV1()
    expect(env.app).toBe('mis-finanzas')
    expect(env.schemaVersion).toBe(1)
    expect(env.savedAt).toBe(1_783_900_800_000)
  })

  it('has the 12 transactions of the table with createdAt = updatedAt = base + n × 86_400_000', () => {
    expect(txs).toHaveLength(12)
    txs.forEach((t, i) => {
      const n = i + 1
      expect(t.id).toBe(`t-${String(n).padStart(2, '0')}`)
      expect(t.createdAt).toBe(ROW_CREATED_BASE + n * DAY_MS)
      expect(t.updatedAt).toBe(t.createdAt)
    })
    // Spot-check the rows the derived numbers hinge on.
    expect(txs[9]).toMatchObject({ id: 't-10', amountCents: 8320, date: '2026-09-12', note: 'Café y compra semanal' })
    expect(txs[11]).toMatchObject({ id: 't-12', amountCents: 5000, date: '2026-09-28', categoryId: 'cat-suscripciones' })
    // The last row's createdAt is the envelope's savedAt.
    expect(txs[11]?.createdAt).toBe(loadFixtureV1().savedAt)
  })

  it('carries the 15 categories of §3.4 exactly as seeded', () => {
    expect(cats).toEqual(DEFAULT_CATEGORIES)
  })

  it('carries DEFAULT_SETTINGS except initialBalanceCents 10000 and lastUsedCategoryId', () => {
    expect(data.settings).toEqual({
      ...DEFAULT_SETTINGS,
      initialBalanceCents: 10000,
      lastUsedCategoryId: { expense: 'cat-suscripciones', income: 'cat-nomina' },
    })
  })

  it('has the two budgets b-ocio (10000) and b-total (null, 100000)', () => {
    expect(data.budgets).toEqual([
      { id: 'b-ocio', categoryId: 'cat-ocio', limitCents: 10000 },
      { id: 'b-total', categoryId: null, limitCents: 100000 },
    ])
  })

  it('validates with no warnings, passes assertInvariants and imports unchanged', () => {
    const validated = validateAppData(loadFixtureV1().data)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.value.warnings).toEqual([])
    expect(validated.value.data).toEqual(data)
    expect(() => assertInvariants(validated.value.data)).not.toThrow()

    const imported = parseImport(JSON.stringify(loadFixtureV1()))
    expect(imported.kind).toBe('ok')
    if (imported.kind !== 'ok') return
    expect(imported.data).toEqual(data)
    expect(imported.preview).toEqual({
      transactions: 12,
      categories: 15,
      budgets: 2,
      schemaVersion: 1,
      warnings: [],
    })
  })
})

describe('§3.7 derived: summaries per month (F3)', () => {
  it.each(EXPECTED_MONTHS)('summarizeMonth($month) = $incomeCents / $expenseCents / $balanceCents / $transactionCount', (row) => {
    expect(summarizeMonth(txs, row.month)).toEqual(row)
  })

  it('September expense 84320 includes 5000 future cents (t-12, date > today)', () => {
    const september = summarizeMonth(txs, '2026-09')
    const future = txs.filter((t) => t.date > today)
    expect(future.map((t) => t.id)).toEqual(['t-12'])
    expect(future.reduce((sum, t) => sum + t.amountCents, 0)).toBe(5000)
    expect(september.expenseCents).toBe(84320)
    expect(september.expenseCents - 5000).toBe(79320)
  })

  it('monthly balance renders as «+356,80 €» in the Home hero (signDisplay exceptZero)', () => {
    expect(eur(summarizeMonth(txs, '2026-09').balanceCents, { signDisplay: 'exceptZero' })).toBe('+356,80 €')
  })
})

describe('§3.7 derived: totalBalance (F3)', () => {
  it('= 10000 + 360000 − (75000 + 67750 + 79320) = 147930 with futureCount 1', () => {
    const result = totalBalance(txs, data.settings.initialBalanceCents, today)
    expect(result).toEqual({ balanceCents: 147930, futureCount: 1 })
    expect(10000 + 360000 - (75000 + 67750 + 79320)).toBe(147930)
  })

  it('renders as «1.479,30 €»', () => {
    expect(eur(totalBalance(txs, data.settings.initialBalanceCents, today).balanceCents)).toBe('1.479,30 €')
  })
})

describe('§3.7 derived: monthKpis(2026-09) (F5)', () => {
  const kpis = monthKpis(txs, '2026-09', today)

  it('daysInMonth 30, daysElapsed 25, futureExpenseCents 5000', () => {
    expect(kpis.month).toBe('2026-09')
    expect(kpis.daysInMonth).toBe(30)
    expect(kpis.daysElapsed).toBe(25)
    expect(kpis.futureExpenseCents).toBe(5000)
  })

  it('avgDailyExpenseCents = round(79320 / 25) = 3173 → «31,73 €»', () => {
    expect(kpis.avgDailyExpenseCents).toBe(3173)
    expect(kpis.avgDailyExpenseCents).toBe(Math.round(79320 / 25))
    expect(eur(kpis.avgDailyExpenseCents ?? 0)).toBe('31,73 €')
  })

  it('projectedExpenseCents = round(79320 × 30 / 25) = 95184 → «951,84 €»', () => {
    expect(kpis.projectedExpenseCents).toBe(95184)
    expect(kpis.projectedExpenseCents).toBe(Math.round((79320 * 30) / 25))
    expect(eur(kpis.projectedExpenseCents ?? 0)).toBe('951,84 €')
  })

  it('topDay = { 2026-09-05, 60000 }', () => {
    expect(kpis.topDay).toEqual({ date: '2026-09-05', expenseCents: 60000 })
  })

  it('a future month (2026-10) has daysElapsed 0 and null KPIs; a past month (2026-08) projects its real expense', () => {
    const future = monthKpis(txs, '2026-10', today)
    expect(future.daysElapsed).toBe(0)
    expect(future.avgDailyExpenseCents).toBeNull()
    expect(future.projectedExpenseCents).toBeNull()

    const past = monthKpis(txs, '2026-08', today)
    expect(past.daysElapsed).toBe(31)
    expect(past.futureExpenseCents).toBe(0)
    expect(past.projectedExpenseCents).toBe(67750)
    expect(past.avgDailyExpenseCents).toBe(Math.round(67750 / 31))
  })
})

describe('§3.7 derived: expensesByCategory(2026-09) (F7 donut)', () => {
  const rows = expensesByCategory(txs, cats, '2026-09')

  it('Vivienda 60000 (71 %), Ocio 11000 (13 %), Alimentación 8320 (10 %), Suscripciones 5000 (6 %)', () => {
    expect(rows.map((r) => [r.name, r.amountCents, r.percent])).toEqual([
      ['Vivienda', 60000, 71],
      ['Ocio', 11000, 13],
      ['Alimentación', 8320, 10],
      ['Suscripciones', 5000, 6],
    ])
    expect(rows.map((r) => r.categoryId)).toEqual(['cat-vivienda', 'cat-ocio', 'cat-alimentacion', 'cat-suscripciones'])
    expect(rows.every((r) => !r.isOthers)).toBe(true)
    expect(rows.map((r) => r.count)).toEqual([1, 1, 1, 1])
  })

  it('percents sum to 100 and come from largest remainder (floors 71/13/9/5 = 98; +1 to Suscripciones and Alimentación)', () => {
    expect(rows.reduce((sum, r) => sum + r.percent, 0)).toBe(100)
    expect(largestRemainderPercents([60000, 11000, 8320, 5000])).toEqual([71, 13, 10, 6])
    const floors = [60000, 11000, 8320, 5000].map((v) => Math.floor((v * 100) / 84320))
    expect(floors).toEqual([71, 13, 9, 5])
  })

  it('foldOthers folds nothing (4 rows, all ≥ 3 %)', () => {
    const folded = foldOthers(rows)
    expect(folded).toEqual(rows)
    expect(folded).toHaveLength(4)
    expect(folded.some((r) => r.isOthers)).toBe(false)
  })

  it('each row keeps its own category color and icon for CategoryBadge', () => {
    for (const row of rows) {
      const category = row.categoryId === null ? undefined : catMap.get(row.categoryId)
      expect(category).toBeDefined()
      expect(row.color).toBe(category?.color)
      expect(row.icon).toBe(category?.icon)
    }
  })
})

describe('§3.7 derived: budgetProgress (F6)', () => {
  it('September: b-total first (84320 / 100000, ratio 0.8432, warning, remaining 15680) then b-ocio (11000 / 10000, 1.1, over, −1000)', () => {
    const rows = budgetProgress(data, '2026-09')
    expect(rows.map((r) => r.budget.id)).toEqual(['b-total', 'b-ocio'])

    const [total, ocio] = rows
    expect(total).toMatchObject({
      month: '2026-09',
      category: null,
      spentCents: 84320,
      limitCents: 100000,
      remainingCents: 15680,
      status: BudgetStatus.warning,
    })
    expect(total?.ratio).toBeCloseTo(0.8432, 10)

    expect(ocio).toMatchObject({
      month: '2026-09',
      spentCents: 11000,
      limitCents: 10000,
      remainingCents: -1000,
      status: BudgetStatus.over,
    })
    expect(ocio?.category?.id).toBe('cat-ocio')
    expect(ocio?.ratio).toBeCloseTo(1.1, 10)
  })

  it('September strings: total «Te quedan 156,80 €», Ocio «Has superado el presupuesto en 10,00 €»', () => {
    const [total, ocio] = budgetProgress(data, '2026-09')
    expect(eur(total?.remainingCents ?? 0)).toBe('156,80 €')
    expect(eur(-(ocio?.remainingCents ?? 0))).toBe('10,00 €')
  })

  it('August: b-ocio is ok (4500 / 10000) → «Te quedan 55,00 €»', () => {
    const rows = budgetProgress(data, '2026-08')
    const ocio = rows.find((r) => r.budget.id === 'b-ocio')
    expect(ocio).toMatchObject({ spentCents: 4500, limitCents: 10000, remainingCents: 5500, status: BudgetStatus.ok })
    expect(ocio?.ratio).toBeCloseTo(0.45, 10)
    expect(eur(ocio?.remainingCents ?? 0)).toBe('55,00 €')
  })

  it('adding a 200 € Alimentación budget yields «Te quedan 116,80 €» in September (e2e spec 3)', () => {
    const next = reduce(data, {
      type: 'budget/upsert',
      budget: { id: 'b-alimentacion', categoryId: 'cat-alimentacion', limitCents: 20000 },
    })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    const row = budgetProgress(next.value, '2026-09').find((r) => r.budget.id === 'b-alimentacion')
    expect(row).toMatchObject({ spentCents: 8320, limitCents: 20000, remainingCents: 11680, status: BudgetStatus.ok })
    expect(eur(row?.remainingCents ?? 0)).toBe('116,80 €')
    // Home shows the total first, then Ocio: total is still first; per-category rows follow by ratio desc.
    expect(budgetProgress(next.value, '2026-09').map((r) => r.budget.id)).toEqual(['b-total', 'b-ocio', 'b-alimentacion'])
  })
})

describe('§3.7 derived: monthlyTrend(txs, 2026-09, 6) (F7 bars)', () => {
  it('= 2026-04, 2026-05, 2026-06 at zero + the three table rows', () => {
    const trend = monthlyTrend(txs, '2026-09', 6)
    expect(trend).toHaveLength(6)
    expect(trend.map((r) => r.month)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'])
    const zero = { incomeCents: 0, expenseCents: 0, balanceCents: 0, transactionCount: 0 }
    expect(trend.slice(0, 3)).toEqual([
      { month: '2026-04', ...zero },
      { month: '2026-05', ...zero },
      { month: '2026-06', ...zero },
    ])
    expect(trend.slice(3)).toEqual(EXPECTED_MONTHS)
  })
})

describe('§3.7 derived: search «cafe» (F4)', () => {
  it('September → only t-10 (accent-insensitive: «Café»)', () => {
    const hits = filterTransactions(txs, catMap, { month: '2026-09', query: 'cafe', type: 'all', categoryId: null })
    expect(hits.map((t) => t.id)).toEqual(['t-10'])
  })

  it('August → nothing', () => {
    const hits = filterTransactions(txs, catMap, { month: '2026-08', query: 'cafe', type: 'all', categoryId: null })
    expect(hits).toEqual([])
  })

  it('Ocio drilldown in September → 1 row (t-11) (e2e spec 4)', () => {
    const hits = filterTransactions(txs, catMap, { month: '2026-09', query: '', type: 'all', categoryId: 'cat-ocio' })
    expect(hits.map((t) => t.id)).toEqual(['t-11'])
  })
})
