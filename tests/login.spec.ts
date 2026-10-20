import { expect, test } from '@playwright/test'

test('login form is keyboard-accessible without external credentials', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'GOLOZUR' })).toBeVisible()
  await expect(page.getByLabel('Usuario')).toBeVisible()
  await expect(page.getByLabel('Contraseña')).toBeVisible()

  await page.getByLabel('Usuario').focus()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Contraseña')).toBeFocused()
})
