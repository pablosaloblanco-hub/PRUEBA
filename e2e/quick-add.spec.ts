// §10.3 item 1 — F1 quick add: fresh app → «+» → 12,50 → Guardar (3 interactions)
// → row «−12,50 €» in Movimientos, «Gastos 12,50 €» on Inicio, persisted across reload.
import { test, expect } from '@playwright/test'
import {
  expectTotals,
  fixedClock,
  goTo,
  moneyRe,
  openTransactionSheet,
  readStorage,
  toast,
  transactionRows,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await fixedClock(page)
  await page.goto('/')
  await expect(page.getByText('Empieza registrando tu primer gasto')).toBeVisible()
})

test('adds an expense in three interactions and persists it', async ({ page }, testInfo) => {
  // 1) «+»
  const dialog = await openTransactionSheet(page, testInfo)
  const amount = dialog.getByLabel('Importe')
  await expect(amount).toBeFocused()
  await expect(dialog.getByRole('radio', { name: 'Gasto' })).toBeChecked()

  // 2) type the amount (focus is already on Importe)
  await page.keyboard.type('12,50')
  await expect(dialog.getByText(moneyRe('= 12,50 €'))).toBeVisible()

  // 3) Guardar
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(toast(page)).toHaveText('Gasto guardado')

  // Movimientos: the row and the totals of the month
  await goTo(page, testInfo, 'Movimientos')
  await expect(transactionRows(page)).toHaveCount(1)
  await expect(transactionRows(page).first()).toContainText(moneyRe('−12,50 €'))
  await expect(page.getByRole('heading', { level: 3, name: /Hoy/ })).toBeVisible()
  await expectTotals(page, '0,00 €', '12,50 €', '−12,50 €')

  // Inicio: hero tile «Gastos 12,50 €»
  await goTo(page, testInfo, 'Inicio')
  const hero = page.getByRole('region', { name: 'Balance del mes' })
  await expect(hero.locator('.home-tile--expense')).toHaveText(moneyRe('Gastos12,50 €'))
  await expect(hero.locator('.home-hero__value')).toHaveText(moneyRe('−12,50 €'))

  // Persisted: localStorage key present, the state survives a reload
  const raw = await readStorage(page)
  expect(raw).not.toBeNull()
  const envelope = JSON.parse(raw ?? '{}') as { app: string; data: { transactions: { amountCents: number }[] } }
  expect(envelope.app).toBe('mis-finanzas')
  expect(envelope.data.transactions).toHaveLength(1)
  expect(envelope.data.transactions[0]?.amountCents).toBe(1250)

  await page.reload()
  await expect(hero.locator('.home-tile--expense')).toHaveText(moneyRe('Gastos12,50 €'))
  await goTo(page, testInfo, 'Movimientos')
  await expect(transactionRows(page).first()).toContainText(moneyRe('−12,50 €'))
  await expectTotals(page, '0,00 €', '12,50 €', '−12,50 €')
})

test('the amount field rejects invalid input and keeps Guardar disabled', async ({ page }, testInfo) => {
  const dialog = await openTransactionSheet(page, testInfo)
  const save = dialog.getByRole('button', { name: 'Guardar', exact: true })
  await expect(save).toBeDisabled()
  await page.keyboard.type('12,505')
  await expect(dialog.getByText('Máximo dos decimales')).toBeVisible()
  await expect(save).toBeDisabled()
  await dialog.getByLabel('Importe').fill('0')
  await expect(dialog.getByText('Introduce un importe mayor que 0')).toBeVisible()
  await expect(save).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Empieza registrando tu primer gasto')).toBeVisible()
})
