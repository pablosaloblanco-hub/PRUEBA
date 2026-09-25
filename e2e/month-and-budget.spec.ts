// §10.3 item 3 — fixture §3.7 + fixed clock: monthly totals with ‹ ›, «Hoy», the search,
// budgets in September (b-ocio over, b-total warning), creating «Alimentación 200 €» and
// the Inicio summary (total first, then Ocio; «Saldo total 1.479,30 €»).
import { test, expect } from '@playwright/test'
import {
  FIXTURE,
  expectTotals,
  fixedClock,
  goTo,
  monthLabel,
  moneyRe,
  seedStorage,
  toast,
  transactionRows,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await fixedClock(page)
  await seedStorage(page, FIXTURE)
  await page.goto('/')
})

test('month selector: totals of September, August and July; «Hoy» returns', async ({ page }, testInfo) => {
  await goTo(page, testInfo, 'Movimientos')
  const previous = page.getByRole('button', { name: 'Mes anterior' })
  const todayPill = page.getByRole('button', { name: 'Hoy', exact: true })

  await expect(monthLabel(page)).toHaveText('septiembre 2026')
  await expect(todayPill).toBeHidden()
  await expectTotals(page, '1.200,00 €', '843,20 €', '+356,80 €')
  await expect(transactionRows(page)).toHaveCount(5)
  // The future movement (2026-09-28) sits under its own day header, above everything; no «Hoy» group.
  const dayHeaders = page.locator('.transaction-list .list-header__label')
  await expect(dayHeaders.first()).toHaveText('lunes, 28 sep')
  await expect(dayHeaders.filter({ hasText: /^Hoy$/ })).toHaveCount(0)
  await expect(transactionRows(page).first()).toContainText('Gimnasio (futuro)')

  await previous.click()
  await expect(monthLabel(page)).toHaveText('agosto 2026')
  await expect(todayPill).toBeVisible()
  await expectTotals(page, '1.200,00 €', '677,50 €', '+522,50 €')
  await expect(transactionRows(page)).toHaveCount(4)

  await previous.click()
  await expect(monthLabel(page)).toHaveText('julio 2026')
  await expectTotals(page, '1.200,00 €', '750,00 €', '+450,00 €')
  await expect(transactionRows(page)).toHaveCount(3)

  await todayPill.click()
  await expect(monthLabel(page)).toHaveText('septiembre 2026')
  await expect(todayPill).toBeHidden()
  await expectTotals(page, '1.200,00 €', '843,20 €', '+356,80 €')
  await expect(transactionRows(page)).toHaveCount(5)
})

test('search «cafe» finds «Café y compra semanal» ignoring accents and case', async ({ page }, testInfo) => {
  await goTo(page, testInfo, 'Movimientos')
  const search = page.getByRole('searchbox', { name: 'Buscar por nota o categoría' })
  await search.fill('cafe')
  await expect(transactionRows(page)).toHaveCount(1)
  await expect(transactionRows(page).first()).toContainText('Café y compra semanal')
  await expect(transactionRows(page).first()).toContainText(moneyRe('−83,20 €'))
  await expectTotals(page, '0,00 €', '83,20 €', '−83,20 €')
  await expect(page.getByRole('button', { name: 'Limpiar filtros' })).toBeVisible()

  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click()
  await expect(search).toHaveValue('')
  await expect(transactionRows(page)).toHaveCount(5)

  // In August nothing matches: filtered empty state
  await search.fill('cafe')
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(page.getByText('Ningún movimiento coincide con los filtros')).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(transactionRows(page)).toHaveCount(4)
})

test('budgets of September and creating «Alimentación 200 €»', async ({ page }, testInfo) => {
  await goTo(page, testInfo, 'Presupuestos')
  const cards = page.locator('.budget-card')
  await expect(cards).toHaveCount(2)

  const total = cards.filter({ hasText: 'Presupuesto total' })
  await expect(total).toHaveAttribute('data-status', 'warning')
  await expect(total).toContainText(moneyRe('Gastado 843,20 € de 1.000,00 €'))
  await expect(total).toContainText(moneyRe('Te quedan 156,80 €'))

  const ocio = cards.filter({ hasText: 'Ocio' })
  await expect(ocio).toHaveAttribute('data-status', 'over')
  await expect(ocio).toContainText(moneyRe('Gastado 110,00 € de 100,00 €'))
  await expect(ocio).toContainText(moneyRe('Has superado el presupuesto en 10,00 €'))

  // Total first, then the category budgets
  await expect(cards.first()).toContainText('Presupuesto total')

  const newBudget = testInfo.project.name === 'mobile'
    ? page.getByRole('button', { name: 'Nuevo presupuesto' })
    : page.getByRole('button', { name: '+ Nuevo presupuesto' })
  await newBudget.click()
  const dialog = page.getByRole('dialog', { name: 'Nuevo presupuesto' })
  await expect(dialog).toBeVisible()
  const select = dialog.getByLabel('Categoría')
  // The total already exists, so «Total mensual» is not offered; Ocio already has a budget.
  await expect(select.locator('option', { hasText: 'Total mensual' })).toHaveCount(0)
  await expect(select.locator('option', { hasText: 'Ocio' })).toHaveCount(0)
  await select.selectOption({ label: 'Alimentación' })
  await dialog.getByLabel('Límite mensual').fill('200')
  await expect(dialog.getByText('Se aplica a todos los meses')).toBeVisible()
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(toast(page)).toHaveText('Presupuesto guardado')

  await expect(cards).toHaveCount(3)
  const food = cards.filter({ hasText: 'Alimentación' })
  await expect(food).toBeVisible()
  await expect(food).toHaveAttribute('data-status', 'ok')
  await expect(food).toContainText(moneyRe('Gastado 83,20 € de 200,00 €'))
  await expect(food).toContainText(moneyRe('Te quedan 116,80 €'))

  // In August Ocio is fine (45,00 / 100,00)
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(ocio).toHaveAttribute('data-status', 'ok')
  await expect(ocio).toContainText(moneyRe('Te quedan 55,00 €'))

  // Persisted
  await page.reload()
  await goTo(page, testInfo, 'Presupuestos')
  await expect(cards.filter({ hasText: 'Alimentación' })).toContainText(moneyRe('Te quedan 116,80 €'))
})

test('Inicio shows the September summary from the fixture', async ({ page }) => {
  await expect(monthLabel(page)).toHaveText('septiembre 2026')

  const hero = page.getByRole('region', { name: 'Balance del mes' })
  await expect(hero.locator('.home-hero__value')).toHaveText(moneyRe('+356,80 €'))
  await expect(hero.locator('.home-tile--income')).toHaveText(moneyRe('Ingresos1.200,00 €'))
  await expect(hero.locator('.home-tile--expense')).toHaveText(moneyRe('Gastos843,20 €'))

  const balance = page.getByRole('region', { name: 'Saldo total' })
  await expect(balance.locator('.home-balance__value')).toContainText(moneyRe('1.479,30 €'))
  await expect(balance).toContainText('(sin contar 1 movimiento futuro)')
  await expect(balance).toContainText('Saldo inicial + ingresos − gastos hasta hoy')

  const kpis = page.locator('.home-kpis .kpi')
  await expect(kpis.filter({ hasText: 'Gasto medio por día' })).toContainText(moneyRe('31,73 €'))
  const projection = kpis.filter({ hasText: 'Proyección a fin de mes' })
  await expect(projection).toContainText(moneyRe('951,84 €'))
  await expect(projection).toContainText('día 25 de 30 (sin contar 1 futuro)')

  // Presupuestos: total first, then Ocio (2 rows)
  const budgets = page.getByRole('region', { name: 'Presupuestos' })
  const rows = budgets.locator('.budget-card')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('Presupuesto total')
  await expect(rows.nth(0)).toHaveAttribute('data-status', 'warning')
  await expect(rows.nth(0)).toContainText(moneyRe('Te quedan 156,80 €'))
  await expect(rows.nth(1)).toContainText('Ocio')
  await expect(rows.nth(1)).toHaveAttribute('data-status', 'over')
  await expect(rows.nth(1)).toContainText(moneyRe('Has superado el presupuesto en 10,00 €'))

  // Gastos por categoría: top 4 with percentages
  const byCategory = page.getByRole('region', { name: 'Gastos por categoría' })
  const bars = byCategory.locator('.home-category')
  await expect(bars).toHaveCount(4)
  await expect(bars.nth(0)).toContainText(moneyRe('Vivienda600,00 €71 %'))
  await expect(bars.nth(1)).toContainText(moneyRe('Ocio110,00 €13 %'))
  await expect(bars.nth(2)).toContainText(moneyRe('Alimentación83,20 €10 %'))
  await expect(bars.nth(3)).toContainText(moneyRe('Suscripciones50,00 €6 %'))

  // Últimos movimientos: the 5 September rows
  await expect(page.getByRole('region', { name: 'Últimos movimientos' }).locator('.list-row')).toHaveCount(5)
})
