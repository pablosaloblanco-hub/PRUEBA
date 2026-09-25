// ============================================================================
// src/ui/views/HomeView.test.tsx — §10.2 «HomeView»: the §3.7 fixture numbers
// (balance, total balance with the future suffix, KPIs with «día 25 de 30» and
// the future suffix, «—» in a future month), the budgets section order (total
// then Ocio), the category bars, the recent rows, the first-use and
// empty-month states and the drilldowns.
// ============================================================================
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedData } from '../../domain/seed'
import { fixtureData, tx } from '../../test/fixtures'
import { FIXTURE_NOW, renderApp } from '../../test/renderApp'

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ')
const main = () => within(screen.getByRole('main'))
const region = (name: string) => within(main().getByRole('region', { name }))

describe('HomeView — fixture numbers (September 2026, today 2026-09-25)', () => {
  it('shows the hero balance «+356,80 €» with the Ingresos and Gastos tiles', () => {
    renderApp()
    const hero = region('Balance del mes')
    expect(norm(hero.getByText(/356,80/).textContent)).toBe('+356,80 €')
    expect(hero.getByText('Ingresos')).toBeInTheDocument()
    expect(norm(hero.getByText(/1\.200,00/).textContent)).toBe('1.200,00 €')
    expect(hero.getByText('Gastos')).toBeInTheDocument()
    expect(norm(hero.getByText(/843,20/).textContent)).toBe('843,20 €')
  })

  it('shows «Saldo total 1.479,30 €» with the help text and the 1-future-movement suffix', () => {
    renderApp()
    const balance = region('Saldo total')
    expect(balance.getByText('Saldo total')).toBeInTheDocument()
    expect(norm(balance.getByText(/1\.479,30/).textContent)).toContain('1.479,30 €')
    expect(balance.getByText('(sin contar 1 movimiento futuro)')).toBeInTheDocument()
    expect(balance.getByText('Saldo inicial + ingresos − gastos hasta hoy')).toBeInTheDocument()
  })

  it('shows the KPIs «31,73 €» and «951,84 €» with «día 25 de 30 (sin contar 1 futuro)»', () => {
    renderApp()
    const avg = main().getByText('Gasto medio por día').parentElement!
    expect(norm(within(avg).getByText(/31,73/).textContent)).toBe('31,73 €')
    const projection = main().getByText('Proyección a fin de mes').parentElement!
    expect(norm(within(projection).getByText(/951,84/).textContent)).toBe('951,84 €')
    expect(within(projection).getByText('día 25 de 30 (sin contar 1 futuro)')).toBeInTheDocument()
  })

  it('shows «—» for both KPIs in a future month', () => {
    renderApp({ ui: { month: '2026-11' } })
    const avg = main().getByText('Gasto medio por día').parentElement!
    expect(within(avg).getByText('—')).toBeInTheDocument()
    const projection = main().getByText('Proyección a fin de mes').parentElement!
    expect(within(projection).getByText('—')).toBeInTheDocument()
    expect(main().queryByText(/día \d+ de \d+/)).not.toBeInTheDocument()
  })

  it('shows no day label and no suffix for a past month (projection = real expense)', () => {
    renderApp({ ui: { month: '2026-08' } })
    const projection = main().getByText('Proyección a fin de mes').parentElement!
    expect(norm(within(projection).getByText(/677,50/).textContent)).toBe('677,50 €')
    expect(main().queryByText(/día \d+ de \d+/)).not.toBeInTheDocument()
    expect(main().queryByText(/sin contar 1 futuro/)).not.toBeInTheDocument()
    // «Saldo total» is month-independent and keeps its own suffix.
    expect(main().getByText('(sin contar 1 movimiento futuro)')).toBeInTheDocument()
  })

  it('lists the budgets with the total first (warning) and then Ocio (over), plus «Ver todos»', async () => {
    const { user } = renderApp()
    const budgets = region('Presupuestos')
    const cards = budgets.getAllByRole('article')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]!).getByText('Presupuesto total')).toBeInTheDocument()
    expect(within(cards[0]!).getByText('Te quedan 156,80 €')).toBeInTheDocument()
    expect(within(cards[0]!).getByRole('progressbar')).toHaveAttribute('data-status', 'warning')
    expect(within(cards[1]!).getByText('Ocio')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('Has superado el presupuesto en 10,00 €')).toBeInTheDocument()
    expect(within(cards[1]!).getByRole('progressbar')).toHaveAttribute('data-status', 'over')
    // Compact cards carry no Editar/Eliminar actions on Inicio.
    expect(budgets.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()

    await user.click(budgets.getByRole('button', { name: 'Ver todos' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Presupuestos' })).toBeInTheDocument()
  })

  it('shows at most 3 budget rows, the total first', () => {
    const data = fixtureData()
    data.budgets.push(
      { id: 'b-vivienda', categoryId: 'cat-vivienda', limitCents: 70000 },
      { id: 'b-alimentacion', categoryId: 'cat-alimentacion', limitCents: 10000 },
    )
    renderApp({ data })
    const cards = region('Presupuestos').getAllByRole('article')
    expect(cards).toHaveLength(3)
    expect(within(cards[0]!).getByText('Presupuesto total')).toBeInTheDocument()
  })

  it('shows the empty budgets text and «Crear presupuesto» opens the new-budget sheet', async () => {
    const data = fixtureData()
    data.budgets = []
    const { user } = renderApp({ data })
    const budgets = region('Presupuestos')
    expect(budgets.getByText('Crea un presupuesto para controlar tus gastos')).toBeInTheDocument()
    expect(budgets.queryByRole('button', { name: 'Ver todos' })).not.toBeInTheDocument()
    await user.click(budgets.getByRole('button', { name: 'Crear presupuesto' }))
    expect(screen.getByRole('dialog', { name: 'Nuevo presupuesto' })).toBeInTheDocument()
  })

  it('shows the top expense categories with amount and percent, in order', () => {
    renderApp()
    const list = region('Gastos por categoría')
    const rows = list.getAllByRole('listitem')
    expect(rows.map((row) => norm(row.textContent))).toEqual([
      expect.stringContaining('Vivienda'),
      expect.stringContaining('Ocio'),
      expect.stringContaining('Alimentación'),
      expect.stringContaining('Suscripciones'),
    ])
    expect(norm(rows[0]!.textContent)).toContain('600,00 €')
    expect(norm(rows[0]!.textContent)).toContain('71 %')
    expect(norm(rows[1]!.textContent)).toContain('110,00 €')
    expect(norm(rows[1]!.textContent)).toContain('13 %')
    expect(norm(rows[2]!.textContent)).toContain('83,20 €')
    expect(norm(rows[2]!.textContent)).toContain('10 %')
    expect(norm(rows[3]!.textContent)).toContain('50,00 €')
    expect(norm(rows[3]!.textContent)).toContain('6 %')
    expect(within(rows[0]!).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '71')
  })

  it('tapping a category row opens Movimientos filtered by that category; «Ver informe» opens Informes', async () => {
    const { user } = renderApp()
    await user.click(region('Gastos por categoría').getByRole('button', { name: /Ocio/ }))
    expect(screen.getByRole('heading', { level: 2, name: 'Movimientos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar filtro de categoría' })).toBeInTheDocument()
    // Only Ocio rows remain (t-08 cine, t-09 concierto in September).
    expect(screen.getAllByRole('button', { name: /Ocio/ })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Vivienda/ })).not.toBeInTheDocument()
  })

  it('«Ver informe» navigates to Informes', async () => {
    const { user } = renderApp()
    await user.click(region('Gastos por categoría').getByRole('button', { name: 'Ver informe' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Informes' })).toBeInTheDocument()
  })

  it('lists the 5 September movements as rows and «Ver todos» opens Movimientos', async () => {
    const { user } = renderApp()
    const recent = region('Últimos movimientos')
    const rows = recent.getAllByRole('listitem')
    expect(rows).toHaveLength(5)
    // Newest first: the future gym fee of 2026-09-28 comes first, the September payslip last.
    expect(norm(rows[0]!.textContent)).toContain('Suscripciones')
    expect(norm(rows[0]!.textContent)).toContain('−50,00 €')
    expect(norm(rows[4]!.textContent)).toContain('+1.200,00 €')
    await user.click(recent.getByRole('button', { name: 'Ver todos' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Movimientos' })).toBeInTheDocument()
  })

  it('tapping a recent row opens the edit sheet for that movement', async () => {
    const { user } = renderApp()
    await user.click(region('Últimos movimientos').getByRole('button', { name: /Café y compra semanal/ }))
    expect(screen.getByRole('dialog', { name: 'Editar movimiento' })).toBeInTheDocument()
  })
})

describe('HomeView — empty states', () => {
  it('first use (no movements at all) shows the onboarding card with both actions', async () => {
    const { user } = renderApp({ data: seedData(FIXTURE_NOW) })
    expect(main().getByText('Empieza registrando tu primer gasto')).toBeInTheDocument()
    expect(main().queryByText('Balance del mes')).not.toBeInTheDocument()
    await user.click(main().getByRole('button', { name: 'Añadir movimiento' }))
    expect(screen.getByRole('dialog', { name: 'Nuevo movimiento' })).toBeInTheDocument()
  })

  it('«Importar copia de seguridad» goes to Ajustes', async () => {
    const { user } = renderApp({ data: seedData(FIXTURE_NOW) })
    await user.click(main().getByRole('button', { name: 'Importar copia de seguridad' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Ajustes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar copia' })).toBeInTheDocument()
  })

  it('a month without data (but with history) shows «Todavía no hay movimientos en octubre 2026»', () => {
    renderApp({ ui: { month: '2026-10' } })
    expect(main().getByText('Todavía no hay movimientos en octubre 2026')).toBeInTheDocument()
    expect(main().getByText('Balance del mes')).toBeInTheDocument()
    expect(main().queryByText('Últimos movimientos')).not.toBeInTheDocument()
    expect(main().queryByText('Gastos por categoría')).not.toBeInTheDocument()
  })

  it('omits the future suffixes when nothing is dated after today', () => {
    const data = seedData(FIXTURE_NOW)
    data.transactions = [tx({ id: 'only', date: '2026-09-10', amountCents: 2500 })]
    renderApp({ data })
    expect(main().queryByText(/sin contar/)).not.toBeInTheDocument()
    const projection = main().getByText('Proyección a fin de mes').parentElement!
    expect(within(projection).getByText('día 25 de 30')).toBeInTheDocument()
    // 25,00 € over 25 days → 1,00 € per day, projected 30,00 €.
    expect(norm(within(projection).getByText(/30,00/).textContent)).toBe('30,00 €')
  })
})
