import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const authDir = path.join(process.cwd(), 'playwright', '.auth')
const authFile = path.join(authDir, 'user.json')

test('authenticate test user', async ({ page }) => {
  const email = process.env.E2E_CLERK_EMAIL
  const password = process.env.E2E_CLERK_PASSWORD

  test.fail(!email || !password, 'Set E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD to run auth setup.')

  await page.goto('/')

  await expect(page).toHaveTitle(/SharedJournal/i)
  await page.getByRole('button', { name: 'Sign In' }).click()

  const emailInput = page
    .locator('input[name="identifier"], input[name="emailAddress"], input[type="email"]')
    .first()
  await expect(emailInput).toBeVisible()
  await emailInput.fill(email!)

  await page
    .getByRole('button', { name: 'Continue', exact: true })
    .first()
    .click()

  const passwordInput = page.locator('input[type="password"]').first()
  await expect(passwordInput).toBeVisible()
  await passwordInput.fill(password!)

  await page
    .getByRole('button', { name: 'Continue', exact: true })
    .first()
    .click()

  await expect(page.getByRole('button', { name: 'Sign In' })).toHaveCount(0)
  await mkdir(authDir, { recursive: true })
  await page.context().storageState({ path: authFile })
})