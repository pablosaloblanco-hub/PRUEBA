// §10.3 item 8 (project `mobile` only) — F11: tab bar and FAB, the bottom sheet, no
// horizontal scroll at 360 px and at the Pixel 7 default width, ≥ 44 px targets, dark
// scheme changes the body background, «Volver» from Ajustes and a keyboard-only quick add.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { FIXTURE, fixedClock, goTo, isMobile, mainNav, moneyRe, screenHeading, seedStorage, toast } from './helpers'
import type { ScreenName } from './helpers'

const SCREENS: readonly ScreenName[] = ['Inicio', 'Movimientos', 'Presupuestos', 'Informes', 'Ajustes', 'Categorías']

async function scrollWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.scrollingElement?.scrollWidth ?? document.documentElement.scrollWidth)
}

async function innerWidth(page: Page): Promise<number> {
  return page.evaluate(() => window.innerWidth)
}

async function bodyBackground(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor)
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo), 'mobile project only')
  await fixedClock(page)
  await seedStorage(page, FIXTURE)
  await page.goto('/')
  await expect(screenHeading(page, 'Inicio')).toBeVisible()
})

test('tab bar and FAB are visible and the FAB opens the bottom sheet', async ({ page }) => {
  const nav = mainNav(page)
  await expect(nav).toBeVisible()
  for (const label of ['Inicio', 'Movimientos', 'Presupuestos', 'Informes']) {
    await expect(nav.getByRole('button', { name: label, exact: true })).toBeVisible()
  }
  await expect(nav.getByRole('button', { name: 'Inicio', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.sidebar')).toHaveCount(0)

  const fab = nav.getByRole('button', { name: 'Añadir movimiento' })
  await expect(fab).toBeVisible()
  await fab.click()
  const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveClass(/dialog--sheet/)
  await expect(dialog.getByLabel('Importe')).toBeFocused()
  // 4-column category grid on mobile
  const tiles = dialog.getByRole('group', { name: 'Categoría' }).getByRole('button')
  const first = await tiles.nth(0).boundingBox()
  const fifth = await tiles.nth(4).boundingBox()
  expect(first).not.toBeNull()
  expect(fifth).not.toBeNull()
  expect(fifth?.x).toBe(first?.x)
  expect(fifth?.y ?? 0).toBeGreaterThan(first?.y ?? 0)
  await dialog.getByRole('button', { name: 'Cerrar' }).click()
  await expect(dialog).toBeHidden()
})

test('no horizontal scroll at the Pixel 7 width nor at 360 px on any screen', async ({ page }, testInfo) => {
  expect(await innerWidth(page)).toBe(412)
  for (const screen of SCREENS) {
    await goTo(page, testInfo, screen)
    if (screen === 'Informes') await expect(page.getByRole('table', { name: 'Ingresos frente a gastos' })).toBeVisible()
    expect(await scrollWidth(page), `${screen} @412`).toBeLessThanOrEqual(await innerWidth(page))
  }

  await page.setViewportSize({ width: 360, height: 740 })
  expect(await innerWidth(page)).toBe(360)
  for (const screen of SCREENS) {
    await goTo(page, testInfo, screen)
    if (screen === 'Informes') await expect(page.getByRole('table', { name: 'Ingresos frente a gastos' })).toBeVisible()
    expect(await scrollWidth(page), `${screen} @360`).toBeLessThanOrEqual(360)
  }

  // The bottom sheet at 360 px does not overflow either
  await goTo(page, testInfo, 'Inicio')
  await mainNav(page).getByRole('button', { name: 'Añadir movimiento' }).click()
  await expect(page.getByRole('dialog', { name: 'Nuevo movimiento' })).toBeVisible()
  expect(await scrollWidth(page), 'sheet @360').toBeLessThanOrEqual(360)
  await page.keyboard.press('Escape')
})

/** Asserts every visible button of the page has a bounding box of at least 44 × 44 px. */
async function expectTargets(page: Page, context: string): Promise<void> {
  const buttons = page.locator('button:visible')
  const count = await buttons.count()
  expect(count, context).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i)
    const box = await button.boundingBox()
    const label = (await button.getAttribute('aria-label')) ?? (await button.innerText())
    expect(box, `${context}: ${label}`).not.toBeNull()
    expect(box?.height ?? 0, `${context}: «${label}» height`).toBeGreaterThanOrEqual(44)
    expect(box?.width ?? 0, `${context}: «${label}» width`).toBeGreaterThanOrEqual(44)
  }
}

test('interactive targets are at least 44 px on touch screens', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 740 })
  for (const screen of ['Inicio', 'Movimientos', 'Presupuestos', 'Categorías'] as const) {
    await goTo(page, testInfo, screen)
    await expectTargets(page, screen)
  }
  // «Hoy» pill and the category filter chip on Movimientos
  await goTo(page, testInfo, 'Movimientos')
  await page.getByRole('button', { name: 'Mes anterior' }).click()
  await expect(page.getByRole('button', { name: 'Hoy', exact: true })).toBeVisible()
  await expectTargets(page, 'Movimientos (agosto)')

  // The bottom sheet: close button, segments, chips and category tiles
  await mainNav(page).getByRole('button', { name: 'Añadir movimiento' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await expect(dialog).toBeVisible()
  await expectTargets(page, 'Nuevo movimiento')
  await page.keyboard.press('Escape')

  const fab = await mainNav(page).getByRole('button', { name: 'Añadir movimiento' }).boundingBox()
  expect(fab?.width ?? 0).toBeGreaterThanOrEqual(56)
  expect(fab?.height ?? 0).toBeGreaterThanOrEqual(56)
})

test('the dark colour scheme changes the body background', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  const light = await bodyBackground(page)
  await page.emulateMedia({ colorScheme: 'dark' })
  const dark = await bodyBackground(page)
  expect(dark).not.toBe(light)
  expect(light).not.toBe('rgba(0, 0, 0, 0)')
  expect(dark).not.toBe('rgba(0, 0, 0, 0)')

  // The explicit theme setting wins over the system scheme (data-theme on <html>)
  await page.getByRole('banner').getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('radio', { name: 'Claro' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await bodyBackground(page)).toBe(light)
  await page.getByRole('radio', { name: 'Oscuro' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  expect(await bodyBackground(page)).toBe(dark)
})

test('«Volver» from Ajustes returns to the previous screen; no tab is current there', async ({ page }, testInfo) => {
  await goTo(page, testInfo, 'Movimientos')
  await page.getByRole('banner').getByRole('button', { name: 'Ajustes' }).click()
  await expect(screenHeading(page, 'Ajustes')).toBeVisible()
  await expect(mainNav(page).locator('[aria-current="page"]')).toHaveCount(0)
  await expect(page.getByRole('banner').getByRole('button', { name: 'Ajustes' })).toHaveCount(0)
  await expect(page.locator('.month-selector')).toHaveCount(0)

  // Ajustes → Volver → the previous screen (Movimientos)
  await page.getByRole('button', { name: 'Volver' }).click()
  await expect(screenHeading(page, 'Movimientos')).toBeVisible()
  await expect(mainNav(page).getByRole('button', { name: 'Movimientos', exact: true })).toHaveAttribute('aria-current', 'page')

  // Ajustes → Categorías → Volver → Ajustes → Volver → Movimientos (never back to Categorías)
  await page.getByRole('banner').getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('main').getByRole('button', { name: 'Categorías' }).click()
  await expect(screenHeading(page, 'Categorías')).toBeVisible()
  await expect(mainNav(page).locator('[aria-current="page"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Volver' }).click()
  await expect(screenHeading(page, 'Ajustes')).toBeVisible()
  await page.getByRole('button', { name: 'Volver' }).click()
  await expect(screenHeading(page, 'Movimientos')).toBeVisible()
})

test('a movement can be added with the keyboard only', async ({ page }, testInfo) => {
  // Tab until the FAB has focus, then Enter opens the sheet with focus on «Importe»
  let focusedFab = false
  for (let i = 0; i < 30 && !focusedFab; i++) {
    await page.keyboard.press('Tab')
    focusedFab = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Añadir movimiento' && document.activeElement?.classList.contains('fab') === true)
  }
  expect(focusedFab).toBe(true)
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Importe')).toBeFocused()
  await page.keyboard.type('7,25')
  await expect(dialog.getByText(moneyRe('= 7,25 €'))).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(toast(page)).toHaveText('Gasto guardado')

  await goTo(page, testInfo, 'Movimientos')
  const rows = page.locator('.transaction-list .list-row')
  await expect(rows).toHaveCount(6)
  await expect(rows.filter({ hasText: moneyRe('−7,25 €') })).toHaveCount(1)
  await expect(page.locator('.transaction-list .list-header__label').filter({ hasText: /^Hoy$/ })).toHaveCount(1)
})
