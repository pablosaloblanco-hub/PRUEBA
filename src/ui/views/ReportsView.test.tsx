// ============================================================================
// src/ui/views/ReportsView.test.tsx — Informes (F7) inside the full app: the
// lazy chart bundle resolves (findBy*), the F7 numbers over the §3.7 fixture,
// legend drill-down to Movimientos filtered by Ocio (1 row), empty states and
// the ErrorBoundary fallback with «Reintentar».
// ============================================================================
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../../domain/seed'
import type { AppData } from '../../domain/types'
import { fixtureData } from '../../test/fixtures'
import { FIXTURE_NOW, renderApp } from '../../test/renderApp'
import type { UiState } from '../state/uiReducer'

const chunk = vi.hoisted(() => ({ fail: false }))
vi.mock('./ReportsContent', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./ReportsContent')>()
  const Real = mod.default
  const Wrapped = () => {
    if (chunk.fail) throw new Error('chunk failed')
    return <Real />
  }
  return { ...mod, default: Wrapped }
})

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ')
const open = (ui: Partial<UiState> = {}, data?: AppData) => renderApp({ ui: { screen: 'reports', ...ui }, data })
const trendTable = () => screen.getByRole('table', { name: 'Ingresos frente a gastos' })
const bodyRows = () => within(trendTable()).getAllByRole('row').slice(1)

describe('ReportsView — F7 criterion on the fixture (septiembre 2026)', () => {
  it('loads the charts lazily and shows both cards with the F7 numbers', async () => {
    open()
    expect(screen.getByRole('heading', { level: 2, name: 'Informes' })).toBeInTheDocument()
    expect(await screen.findByText('Gastos por categoría')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Ingresos frente a gastos' })).toBeInTheDocument()

    const legendButtons = screen.getAllByRole('button', { name: /€.*%$/ })
    expect(legendButtons.map((b) => norm(b.textContent))).toEqual([
      '🏠Vivienda600,00 €71 %',
      '🎬Ocio110,00 €13 %',
      '🛒Alimentación83,20 €10 %',
      '📱Suscripciones50,00 €6 %',
    ])
    expect(screen.queryByText('Otras')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Gastos por categoría de septiembre 2026: 843,20\s€$/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Gastos de septiembre 2026: 843,20\s€; ingresos: 1\.200,00\s€$/ })).toBeInTheDocument()

    const rows = bodyRows()
    expect(rows).toHaveLength(6)
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual([
      'abril 2026',
      'mayo 2026',
      'junio 2026',
      'julio 2026',
      'agosto 2026',
      'septiembre 2026',
    ])
    expect(within(rows[5]!).getAllByRole('cell').map((td) => norm(td.textContent))).toEqual(['1.200,00 €', '843,20 €', '+356,80 €'])
    expect(within(rows[3]!).getAllByRole('cell').map((td) => norm(td.textContent))).toEqual(['1.200,00 €', '750,00 €', '+450,00 €'])
    expect(within(rows[0]!).getAllByRole('cell').map((td) => norm(td.textContent))).toEqual(['0,00 €', '0,00 €', '0,00 €'])
  })

  it('tapping «Ocio» in the legend opens Movimientos filtered by Ocio with one row', async () => {
    const { user } = open()
    await user.click(await screen.findByRole('button', { name: /Ocio/ }))
    expect(screen.getByRole('heading', { level: 2, name: 'Movimientos' })).toBeInTheDocument()
    expect(screen.getByText('septiembre 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ocio' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByRole('main')).getAllByRole('listitem')).toHaveLength(1)
  })

  it('follows the shared month selector (agosto 2026 has 3 named categories)', async () => {
    const { user } = open()
    await screen.findByText('Gastos por categoría')
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(await screen.findByRole('img', { name: /^Gastos de agosto 2026: 677,50\s€; ingresos: 1\.200,00\s€$/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Gastos por categoría de agosto 2026: 677,50\s€/ })).toBeInTheDocument()
    expect(bodyRows().map((r) => within(r).getByRole('rowheader').textContent)[5]).toBe('agosto 2026')
  })
})

describe('ReportsView — empty states', () => {
  it('a month without expenses shows «Aún no hay gastos en este mes» but keeps the bars', async () => {
    open({ month: '2026-10' })
    expect(await screen.findByText('Aún no hay gastos en este mes')).toBeInTheDocument()
    expect(screen.queryByText('Aún no hay datos para este periodo')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /ingresos/ })).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(6)
  })

  it('first use shows both empty texts and still the 6-row table of zeros', async () => {
    open({}, seedData(FIXTURE_NOW))
    expect(await screen.findByText('Aún no hay gastos en este mes')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay datos para este periodo')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    const rows = bodyRows()
    expect(rows).toHaveLength(6)
    expect(within(rows[5]!).getAllByRole('cell').map((td) => norm(td.textContent))).toEqual(['0,00 €', '0,00 €', '0,00 €'])
  })

  it('a month with only incomes shows the empty donut but populated bars', async () => {
    const data = fixtureData()
    data.transactions = data.transactions.filter((t) => t.type === 'income')
    open({}, data)
    expect(await screen.findByText('Aún no hay gastos en este mes')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Gastos de septiembre 2026: 0,00\s€; ingresos: 1\.200,00\s€$/ })).toBeInTheDocument()
    expect(within(bodyRows()[5]!).getAllByRole('cell').map((td) => norm(td.textContent))).toEqual(['1.200,00 €', '0,00 €', '+1.200,00 €'])
  })
})

describe('ReportsView — chunk failure', () => {
  it('shows «No se ha podido cargar el informe» and «Reintentar» recovers', async () => {
    chunk.fail = true
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { user } = open()
      expect(await screen.findByText('No se ha podido cargar el informe')).toBeInTheDocument()
      chunk.fail = false
      await user.click(screen.getByRole('button', { name: 'Reintentar' }))
      expect(await screen.findByText('Gastos por categoría')).toBeInTheDocument()
    } finally {
      chunk.fail = false
      errorSpy.mockRestore()
    }
  })
})
