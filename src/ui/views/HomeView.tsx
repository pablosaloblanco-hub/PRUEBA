// ============================================================================
// src/ui/views/HomeView.tsx — Inicio (§2.1 F6, §7.1): hero «Balance del mes»
// with Ingresos/Gastos tiles, «Saldo total», the month KPIs (average daily
// expense, end-of-month projection), the top budgets, the top-5 expense
// categories as CSS bars and the 5 latest movements. First-use and
// empty-month states. All numbers come from src/domain/queries.
// ============================================================================
import { useMemo } from 'react'
import { formatMonthLabel, monthKeyOf } from '../../domain/dates'
import { formatCents } from '../../domain/money'
import {
  budgetProgress,
  categoriesById,
  expensesByCategory,
  monthKpis,
  recentTransactions,
  summarizeMonth,
  totalBalance,
  transactionsInMonth,
} from '../../domain/queries'
import type { CategoryTotal } from '../../domain/queries'
import type { Id } from '../../domain/types'
import { BudgetCard } from '../components/BudgetCard'
import { CategoryBadge } from '../components/CategoryBadge'
import { EmptyState } from '../components/EmptyState'
import { ProgressBar } from '../components/ProgressBar'
import { TransactionRow } from '../components/TransactionRow'
import { copy } from '../copy'
import { useAppData } from '../state/useStore'
import { useToday, useUi, useUiActions } from '../state/useUi'
import './home.css'

/** Rows shown in the Presupuestos section (total first, then by ratio, §2.1 F6). */
const MAX_BUDGET_ROWS = 3
/** Bars shown in «Gastos por categoría». */
const MAX_CATEGORY_ROWS = 5
/** Rows shown in «Últimos movimientos». */
const MAX_RECENT_ROWS = 5
/**
 * Character counts of the formatted amount («−1.234.567,89 €» is 15) from which
 * each figure steps down a size tier (home.css), calibrated for the 294 px hero,
 * 117 px tiles and 132 px KPI tiles of a 360 px viewport: hero 36 → 28 → 22 px;
 * tile 18 → 16 px, then one tile per row; KPI 22 → 18 → 15 px, then one per row.
 */
const HERO_SIZE_STEPS = [13, 17] as const
const TILE_SIZE_STEPS = [11, 12] as const
const KPI_SIZE_STEPS = [10, 12, 15] as const

/**
 * Size tier of a big amount so seven-digit figures shrink instead of being cut
 * with an ellipsis at 360 px (§11.5 «importes sin salto de línea»). Thresholds
 * are character counts of the formatted text («−1.234.567,89 €» is 15).
 */
const SIZE_TIERS = ['lg', 'md', 'sm', 'xs'] as const
type AmountSize = (typeof SIZE_TIERS)[number]

/** Tier of the longest of `texts`: one step down per threshold of `steps` reached. */
function amountSize(texts: readonly string[], steps: readonly number[]): AmountSize {
  const length = Math.max(...texts.map((t) => t.length))
  let tier = 0
  for (const from of steps) if (length >= from) tier++
  return SIZE_TIERS[tier] ?? 'xs'
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
          <span className="home-category__percent tabular-nums">{copy.reports.percent(row.percent)}</span>
        </span>
        <ProgressBar value={row.percent / 100} status="ok" label={`${row.name}: ${amount} (${copy.reports.percent(row.percent)})`} />
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
  const budgets = useMemo(() => budgetProgress(data, month).slice(0, MAX_BUDGET_ROWS), [data, month])
  const topCategories = useMemo(
    () => expensesByCategory(data.transactions, data.categories, month).slice(0, MAX_CATEGORY_ROWS),
    [data, month],
  )
  const recent = useMemo(() => recentTransactions(monthTransactions, MAX_RECENT_ROWS), [monthTransactions])
  const categoryMap = useMemo(() => categoriesById(data.categories), [data])

  const isCurrentMonth = month === monthKeyOf(today)
  const kpiSuffix = kpis.futureExpenseCents > 0 ? ` ${copy.home.kpiFutureSuffix(kpis.futureExpenseCount)}` : ''
  const projectionHint = isCurrentMonth ? `${copy.home.dayOf(kpis.daysElapsed, kpis.daysInMonth)}${kpiSuffix}` : undefined
  const avgValue =
    kpis.avgDailyExpenseCents === null ? copy.common.notApplicable : formatCents(kpis.avgDailyExpenseCents, currency)
  const projectionValue =
    kpis.projectedExpenseCents === null ? copy.common.notApplicable : formatCents(kpis.projectedExpenseCents, currency)

  const heroText = formatCents(summary.balanceCents, currency, { signDisplay: 'exceptZero' })
  const incomeText = formatCents(summary.incomeCents, currency)
  const expenseText = formatCents(summary.expenseCents, currency)
  const heroSize = amountSize([heroText], HERO_SIZE_STEPS)
  const tileSize = amountSize([incomeText, expenseText], TILE_SIZE_STEPS)
  const kpiSize = amountSize([avgValue, projectionValue], KPI_SIZE_STEPS)

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
          <p
            className={`home-hero__value tabular-nums ${balanceClass(summary.balanceCents)}`}
            data-size={heroSize}
          >
            {heroText}
          </p>
          <div className="home-hero__tiles" data-size={tileSize}>
            <div className="home-tile home-tile--income">
              <span className="home-tile__label">{copy.home.income}</span>
              <span className="money money--neutral home-tile__value">{incomeText}</span>
            </div>
            <div className="home-tile home-tile--expense">
              <span className="home-tile__label">{copy.home.expense}</span>
              <span className="money money--neutral home-tile__value">{expenseText}</span>
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

        <div className="kpi-grid home-kpis" data-size={kpiSize}>
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
                category={categoryMap.get(transaction.categoryId)}
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
