// ============================================================================
// e2e/helpers.ts — shared Playwright helpers (docs/SPEC.md §10.3): seeding
// localStorage before navigation, the mandatory fixed clock, project-aware
// navigation (tab bar + FAB on `mobile`, sidebar on `chromium`) and money text
// matchers that tolerate the NBSP Intl puts between the number and «€».
// ============================================================================
import { expect } from '@playwright/test'
import type { Locator, Page, TestInfo } from '@playwright/test'
import fixture from '../src/domain/storage/__fixtures__/v1.json' with { type: 'json' }

export const STORAGE_KEY = 'mis-finanzas'
export const BACKUP_KEY = 'mis-finanzas:backup'

/** The canonical §3.7 envelope (12 movements, 15 categories, 2 budgets). */
export const FIXTURE = fixture
export type Envelope = typeof fixture

/** Local wall-clock (Europe/Madrid, the project's timezone) every fixture criterion is computed for. */
export const FIXED_CLOCK = '2026-09-25T12:00:00'

/**
 * Writes an arbitrary raw string into a localStorage key (corrupt payloads,
 * backups) before the first navigation of the tab. Init scripts run again on
 * every navigation, so a sessionStorage flag (per tab, survives `reload`)
 * guarantees the seed happens once and never overwrites what the app saved.
 */
export async function seedRaw(page: Page, key: string, raw: string): Promise<void> {
  await page.addInitScript(
    ({ key, raw }) => {
      const flag = `e2e-seeded:${key}`
      if (window.sessionStorage.getItem(flag) !== null) return
      window.sessionStorage.setItem(flag, '1')
      window.localStorage.setItem(key, raw)
    },
    { key, raw },
  )
}

/** Writes `envelope` into localStorage['mis-finanzas'] before the first navigation of `page`. */
export async function seedStorage(page: Page, envelope: unknown, key: string = STORAGE_KEY): Promise<void> {
  await seedRaw(page, key, JSON.stringify(envelope))
}

/** Freezes `Date` at `isoLocal` (Playwright's clock, keeps timers running). Call BEFORE `goto`. */
export async function fixedClock(page: Page, isoLocal: string = FIXED_CLOCK): Promise<void> {
  await page.clock.setFixedTime(new Date(isoLocal))
}

export function isMobile(testInfo: TestInfo): boolean {
  return testInfo.project.name === 'mobile'
}

/** Reads a localStorage key from the page (null when absent). */
export async function readStorage(page: Page, key: string = STORAGE_KEY): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), key)
}

/** The main navigation (tab bar on mobile, sidebar nav on desktop). */
export function mainNav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Navegación principal' })
}

export type ScreenName = 'Inicio' | 'Movimientos' | 'Presupuestos' | 'Informes' | 'Categorías' | 'Ajustes'

/** Screen <h2> rendered by the Shell header. */
export function screenHeading(page: Page, name: ScreenName): Locator {
  return page.getByRole('heading', { level: 2, name, exact: true })
}

/** Navigates to a screen the way the current project's chrome allows it. */
export async function goTo(page: Page, testInfo: TestInfo, screen: ScreenName): Promise<void> {
  if (isMobile(testInfo)) {
    if (screen === 'Ajustes') {
      if (!(await screenHeading(page, 'Ajustes').isVisible())) {
        await page.getByRole('banner').getByRole('button', { name: 'Ajustes' }).click()
      }
    } else if (screen === 'Categorías') {
      await goTo(page, testInfo, 'Ajustes')
      await page.getByRole('main').getByRole('button', { name: 'Categorías' }).click()
    } else {
      await mainNav(page).getByRole('button', { name: screen, exact: true }).click()
    }
  } else {
    await mainNav(page).getByRole('button', { name: screen, exact: true }).click()
  }
  await expect(screenHeading(page, screen)).toBeVisible()
}

/** Opens «Nuevo movimiento» through the FAB (mobile) or the sidebar button (desktop). */
export async function openTransactionSheet(page: Page, testInfo: TestInfo): Promise<Locator> {
  if (isMobile(testInfo)) {
    await mainNav(page).getByRole('button', { name: 'Añadir movimiento' }).click()
  } else {
    await page.getByRole('button', { name: '+ Nuevo movimiento' }).click()
  }
  const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await expect(dialog).toBeVisible()
  return dialog
}

/** Escapes a string for use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * RegExp matching `text` where every space may be a regular space, NBSP or
 * narrow NBSP (Intl emits either before the currency symbol).
 * `moneyRe('−12,50 €')` matches «−12,50 €» with any of them.
 */
export function moneyRe(text: string, flags?: string): RegExp {
  return new RegExp(escapeRegExp(text).replace(/ /g, '\\s'), flags)
}

/** Movement rows (buttons) of the grouped list on Movimientos. */
export function transactionRows(page: Page): Locator {
  return page.locator('.transaction-list .list-row')
}

/** The totals strip «Ingresos x · Gastos y · Balance z» of Movimientos. */
export function totalsStrip(page: Page): Locator {
  return page.locator('.transactions__totals')
}

/** Asserts the totals strip of the visible set. */
export async function expectTotals(page: Page, income: string, expense: string, balance: string): Promise<void> {
  await expect(totalsStrip(page)).toHaveText(moneyRe(`Ingresos ${income} · Gastos ${expense} · Balance ${balance}`))
}

/** The one-toast live region. */
export function toast(page: Page): Locator {
  return page.locator('.toast-region .toast')
}

/** The month label of the header selector. */
export function monthLabel(page: Page): Locator {
  return page.locator('.month-selector__label')
}
