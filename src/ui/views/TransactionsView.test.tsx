// ============================================================================
// src/ui/views/TransactionsView.test.tsx — §10.2 «TransactionsView»: F3
// criterion on the §3.7 fixture (totals and rows per month, «Hoy»), accent-
// insensitive search after 150 ms, «Limpiar búsqueda» immediate, type chips,
// drilldown category chip, «Limpiar filtros», empty states and row → edit.
// ============================================================================
import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seedData } from '../../domain/seed'
import { EMPTY_FILTER } from '../state/uiReducer'
import type { UiState } from '../state/uiReducer'
import { FIXTURE_NOW, renderApp } from '../../test/renderApp'

const norm = (s: string | null) => (s ?? '').replace(/\s/g, ' ')
const totals = () => norm(screen.getByText(/^Ingresos /).textContent)
const list = () => screen.getByRole('main').querySelector('.transaction-list')
const rows = () => within(screen.getByRole('main')).queryAllByRole('listitem')
const dayHeaders = () => within(screen.getByRole('main')).queryAllByRole('heading', { level: 3 })
const search = () => screen.getByRole('searchbox', { name: 'Buscar por nota o categoría' })

const open = (ui: Partial<UiState> = {}, options: Parameters<typeof renderApp>[0] = {}) =>
  renderApp({ ...options, ui: { screen: 'transactions', ...ui } })

describe('TransactionsView — F3 criterion on the fixture', () => {
  it('opens in septiembre 2026 with the totals strip, 5 rows and the future day above (no «Hoy»)', () => {
    open()
    expect(screen.getByRole('heading', { level: 2, name: 'Movimientos' })).toBeInTheDocument()
    expect(screen.getByText('septiembre 2026')).toBeInTheDocument()
    expect(totals()).toBe('Ingresos 1.200,00 € · Gastos 843,20 € · Balance +356,80 €')
    expect(rows()).toHaveLength(5)
    const headers = dayHeaders().map((h) => norm(h.textContent))
    expect(headers[0]).toContain('lunes, 28 sep')
    expect(headers[0]).toContain('−50,00 €')
    expect(headers.some((h) => h.startsWith('Hoy'))).toBe(false)
    expect(headers.some((h) => h.startsWith('Ayer'))).toBe(false)
    expect(list()).not.toBeNull()
  })

  it('renders each row as a button with badge, category, note and the signed amount', () => {
    open()
    const row = screen.getByRole('button', { name: /Café y compra semanal/ })
    expect(row).toHaveClass('list-row')
    expect(row.querySelector('.badge')).not.toBeNull()
    expect(within(row).getByText('Alimentación')).toBeInTheDocument()
    expect(norm(within(row).getByText(/€/).textContent)).toBe('−83,20 €')
    expect(row.querySelector('button')).toBeNull()
    const income = screen.getByRole('button', { name: /Nómina septiembre/ })
    expect(norm(within(income).getByText(/€/).textContent)).toBe('+1.200,00 €')
  })

  it('‹ shows agosto and julio with their totals and row counts; «Hoy» returns to septiembre', async () => {
    const { user } = open()
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(screen.getByText('agosto 2026')).toBeInTheDocument()
    expect(totals()).toBe('Ingresos 1.200,00 € · Gastos 677,50 € · Balance +522,50 €')
    expect(rows()).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(screen.getByText('julio 2026')).toBeInTheDocument()
    expect(totals()).toBe('Ingresos 1.200,00 € · Gastos 750,00 € · Balance +450,00 €')
    expect(rows()).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(screen.getByText('septiembre 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hoy' })).not.toBeInTheDocument()
    expect(rows()).toHaveLength(5)
  })

  it('a row opens the edit sheet for that transaction', async () => {
    const { user } = open()
    await user.click(screen.getByRole('button', { name: /Entradas concierto/ }))
    expect(screen.getByRole('dialog', { name: 'Editar movimiento' })).toBeInTheDocument()
    expect(screen.getByLabelText('Importe')).toHaveValue('110,00')
  })

  it('reformats with the settings currency', () => {
    const data = seedData(FIXTURE_NOW)
    data.settings = { ...data.settings, currency: 'USD' }
    data.transactions.push({
      id: 'usd',
      type: 'expense',
      amountCents: 1250,
      date: '2026-09-20',
      categoryId: 'cat-ocio',
      note: '',
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    })
    open({}, { data })
    expect(norm(screen.getByRole('button', { name: /Ocio/ }).textContent)).toContain('−12,50 US$')
  })
})

describe('TransactionsView — search (debounced)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const openWithTimers = () => open({}, { userEventOptions: { advanceTimers: vi.advanceTimersByTime } })

  it('«cafe» finds «Café y compra semanal» only after 150 ms', async () => {
    const { user } = openWithTimers()
    await user.type(search(), 'cafe')
    expect(rows()).toHaveLength(5)
    act(() => {
      vi.advanceTimersByTime(149)
    })
    expect(rows()).toHaveLength(5)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Café y compra semanal/ })).toBeInTheDocument()
    expect(totals()).toBe('Ingresos 0,00 € · Gastos 83,20 € · Balance −83,20 €')
  })

  it('matches the category name too («OCIO») and the «×» clears immediately', async () => {
    const { user } = openWithTimers()
    await user.type(search(), 'OCIO')
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Entradas concierto/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(search()).toHaveValue('')
    expect(rows()).toHaveLength(5)
    expect(screen.queryByRole('button', { name: 'Limpiar búsqueda' })).not.toBeInTheDocument()
  })

  it('tapping the active «Movimientos» tab clears the search text together with the filter', async () => {
    const { user } = openWithTimers()
    await user.type(search(), 'cafe')
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(rows()).toHaveLength(1)
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    await user.click(within(nav).getByRole('button', { name: 'Movimientos' }))
    expect(rows()).toHaveLength(5)
    expect(search()).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Limpiar búsqueda' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('text typed within the debounce before tapping the active tab is still applied consistently', async () => {
    const { user } = openWithTimers()
    await user.type(search(), 'cafe')
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    await user.click(within(nav).getByRole('button', { name: 'Movimientos' }))
    expect(search()).toHaveValue('cafe')
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(search()).toHaveValue('cafe')
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()
  })

  it('only the last value of a fast typing burst is dispatched', async () => {
    const { user } = openWithTimers()
    await user.type(search(), 'nom')
    act(() => {
      vi.advanceTimersByTime(100)
    })
    await user.type(search(), 'ina')
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(rows()).toHaveLength(5)
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Nómina septiembre/ })).toBeInTheDocument()
  })

  it('shows «Ningún movimiento coincide con los filtros» and «Limpiar filtros» restores the list', async () => {
    const { user } = openWithTimers()
    await user.type(search(), 'zzz')
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(rows()).toHaveLength(0)
    expect(screen.getByText('Ningún movimiento coincide con los filtros')).toBeInTheDocument()
    expect(totals()).toBe('Ingresos 0,00 € · Gastos 0,00 € · Balance 0,00 €')
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(search()).toHaveValue('')
    expect(rows()).toHaveLength(5)
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })
})

describe('TransactionsView — chips and filters', () => {
  it('Todos | Gastos | Ingresos are aria-pressed chips that filter the list and the totals', async () => {
    const { user } = open()
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Gastos' }))
    expect(screen.getByRole('button', { name: 'Gastos' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
    expect(rows()).toHaveLength(4)
    expect(totals()).toBe('Ingresos 0,00 € · Gastos 843,20 € · Balance −843,20 €')
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ingresos' }))
    expect(rows()).toHaveLength(1)
    expect(totals()).toBe('Ingresos 1.200,00 € · Gastos 0,00 € · Balance +1.200,00 €')
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    expect(rows()).toHaveLength(5)
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('shows the category chip from a drilldown and «Quitar filtro de categoría» removes it', async () => {
    const { user } = open({ filter: { ...EMPTY_FILTER, categoryId: 'cat-ocio' } })
    const chip = screen.getByRole('button', { name: 'Ocio' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quitar filtro de categoría' }))
    expect(screen.queryByRole('button', { name: 'Ocio' })).not.toBeInTheDocument()
    expect(rows()).toHaveLength(5)
  })

  it('«Limpiar filtros» resets type, category and search at once', async () => {
    const { user } = open({ filter: { query: '', type: 'expense', categoryId: 'cat-vivienda' } })
    expect(rows()).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(rows()).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Vivienda' })).not.toBeInTheDocument()
  })

  it('filters combine: Ingresos + category Ocio matches nothing', async () => {
    const { user } = open({ filter: { ...EMPTY_FILTER, categoryId: 'cat-ocio' } })
    await user.click(screen.getByRole('button', { name: 'Ingresos' }))
    expect(rows()).toHaveLength(0)
    expect(screen.getByText('Ningún movimiento coincide con los filtros')).toBeInTheDocument()
  })

  it('filters reset when leaving the screen', async () => {
    const { user } = open({ filter: { ...EMPTY_FILTER, type: 'income' } })
    expect(rows()).toHaveLength(1)
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    await user.click(within(nav).getByRole('button', { name: 'Inicio' }))
    await user.click(within(nav).getByRole('button', { name: 'Movimientos' }))
    expect(rows()).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('TransactionsView — empty states', () => {
  it('an empty month shows «No hay movimientos en junio 2026» and «Añadir movimiento» opens the sheet', async () => {
    const { user } = open({ month: '2026-06' })
    expect(screen.getByText('No hay movimientos en junio 2026')).toBeInTheDocument()
    expect(totals()).toBe('Ingresos 0,00 € · Gastos 0,00 € · Balance 0,00 €')
    expect(rows()).toHaveLength(0)
    await user.click(within(screen.getByRole('main')).getByRole('button', { name: 'Añadir movimiento' }))
    expect(screen.getByRole('dialog', { name: 'Nuevo movimiento' })).toBeInTheDocument()
  })

  it('a fresh app shows the empty month state for the current month', () => {
    open({}, { data: seedData(FIXTURE_NOW) })
    expect(screen.getByText('No hay movimientos en septiembre 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })
})
