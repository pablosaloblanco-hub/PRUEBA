// ============================================================================
// src/ui/views/CategoriesView.test.tsx — §10.2 «CategoriesView»: <li> rows
// without button role, counts, tabs Gastos | Ingresos, «+ Nueva categoría»
// and «Editar {nombre}» opening the sheets.
// ============================================================================
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp'

const list = () => screen.getByRole('list')
const rows = () => within(list()).getAllByRole('listitem')

describe('CategoriesView', () => {
  it('lists the expense categories as <li> rows with badge, name, count and an «Editar {nombre}» icon button', () => {
    renderApp({ ui: { screen: 'categories' } })
    expect(rows()).toHaveLength(11)
    expect(rows().map((r) => r.tagName)).toEqual(Array<string>(11).fill('LI'))
    const vivienda = rows()[3]!
    expect(within(vivienda).getByText('Vivienda')).toBeInTheDocument()
    expect(within(vivienda).getByText('3 movimientos')).toBeInTheDocument()
    expect(within(vivienda).getByRole('button', { name: 'Editar Vivienda' })).toBeInTheDocument()
    expect(within(vivienda).getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Vivienda' })).not.toBeInTheDocument()
    expect(within(rows()[5]!).getByText('2 movimientos')).toBeInTheDocument()
    expect(within(rows()[6]!).getByText('0 movimientos')).toBeInTheDocument()
    expect(within(rows()[0]!).getByText('Alimentación')).toBeInTheDocument()
    expect(within(rows()[10]!).getByText('Otros gastos')).toBeInTheDocument()
  })

  it('switches to the income categories with the Ingresos tab', async () => {
    const { user } = renderApp({ ui: { screen: 'categories' } })
    const tabs = screen.getByRole('group', { name: 'Tipo' })
    expect(within(tabs).getByRole('radio', { name: 'Gastos' })).toBeChecked()
    await user.click(within(tabs).getByRole('radio', { name: 'Ingresos' }))
    expect(rows()).toHaveLength(4)
    expect(within(rows()[0]!).getByText('Nómina')).toBeInTheDocument()
    expect(within(rows()[0]!).getByText('3 movimientos')).toBeInTheDocument()
    expect(within(rows()[1]!).getByText('0 movimientos')).toBeInTheDocument()
    expect(within(rows()[3]!).getByText('Otros ingresos')).toBeInTheDocument()
  })

  it('singular «1 movimiento»', () => {
    renderApp({ ui: { screen: 'categories' } })
    expect(within(rows()[1]!).getByText('1 movimiento')).toBeInTheDocument()
  })

  it('«+ Nueva categoría» opens the sheet with the current tab as type', async () => {
    const { user } = renderApp({ ui: { screen: 'categories' } })
    await user.click(screen.getByRole('button', { name: '+ Nueva categoría' }))
    let dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Nueva categoría' })).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: 'Gasto' })).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Ingresos' }))
    await user.click(screen.getByRole('button', { name: '+ Nueva categoría' }))
    dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('radio', { name: 'Ingreso' })).toBeChecked()
  })

  it('«Editar {nombre}» opens the edit sheet prefilled', async () => {
    const { user } = renderApp({ ui: { screen: 'categories' } })
    await user.click(screen.getByRole('button', { name: 'Editar Ocio' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Editar categoría' })).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Nombre' })).toHaveValue('Ocio')
  })

  it('reaches the screen from Ajustes on mobile and «Volver» goes back to Ajustes', async () => {
    const { user } = renderApp({ ui: { screen: 'categories', previousScreen: 'settings' } })
    expect(screen.getByRole('heading', { level: 2, name: 'Categorías' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Ajustes' })).toBeInTheDocument()
  })
})
