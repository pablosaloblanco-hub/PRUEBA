// ============================================================================
// src/ui/components/charts/ExpenseDonut.tsx — «Gastos por categoría» (F7,
// §7.5): PieChart donut (innerRadius 60 %, outerRadius 90 %, 2px gaps), one
// Cell per folded row coloured by POSITION (--series-{i+1}, «Otras» →
// --series-other; CategoryTotal.color is NOT used here), the total as an HTML
// centre label, an es-ES tooltip and an HTML legend (swatch, emoji, name,
// amount, percent) whose rows are buttons that drill down to Movimientos
// (the «Otras» row is not interactive). No Recharts <Legend>. The SVG is inert
// (`accessibilityLayer={false}`): the role="img" wrapper + the HTML legend are
// the accessible representation (§8.2), so keyboard users get no unnamed stops.
// ============================================================================
import { useMemo } from 'react'
import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { formatCents } from '../../../domain/money'
import type { CategoryTotal } from '../../../domain/queries'
import type { Id } from '../../../domain/types'
import { copy } from '../../copy'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Money } from '../Money'
import { ChartFrame } from './ChartFrame'
import type { ChartSize } from './ChartFrame'
import { REDUCED_MOTION_QUERY, seriesSlot, slotColor, useChartColors } from './chartColors'
import type { SeriesSlot } from './chartColors'
import './charts.css'

export type ExpenseDonutProps = {
  /** Folded breakdown: `foldOthers(expensesByCategory(...))`, at most 8 named rows + «Otras». */
  rows: readonly CategoryTotal[]
  totalCents: number
  currency: string
  /** aria-label of the chart wrapper (§8.2). */
  ariaLabel: string
  /** Legend row tap → Movimientos filtered by that category; never called for «Otras». */
  onSelect?: (categoryId: Id) => void
  /** Fixed size for tests (no ResponsiveContainer). */
  size?: ChartSize
  /** Chart height at runtime (default 240, §7.5). */
  height?: number
}

type DonutDatum = {
  name: string
  value: number
  percent: number
  slot: SeriesSlot
  color: string
}

function DonutTooltip({ active, payload, currency }: TooltipContentProps & { currency: string }) {
  if (!active || payload.length === 0) return null
  const entry = payload[0]
  if (entry === undefined) return null
  const datum = entry.payload as DonutDatum | undefined
  if (datum === undefined) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">
        <span className="chart-legend__swatch" style={{ background: datum.color }} aria-hidden="true" />
        {datum.name}
      </p>
      <p className="chart-tooltip__row">
        <span className="chart-tooltip__value">{formatCents(datum.value, currency)}</span>
        <span className="chart-tooltip__meta">{copy.reports.percent(datum.percent)}</span>
      </p>
    </div>
  )
}

export function ExpenseDonut({ rows, totalCents, currency, ariaLabel, onSelect, size, height = 240 }: ExpenseDonutProps) {
  const colors = useChartColors()
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const animate = !reduceMotion && size === undefined

  const data = useMemo<DonutDatum[]>(
    () =>
      rows.map((row, i) => {
        const slot = seriesSlot(i, row.isOthers)
        const name = row.isOthers ? copy.reports.others : row.name
        return { name, value: row.amountCents, percent: row.percent, slot, color: slotColor(colors, slot) }
      }),
    [rows, colors],
  )

  const centre = (
    <div className="donut__center">
      <span className="donut__center-label">{copy.reports.total}</span>
      <span className="donut__center-total tabular-nums">{formatCents(totalCents, currency)}</span>
    </div>
  )

  return (
    <div className="donut">
      <ChartFrame height={height} size={size} ariaLabel={ariaLabel} overlay={centre} className="donut__chart">
        {(dims) => (
          <PieChart
            width={dims?.width}
            height={dims?.height}
            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
            accessibilityLayer={false}
          >
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={animate}
              rootTabIndex={-1}
            >
              {data.map((d) => (
                <Cell key={d.slot} fill={d.color} data-slot={d.slot} />
              ))}
            </Pie>
            <Tooltip
              content={(props: TooltipContentProps) => <DonutTooltip {...props} currency={currency} />}
              isAnimationActive={false}
            />
          </PieChart>
        )}
      </ChartFrame>

      <ul className="chart-legend donut__legend">
        {rows.map((row, i) => {
          const datum = data[i]
          const slot = datum?.slot ?? seriesSlot(i, row.isOthers)
          const color = datum?.color ?? slotColor(colors, slot)
          const name = datum?.name ?? row.name
          const content = (
            <>
              <span className="chart-legend__swatch" data-slot={slot} style={{ background: color }} aria-hidden="true" />
              <span className="chart-legend__icon" aria-hidden="true">
                {row.icon}
              </span>
              <span className="chart-legend__name truncate">{name}</span>
              <Money cents={row.amountCents} currency={currency} className="chart-legend__amount" />
              <span className="chart-legend__percent tabular-nums">{copy.reports.percent(row.percent)}</span>
            </>
          )
          const interactive = !row.isOthers && row.categoryId !== null && onSelect !== undefined
          const categoryId = row.categoryId
          return (
            <li key={row.categoryId ?? 'others'} className="chart-legend__item">
              {interactive && categoryId !== null ? (
                <button type="button" className="chart-legend__row chart-legend__row--button" onClick={() => onSelect(categoryId)}>
                  {content}
                </button>
              ) : (
                <div className="chart-legend__row">{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
