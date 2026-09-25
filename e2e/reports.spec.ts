// §10.3 item 4 — fixture + fixed clock: the 6-row trend table with the F7 numbers and the
// donut legend (4 rows) whose «Ocio» row drills down to Movimientos filtered by Ocio.
import { test, expect } from '@playwright/test'
import {
  FIXTURE,
  expectTotals,
  fixedClock,
  goTo,
  monthLabel,
  moneyRe,
  screenHeading,
  seedStorage,
  transactionRows,
} from './helpers'

const TREND: readonly [string, string, string, string][] = [
  ['abril 2026', '0,00 €', '0,00 €', '0,00 €'],
  ['mayo 2026', '0,00 €', '0,00 €', '0,00 €'],
  ['junio 2026', '0,00 €', '0,00 €', '0,00 €'],
  ['julio 2026', '1.200,00 €', '750,00 €', '+450,00 €'],
  ['agosto 2026', '1.200,00 €', '677,50 €', '+522,50 €'],
  ['septiembre 2026', '1.200,00 €', '843,20 €', '+356,80 €'],
]

const LEGEND: readonly [string, string, string][] = [
  ['Vivienda', '600,00 €', '71 %'],
  ['Ocio', '110,00 €', '13 %'],
  ['Alimentación', '83,20 €', '10 %'],
  ['Suscripciones', '50,00 €', '6 %'],
]

test.beforeEach(async ({ page }, testInfo) => {
  await fixedClock(page)
  await seedStorage(page, FIXTURE)
  await page.goto('/')
  await goTo(page, testInfo, 'Informes')
})

test('the trend table has 6 rows with the F7 numbers', async ({ page }) => {
  const table = page.getByRole('table', { name: 'Ingresos frente a gastos' })
  await expect(table).toBeVisible()
  await expect(table.locator('thead th')).toHaveText(['Mes', 'Ingresos', 'Gastos', 'Balance'])
  const rows = table.locator('tbody tr')
  await expect(rows).toHaveCount(TREND.length)
  for (const [i, [month, income, expense, balance]] of TREND.entries()) {
    const row = rows.nth(i)
    await expect(row.locator('th')).toHaveText(month)
    const cells = row.locator('td')
    await expect(cells.nth(0)).toHaveText(moneyRe(income))
    await expect(cells.nth(1)).toHaveText(moneyRe(expense))
    await expect(cells.nth(2)).toHaveText(moneyRe(balance))
  }
  // The chart itself is labelled for assistive tech
  await expect(page.getByRole('img', { name: moneyRe('Gastos de septiembre 2026: 843,20 €; ingresos: 1.200,00 €') })).toBeVisible()
})

test('the donut legend has 4 rows and «Ocio» drills down to Movimientos', async ({ page }) => {
  const card = page.getByRole('region', { name: 'Gastos por categoría' })
  await expect(card.locator('.donut__center-total')).toHaveText(moneyRe('843,20 €'))
  const legend = card.locator('.donut__legend .chart-legend__item')
  await expect(legend).toHaveCount(LEGEND.length)
  for (const [i, [name, amount, percent]] of LEGEND.entries()) {
    await expect(legend.nth(i).locator('.chart-legend__name')).toHaveText(name)
    await expect(legend.nth(i).locator('.chart-legend__amount')).toHaveText(moneyRe(amount))
    await expect(legend.nth(i).locator('.chart-legend__percent')).toHaveText(moneyRe(percent))
  }
  await expect(card.getByText('Otras')).toHaveCount(0)

  await legend.nth(1).getByRole('button').click()
  await expect(screenHeading(page, 'Movimientos')).toBeVisible()
  await expect(monthLabel(page)).toHaveText('septiembre 2026')
  await expect(page.getByRole('button', { name: 'Ocio', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Quitar filtro de categoría' })).toBeVisible()
  await expect(transactionRows(page)).toHaveCount(1)
  await expect(transactionRows(page).first()).toContainText('Entradas concierto')
  await expect(transactionRows(page).first()).toContainText(moneyRe('−110,00 €'))
  await expectTotals(page, '0,00 €', '110,00 €', '−110,00 €')

  await page.getByRole('button', { name: 'Quitar filtro de categoría' }).click()
  await expect(transactionRows(page)).toHaveCount(5)
})

test('an empty month shows the empty states but keeps the table', async ({ page }) => {
  // Navigate to a future month with no data at all in the 6-month window (March 2027)
  const next = page.getByRole('button', { name: 'Mes siguiente' })
  for (let i = 0; i < 6; i++) await next.click()
  await expect(monthLabel(page)).toHaveText('marzo 2027')
  await expect(page.getByText('Aún no hay gastos en este mes')).toBeVisible()
  await expect(page.getByText('Aún no hay datos para este periodo')).toBeVisible()
  const table = page.getByRole('table', { name: 'Ingresos frente a gastos' })
  await expect(table.locator('tbody tr')).toHaveCount(6)
  await expect(table.locator('tbody tr').first().locator('th')).toHaveText('octubre 2026')
})
