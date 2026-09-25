// ============================================================================
// src/ui/views/ReportsContent.tsx — the lazily loaded body of Informes (F7,
// §7.5): it is the only module that imports Recharts, so the chart bundle
// stays out of the daily quick-add path. Default export for React.lazy.
// Card «Gastos por categoría»: foldOthers(expensesByCategory(txs, cats, month))
// → donut + legend (row tap → Movimientos filtered by category). Card
// «Ingresos frente a gastos»: monthlyTrend(txs, month, 6) → grouped bars +
// table; when every month is zero only the empty state and the table remain.
// ============================================================================
import { useMemo } from 'react'
import { formatMonthLabel } from '../../domain/dates'
import { formatCents } from '../../domain/money'
import { expensesByCategory, foldOthers, monthlyTrend, summarizeMonth } from '../../domain/queries'
import type { Id } from '../../domain/types'
import { EmptyState } from '../components/EmptyState'
import { ExpenseDonut } from '../components/charts/ExpenseDonut'
import { IncomeExpenseBars, TrendTable } from '../components/charts/IncomeExpenseBars'
import { copy } from '../copy'
import { useAppData } from '../state/useStore'
import { useUi, useUiActions } from '../state/useUi'
import './reports.css'

/** Months shown in «Ingresos frente a gastos» (the 12-month toggle is P1-19). */
export const TREND_MONTHS = 6

export default function ReportsContent() {
  const data = useAppData()
  const { month } = useUi()
  const { nav } = useUiActions()
  const currency = data.settings.currency

  const breakdown = useMemo(
    () => foldOthers(expensesByCategory(data.transactions, data.categories, month)),
    [data, month],
  )
  const summary = useMemo(() => summarizeMonth(data.transactions, month), [data, month])
  const trend = useMemo(() => monthlyTrend(data.transactions, month, TREND_MONTHS), [data, month])
  const trendIsEmpty = trend.every((row) => row.incomeCents === 0 && row.expenseCents === 0)

  const monthLabel = formatMonthLabel(month)
  const donutAria = copy.reports.byCategoryAriaLabel(monthLabel, formatCents(summary.expenseCents, currency))
  const barsAria = copy.reports.chartAriaLabel(
    monthLabel,
    formatCents(summary.expenseCents, currency),
    formatCents(summary.incomeCents, currency),
  )

  const drillDown = (categoryId: Id) => nav('transactions', { categoryId })

  return (
    <div className="screen screen--reports" data-screen={copy.nav.reports}>
      <div className="reports__grid">
        <section className="section reports__card" aria-labelledby="reports-by-category">
          <h3 id="reports-by-category" className="section__title">
            {copy.reports.byCategory}
          </h3>
          {breakdown.length === 0 ? (
            <EmptyState title={copy.reports.emptyCategories} />
          ) : (
            <ExpenseDonut
              rows={breakdown}
              totalCents={summary.expenseCents}
              currency={currency}
              ariaLabel={donutAria}
              onSelect={drillDown}
            />
          )}
        </section>

        <section className="section reports__card" aria-labelledby="reports-trend">
          <h3 id="reports-trend" className="section__title">
            {copy.reports.incomeVsExpense}
          </h3>
          {trendIsEmpty ? (
            <>
              <EmptyState title={copy.reports.emptyTrend} />
              <TrendTable rows={trend} currency={currency} />
            </>
          ) : (
            <IncomeExpenseBars rows={trend} currency={currency} ariaLabel={barsAria} />
          )}
        </section>
      </div>
    </div>
  )
}
