import { expect, test } from '@playwright/test'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const authDir = path.join(process.cwd(), 'playwright', '.auth')
const authFile = path.join(authDir, 'user.json')

test.describe.configure({ mode: 'serial' })

test('can log in', async ({ page }) => {
  const email = process.env.E2E_CLERK_EMAIL
  const password = process.env.E2E_CLERK_PASSWORD

  test.skip(!email || !password, 'Set E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD to run auth setup.')

  await page.goto('/')
  await expect(page).toHaveTitle(/Create Next App/i)
  await expect(page.getByText('To get started, edit the page.tsx file.')).toBeVisible()

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

test('dashboard page loads with saved auth state', async ({ browser }) => {
  test.skip(!existsSync(authFile), 'Run the auth setup test first to generate storage state.')

  const context = await browser.newContext({ storageState: authFile })
  const page = await context.newPage()

  await page.goto('/dashboard')
  await expect(page.getByText('Journals', { exact: true })).toBeVisible()

  const cabinMusingsLink = page.getByRole('link', { name: 'Cabin musings' })
  await expect(cabinMusingsLink).toBeVisible()
  await cabinMusingsLink.click()

  await expect(page).toHaveURL(/\/dashboard\/journals\/[a-z0-9-]+$/i)
  await expect(page.getByRole('heading', { level: 1, name: 'Cabin musings' })).toBeVisible()

  await context.close()
})
