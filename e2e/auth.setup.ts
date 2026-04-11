import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { HomePage } from './pages/home.page'
import { SignInPage } from './pages/sign-in.page'

const authDir = path.join(process.cwd(), 'playwright', '.auth')
const authFile = path.join(authDir, 'user.json')

test('authenticate test user', async ({ page }) => {
  const email = process.env.E2E_CLERK_EMAIL
  const password = process.env.E2E_CLERK_PASSWORD

  test.fail(!email || !password, 'Set E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD to run auth setup.')

  const homePage = new HomePage(page)
  await homePage.goto()
  await expect(page).toHaveTitle(/SharedJournal/i)
  await homePage.clickSignIn()

  const signInPage = new SignInPage(page)
  await expect(signInPage.emailInput()).toBeVisible()
  await signInPage.fillEmail(email!)
  await signInPage.clickContinue()

  await expect(signInPage.passwordInput()).toBeVisible()
  await signInPage.fillPassword(password!)
  await signInPage.clickContinue()

  await mkdir(authDir, { recursive: true })
  await page.context().storageState({ path: authFile })
})