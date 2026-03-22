import { expect, test } from '@playwright/test'

import { DashboardPage } from './pages/dashboard.page'
import { JournalDetailPage } from './pages/journal-detail.page'

test('can create a journal, send an invite, and cancel it', async ({ page }) => {
  const journalTitle = `E2E Invite Journal ${Date.now()}`
  const inviteeEmail = `invitee+${Date.now()}@example.com`

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

  const inviteUserModal = await journalDetailPage.openInviteUserModal()
  await expect(inviteUserModal.heading()).toBeVisible()
  await inviteUserModal.fillEmail(inviteeEmail)
  await inviteUserModal.submit()

  await expect(inviteUserModal.invitationSentText('invitee+')).toBeVisible()
  await inviteUserModal.cancel()
  // await journalDetailPage.page.reload()

  await expect(journalDetailPage.pendingInvitesHeading()).toBeVisible()
  await expect(journalDetailPage.pendingInviteEmail(inviteeEmail)).toBeVisible()

  await journalDetailPage.cancelPendingInvite(inviteeEmail)

  await expect(journalDetailPage.pendingInviteEmail(inviteeEmail)).not.toBeVisible()
  await expect(journalDetailPage.pendingInvitesHeading()).not.toBeVisible()

  const deleteJournalDialog = await journalDetailPage.openDeleteJournalDialog()
  await deleteJournalDialog.confirm()

  await expect(page).toHaveURL('/dashboard')
  await expect(dashboardPage.journalCard(journalTitle)).not.toBeVisible()
})