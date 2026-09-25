// ============================================================================
// src/ui/components/charts/IncomeExpenseBars.tsx — «Ingresos frente a gastos»
// (F7, §7.5): grouped BarChart of the last 6 months (--series-income /
// --series-expense, 2px gap, 4px radius on the data ends), one Y axis with
// formatCompactCents, horizontal hairline grid, es-ES tooltip, an HTML legend
// and the accessible <table> twin (Mes / Ingresos / Gastos / Balance) that the
// e2e assertions read. `TrendTable` is exported so the empty state can keep it.
// ============================================================================
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { formatMonthLabel, formatShortMonth } from '../../../domain/dates'
import { formatCents, formatCompactCents } from '../../../domain/money'
import type { MonthSummary } from '../../../domain/queries'
import { copy } from '../../copy'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Money } from '../Money'
import { ChartFrame } from './ChartFrame'
import type { ChartSize } from './ChartFrame'
import { REDUCED_MOTION_QUERY, useChartColors } from './chartColors'
import './charts.css'

export type IncomeExpenseBarsProps = {
  /** `monthlyTrend(txs, month, 6)`: oldest first, months without data at zero. */
  rows: readonly MonthSummary[]
  currency: string
  /** aria-label of the chart wrapper (§8.2). */
  ariaLabel: string
  /** Fixed size for tests (no ResponsiveContainer). */
  size?: ChartSize
  /** Chart height at runtime (default 240, §7.5). */
  height?: number
}

type BarDatum = {
  month: string
  label: string
  monthLabel: string
  income: number
  expense: number
}

const INCOME_KEY = 'income'
const EXPENSE_KEY = 'expense'

function BarsTooltip({ active, payload, currency }: TooltipContentProps & { currency: string }) {
  if (!active || payload.length === 0) return null
  const datum = payload[0]?.payload as BarDatum | undefined
  if (datum === undefined) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{datum.monthLabel}</p>
      {payload.map((entry) => {
        const isIncome = entry.dataKey === INCOME_KEY
        const value = typeof entry.value === 'number' ? entry.value : 0
        return (
          <p key={String(entry.dataKey)} className="chart-tooltip__row">
            <span className="chart-legend__swatch" style={{ background: entry.color ?? entry.fill }} aria-hidden="true" />
            <span className="chart-tooltip__meta">{isIncome ? copy.reports.seriesIncome : copy.reports.seriesExpense}</span>
            <span className="chart-tooltip__value">{formatCents(value, currency)}</span>
          </p>
        )
      })}
    </div>
  )
}

export type TrendTableProps = {
  rows: readonly MonthSummary[]
  currency: string
}

/** Accessible twin of the bar chart: Mes / Ingresos / Gastos / Balance, balance with explicit sign. */
export function TrendTable({ rows, currency }: TrendTableProps) {
  return (
    <div className="table-wrap">
      <table className="table trend-table">
        <caption className="visually-hidden">{copy.reports.incomeVsExpense}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.reports.tableMonth}</th>
            <th scope="col" className="num">
              {copy.reports.tableIncome}
            </th>
            <th scope="col" className="num">
              {copy.reports.tableExpense}
            </th>
            <th scope="col" className="num">
              {copy.reports.tableBalance}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">{formatMonthLabel(row.month)}</th>
              <td className="num">
                <Money cents={row.incomeCents} currency={currency} />
              </td>
              <td className="num">
                <Money cents={row.expenseCents} currency={currency} />
              </td>
              <td className="num">
                <Money cents={row.balanceCents} currency={currency} signDisplay="exceptZero" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function IncomeExpenseBars({ rows, currency, ariaLabel, size, height = 240 }: IncomeExpenseBarsProps) {
  const colors = useChartColors()
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const animate = !reduceMotion && size === undefined

  const data = useMemo<BarDatum[]>(
    () =>
      rows.map((row) => ({
        month: row.month,
        label: formatShortMonth(row.month),
        monthLabel: formatMonthLabel(row.month),
        income: row.incomeCents,
        expense: row.expenseCents,
      })),
    [rows],
  )

  const tick = { fill: colors.tick, fontSize: 12 }

  return (
    <div className="bars">
      <ChartFrame height={height} size={size} ariaLabel={ariaLabel} className="bars__chart">
        {(dims) => (
          <BarChart
            width={dims?.width}
            height={dims?.height}
            data={data}
            barGap={2}
            barCategoryGap="20%"
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            accessibilityLayer={false}
          >
            <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray={undefined} />
            <XAxis
              dataKey="label"
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: colors.axis }}
              interval={0}
            />
            <YAxis
              width="auto"
              tick={tick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompactCents(value, currency)}
            />
            <Tooltip
              cursor={{ fill: colors.grid, fillOpacity: 0.5 }}
              content={(props: TooltipContentProps) => <BarsTooltip {...props} currency={currency} />}
              isAnimationActive={false}
            />
            <Bar
              dataKey={INCOME_KEY}
              name={copy.reports.seriesIncome}
              fill={colors.income}
              radius={[4, 4, 0, 0]}
              isAnimationActive={animate}
            />
            <Bar
              dataKey={EXPENSE_KEY}
              name={copy.reports.seriesExpense}
              fill={colors.expense}
              radius={[4, 4, 0, 0]}
              isAnimationActive={animate}
            />
          </BarChart>
        )}
      </ChartFrame>

      <ul className="chart-legend chart-legend--inline bars__legend">
        <li className="chart-legend__item">
          <div className="chart-legend__row">
            <span className="chart-legend__swatch" data-slot="--series-income" style={{ background: colors.income }} aria-hidden="true" />
            <span className="chart-legend__name">{copy.reports.seriesIncome}</span>
          </div>
        </li>
        <li className="chart-legend__item">
          <div className="chart-legend__row">
            <span className="chart-legend__swatch" data-slot="--series-expense" style={{ background: colors.expense }} aria-hidden="true" />
            <span className="chart-legend__name">{copy.reports.seriesExpense}</span>
          </div>
        </li>
      </ul>

      <TrendTable rows={rows} currency={currency} />
    </div>
  )
}
