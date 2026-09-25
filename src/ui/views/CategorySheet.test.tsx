// ============================================================================
// src/ui/views/CategorySheet.test.tsx — §10.2 «CategorySheet»: create, name
// errors, rename with collision, delete with reassignment (text with N) and
// builtIn without «Eliminar».
// ============================================================================
import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EMOJI_CHOICES } from '../../domain/seed'
import { WELL_KNOWN_IDS } from '../../domain/types'
import { assertInvariants } from '../../domain/validate'
import { renderApp } from '../../test/renderApp'

const dialog = () => screen.getByRole('dialog')
const nameInput = () => within(dialog()).getByRole('textbox', { name: 'Nombre' })
const save = () => within(dialog()).getByRole('button', { name: 'Guardar' })
const iconGroup = () => within(dialog()).getByRole('group', { name: 'Icono' })
const colorGroup = () => within(dialog()).getByRole('group', { name: 'Color' })
const typeGroup = () => within(dialog()).getByRole('group', { name: 'Tipo' })

describe('CategorySheet (new)', () => {
  it('renders the emoji grid, the 9 named colour swatches and the type segment', () => {
    renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/new', type: 'expense' } } })
    const tiles = within(iconGroup()).getAllByRole('button')
    expect(tiles).toHaveLength(EMOJI_CHOICES.length)
    expect(tiles.filter((t) => t.getAttribute('aria-pressed') === 'true')).toHaveLength(1)
    const swatches = within(colorGroup()).getAllByRole('button')
    expect(swatches.map((s) => s.getAttribute('aria-label'))).toEqual([
      'Azul', 'Naranja', 'Verde azulado', 'Ámbar', 'Rosa', 'Verde', 'Violeta', 'Rojo', 'Gris',
    ])
    expect(within(colorGroup()).getByRole('button', { name: 'Azul' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(typeGroup()).getByRole('radio', { name: 'Gasto' })).toBeChecked()
    expect(within(typeGroup()).getByRole('radio', { name: 'Ingreso' })).toBeEnabled()
    expect(nameInput()).toHaveFocus()
    expect(within(dialog()).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  it('creates «Mascotas 🐶» (red) and lists it with 0 movements', async () => {
    const { user, store } = renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/new', type: 'expense' } } })
    await user.type(nameInput(), 'Mascotas')
    await user.click(within(iconGroup()).getByRole('button', { name: '🐶' }))
    expect(within(iconGroup()).getByRole('button', { name: '🐶' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(colorGroup()).getByRole('button', { name: 'Rojo' }))
    await user.click(save())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Categoría guardada')).toBeInTheDocument()
    const created = store.getSnapshot().categories.find((c) => c.name === 'Mascotas')
    expect(created).toMatchObject({ type: 'expense', icon: '🐶', color: 'red', builtIn: false, sortOrder: 11 })
    assertInvariants(store.getSnapshot())
    const row = screen.getByText('Mascotas').closest('li')
    expect(row).not.toBeNull()
    expect(within(row!).getByText('0 movimientos')).toBeInTheDocument()
    expect(within(row!).getByRole('button', { name: 'Editar Mascotas' })).toBeInTheDocument()
  })

  it('creates an income category when the type segment is switched', async () => {
    const { user, store } = renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/new', type: 'expense' } } })
    await user.type(nameInput(), 'Alquiler cobrado')
    await user.click(within(typeGroup()).getByRole('radio', { name: 'Ingreso' }))
    await user.keyboard('{Enter}')
    await user.click(nameInput())
    await user.keyboard('{Enter}')
    expect(store.getSnapshot().categories.find((c) => c.name === 'Alquiler cobrado')?.type).toBe('income')
  })

  it('shows «El nombre es obligatorio» for a blank name and «Ya existe una categoría con ese nombre» for a collision', async () => {
    const { user, store } = renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/new', type: 'expense' } } })
    await user.type(nameInput(), '   ')
    await user.click(save())
    const required = within(dialog()).getByText('El nombre es obligatorio')
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true')
    expect(nameInput()).toHaveAttribute('aria-describedby', required.id)
    await user.clear(nameInput())
    await user.type(nameInput(), 'alimentacion')
    expect(within(dialog()).queryByText('El nombre es obligatorio')).not.toBeInTheDocument()
    await user.click(save())
    expect(within(dialog()).getByText('Ya existe una categoría con ese nombre')).toBeInTheDocument()
    expect(store.getSnapshot().categories).toHaveLength(15)
    await user.clear(nameInput())
    await user.type(nameInput(), 'x'.repeat(31))
    await user.click(save())
    expect(within(dialog()).getByText('Máximo 30 caracteres')).toBeInTheDocument()
  })

  it('an income name may repeat an expense name (uniqueness is per type)', async () => {
    const { user, store } = renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/new', type: 'income' } } })
    await user.type(nameInput(), 'Ocio')
    await user.click(save())
    expect(store.getSnapshot().categories.filter((c) => c.name === 'Ocio')).toHaveLength(2)
  })
})

describe('CategorySheet (edit)', () => {
  it('prefills the fields, disables the type segment and renames with collision detection', async () => {
    const { user, store } = renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/edit', id: 'cat-ocio' } } })
    expect(within(dialog()).getByRole('heading', { name: 'Editar categoría' })).toBeInTheDocument()
    expect(nameInput()).toHaveValue('Ocio')
    expect(within(iconGroup()).getByRole('button', { name: '🎬' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(colorGroup()).getByRole('button', { name: 'Rosa' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(typeGroup()).getByRole('radio', { name: 'Gasto' })).toBeChecked()
    expect(within(typeGroup()).getByRole('radio', { name: 'Gasto' })).toBeDisabled()

    await user.clear(nameInput())
    await user.type(nameInput(), 'SALUD')
    await user.click(save())
    expect(within(dialog()).getByText('Ya existe una categoría con ese nombre')).toBeInTheDocument()
    expect(store.getSnapshot().categories.find((c) => c.id === 'cat-ocio')?.name).toBe('Ocio')

    await user.clear(nameInput())
    await user.type(nameInput(), 'ocio')
    await user.click(within(colorGroup()).getByRole('button', { name: 'Verde' }))
    await user.click(save())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot().categories.find((c) => c.id === 'cat-ocio')).toMatchObject({ name: 'ocio', color: 'green' })
    expect(screen.getByText('Categoría guardada')).toBeInTheDocument()
  })

  it('deletes a category with movements after the reassignment dialog (N and «Otros gastos»)', async () => {
    const { user, store } = renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/edit', id: 'cat-ocio' } } })
    await user.click(within(dialog()).getByRole('button', { name: 'Eliminar' }))
    const confirm = screen.getByRole('dialog', { name: '¿Eliminar la categoría Ocio?' })
    expect(
      within(confirm).getByText('Sus 2 movimientos pasarán a "Otros gastos". Se eliminará también su presupuesto.'),
    ).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog', { name: '¿Eliminar la categoría Ocio?' })).not.toBeInTheDocument()
    expect(store.getSnapshot().categories.some((c) => c.id === 'cat-ocio')).toBe(true)

    await user.click(within(dialog()).getByRole('button', { name: 'Eliminar' }))
    await user.click(
      within(screen.getByRole('dialog', { name: '¿Eliminar la categoría Ocio?' })).getByRole('button', { name: 'Eliminar' }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const data = store.getSnapshot()
    expect(data.categories.some((c) => c.id === 'cat-ocio')).toBe(false)
    expect(data.budgets.some((b) => b.categoryId === 'cat-ocio')).toBe(false)
    expect(data.transactions).toHaveLength(12)
    for (const id of ['t-07', 't-11']) {
      expect(data.transactions.find((t) => t.id === id)?.categoryId).toBe(WELL_KNOWN_IDS.otherExpense)
    }
    assertInvariants(data)
    expect(screen.getByText('Categoría eliminada')).toBeInTheDocument()
    expect(screen.queryByText('Ocio')).not.toBeInTheDocument()
  })

  it('a category without movements asks a simple confirmation', async () => {
    const { user, store } = renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/edit', id: 'cat-salud' } } })
    await user.click(within(dialog()).getByRole('button', { name: 'Eliminar' }))
    const confirm = screen.getByRole('dialog', { name: '¿Eliminar la categoría Salud?' })
    expect(within(confirm).queryByText(/pasarán a/)).not.toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Eliminar' }))
    expect(store.getSnapshot().categories.some((c) => c.id === 'cat-salud')).toBe(false)
    assertInvariants(store.getSnapshot())
  })

  it('a builtIn category has no «Eliminar» but explains why, and can still be renamed', async () => {
    const { user, store } = renderApp({
      ui: { screen: 'categories', sheet: { kind: 'category/edit', id: WELL_KNOWN_IDS.otherExpense } },
    })
    expect(within(dialog()).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(within(dialog()).getByText('Esta categoría no se puede eliminar')).toBeInTheDocument()
    await user.clear(nameInput())
    await user.type(nameInput(), 'Varios')
    await user.click(save())
    expect(store.getSnapshot().categories.find((c) => c.id === WELL_KNOWN_IDS.otherExpense)).toMatchObject({
      name: 'Varios',
      builtIn: true,
    })
  })

  it('Escape inside the delete confirmation closes only the confirmation and keeps the edits', async () => {
    const { user, store } = renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/edit', id: 'cat-ocio' } } })
    await user.clear(nameInput())
    await user.type(nameInput(), 'Ocio editado')
    await user.click(within(dialog()).getByRole('button', { name: 'Eliminar' }))
    const confirm = screen.getByRole('dialog', { name: '¿Eliminar la categoría Ocio?' })
    act(() => {
      confirm.dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(screen.queryByRole('dialog', { name: '¿Eliminar la categoría Ocio?' })).not.toBeInTheDocument()
    const sheet = screen.getByRole('dialog', { name: 'Editar categoría' })
    expect(within(sheet).getByRole('textbox', { name: 'Nombre' })).toHaveValue('Ocio editado')
    expect(store.getSnapshot().categories.some((c) => c.id === 'cat-ocio')).toBe(true)
  })

  it('opens with focus on «Nombre»', () => {
    renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/new', type: 'expense' } } })
    expect(nameInput()).toHaveFocus()
  })

  it('Escape closes without saving', async () => {
    const { user, store } = renderApp({ ui: { screen: 'categories', sheet: { kind: 'category/edit', id: 'cat-ocio' } } })
    await user.type(nameInput(), 'X')
    act(() => {
      dialog().dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot().categories.find((c) => c.id === 'cat-ocio')?.name).toBe('Ocio')
  })
})
