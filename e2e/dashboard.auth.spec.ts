import { expect, test } from '@playwright/test'
import { DashboardPage } from './pages/dashboard.page'
import { JournalDetailPage } from './pages/journal-detail.page'

test('can create a journal, add an entry, and invite a collaborator', async ({ page }) => {
  const journalTitle = `E2E Journal ${Date.now()}`
  const journalDescription = 'Journal created by Playwright end-to-end coverage.'
  const entryTitle = 'First E2E entry'
  const entryContent = 'Entry content written by Playwright for lifecycle coverage.'
  const inviteeEmail = `invitee+${Date.now()}@example.com`

  const dashboardPage = new DashboardPage(page)
  await dashboardPage.goto()
  await expect(dashboardPage.heading()).toBeVisible()

  const createJournalModal = await dashboardPage.openCreateJournalModal()
  await expect(createJournalModal.heading()).toBeVisible()
  await createJournalModal.fillTitle(journalTitle)
  await createJournalModal.fillDescription(journalDescription)
  await createJournalModal.submit()

  const journalDetailPage = new JournalDetailPage(page)
  await expect(page).toHaveURL(/\/dashboard\/journals\/[a-z0-9-]+$/i)
  await expect(journalDetailPage.heading(journalTitle)).toBeVisible()
  await expect(journalDetailPage.descriptionText(journalDescription)).toBeVisible()

  const createEntryModal = await journalDetailPage.openCreateEntryModal()
  await expect(createEntryModal.heading()).toBeVisible()
  await createEntryModal.fillTitle(entryTitle)
  await createEntryModal.fillContent(entryContent)
  await createEntryModal.fillEntryDate('2026-03-10')
  await createEntryModal.submit()

  await expect(journalDetailPage.entriesHeading()).toBeVisible()
  await expect(journalDetailPage.entryTitle(entryTitle)).toBeVisible()
  await expect(journalDetailPage.entryContent(entryContent)).toBeVisible()

  const inviteUserModal = await journalDetailPage.openInviteUserModal()
  await expect(inviteUserModal.heading()).toBeVisible()
  await inviteUserModal.fillEmail(inviteeEmail)
  await inviteUserModal.submit()

  await expect(inviteUserModal.invitationSentText('invitee+')).toBeVisible()
  await expect(inviteUserModal.inviteLinkText()).toBeVisible()

  await inviteUserModal.close()
  await page.reload()

  await expect(journalDetailPage.pendingInvitesHeading()).toBeVisible()
  await expect(journalDetailPage.pendingInviteEmail(inviteeEmail)).toBeVisible()

  await journalDetailPage.openCollaboratorsPanel()
  await expect(journalDetailPage.noCollaboratorsText()).toBeVisible()

  const deleteJournalDialog = await journalDetailPage.openDeleteJournalDialog()
  await deleteJournalDialog.confirm()

  await expect(page).toHaveURL('/dashboard')
  await expect(dashboardPage.journalCard(journalTitle)).not.toBeVisible()
})

test('can edit journal name and delete on details page', async ({ page }) => {
  const journalTitle = `E2E Journal ${Date.now()}`
  const newJournalTitle = `Updated ${journalTitle}`

  const dashboardPage = new DashboardPage(page)
  await dashboardPage.goto()
  await expect(dashboardPage.heading()).toBeVisible()

  const createJournalModal = await dashboardPage.openCreateJournalModal()
  await expect(createJournalModal.heading()).toBeVisible()
  await createJournalModal.fillTitle(journalTitle)
  await createJournalModal.submit()

  const journalDetailPage = new JournalDetailPage(page)
  await expect(page).toHaveURL(/\/dashboard\/journals\/[a-z0-9-]+$/i)
  await expect(journalDetailPage.heading(journalTitle)).toBeVisible()

  await journalDetailPage.openEditJournalTitle()
  await journalDetailPage.setJournalTitle(newJournalTitle)
  await journalDetailPage.saveJournalTitle()

  await expect(journalDetailPage.heading(newJournalTitle)).toBeVisible()

  const deleteJournalDialog = await journalDetailPage.openDeleteJournalDialog()
  await deleteJournalDialog.confirm()

  await expect(page).toHaveURL('/dashboard')
  await expect(dashboardPage.journalCard(newJournalTitle)).not.toBeVisible()
})