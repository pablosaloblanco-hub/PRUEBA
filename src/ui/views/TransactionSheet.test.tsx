// ============================================================================
// src/ui/views/TransactionSheet.test.tsx — §10.2 «TransactionSheet» and «Flujo
// alta»: initial focus, live preview, every §4.4 error disables «Guardar»,
// Enter submits, type switch changes the grid, edit prefill, two-step delete,
// Escape/backdrop close without saving, inline reducer errors.
// ============================================================================
import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seedData } from '../../domain/seed'
import type { AppData } from '../../domain/types'
import { fixtureData, tx } from '../../test/fixtures'
import { FIXTURE_NOW, renderApp } from '../../test/renderApp'

const ids = vi.hoisted(() => ({ forced: null as string | null }))

vi.mock('../../domain/ids', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../domain/ids')>()
  return { ...actual, newId: () => ids.forced ?? actual.newId() }
})

const dialog = () => screen.getByRole('dialog')
const amountInput = () => screen.getByLabelText('Importe')
const saveButton = () => screen.getByRole('button', { name: 'Guardar' })
const categoryGroup = () => screen.getByRole('group', { name: 'Categoría' })
const norm = (s: string | null) => (s ?? '').replace(/\s/g, ' ')

const openNew = (options: Parameters<typeof renderApp>[0] = {}) =>
  renderApp({ ...options, ui: { ...options.ui, sheet: { kind: 'transaction/new' } } })

describe('TransactionSheet — new transaction', () => {
  afterEach(() => {
    ids.forced = null
  })

  it('opens with «Nuevo movimiento», focus on Importe, Gasto, today and the last used expense category', () => {
    openNew()
    expect(screen.getByRole('dialog', { name: 'Nuevo movimiento' })).toBeInTheDocument()
    expect(amountInput()).toHaveFocus()
    expect(amountInput()).toHaveAttribute('inputmode', 'decimal')
    expect(amountInput()).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByRole('radio', { name: 'Gasto' })).toBeChecked()
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-09-25')
    expect(screen.getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'true')
    // Fixture: settings.lastUsedCategoryId.expense = cat-suscripciones.
    expect(within(categoryGroup()).getByRole('button', { name: 'Suscripciones' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(categoryGroup()).queryByRole('button', { name: 'Nómina' })).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  it('falls back to the first category by sortOrder when there is no last used one', () => {
    openNew({ data: seedData(FIXTURE_NOW) })
    expect(within(categoryGroup()).getByRole('button', { name: 'Alimentación' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the live preview «= 12,50 €» and enables Guardar', async () => {
    const { user } = openNew()
    await user.type(amountInput(), '12,50')
    expect(norm(screen.getByText(/^= /).textContent)).toBe('= 12,50 €')
    expect(saveButton()).toBeEnabled()
  })

  it.each([
    ['0', 'Introduce un importe mayor que 0'],
    ['12,505', 'Máximo dos decimales'],
    ['abc', 'Importe no válido. Ejemplos: 12,50 · 1.234,56'],
    ['-5', 'El importe no puede ser negativo'],
    ['1000000000', 'Importe demasiado grande (máx. 999.999.999,99)'],
  ])('amount %s shows «%s» and disables Guardar', async (value, message) => {
    const { user } = openNew()
    await user.type(amountInput(), value)
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(amountInput()).toHaveAttribute('aria-invalid', 'true')
    expect(saveButton()).toBeDisabled()
  })

  it('empty amount keeps Guardar disabled and Enter does nothing', async () => {
    const { user, store } = openNew()
    const before = store.getSnapshot()
    await user.keyboard('{Enter}')
    expect(store.getSnapshot()).toBe(before)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Enter in Importe saves, closes the sheet, shows «Gasto guardado» and updates lastUsedCategoryId', async () => {
    const { user, store } = openNew()
    await user.type(amountInput(), '12,50{Enter}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Gasto guardado')).toBeInTheDocument()
    const data = store.getSnapshot()
    const added = data.transactions.find((t) => t.amountCents === 1250)
    expect(added).toMatchObject({ type: 'expense', date: '2026-09-25', categoryId: 'cat-suscripciones', note: '' })
    expect(data.settings.lastUsedCategoryId.expense).toBe('cat-suscripciones')
  })

  it('Enter in Nota submits with the trimmed note and the chosen category', async () => {
    const { user, store } = openNew()
    await user.type(amountInput(), '7')
    await user.click(within(categoryGroup()).getByRole('button', { name: 'Ocio' }))
    await user.type(screen.getByLabelText('Nota (opcional)'), '  Cine  {Enter}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const added = store.getSnapshot().transactions.find((t) => t.amountCents === 700)
    expect(added).toMatchObject({ categoryId: 'cat-ocio', note: 'Cine' })
    expect(store.getSnapshot().settings.lastUsedCategoryId.expense).toBe('cat-ocio')
  })

  it('the note input is limited to 140 characters', () => {
    openNew()
    expect(screen.getByLabelText('Nota (opcional)')).toHaveAttribute('maxlength', '140')
  })

  it('switching to Ingreso swaps the grid, preselects the last used income category and toasts «Ingreso guardado»', async () => {
    const { user, store } = openNew()
    await user.click(screen.getByRole('radio', { name: 'Ingreso' }))
    expect(screen.getByRole('radio', { name: 'Ingreso' })).toBeChecked()
    const group = categoryGroup()
    expect(within(group).queryByRole('button', { name: 'Suscripciones' })).not.toBeInTheDocument()
    expect(within(group).getByRole('button', { name: 'Nómina' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: 'Extras' })).toHaveAttribute('aria-pressed', 'false')
    await user.type(amountInput(), '1200')
    await user.click(saveButton())
    expect(screen.getByText('Ingreso guardado')).toBeInTheDocument()
    const added = store.getSnapshot().transactions.find((t) => t.amountCents === 120000 && t.date === '2026-09-25')
    expect(added).toMatchObject({ type: 'income', categoryId: 'cat-nomina' })
  })

  it('date chips set Hoy/Ayer, the date input is editable and an invalid date disables Guardar', async () => {
    const { user } = openNew()
    await user.type(amountInput(), '5')
    await user.click(screen.getByRole('button', { name: 'Ayer' }))
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-09-24')
    expect(screen.getByRole('button', { name: 'Ayer' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-09-25')
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-03' } })
    expect(screen.getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'false')
    expect(saveButton()).toBeEnabled()
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '' } })
    expect(screen.getByText('Fecha no válida')).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha')).toHaveAttribute('aria-invalid', 'true')
    expect(saveButton()).toBeDisabled()
  })

  it('uses the presetType of the sheet', () => {
    renderApp({ ui: { sheet: { kind: 'transaction/new', presetType: 'income' } } })
    expect(screen.getByRole('radio', { name: 'Ingreso' })).toBeChecked()
    expect(within(categoryGroup()).getByRole('button', { name: 'Nómina' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('Escape closes without saving', async () => {
    const { user, store } = openNew()
    const before = store.getSnapshot()
    await user.type(amountInput(), '12,50')
    act(() => {
      dialog().dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot()).toBe(before)
    expect(screen.queryByText('Gasto guardado')).not.toBeInTheDocument()
  })

  it('«×» and the backdrop close without saving', async () => {
    const { user, store } = openNew()
    const before = store.getSnapshot()
    await user.type(amountInput(), '3')
    await user.click(within(dialog()).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Añadir movimiento' }))
    fireEvent.click(dialog())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot()).toBe(before)
  })

  it('shows the reducer error inline when the dispatch is rejected', async () => {
    ids.forced = 't-10' // duplicate id → the reducer rejects the add
    const { user, store } = openNew()
    const before = store.getSnapshot()
    await user.type(amountInput(), '12,50{Enter}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No se ha podido guardar. Revisa los datos e inténtalo de nuevo')
    expect(store.getSnapshot()).toBe(before)
    // Editing any field clears the message.
    await user.type(amountInput(), '1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('TransactionSheet — edit', () => {
  const openEdit = (id: string, data?: AppData) => renderApp({ data, ui: { sheet: { kind: 'transaction/edit', id } } })

  it('prefills the amount without grouping («1234,56»), the note, the date and the category', () => {
    const data = fixtureData()
    data.transactions.push(tx({ id: 'big', amountCents: 123456, date: '2026-09-03', note: 'Portátil', categoryId: 'cat-compras' }))
    openEdit('big', data)
    expect(screen.getByRole('dialog', { name: 'Editar movimiento' })).toBeInTheDocument()
    expect(amountInput()).toHaveValue('1234,56')
    expect(norm(screen.getByText(/^= /).textContent)).toBe('= 1.234,56 €')
    expect(screen.getByLabelText('Nota (opcional)')).toHaveValue('Portátil')
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-09-03')
    expect(within(categoryGroup()).getByRole('button', { name: 'Compras' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('«Guardar cambios» updates the transaction and toasts «Cambios guardados»', async () => {
    const { user, store } = openEdit('t-10')
    expect(amountInput()).toHaveValue('83,20')
    await user.clear(amountInput())
    await user.type(amountInput(), '20')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Cambios guardados')).toBeInTheDocument()
    const updated = store.getSnapshot().transactions.find((t) => t.id === 't-10')
    expect(updated).toMatchObject({ amountCents: 2000, note: 'Café y compra semanal', categoryId: 'cat-alimentacion' })
    expect(updated?.updatedAt).toBeGreaterThan(updated?.createdAt ?? 0)
  })

  it('changing the type in edit mode resets the category to the last used of the new type', async () => {
    const { user, store } = openEdit('t-10')
    await user.click(screen.getByRole('radio', { name: 'Ingreso' }))
    expect(within(categoryGroup()).getByRole('button', { name: 'Nómina' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(store.getSnapshot().transactions.find((t) => t.id === 't-10')).toMatchObject({
      type: 'income',
      categoryId: 'cat-nomina',
    })
  })

  it('deletes in two steps: «Eliminar» → «¿Eliminar este movimiento?» → «Sí, eliminar»; «Cancelar» keeps it', async () => {
    const { user, store } = openEdit('t-10')
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(screen.getByText('¿Eliminar este movimiento?')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('¿Eliminar este movimiento?')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Movimiento eliminado')).toBeInTheDocument()
    expect(store.getSnapshot().transactions.some((t) => t.id === 't-10')).toBe(false)
  })

  it('closes when the edited transaction disappears from the store', () => {
    const { store } = openEdit('t-10')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      store.dispatch({ type: 'transaction/remove', id: 't-10' })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes immediately when opened for an unknown id', () => {
    openEdit('nope')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Flujo alta (F1)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('+ → 12,50 → Guardar in 3 interactions: the row «−12,50 €» appears in Movimientos and the toast disappears after 4 s', async () => {
    const { user, store } = renderApp({
      data: seedData(FIXTURE_NOW),
      userEventOptions: { advanceTimers: vi.advanceTimersByTime },
    })
    await user.click(screen.getByRole('button', { name: 'Añadir movimiento' }))
    expect(amountInput()).toHaveFocus()
    await user.keyboard('12,50')
    await user.click(saveButton())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Gasto guardado')).toBeInTheDocument()
    expect(store.getSnapshot().transactions).toHaveLength(1)
    expect(store.getSnapshot().transactions[0]).toMatchObject({
      type: 'expense',
      amountCents: 1250,
      date: '2026-09-25',
      categoryId: 'cat-alimentacion',
    })

    await user.click(within(screen.getByRole('navigation', { name: 'Navegación principal' })).getByRole('button', { name: 'Movimientos' }))
    const row = screen.getByRole('button', { name: /Alimentación/ })
    expect(norm(row.textContent)).toContain('−12,50 €')
    expect(screen.getByRole('heading', { level: 4, name: /Hoy/ })).toBeInTheDocument()
    expect(norm(screen.getByText(/^Ingresos /).textContent)).toBe('Ingresos 0,00 € · Gastos 12,50 € · Balance −12,50 €')

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText('Gasto guardado')).not.toBeInTheDocument()
  })
})
