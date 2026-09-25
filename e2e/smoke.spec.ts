import { test, expect } from '@playwright/test'

test('the app loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /mis finanzas/i })).toBeVisible()
})
