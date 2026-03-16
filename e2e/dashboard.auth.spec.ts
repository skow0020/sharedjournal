import { expect, test } from '@playwright/test'

test('can create a journal, add an entry, and invite a collaborator', async ({ page }) => {
  const journalTitle = `E2E Journal ${Date.now()}`
  const journalDescription = 'Journal created by Playwright end-to-end coverage.'
  const entryTitle = 'First E2E entry'
  const entryContent = 'Entry content written by Playwright for lifecycle coverage.'
  const inviteeEmail = `invitee+${Date.now()}@example.com`

  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1, name: 'Journals' })).toBeVisible()

  await page.getByRole('button', { name: 'Add journal' }).click()
  await expect(page.getByRole('heading', { name: 'Create a journal' })).toBeVisible()
  await page.getByLabel('Title').fill(journalTitle)
  await page.getByLabel('Description').fill(journalDescription)
  await page.getByRole('button', { name: 'Create journal' }).click()

  await expect(page).toHaveURL(/\/dashboard\/journals\/[a-z0-9-]+$/i)
  await expect(page.getByRole('heading', { level: 1, name: journalTitle })).toBeVisible()
  await expect(page.getByText(journalDescription)).toBeVisible()

  await page.getByRole('button', { name: 'Add entry' }).click()
  await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible()
  await page.getByRole('dialog', {name: 'Create an entry'}).getByLabel('Title').fill(entryTitle)
  await page.getByLabel('Content').fill(entryContent)
  await page.getByLabel('Entry date').fill('2026-03-10')
  await page.getByRole('button', { name: 'Create entry' }).click()

  await expect(page.getByRole('heading', { name: 'Journal entries' })).toBeVisible()
  await expect(page.getByText(entryTitle)).toBeVisible()
  await expect(page.getByText(entryContent)).toBeVisible()

  await page.getByRole('button', { name: 'Invite' }).click()
  await expect(page.getByRole('heading', { name: 'Invite a user' })).toBeVisible()
  await page.getByLabel('Email').fill(inviteeEmail)
  await page.getByRole('button', { name: 'Send invite' }).click()

  await expect(
    page.getByText(new RegExp(`Invitation (sent to|created for) invitee+`, 'i')),
  ).toBeVisible()
  await expect(page.getByText('Invite link:', { exact: false })).toBeVisible()
  
  await page.getByRole('button', {name: 'Cancel'}).click()
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Pending invites' })).toBeVisible()
  await expect(page.getByText(inviteeEmail)).toBeVisible()

  await page.getByRole('button', { name: 'Collaborators (0)' }).click()
  await expect(page.getByText('Not shared with anyone yet.')).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog', { name: 'Delete journal' }).getByRole('button', { name: 'Delete' }).click()

  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByText(journalTitle)).not.toBeVisible()
})

test('can edit journal name and delete on details page', async ({ page }) => {
  const journalTitle = `E2E Journal ${Date.now()}`
  const newJournalTitle = `Updated ${journalTitle}`

  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1, name: 'Journals' })).toBeVisible()

  await page.getByRole('button', { name: 'Add journal' }).click()
  await expect(page.getByRole('heading', { name: 'Create a journal' })).toBeVisible()
  await page.getByLabel('Title').fill(journalTitle)
  await page.getByRole('button', { name: 'Create journal' }).click()

  await expect(page).toHaveURL(/\/dashboard\/journals\/[a-z0-9-]+$/i)
  await expect(page.getByRole('heading', { level: 1, name: journalTitle })).toBeVisible()

  await page.getByRole('button', { name: 'Edit journal' }).click()
  await page.getByRole('textbox', { name: 'Journal title' }).fill(newJournalTitle)
  await page.getByRole('button', { name: 'Save journal title' }).click()

  await expect(page.getByRole('heading', { level: 1, name: newJournalTitle })).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog', { name: 'Delete journal' }).getByRole('button', { name: 'Delete' }).click()

  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByText(newJournalTitle)).not.toBeVisible()
})