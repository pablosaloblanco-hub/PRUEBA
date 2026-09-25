// ============================================================================
// src/ui/views/BudgetsView.test.tsx — §10.2 «BudgetsView»: status texts by
// ratio over the §3.7 fixture, empty state, «+ Nuevo presupuesto» disabled when
// no option remains, edit/delete with confirmation.
// ============================================================================
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fixtureData } from '../../test/fixtures'
import { renderApp } from '../../test/renderApp'
import type { AppData } from '../../domain/types'

const media = vi.hoisted(() => ({ desktop: false }))
vi.mock('../hooks/useMediaQuery', () => ({
  DESKTOP_QUERY: '(min-width: 900px)',
  useMediaQuery: () => media.desktop,
  useIsDesktop: () => media.desktop,
}))

const cards = () => screen.getAllByRole('article')

/** Fixture where every expense category and the total already have a budget. */
function fullyBudgeted(): AppData {
  const data = fixtureData()
  let n = 0
  for (const c of data.categories) {
    if (c.type !== 'expense' || data.budgets.some((b) => b.categoryId === c.id)) continue
    data.budgets.push({ id: `b-extra-${n++}`, categoryId: c.id, limitCents: 5000 })
  }
  return data
}

describe('BudgetsView', () => {
  it('shows the total first with the warning text, then Ocio exceeded (September 2026)', () => {
    renderApp({ ui: { screen: 'budgets' } })
    const [total, ocio] = cards()
    expect(cards()).toHaveLength(2)
    expect(within(total!).getByText('Presupuesto total')).toBeInTheDocument()
    expect(within(total!).getByText('Gastado 843,20 € de 1.000,00 €')).toBeInTheDocument()
    expect(within(total!).getByText('Te quedan 156,80 €')).toBeInTheDocument()
    expect(within(total!).getByRole('progressbar')).toHaveAttribute('data-status', 'warning')
    expect(within(total!).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '84')

    expect(within(ocio!).getByText('Ocio')).toBeInTheDocument()
    expect(within(ocio!).getByText('Gastado 110,00 € de 100,00 €')).toBeInTheDocument()
    expect(within(ocio!).getByText('Has superado el presupuesto en 10,00 €')).toBeInTheDocument()
    expect(within(ocio!).getByRole('progressbar')).toHaveAttribute('data-status', 'over')
    expect(within(ocio!).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('shows «Te quedan» with status ok below the warn ratio (August 2026)', () => {
    renderApp({ ui: { screen: 'budgets', month: '2026-08' } })
    const [total, ocio] = cards()
    expect(within(total!).getByText('Gastado 677,50 € de 1.000,00 €')).toBeInTheDocument()
    expect(within(total!).getByText('Te quedan 322,50 €')).toBeInTheDocument()
    expect(within(total!).getByRole('progressbar')).toHaveAttribute('data-status', 'ok')
    expect(within(ocio!).getByText('Gastado 45,00 € de 100,00 €')).toBeInTheDocument()
    expect(within(ocio!).getByText('Te quedan 55,00 €')).toBeInTheDocument()
    expect(within(ocio!).getByRole('progressbar')).toHaveAttribute('data-status', 'ok')
  })

  it('renders the empty state and «Crear presupuesto» opens the new-budget sheet', async () => {
    const data = fixtureData()
    data.budgets = []
    const { user } = renderApp({ data, ui: { screen: 'budgets' } })
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    expect(screen.getByText('Aún no tienes presupuestos')).toBeInTheDocument()
    expect(screen.getByText('Fija un límite mensual por categoría y verás cuánto te queda')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crear presupuesto' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nuevo presupuesto' })).toBeInTheDocument()
  })

  it('the toolbar button is icon-only on mobile and opens the sheet', async () => {
    const { user } = renderApp({ ui: { screen: 'budgets' } })
    const button = screen.getByRole('button', { name: 'Nuevo presupuesto' })
    expect(button).toBeEnabled()
    expect(screen.queryByText('Todas las categorías tienen presupuesto')).not.toBeInTheDocument()
    await user.click(button)
    expect(screen.getByRole('heading', { name: 'Nuevo presupuesto' })).toBeInTheDocument()
  })

  it('shows the full label on desktop', () => {
    media.desktop = true
    try {
      renderApp({ ui: { screen: 'budgets' } })
      expect(screen.getByRole('button', { name: '+ Nuevo presupuesto' })).toBeEnabled()
    } finally {
      media.desktop = false
    }
  })

  it('disables «Nuevo presupuesto» with help text when every option already has a budget', () => {
    renderApp({ data: fullyBudgeted(), ui: { screen: 'budgets' } })
    const button = screen.getByRole('button', { name: 'Nuevo presupuesto' })
    expect(button).toBeDisabled()
    const help = screen.getByText('Todas las categorías tienen presupuesto')
    expect(button).toHaveAttribute('aria-describedby', help.id)
  })

  it('«Editar» opens the edit sheet with the category locked and the limit prefilled', async () => {
    const { user } = renderApp({ ui: { screen: 'budgets' } })
    const [, ocio] = cards()
    await user.click(within(ocio!).getByRole('button', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Editar presupuesto' })).toBeInTheDocument()
    const select = within(dialog).getByRole('combobox', { name: 'Categoría' })
    expect(select).toBeDisabled()
    expect(select).toHaveDisplayValue('Ocio')
    expect(within(dialog).getByRole('textbox', { name: 'Límite mensual' })).toHaveValue('100,00')
  })

  it('«Eliminar» asks for confirmation, «Cancelar» keeps the budget and confirming removes it with a toast', async () => {
    const { user, store } = renderApp({ ui: { screen: 'budgets' } })
    const [, ocio] = cards()
    await user.click(within(ocio!).getByRole('button', { name: 'Eliminar' }))
    let dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: '¿Eliminar el presupuesto de Ocio?' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot().budgets).toHaveLength(2)

    await user.click(within(ocio!).getByRole('button', { name: 'Eliminar' }))
    dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot().budgets.map((b) => b.id)).toEqual(['b-total'])
    expect(cards()).toHaveLength(1)
    expect(screen.getByText('Presupuesto eliminado')).toBeInTheDocument()
  })

  it('the total budget asks «¿Eliminar el presupuesto total?»', async () => {
    const { user, store } = renderApp({ ui: { screen: 'budgets' } })
    const [total] = cards()
    await user.click(within(total!).getByRole('button', { name: 'Eliminar' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: '¿Eliminar el presupuesto total?' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    expect(store.getSnapshot().budgets.map((b) => b.id)).toEqual(['b-ocio'])
  })
})
