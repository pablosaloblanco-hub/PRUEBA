// §10.3 item 7 — persistence recovery (§5.5): a corrupt payload with a valid automatic
// backup shows the recovery card, «Restaurar copia automática» loads the backup without
// touching it; a QuotaExceededError on save shows the banner and keeps the state on screen.
import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  BACKUP_KEY,
  FIXTURE,
  STORAGE_KEY,
  fixedClock,
  goTo,
  moneyRe,
  openTransactionSheet,
  readStorage,
  seedRaw,
  seedStorage,
  toast,
  transactionRows,
} from './helpers'

const CORRUPT = '{bad'

/** Makes `Storage.prototype.setItem` throw a QuotaExceededError once `allowed` calls have gone through. */
async function failSetItemAfter(page: Page, allowed: number): Promise<void> {
  await page.addInitScript((n) => {
    let calls = 0
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      calls += 1
      if (calls > n) throw new DOMException('Simulated quota exceeded', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  }, allowed)
}

test('a corrupt payload shows the recovery card and the backup can be restored untouched', async ({ page }, testInfo) => {
  const backupRaw = JSON.stringify(FIXTURE)
  await fixedClock(page)
  await seedRaw(page, STORAGE_KEY, CORRUPT)
  await seedRaw(page, BACKUP_KEY, backupRaw)
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 3, name: 'No se han podido leer tus datos guardados.' })).toBeVisible()
  const restore = page.getByRole('button', { name: 'Restaurar copia automática' })
  await expect(restore).toBeVisible()
  await expect(page.getByRole('button', { name: 'Empezar de cero' })).toBeVisible()

  // The raw payload can be downloaded as-is
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar datos en bruto' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('mis-finanzas-datos-en-bruto.txt')
  expect(readFileSync(await download.path(), 'utf8')).toBe(CORRUPT)

  // Nothing has been written while the card is shown (store in readonly mode)
  expect(await readStorage(page, STORAGE_KEY)).toBe(CORRUPT)
  expect(await readStorage(page, BACKUP_KEY)).toBe(backupRaw)

  await restore.click()
  await expect(page.getByText('No se han podido leer tus datos guardados.')).toHaveCount(0)
  const hero = page.getByRole('region', { name: 'Balance del mes' })
  await expect(hero.locator('.home-hero__value')).toHaveText(moneyRe('+356,80 €'))

  // The backup was not overwritten by the corrupt payload; the main key now holds the restored data
  expect(await readStorage(page, BACKUP_KEY)).toBe(backupRaw)
  const restored = JSON.parse((await readStorage(page, STORAGE_KEY)) ?? '{}') as { app: string; data: unknown }
  expect(restored.app).toBe('mis-finanzas')
  expect(restored.data).toEqual(FIXTURE.data)

  await goTo(page, testInfo, 'Movimientos')
  await expect(transactionRows(page)).toHaveCount(5)

  // Reload: the restored data loads normally
  await page.reload()
  await expect(hero.locator('.home-hero__value')).toHaveText(moneyRe('+356,80 €'))
})

test('a QuotaExceededError on save shows the banner and keeps the movement on screen', async ({ page }, testInfo) => {
  await fixedClock(page)
  await seedStorage(page, FIXTURE)
  // The startup probe is the only write allowed; the next save (backup + main) throws.
  await failSetItemAfter(page, 1)
  await page.goto('/')
  await expect(page.getByRole('status')).toHaveCount(0)

  const dialog = await openTransactionSheet(page, testInfo)
  await page.keyboard.type('33')
  await dialog.getByLabel('Nota (opcional)').fill('Sin sitio')
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(toast(page)).toHaveText('Gasto guardado')

  const banner = page.getByRole('status').filter({ hasText: 'No se ha podido guardar' })
  await expect(banner).toBeVisible()
  await expect(banner).toHaveText(
    /No se ha podido guardar: el almacenamiento está lleno\. Exporta una copia y elimina movimientos antiguos\./,
  )
  await expect(banner.getByRole('button', { name: 'Exportar copia' })).toBeVisible()

  // The in-memory state keeps the movement…
  await goTo(page, testInfo, 'Movimientos')
  const row = transactionRows(page).filter({ hasText: 'Sin sitio' })
  await expect(row).toContainText(moneyRe('−33,00 €'))
  await expect(banner).toBeVisible()

  // …while localStorage still holds the previous payload
  const stored = JSON.parse((await readStorage(page, STORAGE_KEY)) ?? '{}') as { data: { transactions: unknown[] } }
  expect(stored.data.transactions).toHaveLength(12)

  // The banner's export still works from memory
  const downloadPromise = page.waitForEvent('download')
  await banner.getByRole('button', { name: 'Exportar copia' }).click()
  const download = await downloadPromise
  const exported = JSON.parse(readFileSync(await download.path(), 'utf8')) as { data: { transactions: { note: string }[] } }
  expect(exported.data.transactions).toHaveLength(13)
  expect(exported.data.transactions.some((t) => t.note === 'Sin sitio')).toBe(true)
})
