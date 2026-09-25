// §10.3 item 5 — fixture + fixed clock: create «Mascotas 🐶», use it in a movement, delete
// it → the movement moves to «Otros gastos» (no orphan rows).
import { test, expect } from '@playwright/test'
import { FIXTURE, fixedClock, goTo, moneyRe, openTransactionSheet, seedStorage, toast, transactionRows } from './helpers'

test.beforeEach(async ({ page }) => {
  await fixedClock(page)
  await seedStorage(page, FIXTURE)
  await page.goto('/')
})

test('create «Mascotas», use it and delete it: the movement goes to «Otros gastos»', async ({ page }, testInfo) => {
  await goTo(page, testInfo, 'Categorías')
  const rows = page.locator('.category-list .category-row')
  await expect(rows).toHaveCount(11)
  // Rows are not buttons: only the icon button «Editar {nombre}» is interactive
  await expect(rows.first().getByRole('button')).toHaveCount(1)

  // Create
  await page.getByRole('button', { name: '+ Nueva categoría' }).click()
  const sheet = page.getByRole('dialog', { name: 'Nueva categoría' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByLabel('Nombre')).toBeFocused()
  await sheet.getByLabel('Nombre').fill('Mascotas')
  await sheet.getByRole('group', { name: 'Icono' }).getByRole('button', { name: '🐶' }).click()
  await sheet.getByRole('group', { name: 'Color' }).getByRole('button', { name: 'Ámbar' }).click()
  await sheet.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(sheet).toBeHidden()
  await expect(toast(page)).toHaveText('Categoría guardada')
  const pets = rows.filter({ hasText: 'Mascotas' })
  await expect(pets).toHaveCount(1)
  await expect(pets).toContainText('0 movimientos')
  await expect(pets).toContainText('🐶')

  // Duplicate name (accent/case-insensitive) is rejected
  await page.getByRole('button', { name: '+ Nueva categoría' }).click()
  await sheet.getByLabel('Nombre').fill('mascotas')
  await sheet.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(sheet.getByText('Ya existe una categoría con ese nombre')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()

  // Use it in a movement
  const dialog = await openTransactionSheet(page, testInfo)
  await page.keyboard.type('15')
  const tile = dialog.getByRole('group', { name: 'Categoría' }).getByRole('button', { name: 'Mascotas' })
  await tile.click()
  await expect(tile).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByLabel('Nota (opcional)').fill('Pienso')
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(toast(page)).toHaveText('Gasto guardado')

  await goTo(page, testInfo, 'Movimientos')
  const pienso = transactionRows(page).filter({ hasText: 'Pienso' })
  await expect(pienso).toContainText('Mascotas')
  await expect(pienso).toContainText(moneyRe('−15,00 €'))

  // Delete it: the confirmation names the reassignment target
  await goTo(page, testInfo, 'Categorías')
  await expect(pets).toContainText('1 movimiento')
  await page.getByRole('button', { name: 'Editar Mascotas' }).click()
  const edit = page.getByRole('dialog', { name: 'Editar categoría' })
  await expect(edit).toBeVisible()
  await expect(edit.getByLabel('Nombre')).toHaveValue('Mascotas')
  await edit.getByRole('button', { name: 'Eliminar', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: '¿Eliminar la categoría Mascotas?' })
  await expect(confirm).toBeVisible()
  await expect(confirm).toContainText('Sus 1 movimientos pasarán a "Otros gastos". Se eliminará también su presupuesto.')
  await confirm.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await expect(confirm).toBeHidden()
  await expect(edit).toBeHidden()
  await expect(toast(page)).toHaveText('Categoría eliminada')
  await expect(pets).toHaveCount(0)
  await expect(rows).toHaveCount(11)
  await expect(rows.filter({ hasText: 'Otros gastos' })).toContainText('1 movimiento')

  // The movement now belongs to «Otros gastos»
  await goTo(page, testInfo, 'Movimientos')
  await expect(pienso).toContainText('Otros gastos')
  await expect(pienso).toContainText(moneyRe('−15,00 €'))
  await expect(transactionRows(page)).toHaveCount(6)

  // Persisted after reload, still no orphan
  await page.reload()
  await goTo(page, testInfo, 'Movimientos')
  await expect(transactionRows(page).filter({ hasText: 'Pienso' })).toContainText('Otros gastos')
})

test('built-in categories cannot be deleted', async ({ page }, testInfo) => {
  await goTo(page, testInfo, 'Categorías')
  await page.getByRole('button', { name: 'Editar Otros gastos' }).click()
  const edit = page.getByRole('dialog', { name: 'Editar categoría' })
  await expect(edit).toBeVisible()
  await expect(edit.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0)
  await expect(edit.getByText('Esta categoría no se puede eliminar')).toBeVisible()
  await expect(edit.getByRole('radio', { name: 'Gasto' })).toBeDisabled()
})
