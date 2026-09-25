// ============================================================================
// src/ui/views/BudgetSheet.test.tsx — §10.2 «BudgetSheet»: select without
// «Total mensual» when a total exists, amount validation, create (E2E
// criterion of F5), duplicate rejected, edit, Escape without saving.
// ============================================================================
import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { assertInvariants } from '../../domain/validate'
import { fixtureData } from '../../test/fixtures'
import { renderApp } from '../../test/renderApp'

const dialog = () => screen.getByRole('dialog')
const select = () => within(dialog()).getByRole('combobox', { name: 'Categoría' })
const optionLabels = () => within(select()).getAllByRole('option').map((o) => o.textContent)
const limit = () => within(dialog()).getByRole('textbox', { name: 'Límite mensual' })
const save = () => within(dialog()).getByRole('button', { name: 'Guardar' })

describe('BudgetSheet (new)', () => {
  it('omits «Total mensual» and budgeted categories when a total already exists', () => {
    renderApp({ ui: { screen: 'budgets', sheet: { kind: 'budget/new' } } })
    expect(within(dialog()).getByRole('heading', { name: 'Nuevo presupuesto' })).toBeInTheDocument()
    const labels = optionLabels()
    expect(labels).not.toContain('Total mensual')
    expect(labels).not.toContain('Ocio')
    expect(labels).toEqual([
      'Alimentación', 'Restaurantes', 'Transporte', 'Vivienda', 'Suministros', 'Salud', 'Compras',
      'Suscripciones', 'Educación', 'Otros gastos',
    ])
    expect(screen.getByText('Se aplica a todos los meses')).toBeInTheDocument()
    expect(limit()).toHaveAttribute('aria-describedby', expect.stringContaining(screen.getByText('Se aplica a todos los meses').id))
  })

  it('offers «Total mensual» first when there is no total budget and saves it with categoryId null', async () => {
    const data = fixtureData()
    data.budgets = data.budgets.filter((b) => b.categoryId !== null)
    const { user, store } = renderApp({ data, ui: { screen: 'budgets', sheet: { kind: 'budget/new' } } })
    expect(optionLabels()[0]).toBe('Total mensual')
    expect(select()).toHaveDisplayValue('Total mensual')
    await user.type(limit(), '1000')
    await user.click(save())
    const total = store.getSnapshot().budgets.find((b) => b.categoryId === null)
    expect(total?.limitCents).toBe(100000)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables «Guardar» until the limit is valid and shows the §4.4 messages', async () => {
    const { user } = renderApp({ ui: { screen: 'budgets', sheet: { kind: 'budget/new' } } })
    expect(save()).toBeDisabled()
    await user.type(limit(), 'abc')
    expect(screen.getByText('Importe no válido. Ejemplos: 12,50 · 1.234,56')).toBeInTheDocument()
    expect(save()).toBeDisabled()
    await user.clear(limit())
    await user.type(limit(), '0')
    expect(screen.getByText('Introduce un importe mayor que 0')).toBeInTheDocument()
    expect(save()).toBeDisabled()
    await user.clear(limit())
    await user.type(limit(), '1,234')
    expect(screen.getByText('Máximo dos decimales')).toBeInTheDocument()
    expect(save()).toBeDisabled()
    await user.clear(limit())
    await user.type(limit(), '200')
    expect(screen.getByText('= 200,00 €')).toBeInTheDocument()
    expect(save()).toBeEnabled()
  })

  it('creates «Alimentación 200 €» and the card shows «Gastado 83,20 € de 200,00 €» / «Te quedan 116,80 €»', async () => {
    const { user, store } = renderApp({ ui: { screen: 'budgets', sheet: { kind: 'budget/new' } } })
    await user.selectOptions(select(), 'Alimentación')
    await user.type(limit(), '200')
    await user.click(save())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Presupuesto guardado')).toBeInTheDocument()
    const created = store.getSnapshot().budgets.find((b) => b.categoryId === 'cat-alimentacion')
    expect(created?.limitCents).toBe(20000)
    assertInvariants(store.getSnapshot())
    const card = screen.getByText('Alimentación').closest('article')
    expect(card).not.toBeNull()
    expect(within(card!).getByText('Gastado 83,20 € de 200,00 €')).toBeInTheDocument()
    expect(within(card!).getByText('Te quedan 116,80 €')).toBeInTheDocument()
    expect(within(card!).getByRole('progressbar')).toHaveAttribute('data-status', 'ok')
  })

  it('Enter in the limit field submits', async () => {
    const { user, store } = renderApp({ ui: { screen: 'budgets', sheet: { kind: 'budget/new' } } })
    await user.selectOptions(select(), 'Vivienda')
    await user.type(limit(), '700{Enter}')
    expect(store.getSnapshot().budgets.find((b) => b.categoryId === 'cat-vivienda')?.limitCents).toBe(70000)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('preselects presetCategoryId', () => {
    renderApp({ ui: { screen: 'budgets', sheet: { kind: 'budget/new', presetCategoryId: 'cat-vivienda' } } })
    expect(select()).toHaveDisplayValue('Vivienda')
  })

  it('rejects a duplicate budget with «Ya existe un presupuesto para esta categoría» and keeps the sheet open', async () => {
    const { user, store } = renderApp({ ui: { screen: 'budgets', sheet: { kind: 'budget/new' } } })
    await user.selectOptions(select(), 'Alimentación')
    await user.type(limit(), '50')
    // Another budget for the same category appears meanwhile (e.g. another tab).
    act(() => {
      store.dispatch({ type: 'budget/upsert', budget: { id: 'b-race', categoryId: 'cat-alimentacion', limitCents: 1000 } })
    })
    expect(select()).toHaveDisplayValue('Alimentación')
    await user.click(save())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const error = within(dialog()).getByText('Ya existe un presupuesto para esta categoría')
    expect(select()).toHaveAttribute('aria-invalid', 'true')
    expect(select()).toHaveAttribute('aria-describedby', error.id)
    expect(store.getSnapshot().budgets).toHaveLength(3)
    expect(screen.queryByText('Presupuesto guardado')).not.toBeInTheDocument()
  })

  it('Escape closes without saving', async () => {
    const { user, store } = renderApp({ ui: { screen: 'budgets', sheet: { kind: 'budget/new' } } })
    await user.type(limit(), '300')
    act(() => {
      dialog().dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot().budgets).toHaveLength(2)
  })
})

describe('BudgetSheet (edit)', () => {
  it('prefills the limit, locks the category and saves the new limit by id', async () => {
    const { user, store } = renderApp({ ui: { screen: 'budgets', sheet: { kind: 'budget/edit', id: 'b-ocio' } } })
    expect(within(dialog()).getByRole('heading', { name: 'Editar presupuesto' })).toBeInTheDocument()
    expect(select()).toBeDisabled()
    expect(optionLabels()).toEqual(['Ocio'])
    expect(limit()).toHaveValue('100,00')
    expect(save()).toBeEnabled()
    await user.clear(limit())
    await user.type(limit(), '150')
    await user.click(save())
    expect(store.getSnapshot().budgets.find((b) => b.id === 'b-ocio')?.limitCents).toBe(15000)
    expect(store.getSnapshot().budgets).toHaveLength(2)
    expect(screen.getByText('Presupuesto guardado')).toBeInTheDocument()
    expect(screen.getByText('Gastado 110,00 € de 150,00 €')).toBeInTheDocument()
  })

  it('the total budget edits as «Total mensual»', () => {
    renderApp({ ui: { screen: 'budgets', sheet: { kind: 'budget/edit', id: 'b-total' } } })
    expect(select()).toHaveDisplayValue('Total mensual')
    expect(limit()).toHaveValue('1000,00')
  })
})
