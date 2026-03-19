import { expect, test } from '@playwright/test'
import { HomePage } from './pages/home.page'
import { InvitationPage } from './pages/invitation.page'

test('shows public home content and feature cards', async ({ page }) => {
  const homePage = new HomePage(page)
  await homePage.goto()

  await expect(page).toHaveTitle(/SharedJournal/i)
  await expect(homePage.headline()).toBeVisible()

  await expect(homePage.featureCard('Personal journals')).toBeVisible()
  await expect(homePage.featureCard('Shared entries')).toBeVisible()
  await expect(homePage.featureCard('Photo support')).toBeVisible()
})

test('shows invitation not found for an invalid token', async ({ page }) => {
  const invitationPage = new InvitationPage(page)
  await invitationPage.goto('e2e-invalid-token')

  await expect(invitationPage.notFoundHeading()).toBeVisible()
  await expect(invitationPage.notFoundMessage()).toBeVisible()
})
