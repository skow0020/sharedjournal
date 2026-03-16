import { expect, test } from '@playwright/test'

test('shows public home content and feature cards', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/SharedJournal/i)
  await expect(page.getByText('Everything in one journal workflow')).toBeVisible()

  await expect(page.getByText('Personal journals')).toBeVisible()
  await expect(page.getByText('Shared entries')).toBeVisible()
  await expect(page.getByText('Photo support')).toBeVisible()
})

test('shows invitation not found for an invalid token', async ({ page }) => {
  await page.goto('/invitations/e2e-invalid-token')

  await expect(page.getByText('Invitation not found')).toBeVisible()
  await expect(
    page.getByText('This invitation link is invalid or no longer exists.'),
  ).toBeVisible()
})
