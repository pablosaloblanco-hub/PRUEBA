import { test, expect } from '@playwright/test'

test('the app loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /mis finanzas/i })).toBeVisible()
})

test('the favicon is the app icon, not the Vite template logo', async ({ request }) => {
  const response = await request.get('/favicon.svg')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/svg+xml')
  const body = await response.text()
  expect(body).toContain('<svg')
  expect(body).toContain('Mis Finanzas')
  // Fingerprints of the Vite 8 scaffold favicon (lightning bolt, #863bff, blur filters).
  expect(body).not.toContain('#863bff')
  expect(body).not.toContain('foregroundBlur')
  expect(body).not.toContain('M25.946 44.938')
})
