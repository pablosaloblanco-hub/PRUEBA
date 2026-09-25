// ============================================================================
// src/ui/components/charts/charts.test.tsx — §10.2 «Charts»: ExpenseDonut and
// IncomeExpenseBars with a fixed `size` over the §3.7 fixture. Only the HTML
// legend/table is asserted, plus one SVG check: legend swatch i carries the
// same slot (--series-{i+1} / --series-other) and colour as Cell i.
// ============================================================================
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expensesByCategory, foldOthers, monthlyTrend, summarizeMonth } from '../../../domain/queries'
import type { CategoryTotal } from '../../../domain/queries'
import { cat, fixtureData, tx } from '../../../test/fixtures'
import { CHART_COLOR_FALLBACKS, readChartColors, seriesSlot, slotColor } from './chartColors'
import { ExpenseDonut } from './ExpenseDonut'
import { IncomeExpenseBars, TrendTable } from './IncomeExpenseBars'

const SIZE = { width: 320, height: 240 }
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ')

const data = fixtureData()
const MONTH = '2026-09'
const breakdown = foldOthers(expensesByCategory(data.transactions, data.categories, MONTH))
const summary = summarizeMonth(data.transactions, MONTH)
const trend = monthlyTrend(data.transactions, MONTH, 6)

function renderDonut(rows: readonly CategoryTotal[] = breakdown, onSelect?: (id: string) => void) {
  return render(
    <ExpenseDonut
      rows={rows}
      totalCents={summary.expenseCents}
      currency="EUR"
      ariaLabel="Gastos por categoría de septiembre 2026: 843,20 €"
      onSelect={onSelect}
      size={SIZE}
    />,
  )
}

describe('chartColors', () => {
  it('falls back to the light tokens in jsdom and maps slots by position', () => {
    const colors = readChartColors()
    expect(colors.series).toHaveLength(8)
    expect(colors.series[0]).toBe(CHART_COLOR_FALLBACKS.series[0])
    expect(seriesSlot(0, false)).toBe('--series-1')
    expect(seriesSlot(7, false)).toBe('--series-8')
    expect(seriesSlot(8, false)).toBe('--series-other')
    expect(seriesSlot(2, true)).toBe('--series-other')
    expect(slotColor(colors, '--series-3')).toBe(colors.series[2])
    expect(slotColor(colors, '--series-other')).toBe(colors.other)
  })
})

describe('ExpenseDonut (fixture, septiembre 2026)', () => {
  it('lists the four legend rows with amount and percent, and the total in the centre', () => {
    renderDonut()
    const legend = screen.getByRole('list')
    const items = within(legend).getAllByRole('listitem')
    expect(items.map((li) => norm(li.textContent))).toEqual([
      '🏠Vivienda600,00 €71 %',
      '🎬Ocio110,00 €13 %',
      '🛒Alimentación83,20 €10 %',
      '📱Suscripciones50,00 €6 %',
    ])
    expect(screen.queryByText('Otras')).not.toBeInTheDocument()
    expect(norm(screen.getByText(/843,20/).textContent)).toBe('843,20 €')
    expect(screen.getByRole('img', { name: 'Gastos por categoría de septiembre 2026: 843,20 €' })).toBeInTheDocument()
  })

  it('legend swatch i and Cell i share the positional slot colour', () => {
    const { container } = renderDonut()
    const swatches = container.querySelectorAll('.chart-legend .chart-legend__swatch')
    const sectors = container.querySelectorAll('.recharts-pie-sector path, path.recharts-sector')
    expect(swatches).toHaveLength(4)
    expect(sectors).toHaveLength(4)
    swatches.forEach((swatch, i) => {
      const slot = seriesSlot(i, false)
      expect(swatch.getAttribute('data-slot')).toBe(slot)
      const sector = sectors[i]!
      expect(sector.getAttribute('data-slot')).toBe(slot)
      expect(sector.getAttribute('fill')).toBe(slotColor(CHART_COLOR_FALLBACKS, slot))
      expect((swatch as HTMLElement).style.background).not.toBe('')
    })
  })

  it('legend rows are buttons that report the category id; «Otras» is not interactive', async () => {
    const onSelect = vi.fn()
    const many: CategoryTotal[] = [
      ...breakdown,
      { categoryId: null, isOthers: true, name: 'Otras', icon: '…', color: 'gray', amountCents: 100, count: 3, percent: 0 },
    ]
    const user = userEvent.setup()
    const { container } = renderDonut(many, onSelect)
    await user.click(screen.getByRole('button', { name: /Ocio/ }))
    expect(onSelect).toHaveBeenCalledWith('cat-ocio')
    expect(screen.queryByRole('button', { name: /Otras/ })).not.toBeInTheDocument()
    const swatches = container.querySelectorAll('.chart-legend .chart-legend__swatch')
    expect(swatches[4]?.getAttribute('data-slot')).toBe('--series-other')
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('exposes no keyboard stops inside the role="img" frame (the legend is the accessible twin)', () => {
    const { container } = renderDonut()
    expect(container.querySelectorAll('.chart-frame [tabindex="0"], .chart-frame [role="application"]')).toHaveLength(0)
  })

  it('renders no buttons when onSelect is missing', () => {
    renderDonut(breakdown)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

describe('IncomeExpenseBars (fixture, 6 months to septiembre 2026)', () => {
  it('renders the table twin with the F7 numbers and the HTML legend', () => {
    render(<IncomeExpenseBars rows={trend} currency="EUR" ariaLabel="Gastos de septiembre 2026: 843,20 €; ingresos: 1.200,00 €" size={SIZE} />)
    const table = screen.getByRole('table', { name: 'Ingresos frente a gastos' })
    const headers = within(table).getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers).toEqual(['Mes', 'Ingresos', 'Gastos', 'Balance'])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(6)
    const cells = rows.map((row) => within(row).getAllByRole('cell').map((td) => norm(td.textContent)))
    const months = rows.map((row) => within(row).getByRole('rowheader').textContent)
    expect(months).toEqual(['abril 2026', 'mayo 2026', 'junio 2026', 'julio 2026', 'agosto 2026', 'septiembre 2026'])
    expect(cells).toEqual([
      ['0,00 €', '0,00 €', '0,00 €'],
      ['0,00 €', '0,00 €', '0,00 €'],
      ['0,00 €', '0,00 €', '0,00 €'],
      ['1.200,00 €', '750,00 €', '+450,00 €'],
      ['1.200,00 €', '677,50 €', '+522,50 €'],
      ['1.200,00 €', '843,20 €', '+356,80 €'],
    ])
    expect(screen.getByRole('img', { name: /Gastos de septiembre 2026/ })).toBeInTheDocument()
    const legend = screen.getByRole('list')
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Ingresos', 'Gastos'])
    const swatches = legend.querySelectorAll('.chart-legend__swatch')
    expect(swatches[0]?.getAttribute('data-slot')).toBe('--series-income')
    expect(swatches[1]?.getAttribute('data-slot')).toBe('--series-expense')
  })

  it('exposes no keyboard stops inside the bar chart frame', () => {
    const { container } = render(<IncomeExpenseBars rows={trend} currency="EUR" ariaLabel="x" size={SIZE} />)
    expect(container.querySelectorAll('.chart-frame [tabindex="0"], .chart-frame [role="application"]')).toHaveLength(0)
  })

  it('draws two bar series coloured with the income/expense tokens', () => {
    const { container } = render(<IncomeExpenseBars rows={trend} currency="EUR" ariaLabel="x" size={SIZE} />)
    const fills = new Set(Array.from(container.querySelectorAll('.recharts-bar-rectangle path')).map((p) => p.getAttribute('fill')))
    expect(fills.has(CHART_COLOR_FALLBACKS.income)).toBe(true)
    expect(fills.has(CHART_COLOR_FALLBACKS.expense)).toBe(true)
  })

  it('shows a negative balance with the minus sign', () => {
    const rows = monthlyTrend([tx({ amountCents: 5000, date: '2026-09-02' })], MONTH, 1)
    render(<TrendTable rows={rows} currency="EUR" />)
    const row = screen.getAllByRole('row')[1]!
    expect(within(row).getAllByRole('cell').map((td) => norm(td.textContent))).toEqual(['0,00 €', '50,00 €', '−50,00 €'])
  })
})

describe('empty inputs', () => {
  it('donut with no rows renders no legend items and a zero total', () => {
    const { container } = render(<ExpenseDonut rows={[]} totalCents={0} currency="EUR" ariaLabel="vacío" size={SIZE} />)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(container.querySelectorAll('.chart-legend__swatch')).toHaveLength(0)
    expect(norm(screen.getByText(/0,00/).textContent)).toBe('0,00 €')
  })

  it('expensesByCategory of a month with only incomes is empty', () => {
    const cats = [cat({ id: 'c-inc', type: 'income', name: 'Nómina' })]
    const rows = expensesByCategory([tx({ type: 'income', categoryId: 'c-inc', date: '2026-09-01' })], cats, MONTH)
    expect(rows).toEqual([])
  })
})
