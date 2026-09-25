// §10.3 item 2 — F2: open a row → change 12,50 to 20 → «Guardar cambios» → «−20,00 €»;
// Eliminar → «Sí, eliminar» → the row disappears and the totals go down; reload persists.
import { test, expect } from '@playwright/test'
import { FIXTURE, expectTotals, fixedClock, goTo, moneyRe, seedStorage, toast, transactionRows } from './helpers'

/** Fixture categories/settings with two September movements: a 12,50 € coffee today and the salary. */
const ENVELOPE = {
  ...FIXTURE,
  data: {
    ...FIXTURE.data,
    transactions: [
      {
        id: 't-cafe',
        type: 'expense',
        amountCents: 1250,
        date: '2026-09-25',
        categoryId: 'cat-restaurantes',
        note: 'Café',
        createdAt: 1783900800000,
        updatedAt: 1783900800000,
      },
      {
        id: 't-nomina',
        type: 'income',
        amountCents: 120000,
        date: '2026-09-01',
        categoryId: 'cat-nomina',
        note: 'Nómina septiembre',
        createdAt: 1783555200000,
        updatedAt: 1783555200000,
      },
    ],
  },
}

test.beforeEach(async ({ page }, testInfo) => {
  await fixedClock(page)
  await seedStorage(page, ENVELOPE)
  await page.goto('/')
  await goTo(page, testInfo, 'Movimientos')
  await expectTotals(page, '1.200,00 €', '12,50 €', '+1.187,50 €')
})

test('edits the amount, then deletes the movement, and both changes persist', async ({ page }, testInfo) => {
  // Edit: the row opens the sheet in edit mode with the amount prefilled without grouping
  const coffee = transactionRows(page).filter({ hasText: 'Café' })
  await expect(coffee).toContainText(moneyRe('−12,50 €'))
  await coffee.click()
  const dialog = page.getByRole('dialog', { name: 'Editar movimiento' })
  await expect(dialog).toBeVisible()
  const amount = dialog.getByLabel('Importe')
  await expect(amount).toHaveValue('12,50')
  await amount.fill('20')
  await expect(dialog.getByText(moneyRe('= 20,00 €'))).toBeVisible()
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(dialog).toBeHidden()
  await expect(toast(page)).toHaveText('Cambios guardados')
  await expect(coffee).toContainText(moneyRe('−20,00 €'))
  await expectTotals(page, '1.200,00 €', '20,00 €', '+1.180,00 €')

  // Delete: two-step confirmation inside the sheet (no window.confirm)
  await coffee.click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Eliminar', exact: true }).click()
  const confirm = dialog.getByRole('group', { name: '¿Eliminar este movimiento?' })
  await expect(confirm).toBeVisible()
  await expect(confirm.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  await confirm.getByRole('button', { name: 'Sí, eliminar' }).click()
  await expect(dialog).toBeHidden()
  await expect(toast(page)).toHaveText('Movimiento eliminado')
  await expect(coffee).toHaveCount(0)
  await expect(transactionRows(page)).toHaveCount(1)
  await expectTotals(page, '1.200,00 €', '0,00 €', '+1.200,00 €')

  // Reload: both changes were persisted synchronously
  await page.reload()
  await goTo(page, testInfo, 'Movimientos')
  await expect(transactionRows(page)).toHaveCount(1)
  await expect(transactionRows(page).filter({ hasText: 'Café' })).toHaveCount(0)
  await expectTotals(page, '1.200,00 €', '0,00 €', '+1.200,00 €')
})

test('«Cancelar» in the confirmation keeps the movement and Escape closes without saving', async ({ page }) => {
  const coffee = transactionRows(page).filter({ hasText: 'Café' })
  await coffee.click()
  const dialog = page.getByRole('dialog', { name: 'Editar movimiento' })
  await dialog.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
  await dialog.getByLabel('Importe').fill('99')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(coffee).toContainText(moneyRe('−12,50 €'))
  await expectTotals(page, '1.200,00 €', '12,50 €', '+1.187,50 €')
})
