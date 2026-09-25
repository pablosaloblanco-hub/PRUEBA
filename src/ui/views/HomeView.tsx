// ============================================================================
// src/ui/views/HomeView.tsx — Inicio (§2.1 F6, §7.1): hero «Balance del mes»
// with Ingresos/Gastos tiles, «Saldo total», the month KPIs (average daily
// expense, end-of-month projection), the top budgets, the top-5 expense
// categories as CSS bars and the 5 latest movements. First-use and
// empty-month states. All numbers come from src/domain/queries.
// ============================================================================
import { useMemo } from 'react'
import { compareDates, formatMonthLabel, monthKeyOf } from '../../domain/dates'
import { formatCents } from '../../domain/money'
import {
  budgetProgress,
  expensesByCategory,
  monthKpis,
  recentTransactions,
  summarizeMonth,
  totalBalance,
  transactionsInMonth,
} from '../../domain/queries'
import type { CategoryTotal } from '../../domain/queries'
import type { Category, Id, Transaction } from '../../domain/types'
import { BudgetCard } from '../components/BudgetCard'
import { CategoryBadge } from '../components/CategoryBadge'
import { EmptyState } from '../components/EmptyState'
import { Money } from '../components/Money'
import { ProgressBar } from '../components/ProgressBar'
import { TransactionRow } from '../components/TransactionRow'
import { copy } from '../copy'
import { useAppData } from '../state/useStore'
import { useToday, useUi, useUiActions } from '../state/useUi'
import './budgets.css'
import './transactions.css'
import './home.css'

/** Rows shown in the Presupuestos section (total first, then by ratio, §2.1 F6). */
const MAX_BUDGET_ROWS = 3
/** Bars shown in «Gastos por categoría». */
const MAX_CATEGORY_ROWS = 5
/** Rows shown in «Últimos movimientos». */
const MAX_RECENT_ROWS = 5

/** Number of expense movements of `txs` dated after `today` (the KPI suffix counts movements, not cents). */
function countFutureExpenses(txs: readonly Transaction[], today: string): number {
  let n = 0
  for (const t of txs) if (t.type === 'expense' && compareDates(t.date, today) > 0) n++
  return n
}

/** Semantic colour class of a signed balance (§8.1: income green, expense red, zero neutral). */
function balanceClass(cents: number): string {
  if (cents > 0) return 'text-income'
  if (cents < 0) return 'text-expense'
  return ''
}

type KpiTileProps = { label: string; value: string; hint?: string }

function KpiTile({ label, value, hint }: KpiTileProps) {
  return (
    <div className="kpi">
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {hint !== undefined ? <span className="kpi__hint">{hint}</span> : null}
    </div>
  )
}

type SectionHeaderProps = { title: string; actionLabel?: string; onAction?: () => void }

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <div className="section__header">
      <h3 className="section__title">{title}</h3>
      {actionLabel !== undefined && onAction !== undefined ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

type CategoryBarProps = { row: CategoryTotal; currency: string; onSelect: (categoryId: Id) => void }

/** One «Gastos por categoría» row: a button (no nested controls) with a CSS bar underneath. */
function CategoryBar({ row, currency, onSelect }: CategoryBarProps) {
  const amount = formatCents(row.amountCents, currency)
  return (
    <li className="home-category">
      <button
        type="button"
        className="home-category__button"
        disabled={row.categoryId === null}
        onClick={() => {
          if (row.categoryId !== null) onSelect(row.categoryId)
        }}
      >
        <span className="home-category__row">
          <CategoryBadge icon={row.icon} color={row.color} size="sm" />
          <span className="home-category__name truncate">{row.name}</span>
          <span className="home-category__amount tabular-nums">{amount}</span>
          <span className="home-category__percent tabular-nums">{row.percent} %</span>
        </span>
        <ProgressBar value={row.percent / 100} status="ok" label={`${row.name}: ${amount} (${row.percent} %)`} />
      </button>
    </li>
  )
}

export function HomeView() {
  const data = useAppData()
  const today = useToday()
  const { month } = useUi()
  const { nav, openSheet } = useUiActions()
  const currency = data.settings.currency

  const summary = useMemo(() => summarizeMonth(data.transactions, month), [data, month])
  const balance = useMemo(
    () => totalBalance(data.transactions, data.settings.initialBalanceCents, today),
    [data, today],
  )
  const kpis = useMemo(() => monthKpis(data.transactions, month, today), [data, month, today])
  const monthTransactions = useMemo(() => transactionsInMonth(data.transactions, month), [data, month])
  const futureExpenseCount = useMemo(() => countFutureExpenses(monthTransactions, today), [monthTransactions, today])
  const budgets = useMemo(() => budgetProgress(data, month).slice(0, MAX_BUDGET_ROWS), [data, month])
  const topCategories = useMemo(
    () => expensesByCategory(data.transactions, data.categories, month).slice(0, MAX_CATEGORY_ROWS),
    [data, month],
  )
  const recent = useMemo(() => recentTransactions(monthTransactions, MAX_RECENT_ROWS), [monthTransactions])
  const categoriesById = useMemo(() => {
    const map = new Map<Id, Category>()
    for (const c of data.categories) map.set(c.id, c)
    return map
  }, [data])

  const isCurrentMonth = month === monthKeyOf(today)
  const kpiSuffix = kpis.futureExpenseCents > 0 ? ` ${copy.home.kpiFutureSuffix(futureExpenseCount)}` : ''
  const projectionHint = isCurrentMonth ? `${copy.home.dayOf(kpis.daysElapsed, kpis.daysInMonth)}${kpiSuffix}` : undefined
  const avgValue =
    kpis.avgDailyExpenseCents === null ? copy.common.notApplicable : formatCents(kpis.avgDailyExpenseCents, currency)
  const projectionValue =
    kpis.projectedExpenseCents === null ? copy.common.notApplicable : formatCents(kpis.projectedExpenseCents, currency)

  const openNewTransaction = () => openSheet({ kind: 'transaction/new' })

  if (data.transactions.length === 0) {
    return (
      <div className="screen screen--home" data-screen={copy.nav.home}>
        <section className="section">
          <EmptyState
            title={copy.home.firstUseTitle}
            actionLabel={copy.home.firstUseCta}
            onAction={openNewTransaction}
            secondaryLabel={copy.home.firstUseImport}
            onSecondary={() => nav('settings')}
          />
        </section>
      </div>
    )
  }

  const monthIsEmpty = monthTransactions.length === 0

  return (
    <div className="screen screen--home" data-screen={copy.nav.home}>
      <div className="home__top">
        <section className="section home-hero" aria-label={copy.home.monthBalance}>
          <p className="home-hero__label">{copy.home.monthBalance}</p>
          <p className={`home-hero__value tabular-nums ${balanceClass(summary.balanceCents)}`}>
            {formatCents(summary.balanceCents, currency, { signDisplay: 'exceptZero' })}
          </p>
          <div className="home-hero__tiles">
            <div className="home-tile home-tile--income">
              <span className="home-tile__label">{copy.home.income}</span>
              <Money cents={summary.incomeCents} currency={currency} className="home-tile__value" />
            </div>
            <div className="home-tile home-tile--expense">
              <span className="home-tile__label">{copy.home.expense}</span>
              <Money cents={summary.expenseCents} currency={currency} className="home-tile__value" />
            </div>
          </div>
        </section>

        <section className="section home-balance" aria-label={copy.home.totalBalance}>
          <p className="home-balance__label">{copy.home.totalBalance}</p>
          <p className="home-balance__value tabular-nums">
            {formatCents(balance.balanceCents, currency)}
            {balance.futureCount > 0 ? (
              <span className="home-balance__future"> {copy.home.futureSuffix(balance.futureCount)}</span>
            ) : null}
          </p>
          <p className="home-balance__help">{copy.home.totalBalanceHelp}</p>
        </section>

        <div className="kpi-grid home-kpis">
          <KpiTile label={copy.home.avgDaily} value={avgValue} />
          <KpiTile label={copy.home.projection} value={projectionValue} hint={projectionHint} />
        </div>
      </div>

      <div className="home__grid">
        <section className="section home-budgets" aria-label={copy.home.budgets}>
          <SectionHeader
            title={copy.home.budgets}
            actionLabel={budgets.length > 0 ? copy.home.seeAllBudgets : undefined}
            onAction={budgets.length > 0 ? () => nav('budgets') : undefined}
          />
          {budgets.length === 0 ? (
            <EmptyState
              title={copy.home.noBudgets}
              actionLabel={copy.home.createBudget}
              onAction={() => openSheet({ kind: 'budget/new' })}
            />
          ) : (
            <div className="home-budgets__list">
              {budgets.map((row) => (
                <BudgetCard key={row.budget.id} progress={row} currency={currency} compact />
              ))}
            </div>
          )}
        </section>

        {monthIsEmpty ? (
          <section className="section home-empty-month">
            <EmptyState title={copy.home.emptyMonth(formatMonthLabel(month))} />
          </section>
        ) : (
          <section className="section home-categories" aria-label={copy.home.byCategory}>
            <SectionHeader title={copy.home.byCategory} actionLabel={copy.home.seeReport} onAction={() => nav('reports')} />
            {topCategories.length === 0 ? (
              <p className="text-muted">{copy.reports.emptyCategories}</p>
            ) : (
              <ul className="home-categories__list">
                {topCategories.map((row) => (
                  <CategoryBar
                    key={row.categoryId ?? 'others'}
                    row={row}
                    currency={currency}
                    onSelect={(categoryId) => nav('transactions', { categoryId })}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {monthIsEmpty ? null : (
        <section className="section home-recent" aria-label={copy.home.recent}>
          <SectionHeader
            title={copy.home.recent}
            actionLabel={copy.home.seeAllTransactions}
            onAction={() => nav('transactions')}
          />
          <ul className="list">
            {recent.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                category={categoriesById.get(transaction.categoryId)}
                currency={currency}
                onSelect={(id) => openSheet({ kind: 'transaction/edit', id })}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
