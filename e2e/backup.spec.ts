// §10.3 item 6 — fixture + fixed clock: «Exportar copia (JSON)» → «Borrar todos los datos»
// (BORRAR) → «Importar copia» → «Reemplazar» → same rows and a second export that is
// strictly deep-equal to the first one (same `savedAt` thanks to the fixed clock).
import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { FIXTURE, expectTotals, fixedClock, goTo, seedStorage, toast, transactionRows } from './helpers'

async function exportBackup(page: Page): Promise<{ filename: string; text: string }> {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar copia (JSON)' }).click()
  const download = await downloadPromise
  const path = await download.path()
  await expect(toast(page)).toHaveText('Copia exportada')
  return { filename: download.suggestedFilename(), text: readFileSync(path, 'utf8') }
}

test.beforeEach(async ({ page }, testInfo) => {
  await fixedClock(page)
  await seedStorage(page, FIXTURE)
  await page.goto('/')
  await goTo(page, testInfo, 'Ajustes')
})

test('export → delete everything → import restores exactly the same data', async ({ page }, testInfo) => {
  const first = await exportBackup(page)
  expect(first.filename).toBe('mis-finanzas-2026-09-25.json')
  const firstEnvelope = JSON.parse(first.text) as { app: string; schemaVersion: number; savedAt: number; data: unknown }
  expect(firstEnvelope.app).toBe('mis-finanzas')
  expect(firstEnvelope.schemaVersion).toBe(1)
  expect(firstEnvelope.data).toEqual(FIXTURE.data)
  // Pretty-printed
  expect(first.text).toContain('\n  ')

  // Delete everything (keyword guarded)
  await page.getByRole('button', { name: 'Borrar todos los datos' }).click()
  const confirm = page.getByRole('dialog', { name: 'Borrar todos los datos' })
  await expect(confirm).toBeVisible()
  await expect(confirm).toContainText('Esta acción no se puede deshacer. Escribe BORRAR para confirmar')
  const deleteButton = confirm.getByRole('button', { name: 'Borrar', exact: true })
  await expect(deleteButton).toBeDisabled()
  await confirm.getByLabel('Escribe BORRAR').fill('borrar')
  await expect(deleteButton).toBeDisabled()
  await confirm.getByLabel('Escribe BORRAR').fill('BORRAR')
  await expect(deleteButton).toBeEnabled()
  await deleteButton.click()
  await expect(confirm).toBeHidden()
  await expect(toast(page)).toHaveText('Datos borrados')

  await goTo(page, testInfo, 'Inicio')
  await expect(page.getByText('Empieza registrando tu primer gasto')).toBeVisible()

  // Import the exported file
  await goTo(page, testInfo, 'Ajustes')
  await page.locator('input[type="file"]').setInputFiles({
    name: first.filename,
    mimeType: 'application/json',
    buffer: Buffer.from(first.text, 'utf8'),
  })
  const preview = page.getByRole('dialog', { name: '¿Reemplazar los datos actuales?' })
  await expect(preview).toBeVisible()
  await expect(preview).toContainText('Se importarán 12 movimientos, 15 categorías y 2 presupuestos')
  await expect(preview).not.toContainText('Se han ajustado')
  await preview.getByRole('button', { name: 'Reemplazar' }).click()
  await expect(preview).toBeHidden()
  await expect(toast(page)).toHaveText('Datos importados correctamente')

  // Same rows
  await goTo(page, testInfo, 'Movimientos')
  await expect(transactionRows(page)).toHaveCount(5)
  await expectTotals(page, '1.200,00 €', '843,20 €', '+356,80 €')

  // Strict deep-equal of both exports (savedAt included: the clock is fixed)
  await goTo(page, testInfo, 'Ajustes')
  const second = await exportBackup(page)
  expect(second.filename).toBe(first.filename)
  expect(JSON.parse(second.text)).toEqual(firstEnvelope)
  expect(second.text).toBe(first.text)

  // Settings survived as well (initial balance 100,00 from the fixture)
  await expect(page.getByLabel('Saldo inicial')).toHaveValue('100,00')
})

test('import rejects a file that is not a backup', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad', 'utf8') })
  await expect(page.getByRole('alert')).toHaveText('El archivo no es un JSON válido')
  await fileInput.setInputFiles({ name: 'other.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}', 'utf8') })
  await expect(page.getByRole('alert')).toHaveText('El archivo no es una copia válida de Mis Finanzas')
  const newer = JSON.stringify({ ...FIXTURE, schemaVersion: 99 })
  await fileInput.setInputFiles({ name: 'newer.json', mimeType: 'application/json', buffer: Buffer.from(newer, 'utf8') })
  await expect(page.getByRole('alert')).toHaveText('El archivo es de una versión más nueva de la app')
})

test('changing the currency reformats the amounts without converting them', async ({ page }, testInfo) => {
  await page.getByLabel('Moneda').selectOption('USD')
  await goTo(page, testInfo, 'Movimientos')
  await expect(transactionRows(page).filter({ hasText: 'Café y compra semanal' })).toContainText(/−83,20\sUS\$/)
  const raw = await page.evaluate(() => window.localStorage.getItem('mis-finanzas'))
  const envelope = JSON.parse(raw ?? '{}') as { data: { transactions: { id: string; amountCents: number }[]; settings: { currency: string } } }
  expect(envelope.data.settings.currency).toBe('USD')
  expect(envelope.data.transactions.find((t) => t.id === 't-10')?.amountCents).toBe(8320)
})
