// ============================================================================
// src/domain/queries.test.ts — §10.1 «queries» row over the §3.7 fixture with
// today = '2026-09-25'.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { FIXTURE_TODAY, budget, cat, fixtureData, tx } from '../test/fixtures'
import {
  BudgetStatus,
  budgetProgress,
  categoriesById,
  categoriesOfType,
  categoriesWithoutBudget,
  countTransactionsByCategory,
  expensesByCategory,
  filterTransactions,
  foldOthers,
  groupByDay,
  monthKpis,
  monthlyTrend,
  recentTransactions,
  sortTransactions,
  summarize,
  summarizeMonth,
  totalBalance,
  transactionsInMonth,
} from './queries'
import type { CategoryTotal, TransactionFilter } from './queries'
import type { AppData, Category, Id, Transaction } from './types'

const today = FIXTURE_TODAY
const data: AppData = fixtureData()
const txs: readonly Transaction[] = data.transactions
const cats: readonly Category[] = data.categories
const catMap: ReadonlyMap<Id, Category> = new Map(cats.map((c) => [c.id, c]))

const ids = (list: readonly Transaction[]): string[] => list.map((t) => t.id)
const filter = (patch: Partial<TransactionFilter>): TransactionFilter => ({
  month: '2026-09',
  query: '',
  type: 'all',
  categoryId: null,
  ...patch,
})
const percentSum = (rows: readonly CategoryTotal[]): number => rows.reduce((acc, r) => acc + r.percent, 0)

describe('transactionsInMonth', () => {
  it('selects the rows of the month', () => {
    expect(ids(transactionsInMonth(txs, '2026-07'))).toEqual(['t-01', 't-02', 't-03'])
    expect(ids(transactionsInMonth(txs, '2026-09'))).toEqual(['t-08', 't-09', 't-10', 't-11', 't-12'])
    expect(transactionsInMonth(txs, '2026-06')).toEqual([])
  })

  it('includes the first and last day of the month and excludes the neighbours (§9)', () => {
    const edge = [
      tx({ id: 'e-0831', date: '2026-08-31' }),
      tx({ id: 'e-0901', date: '2026-09-01' }),
      tx({ id: 'e-0930', date: '2026-09-30' }),
      tx({ id: 'e-1001', date: '2026-10-01' }),
    ]
    expect(ids(transactionsInMonth(edge, '2026-09'))).toEqual(['e-0901', 'e-0930'])
    expect(ids(transactionsInMonth(edge, '2026-08'))).toEqual(['e-0831'])
    expect(ids(transactionsInMonth(edge, '2026-10'))).toEqual(['e-1001'])
  })
})

describe('summarizeMonth / summarize (§3.7)', () => {
  it('matches the derived figures of the fixture', () => {
    expect(summarizeMonth(txs, '2026-07')).toEqual({
      month: '2026-07',
      incomeCents: 120000,
      expenseCents: 75000,
      balanceCents: 45000,
      transactionCount: 3,
    })
    expect(summarizeMonth(txs, '2026-08')).toEqual({
      month: '2026-08',
      incomeCents: 120000,
      expenseCents: 67750,
      balanceCents: 52250,
      transactionCount: 4,
    })
    expect(summarizeMonth(txs, '2026-09')).toEqual({
      month: '2026-09',
      incomeCents: 120000,
      expenseCents: 84320,
      balanceCents: 35680,
      transactionCount: 5,
    })
  })

  it('returns zeros for an empty month, never undefined', () => {
    expect(summarizeMonth(txs, '2026-06')).toEqual({
      month: '2026-06',
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      transactionCount: 0,
    })
    expect(summarizeMonth([], '2026-09')).toEqual({
      month: '2026-09',
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      transactionCount: 0,
    })
  })

  it('respects the month boundaries', () => {
    const edge = [
      tx({ id: 'e-0831', date: '2026-08-31', amountCents: 1 }),
      tx({ id: 'e-0901', date: '2026-09-01', amountCents: 10 }),
      tx({ id: 'e-0930', date: '2026-09-30', amountCents: 100 }),
      tx({ id: 'e-1001', date: '2026-10-01', amountCents: 1000 }),
    ]
    expect(summarizeMonth(edge, '2026-09').expenseCents).toBe(110)
    expect(summarizeMonth(edge, '2026-09').transactionCount).toBe(2)
  })

  it('summarize works on an arbitrary (filtered) set and can be negative', () => {
    const set = [
      tx({ type: 'income', categoryId: 'cat-nomina', amountCents: 500 }),
      tx({ amountCents: 700 }),
      tx({ amountCents: 300 }),
    ]
    expect(summarize(set)).toEqual({ incomeCents: 500, expenseCents: 1000, balanceCents: -500, transactionCount: 3 })
    expect(summarize([])).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0, transactionCount: 0 })
  })
})

describe('monthlyTrend', () => {
  it('returns n rows, oldest first, ending in endMonth, zeros for empty months (§3.7)', () => {
    const trend = monthlyTrend(txs, '2026-09', 6)
    expect(trend.map((r) => r.month)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'])
    for (const row of trend.slice(0, 3)) {
      expect(row).toEqual({ month: row.month, incomeCents: 0, expenseCents: 0, balanceCents: 0, transactionCount: 0 })
    }
    expect(trend.slice(3)).toEqual([
      summarizeMonth(txs, '2026-07'),
      summarizeMonth(txs, '2026-08'),
      summarizeMonth(txs, '2026-09'),
    ])
    expect(trend[3]?.balanceCents).toBe(45000)
    expect(trend[4]?.balanceCents).toBe(52250)
    expect(trend[5]?.balanceCents).toBe(35680)
  })

  it('crosses the year boundary: end 2026-02, n 12 starts in 2025-03', () => {
    const trend = monthlyTrend(txs, '2026-02', 12)
    expect(trend).toHaveLength(12)
    expect(trend[0]?.month).toBe('2025-03')
    expect(trend[11]?.month).toBe('2026-02')
    expect(trend.every((r) => r.transactionCount === 0 && r.balanceCents === 0)).toBe(true)
  })

  it('a 12-month window before the first movement is all zeros', () => {
    const trend = monthlyTrend(txs, '2026-06', 12)
    expect(trend.every((r) => r.incomeCents === 0 && r.expenseCents === 0)).toBe(true)
  })
})

describe('categoriesOfType / categoriesById', () => {
  it('filters one type and orders by sortOrder without mutating the input', () => {
    const list = [
      cat({ id: 'b', type: 'expense', sortOrder: 2 }),
      cat({ id: 'i', type: 'income', sortOrder: 0 }),
      cat({ id: 'a', type: 'expense', sortOrder: 1 }),
    ]
    const before = [...list]
    expect(categoriesOfType(list, 'expense').map((c) => c.id)).toEqual(['a', 'b'])
    expect(categoriesOfType(list, 'income').map((c) => c.id)).toEqual(['i'])
    expect(categoriesOfType([], 'expense')).toEqual([])
    expect(list).toEqual(before)
  })

  it('categoriesById maps every category by id (fixture: 15 entries)', () => {
    const map = categoriesById(data.categories)
    expect(map.size).toBe(15)
    expect(map.get('cat-ocio')?.name).toBe('Ocio')
    expect(map.get('missing')).toBeUndefined()
  })
})

describe('sortTransactions', () => {
  it('orders the fixture date desc', () => {
    expect(ids(sortTransactions(txs))).toEqual([
      't-12', 't-11', 't-10', 't-09', 't-08', 't-07', 't-06', 't-05', 't-04', 't-03', 't-02', 't-01',
    ])
  })

  it('breaks ties by createdAt desc and then id asc, without mutating the input', () => {
    const input = [
      tx({ id: 'b', date: '2026-09-10', createdAt: 100 }),
      tx({ id: 'a', date: '2026-09-10', createdAt: 100 }),
      tx({ id: 'c', date: '2026-09-10', createdAt: 200 }),
      tx({ id: 'd', date: '2026-09-11', createdAt: 1 }),
      tx({ id: 'a', date: '2026-09-10', createdAt: 100 }),
    ]
    const frozen = Object.freeze([...input])
    const sorted = sortTransactions(frozen)
    expect(ids(sorted)).toEqual(['d', 'c', 'a', 'a', 'b'])
    expect(ids(frozen)).toEqual(['b', 'a', 'c', 'd', 'a'])
    expect(sorted).not.toBe(frozen)
  })
})

describe('groupByDay', () => {
  it('groups the sorted September rows by day, newest first, with net per day', () => {
    const groups = groupByDay(sortTransactions(transactionsInMonth(txs, '2026-09')))
    expect(groups.map((g) => g.date)).toEqual(['2026-09-28', '2026-09-20', '2026-09-12', '2026-09-05', '2026-09-01'])
    expect(groups.map((g) => g.netCents)).toEqual([-5000, -11000, -8320, -60000, 120000])
    expect(groups.every((g) => g.transactions.length === 1)).toBe(true)
  })

  it('accumulates several rows of the same day and keeps their order', () => {
    const rows = sortTransactions([
      tx({ id: 'x1', date: '2026-09-10', amountCents: 300, createdAt: 3 }),
      tx({ id: 'x2', date: '2026-09-10', type: 'income', categoryId: 'cat-nomina', amountCents: 1000, createdAt: 2 }),
      tx({ id: 'x3', date: '2026-09-09', amountCents: 50, createdAt: 1 }),
    ])
    const groups = groupByDay(rows)
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ date: '2026-09-10', netCents: 700 })
    expect(ids(groups[0]?.transactions ?? [])).toEqual(['x1', 'x2'])
    expect(groups[1]).toMatchObject({ date: '2026-09-09', netCents: -50 })
  })

  it('orders groups by date desc even when the input is not sorted', () => {
    const groups = groupByDay([tx({ date: '2026-09-01' }), tx({ date: '2026-09-03' }), tx({ date: '2026-09-02' })])
    expect(groups.map((g) => g.date)).toEqual(['2026-09-03', '2026-09-02', '2026-09-01'])
  })

  it('returns an empty list for no rows', () => {
    expect(groupByDay([])).toEqual([])
  })
})

describe('filterTransactions', () => {
  it('searches without diacritics: «cafe» in September → only t-10; nothing in August', () => {
    expect(ids(filterTransactions(txs, catMap, filter({ query: 'cafe' })))).toEqual(['t-10'])
    expect(ids(filterTransactions(txs, catMap, filter({ query: 'CAFÉ' })))).toEqual(['t-10'])
    expect(ids(filterTransactions(txs, catMap, filter({ month: '2026-08', query: 'cafe' })))).toEqual([])
  })

  it('matches the category name as well as the note', () => {
    expect(ids(filterTransactions(txs, catMap, filter({ query: 'vivienda' })))).toEqual(['t-09'])
    expect(ids(filterTransactions(txs, catMap, filter({ query: 'nomina' })))).toEqual(['t-08'])
    expect(ids(filterTransactions(txs, catMap, filter({ query: '  Suscrip ' })))).toEqual(['t-12'])
  })

  it('an empty or blank query means no text filter', () => {
    expect(filterTransactions(txs, catMap, filter({ query: '' }))).toHaveLength(5)
    expect(filterTransactions(txs, catMap, filter({ query: '   ' }))).toHaveLength(5)
  })

  it('filters by type', () => {
    expect(ids(filterTransactions(txs, catMap, filter({ type: 'income' })))).toEqual(['t-08'])
    expect(ids(filterTransactions(txs, catMap, filter({ type: 'expense' })))).toEqual(['t-09', 't-10', 't-11', 't-12'])
  })

  it('filters by category', () => {
    expect(ids(filterTransactions(txs, catMap, filter({ categoryId: 'cat-ocio' })))).toEqual(['t-11'])
    expect(ids(filterTransactions(txs, catMap, filter({ month: '2026-08', categoryId: 'cat-ocio' })))).toEqual(['t-07'])
  })

  it('combines month, type, category and query', () => {
    expect(ids(filterTransactions(txs, catMap, filter({ type: 'expense', categoryId: 'cat-ocio', query: 'concierto' })))).toEqual(['t-11'])
    expect(ids(filterTransactions(txs, catMap, filter({ type: 'income', categoryId: 'cat-ocio' })))).toEqual([])
    expect(ids(filterTransactions(txs, catMap, filter({ type: 'expense', query: 'nomina' })))).toEqual([])
  })

  it('returns nothing for a month without rows or a query without matches', () => {
    expect(filterTransactions(txs, catMap, filter({ month: '2026-01' }))).toEqual([])
    expect(filterTransactions(txs, catMap, filter({ query: 'zzz' }))).toEqual([])
    expect(filterTransactions([], catMap, filter({}))).toEqual([])
  })

  it('a row whose category is missing from the map still matches by note only', () => {
    const orphan = tx({ id: 'o', date: '2026-09-02', categoryId: 'cat-missing', note: 'Taxi' })
    expect(ids(filterTransactions([orphan], catMap, filter({ query: 'taxi' })))).toEqual(['o'])
    expect(ids(filterTransactions([orphan], catMap, filter({ query: 'missing' })))).toEqual([])
  })
})

describe('expensesByCategory (§3.7)', () => {
  it('orders by amount desc with largest-remainder percents 71/13/10/6 = 100', () => {
    const rows = expensesByCategory(txs, cats, '2026-09')
    expect(rows.map((r) => [r.categoryId, r.name, r.amountCents, r.count, r.percent])).toEqual([
      ['cat-vivienda', 'Vivienda', 60000, 1, 71],
      ['cat-ocio', 'Ocio', 11000, 1, 13],
      ['cat-alimentacion', 'Alimentación', 8320, 1, 10],
      ['cat-suscripciones', 'Suscripciones', 5000, 1, 6],
    ])
    expect(percentSum(rows)).toBe(100)
    expect(rows.every((r) => !r.isOthers)).toBe(true)
    expect(rows[0]).toMatchObject({ icon: '🏠', color: 'violet' })
  })

  it('August has three rows and ignores incomes', () => {
    const rows = expensesByCategory(txs, cats, '2026-08')
    expect(rows.map((r) => [r.name, r.amountCents])).toEqual([
      ['Vivienda', 60000],
      ['Ocio', 4500],
      ['Restaurantes', 3250],
    ])
    expect(percentSum(rows)).toBe(100)
  })

  it('accumulates several rows of one category and breaks amount ties by name asc', () => {
    const rows = expensesByCategory(
      [
        tx({ date: '2026-09-01', categoryId: 'cat-ocio', amountCents: 100 }),
        tx({ date: '2026-09-02', categoryId: 'cat-ocio', amountCents: 100 }),
        tx({ date: '2026-09-03', categoryId: 'cat-alimentacion', amountCents: 200 }),
        tx({ date: '2026-09-03', categoryId: 'cat-transporte', amountCents: 50 }),
        tx({ date: '2026-09-03', categoryId: 'cat-compras', amountCents: 50 }),
      ],
      cats,
      '2026-09',
    )
    expect(rows.map((r) => [r.name, r.amountCents, r.count])).toEqual([
      ['Alimentación', 200, 1],
      ['Ocio', 200, 2],
      ['Compras', 50, 1],
      ['Transporte', 50, 1],
    ])
  })

  it('largest remainder: [1,1,1] cents → 34/33/33 and a single category → 100', () => {
    const three = expensesByCategory(
      [
        tx({ date: '2026-09-01', categoryId: 'cat-ocio', amountCents: 1 }),
        tx({ date: '2026-09-01', categoryId: 'cat-salud', amountCents: 1 }),
        tx({ date: '2026-09-01', categoryId: 'cat-compras', amountCents: 1 }),
      ],
      cats,
      '2026-09',
    )
    expect(three.map((r) => r.percent)).toEqual([34, 33, 33])
    expect(three.map((r) => r.name)).toEqual(['Compras', 'Ocio', 'Salud'])
    const one = expensesByCategory([tx({ date: '2026-09-01', amountCents: 7 })], cats, '2026-09')
    expect(one.map((r) => r.percent)).toEqual([100])
  })

  it('an empty month or a month with only incomes yields no rows', () => {
    expect(expensesByCategory(txs, cats, '2026-01')).toEqual([])
    expect(expensesByCategory([tx({ type: 'income', categoryId: 'cat-nomina', date: '2026-09-01' })], cats, '2026-09')).toEqual([])
  })

  it('a dangling categoryId degrades to a gray placeholder row instead of losing the amount', () => {
    const rows = expensesByCategory([tx({ date: '2026-09-01', categoryId: 'cat-missing', amountCents: 5 })], cats, '2026-09')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ categoryId: 'cat-missing', name: 'cat-missing', color: 'gray', amountCents: 5, percent: 100 })
  })
})

describe('foldOthers', () => {
  const row = (i: number, amountCents: number): CategoryTotal => ({
    categoryId: `cat-${i}`,
    isOthers: false,
    name: `Cat ${i}`,
    icon: '📦',
    color: 'blue',
    amountCents,
    count: 1,
    percent: 0,
  })
  const withPercents = (rows: CategoryTotal[]): CategoryTotal[] => {
    const total = rows.reduce((acc, r) => acc + r.amountCents, 0)
    return rows.map((r) => ({ ...r, percent: total === 0 ? 0 : Math.floor((r.amountCents * 100) / total) }))
  }

  it('does not fold the fixture (4 rows, all ≥ 3 %)', () => {
    const rows = expensesByCategory(txs, cats, '2026-09')
    const folded = foldOthers(rows)
    expect(folded).toEqual(rows)
    expect(folded).not.toBe(rows)
  })

  it('9 rows → 8 named + «Otras» with categoryId null and isOthers true, percents summing 100', () => {
    const rows = withPercents([100, 90, 80, 70, 60, 50, 40, 30, 20].map((amount, i) => row(i, amount)))
    const folded = foldOthers(rows)
    expect(folded).toHaveLength(9)
    expect(folded.slice(0, 8).map((r) => r.categoryId)).toEqual(rows.slice(0, 8).map((r) => r.categoryId))
    const others = folded[8]
    expect(others).toMatchObject({ categoryId: null, isOthers: true, name: 'Otras', icon: '…', color: 'gray', amountCents: 20, count: 1 })
    expect(percentSum(folded)).toBe(100)
    expect(folded.reduce((acc, r) => acc + r.amountCents, 0)).toBe(540)
  })

  it('12 rows fold four into «Otras» with the summed amount and count', () => {
    const rows = withPercents(Array.from({ length: 12 }, (_, i) => row(i, 120 - i * 5)))
    const folded = foldOthers(rows)
    expect(folded).toHaveLength(9)
    const others = folded[8]
    expect(others?.isOthers).toBe(true)
    expect(others?.amountCents).toBe(rows.slice(8).reduce((acc, r) => acc + r.amountCents, 0))
    expect(others?.count).toBe(4)
    expect(percentSum(folded)).toBe(100)
  })

  it('8 rows all ≥ 3 % are returned unchanged', () => {
    const rows = withPercents(Array.from({ length: 8 }, (_, i) => row(i, 100)))
    expect(foldOthers(rows)).toEqual(rows)
  })

  it('0 rows → 0 rows', () => {
    expect(foldOthers([])).toEqual([])
  })

  it('all rows below 3 % keeps the first 8 and folds the rest', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ ...row(i, 10), percent: 2 }))
    const folded = foldOthers(rows)
    expect(folded).toHaveLength(9)
    expect(folded.slice(0, 8).map((r) => r.categoryId)).toEqual(rows.slice(0, 8).map((r) => r.categoryId))
    expect(folded[8]).toMatchObject({ isOthers: true, categoryId: null, amountCents: 420, count: 42 })
    expect(percentSum(folded)).toBe(100)
  })

  it('all rows below 3 % with at most 8 rows keeps them all', () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({ ...row(i, 10), percent: 1 }))
    expect(foldOthers(rows)).toEqual(rows)
  })

  it('rows under the threshold are folded even when fewer than max are named', () => {
    const rows = withPercents([970, 10, 10, 10].map((amount, i) => row(i, amount)))
    const folded = foldOthers(rows)
    expect(folded).toHaveLength(2)
    expect(folded[0]?.categoryId).toBe('cat-0')
    expect(folded[1]).toMatchObject({ isOthers: true, amountCents: 30, count: 3 })
    expect(folded.map((r) => r.percent)).toEqual([97, 3])
  })

  it('honours custom max and minPercent', () => {
    const rows = withPercents([50, 30, 20].map((amount, i) => row(i, amount)))
    const folded = foldOthers(rows, { max: 1, minPercent: 0 })
    expect(folded).toHaveLength(2)
    expect(folded[1]).toMatchObject({ isOthers: true, amountCents: 50, percent: 50 })
  })
})

describe('totalBalance (§3.7)', () => {
  it('is 147930 with one future movement', () => {
    expect(totalBalance(txs, data.settings.initialBalanceCents, today)).toEqual({ balanceCents: 147930, futureCount: 1 })
  })

  it('includes movements dated today and excludes those after today', () => {
    const set = [
      tx({ date: '2026-09-25', amountCents: 100 }),
      tx({ date: '2026-09-26', amountCents: 1000 }),
      tx({ date: '2026-09-24', type: 'income', categoryId: 'cat-nomina', amountCents: 500 }),
    ]
    expect(totalBalance(set, 0, today)).toEqual({ balanceCents: 400, futureCount: 1 })
    expect(totalBalance(set, -1000, today)).toEqual({ balanceCents: -600, futureCount: 1 })
  })

  it('with no movements returns the initial balance', () => {
    expect(totalBalance([], 12345, today)).toEqual({ balanceCents: 12345, futureCount: 0 })
  })
})

describe('monthKpis (§4.6)', () => {
  it('current month of the fixture: 30 days, 25 elapsed, 5000 future, avg 3173, projection 95184, topDay 2026-09-05', () => {
    expect(monthKpis(txs, '2026-09', today)).toEqual({
      month: '2026-09',
      daysInMonth: 30,
      daysElapsed: 25,
      futureExpenseCents: 5000,
      futureExpenseCount: 1,
      avgDailyExpenseCents: 3173,
      projectedExpenseCents: 95184,
      topDay: { date: '2026-09-05', expenseCents: 60000 },
    })
  })

  it('past month: daysElapsed = daysInMonth, no future, projection = real expense', () => {
    expect(monthKpis(txs, '2026-08', today)).toEqual({
      month: '2026-08',
      daysInMonth: 31,
      daysElapsed: 31,
      futureExpenseCents: 0,
      futureExpenseCount: 0,
      avgDailyExpenseCents: Math.round(67750 / 31),
      projectedExpenseCents: 67750,
      topDay: { date: '2026-08-05', expenseCents: 60000 },
    })
    expect(monthKpis(txs, '2026-07', today).projectedExpenseCents).toBe(75000)
    expect(monthKpis(txs, '2026-07', today).avgDailyExpenseCents).toBe(Math.round(75000 / 31))
  })

  it('future month: daysElapsed 0, avg and projection null', () => {
    const future = [tx({ date: '2026-10-03', amountCents: 500 })]
    expect(monthKpis(future, '2026-10', today)).toEqual({
      month: '2026-10',
      daysInMonth: 31,
      daysElapsed: 0,
      futureExpenseCents: 500,
      futureExpenseCount: 1,
      avgDailyExpenseCents: null,
      projectedExpenseCents: null,
      topDay: { date: '2026-10-03', expenseCents: 500 },
    })
  })

  it('day 1 of the month: projection = past expense × days, labelled día 1', () => {
    const set = [tx({ date: '2026-09-01', amountCents: 1000 })]
    const kpis = monthKpis(set, '2026-09', '2026-09-01')
    expect(kpis.daysElapsed).toBe(1)
    expect(kpis.avgDailyExpenseCents).toBe(1000)
    expect(kpis.projectedExpenseCents).toBe(30000)
  })

  it('last day as today without future rows: projection equals the real expense', () => {
    const set = [tx({ date: '2026-09-02', amountCents: 4000 }), tx({ date: '2026-09-30', amountCents: 2000 })]
    const kpis = monthKpis(set, '2026-09', '2026-09-30')
    expect(kpis.daysElapsed).toBe(30)
    expect(kpis.futureExpenseCents).toBe(0)
    expect(kpis.projectedExpenseCents).toBe(6000)
    expect(kpis.avgDailyExpenseCents).toBe(200)
  })

  it('rounds half-up to integer cents: 1001/2 → 501 and 1234 on day 10 of 31 → 3825', () => {
    const half = monthKpis([tx({ date: '2026-09-01', amountCents: 1001 })], '2026-09', '2026-09-02')
    expect(half.avgDailyExpenseCents).toBe(501)
    const oct = monthKpis([tx({ date: '2026-10-05', amountCents: 1234 })], '2026-10', '2026-10-10')
    expect(oct.daysInMonth).toBe(31)
    expect(oct.projectedExpenseCents).toBe(3825)
    expect(oct.avgDailyExpenseCents).toBe(123)
  })

  it('day 10 of 30 with 100 € past and 800 € future → projection 30000, avg 1000, future 80000', () => {
    const set = [tx({ date: '2026-09-04', amountCents: 10000 }), tx({ date: '2026-09-20', amountCents: 80000 })]
    const kpis = monthKpis(set, '2026-09', '2026-09-10')
    expect(kpis).toMatchObject({
      daysElapsed: 10,
      futureExpenseCents: 80000,
      avgDailyExpenseCents: 1000,
      projectedExpenseCents: 30000,
    })
  })

  it('ignores incomes in every expense KPI', () => {
    const set = [tx({ type: 'income', categoryId: 'cat-nomina', date: '2026-09-01', amountCents: 999999 })]
    const kpis = monthKpis(set, '2026-09', today)
    expect(kpis.avgDailyExpenseCents).toBe(0)
    expect(kpis.projectedExpenseCents).toBe(0)
    expect(kpis.futureExpenseCents).toBe(0)
    expect(kpis.topDay).toBeNull()
  })

  it('topDay sums the day and on a tie picks the oldest date; null without expenses', () => {
    const set = [
      tx({ date: '2026-09-20', amountCents: 700 }),
      tx({ date: '2026-09-03', amountCents: 300 }),
      tx({ date: '2026-09-03', amountCents: 400 }),
      tx({ date: '2026-09-11', amountCents: 700 }),
    ]
    expect(monthKpis(set, '2026-09', today).topDay).toEqual({ date: '2026-09-03', expenseCents: 700 })
    const reversed = [tx({ date: '2026-09-20', amountCents: 5 }), tx({ date: '2026-09-11', amountCents: 5 })]
    expect(monthKpis(reversed, '2026-09', today).topDay).toEqual({ date: '2026-09-11', expenseCents: 5 })
    expect(monthKpis([], '2026-09', today).topDay).toBeNull()
  })
})

describe('budgetProgress (§4.5)', () => {
  it('fixture September: b-total warning (remaining 15680) first, then b-ocio over (remaining −1000)', () => {
    const rows = budgetProgress(data, '2026-09')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      month: '2026-09',
      category: null,
      spentCents: 84320,
      limitCents: 100000,
      remainingCents: 15680,
      status: BudgetStatus.warning,
    })
    expect(rows[0]?.budget.id).toBe('b-total')
    expect(rows[0]?.ratio).toBeCloseTo(0.8432, 10)
    expect(rows[1]).toMatchObject({
      spentCents: 11000,
      limitCents: 10000,
      remainingCents: -1000,
      status: BudgetStatus.over,
    })
    expect(rows[1]?.budget.id).toBe('b-ocio')
    expect(rows[1]?.category?.id).toBe('cat-ocio')
    expect(rows[1]?.ratio).toBeCloseTo(1.1, 10)
  })

  it('fixture August: b-ocio is ok (4500 / 10000)', () => {
    const rows = budgetProgress(data, '2026-08')
    const ocio = rows.find((r) => r.budget.id === 'b-ocio')
    expect(ocio).toMatchObject({ spentCents: 4500, remainingCents: 5500, status: BudgetStatus.ok })
    expect(rows[0]?.budget.id).toBe('b-total')
    expect(rows[0]).toMatchObject({ spentCents: 67750, status: BudgetStatus.ok })
  })

  it('status thresholds at 0.79 / 0.80 / 1.00 / 1.01 with the default warn ratio', () => {
    const cases: Array<[number, BudgetStatus]> = [
      [7900, BudgetStatus.ok],
      [8000, BudgetStatus.warning],
      [10000, BudgetStatus.warning],
      [10100, BudgetStatus.over],
    ]
    for (const [spent, status] of cases) {
      const d: AppData = {
        ...fixtureData(),
        transactions: [tx({ date: '2026-09-02', categoryId: 'cat-ocio', amountCents: spent })],
        budgets: [budget({ id: 'b-ocio', categoryId: 'cat-ocio', limitCents: 10000 })],
      }
      const [row] = budgetProgress(d, '2026-09')
      expect(row?.status).toBe(status)
      expect(row?.remainingCents).toBe(10000 - spent)
    }
  })

  it('exactly 100 % is warning with remaining 0', () => {
    const d: AppData = {
      ...fixtureData(),
      transactions: [tx({ date: '2026-09-02', categoryId: 'cat-ocio', amountCents: 10000 })],
      budgets: [budget({ categoryId: 'cat-ocio', limitCents: 10000 })],
    }
    expect(budgetProgress(d, '2026-09')[0]).toMatchObject({ ratio: 1, remainingCents: 0, status: BudgetStatus.warning })
  })

  it('uses settings.budgetWarnRatio', () => {
    const d: AppData = {
      ...fixtureData(),
      transactions: [tx({ date: '2026-09-02', categoryId: 'cat-ocio', amountCents: 5000 })],
      budgets: [budget({ categoryId: 'cat-ocio', limitCents: 10000 })],
    }
    d.settings = { ...d.settings, budgetWarnRatio: 0.5 }
    expect(budgetProgress(d, '2026-09')[0]?.status).toBe(BudgetStatus.warning)
    d.settings = { ...d.settings, budgetWarnRatio: 0.51 }
    expect(budgetProgress(d, '2026-09')[0]?.status).toBe(BudgetStatus.ok)
  })

  it('0 % spent: remaining is the whole limit', () => {
    const rows = budgetProgress(data, '2026-01')
    expect(rows.map((r) => [r.budget.id, r.spentCents, r.remainingCents, r.ratio, r.status])).toEqual([
      ['b-total', 0, 100000, 0, 'ok'],
      ['b-ocio', 0, 10000, 0, 'ok'],
    ])
  })

  it('orders the total first and then by ratio desc, regardless of input order', () => {
    const d: AppData = {
      ...fixtureData(),
      transactions: [
        tx({ date: '2026-09-02', categoryId: 'cat-ocio', amountCents: 500 }),
        tx({ date: '2026-09-02', categoryId: 'cat-alimentacion', amountCents: 9000 }),
        tx({ date: '2026-09-02', categoryId: 'cat-salud', amountCents: 2000 }),
      ],
      budgets: [
        budget({ id: 'b-salud', categoryId: 'cat-salud', limitCents: 10000 }),
        budget({ id: 'b-ocio', categoryId: 'cat-ocio', limitCents: 10000 }),
        budget({ id: 'b-total', categoryId: null, limitCents: 1000000 }),
        budget({ id: 'b-alim', categoryId: 'cat-alimentacion', limitCents: 10000 }),
      ],
    }
    expect(budgetProgress(d, '2026-09').map((r) => r.budget.id)).toEqual(['b-total', 'b-alim', 'b-salud', 'b-ocio'])
  })

  it('equal ratios are ordered by category name', () => {
    const d: AppData = {
      ...fixtureData(),
      transactions: [
        tx({ date: '2026-09-02', categoryId: 'cat-salud', amountCents: 100 }),
        tx({ date: '2026-09-02', categoryId: 'cat-alimentacion', amountCents: 100 }),
      ],
      budgets: [
        budget({ id: 'b-salud', categoryId: 'cat-salud', limitCents: 1000 }),
        budget({ id: 'b-alim', categoryId: 'cat-alimentacion', limitCents: 1000 }),
      ],
    }
    expect(budgetProgress(d, '2026-09').map((r) => r.budget.id)).toEqual(['b-alim', 'b-salud'])
  })

  it('total and per-category budgets are independent; no budgets → empty', () => {
    const rows = budgetProgress(data, '2026-09')
    expect(rows[0]?.spentCents).toBe(84320)
    expect(rows[1]?.spentCents).toBe(11000)
    expect(budgetProgress({ ...data, budgets: [] }, '2026-09')).toEqual([])
  })

  it('a budget whose category is missing still reports with category null', () => {
    const d: AppData = { ...fixtureData(), budgets: [budget({ id: 'b-x', categoryId: 'cat-missing', limitCents: 100 })] }
    expect(budgetProgress(d, '2026-09')[0]).toMatchObject({ category: null, spentCents: 0, status: 'ok' })
  })
})

describe('categoriesWithoutBudget (P1-18, signature)', () => {
  it('returns the month rows of expense categories that have no budget', () => {
    const rows = categoriesWithoutBudget(data, '2026-09')
    expect(rows.map((r) => r.categoryId)).toEqual(['cat-vivienda', 'cat-alimentacion', 'cat-suscripciones'])
    expect(rows.every((r) => !r.isOthers && r.categoryId !== null)).toBe(true)
  })

  it('returns nothing when every spent category is budgeted or the month is empty', () => {
    expect(categoriesWithoutBudget(data, '2026-01')).toEqual([])
    const d: AppData = {
      ...fixtureData(),
      transactions: [tx({ date: '2026-09-02', categoryId: 'cat-ocio', amountCents: 5 })],
    }
    expect(categoriesWithoutBudget(d, '2026-09')).toEqual([])
  })
})

describe('countTransactionsByCategory', () => {
  it('counts every row per categoryId over all months', () => {
    const counts = countTransactionsByCategory(txs)
    expect(counts.get('cat-nomina')).toBe(3)
    expect(counts.get('cat-vivienda')).toBe(3)
    expect(counts.get('cat-alimentacion')).toBe(2)
    expect(counts.get('cat-ocio')).toBe(2)
    expect(counts.get('cat-restaurantes')).toBe(1)
    expect(counts.get('cat-suscripciones')).toBe(1)
    expect(counts.get('cat-salud')).toBeUndefined()
    expect(counts.size).toBe(6)
    expect(countTransactionsByCategory([]).size).toBe(0)
  })
})

describe('recentTransactions', () => {
  it('returns the n newest in canonical order', () => {
    expect(ids(recentTransactions(txs, 3))).toEqual(['t-12', 't-11', 't-10'])
    expect(ids(recentTransactions(txs, 0))).toEqual([])
    expect(ids(recentTransactions(txs, -1))).toEqual([])
    expect(recentTransactions(txs, 100)).toHaveLength(12)
    expect(recentTransactions([], 5)).toEqual([])
  })
})

describe('fixture builders (src/test/fixtures.ts)', () => {
  it('produce valid, distinct objects that accept overrides', () => {
    const a = tx()
    const b = tx({ note: 'x' })
    expect(a.id).not.toBe(b.id)
    expect(b.note).toBe('x')
    const c = cat({ type: 'income' })
    expect(c.type).toBe('income')
    expect(c.builtIn).toBe(false)
    const bd = budget({ categoryId: null })
    expect(bd.categoryId).toBeNull()
    expect(bd.limitCents).toBeGreaterThan(0)
  })

  it('fixtureData returns independent deep copies of the §3.7 data', () => {
    const one = fixtureData()
    const two = fixtureData()
    expect(one).toEqual(two)
    expect(one).not.toBe(two)
    expect(one.transactions[0]).not.toBe(two.transactions[0])
    expect(one.transactions).toHaveLength(12)
    expect(one.categories).toHaveLength(15)
    expect(one.budgets.map((b) => b.id)).toEqual(['b-ocio', 'b-total'])
    expect(one.settings).toMatchObject({
      initialBalanceCents: 10000,
      lastUsedCategoryId: { expense: 'cat-suscripciones', income: 'cat-nomina' },
      currency: 'EUR',
      budgetWarnRatio: 0.8,
    })
    for (const [i, t] of one.transactions.entries()) {
      expect(t.createdAt).toBe(1_782_864_000_000 + (i + 1) * 86_400_000)
      expect(t.updatedAt).toBe(t.createdAt)
    }
  })
})
