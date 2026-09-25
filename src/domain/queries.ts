// ============================================================================
// src/domain/queries.ts — pure, deterministic aggregations over AppData (§3.3,
// §4.5, §4.6). Sums are integer cents; `ratio` and `percent` are the only
// derived floats/rounded values and are never persisted. No React, no DOM, no
// clock: `today` is always a parameter.
// ============================================================================
import type { AppData, Budget, Category, Cents, Id, LocalDate, MonthKey, Transaction, TransactionType } from './types'
import { dayOf, daysInMonth, lastNMonths, monthKeyOf } from './dates'
import { largestRemainderPercents } from './money'
import { normalizeText } from './text'

// ---------------------------------------------------------------------------
// Types (§3.3)
// ---------------------------------------------------------------------------

export type MonthSummary = {
  month: MonthKey
  incomeCents: Cents
  expenseCents: Cents
  /** incomeCents − expenseCents; puede ser negativo. */
  balanceCents: number
  transactionCount: number
}

export type CategoryTotal = {
  /** null solo en la fila plegada «Otras». */
  categoryId: Id | null
  /** true para la fila plegada «Otras»; sin drilldown. */
  isOthers: boolean
  name: string
  icon: string
  /** Color propio de la categoría: lo usa CategoryBadge (Movimientos, Inicio, Categorías). Informes NO lo usa (§7.5). */
  color: Category['color']
  amountCents: Cents
  count: number
  /** Entero 0..100 por resto mayor; la suma de todas las filas es 100 (o 0 si no hay gasto). */
  percent: number
}

export const BudgetStatus = { ok: 'ok', warning: 'warning', over: 'over' } as const
export type BudgetStatus = (typeof BudgetStatus)[keyof typeof BudgetStatus]

export type BudgetProgress = {
  budget: Budget
  month: MonthKey
  /** null cuando budget.categoryId es null (total). */
  category: Category | null
  spentCents: Cents
  limitCents: Cents
  /** limitCents − spentCents; negativo cuando se supera. */
  remainingCents: number
  /** spentCents / limitCents, sin recortar (la barra recorta a 1). Único float del dominio junto a percent. */
  ratio: number
  status: BudgetStatus
}

export type MonthKpis = {
  month: MonthKey
  daysInMonth: number
  /** 0 si el mes es futuro; día de hoy si es el actual; daysInMonth si es pasado. */
  daysElapsed: number
  /** Gasto del mes con date > today (0 en meses pasados). Se excluye de la media y la proyección. */
  futureExpenseCents: Cents
  /** Math.round(expensePastCents / daysElapsed); null si daysElapsed === 0. (expensePastCents = gasto con date <= today.) */
  avgDailyExpenseCents: Cents | null
  /** pasado: expenseCents; actual: Math.round(expensePastCents * daysInMonth / daysElapsed); futuro: null. */
  projectedExpenseCents: Cents | null
  /** Fecha con mayor gasto del mes; en caso de empate, la fecha más antigua; null si no hay gastos. */
  topDay: { date: LocalDate; expenseCents: Cents } | null
}

export type TotalBalance = {
  balanceCents: number
  /** Movimientos con date > today, excluidos del saldo. */
  futureCount: number
}

export type DayGroup = { date: LocalDate; netCents: number; transactions: Transaction[] }

export type TransactionFilter = {
  month: MonthKey
  query: string
  type: TransactionType | 'all'
  categoryId: Id | null
}

/** The folded «Otras» row of `foldOthers` (§4.5); always `--series-other` in the UI. */
const OTHERS_ROW = { categoryId: null, isOthers: true, name: 'Otras', icon: '…', color: 'gray' } as const

const DEFAULT_FOLD_MAX = 8
const DEFAULT_FOLD_MIN_PERCENT = 3

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Signed contribution of a transaction to a balance: incomes add, expenses subtract. */
function signedCents(t: Transaction): number {
  return t.type === 'income' ? t.amountCents : -t.amountCents
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, 'es')
}

function isExpense(t: Transaction): boolean {
  return t.type === 'expense'
}

/** Integer sum of `amountCents` over the expenses of `txs`. */
function sumExpenses(txs: readonly Transaction[]): Cents {
  let total = 0
  for (const t of txs) if (isExpense(t)) total += t.amountCents
  return total
}

// ---------------------------------------------------------------------------
// Selection and ordering
// ---------------------------------------------------------------------------

export function transactionsInMonth(txs: readonly Transaction[], month: MonthKey): Transaction[] {
  return txs.filter((t) => monthKeyOf(t.date) === month)
}

/** Orden canónico: date desc, createdAt desc, id asc. Never mutates the input. */
export function sortTransactions(txs: readonly Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt
    if (a.id !== b.id) return a.id < b.id ? -1 : 1
    return 0
  })
}

/**
 * Month + type + category + free-text search (§9 «Búsqueda y filtros»): the query is
 * normalized (NFD, no diacritics, lower-case, trim) and matches the note AND the
 * category name; an empty query means no text filter. Keeps the input order.
 */
export function filterTransactions(
  txs: readonly Transaction[],
  cats: ReadonlyMap<Id, Category>,
  f: TransactionFilter,
): Transaction[] {
  const query = normalizeText(f.query)
  return txs.filter((t) => {
    if (monthKeyOf(t.date) !== f.month) return false
    if (f.type !== 'all' && t.type !== f.type) return false
    if (f.categoryId !== null && t.categoryId !== f.categoryId) return false
    if (query === '') return true
    if (normalizeText(t.note).includes(query)) return true
    const category = cats.get(t.categoryId)
    return category !== undefined && normalizeText(category.name).includes(query)
  })
}

/**
 * Groups by date, newest day first; inside a group the input order is preserved
 * (callers pass the canonical order of `sortTransactions`).
 */
export function groupByDay(txs: readonly Transaction[]): DayGroup[] {
  const byDate = new Map<LocalDate, DayGroup>()
  for (const t of txs) {
    let group = byDate.get(t.date)
    if (group === undefined) {
      group = { date: t.date, netCents: 0, transactions: [] }
      byDate.set(t.date, group)
    }
    group.netCents += signedCents(t)
    group.transactions.push(t)
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

/** Integer totals of an arbitrary set (the filtered list); zeros for an empty set. */
export function summarize(txs: readonly Transaction[]): Omit<MonthSummary, 'month'> {
  let incomeCents = 0
  let expenseCents = 0
  for (const t of txs) {
    if (t.type === 'income') incomeCents += t.amountCents
    else expenseCents += t.amountCents
  }
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents, transactionCount: txs.length }
}

export function summarizeMonth(txs: readonly Transaction[], month: MonthKey): MonthSummary {
  return { month, ...summarize(transactionsInMonth(txs, month)) }
}

/** n entradas, la más antigua primero, terminando en endMonth; meses sin datos a cero. */
export function monthlyTrend(txs: readonly Transaction[], endMonth: MonthKey, n: number): MonthSummary[] {
  return lastNMonths(endMonth, n).map((month) => summarizeMonth(txs, month))
}

// ---------------------------------------------------------------------------
// Expenses by category
// ---------------------------------------------------------------------------

/** Gasto por categoría del mes: amountCents desc, luego name asc; percent por resto mayor. */
export function expensesByCategory(
  txs: readonly Transaction[],
  cats: readonly Category[],
  month: MonthKey,
): CategoryTotal[] {
  const byId = new Map<Id, Category>()
  for (const c of cats) byId.set(c.id, c)

  const totals = new Map<Id, { amountCents: Cents; count: number }>()
  for (const t of transactionsInMonth(txs, month)) {
    if (!isExpense(t)) continue
    const acc = totals.get(t.categoryId)
    if (acc === undefined) totals.set(t.categoryId, { amountCents: t.amountCents, count: 1 })
    else {
      acc.amountCents += t.amountCents
      acc.count++
    }
  }

  const rows: CategoryTotal[] = []
  for (const [categoryId, acc] of totals) {
    const category = byId.get(categoryId)
    // Invariants guarantee the category exists; a dangling id degrades to a gray placeholder rather than losing money.
    rows.push({
      categoryId,
      isOthers: false,
      name: category?.name ?? categoryId,
      icon: category?.icon ?? OTHERS_ROW.icon,
      color: category?.color ?? OTHERS_ROW.color,
      amountCents: acc.amountCents,
      count: acc.count,
      percent: 0,
    })
  }
  rows.sort((a, b) => b.amountCents - a.amountCents || compareNames(a.name, b.name))
  return withPercents(rows)
}

/** Returns copies of `rows` with `percent` recomputed by largest remainder over `amountCents`. */
function withPercents(rows: readonly CategoryTotal[]): CategoryTotal[] {
  const percents = largestRemainderPercents(rows.map((r) => r.amountCents))
  return rows.map((row, i) => ({ ...row, percent: percents[i] ?? 0 }))
}

/**
 * Keeps the rows with `percent >= minPercent` up to `max` named rows and folds the rest into a
 * final «Otras» row (`categoryId: null`, `isOthers: true`): at most max + 1 rows. When every row
 * is below the threshold the first `max` are kept. Percents are recomputed so they add up to 100.
 */
export function foldOthers(
  rows: readonly CategoryTotal[],
  opts?: { max?: number; minPercent?: number },
): CategoryTotal[] {
  const max = opts?.max ?? DEFAULT_FOLD_MAX
  const minPercent = opts?.minPercent ?? DEFAULT_FOLD_MIN_PERCENT

  let named = rows.filter((r) => r.percent >= minPercent).slice(0, max)
  if (named.length === 0) named = rows.slice(0, max)
  if (named.length === rows.length) return rows.map((r) => ({ ...r }))

  const kept = new Set<CategoryTotal>(named)
  let amountCents = 0
  let count = 0
  for (const r of rows) {
    if (kept.has(r)) continue
    amountCents += r.amountCents
    count += r.count
  }
  const others: CategoryTotal = { ...OTHERS_ROW, amountCents, count, percent: 0 }
  return withPercents([...named, others])
}

// ---------------------------------------------------------------------------
// Balance and KPIs
// ---------------------------------------------------------------------------

/** initialBalanceCents + Σ income − Σ expense over every movement with date <= today. */
export function totalBalance(txs: readonly Transaction[], initialBalanceCents: Cents, today: LocalDate): TotalBalance {
  let balanceCents = initialBalanceCents
  let futureCount = 0
  for (const t of txs) {
    if (t.date > today) futureCount++
    else balanceCents += signedCents(t)
  }
  return { balanceCents, futureCount }
}

/** §4.6: 0 for a future month, the day of `today` for the current one, the month length for a past one. */
function daysElapsedIn(month: MonthKey, today: LocalDate): number {
  const current = monthKeyOf(today)
  if (month > current) return 0
  if (month === current) return dayOf(today)
  return daysInMonth(month)
}

/** Day with the largest expense sum; ties go to the oldest date; null without expenses. */
function topExpenseDay(monthTxs: readonly Transaction[]): MonthKpis['topDay'] {
  const byDate = new Map<LocalDate, Cents>()
  for (const t of monthTxs) {
    if (!isExpense(t)) continue
    byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.amountCents)
  }
  let top: MonthKpis['topDay'] = null
  for (const [date, expenseCents] of byDate) {
    if (top === null || expenseCents > top.expenseCents || (expenseCents === top.expenseCents && date < top.date)) {
      top = { date, expenseCents }
    }
  }
  return top
}

export function monthKpis(txs: readonly Transaction[], month: MonthKey, today: LocalDate): MonthKpis {
  const monthTxs = transactionsInMonth(txs, month)
  const days = daysInMonth(month)
  const daysElapsed = daysElapsedIn(month, today)
  const expenseCents = sumExpenses(monthTxs)
  const futureExpenseCents = sumExpenses(monthTxs.filter((t) => t.date > today))
  const expensePastCents = expenseCents - futureExpenseCents

  let avgDailyExpenseCents: Cents | null = null
  let projectedExpenseCents: Cents | null = null
  if (daysElapsed > 0) {
    // The only intermediate floats of this module, rounded to integer cents right away.
    avgDailyExpenseCents = Math.round(expensePastCents / daysElapsed)
    projectedExpenseCents =
      month < monthKeyOf(today) ? expenseCents : Math.round((expensePastCents * days) / daysElapsed)
  }

  return {
    month,
    daysInMonth: days,
    daysElapsed,
    futureExpenseCents,
    avgDailyExpenseCents,
    projectedExpenseCents,
    topDay: topExpenseDay(monthTxs),
  }
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

function budgetStatusOf(spentCents: Cents, limitCents: Cents, ratio: number, warnRatio: number): BudgetStatus {
  if (spentCents > limitCents) return BudgetStatus.over
  if (ratio >= warnRatio) return BudgetStatus.warning
  return BudgetStatus.ok
}

/** One entry per budget: the total (categoryId null) first, then by ratio desc. */
export function budgetProgress(data: AppData, month: MonthKey): BudgetProgress[] {
  const monthTxs = transactionsInMonth(data.transactions, month)
  const byId = new Map<Id, Category>()
  for (const c of data.categories) byId.set(c.id, c)
  const warnRatio = data.settings.budgetWarnRatio

  const rows = data.budgets.map((budget): BudgetProgress => {
    const category = budget.categoryId === null ? null : (byId.get(budget.categoryId) ?? null)
    const spentCents =
      budget.categoryId === null
        ? sumExpenses(monthTxs)
        : sumExpenses(monthTxs.filter((t) => t.categoryId === budget.categoryId))
    const limitCents = budget.limitCents
    const ratio = spentCents / limitCents
    return {
      budget,
      month,
      category,
      spentCents,
      limitCents,
      remainingCents: limitCents - spentCents,
      ratio,
      status: budgetStatusOf(spentCents, limitCents, ratio, warnRatio),
    }
  })

  return rows.sort((a, b) => {
    const aTotal = a.budget.categoryId === null
    const bTotal = b.budget.categoryId === null
    if (aTotal !== bTotal) return aTotal ? -1 : 1
    if (a.ratio !== b.ratio) return b.ratio - a.ratio
    return compareNames(a.category?.name ?? '', b.category?.name ?? '')
  })
}

/** P1-18 (closed signature, no UI in P0): the month's expense rows of categories that have no budget. */
export function categoriesWithoutBudget(data: AppData, month: MonthKey): CategoryTotal[] {
  const budgeted = new Set<Id>()
  for (const b of data.budgets) if (b.categoryId !== null) budgeted.add(b.categoryId)
  return expensesByCategory(data.transactions, data.categories, month).filter(
    (row) => row.categoryId !== null && !budgeted.has(row.categoryId),
  )
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** Number of movements per categoryId (categories without movements are absent). */
export function countTransactionsByCategory(txs: readonly Transaction[]): ReadonlyMap<Id, number> {
  const counts = new Map<Id, number>()
  for (const t of txs) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1)
  return counts
}

/** The `n` newest movements in canonical order. */
export function recentTransactions(txs: readonly Transaction[], n: number): Transaction[] {
  return sortTransactions(txs).slice(0, Math.max(0, n))
}
