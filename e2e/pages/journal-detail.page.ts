import { type Page } from '@playwright/test'
import { CreateEntryModal } from '../components/create-entry-modal'
import { DeleteJournalDialog } from '../components/delete-journal-dialog'
import { InviteUserModal } from '../components/invite-user-modal'

export class JournalDetailPage {
  readonly createEntryModal: CreateEntryModal
  readonly inviteUserModal: InviteUserModal
  readonly deleteJournalDialog: DeleteJournalDialog

  constructor(readonly page: Page) {
    this.createEntryModal = new CreateEntryModal(page)
    this.inviteUserModal = new InviteUserModal(page)
    this.deleteJournalDialog = new DeleteJournalDialog(page)
  }

  heading(title: string) {
    return this.page.getByRole('heading', { level: 1, name: title })
  }

  descriptionText(text: string) {
    return this.page.getByText(text)
  }

  async openCreateEntryModal(): Promise<CreateEntryModal> {
    await this.page.getByRole('button', { name: 'Add entry' }).click()
    return this.createEntryModal
  }

  async openInviteUserModal(): Promise<InviteUserModal> {
    await this.page.getByRole('button', { name: 'Invite' }).click()
    return this.inviteUserModal
  }

  async openDeleteJournalDialog(): Promise<DeleteJournalDialog> {
    await this.page.getByRole('button', { name: 'Delete journal', exact: true }).click()
    return this.deleteJournalDialog
  }

  async openEditJournalTitle() {
    await this.page.getByRole('button', { name: 'Edit journal title' }).click()
  }

  async setJournalTitle(title: string) {
    await this.page.getByRole('textbox', { name: 'Journal title' }).fill(title)
  }

  async saveJournalTitle() {
    await this.page.getByRole('button', { name: 'Save journal title' }).click()
  }

  async openCollaboratorsPanel() {
    await this.page.getByRole('button', { name: 'Collaborators (0)' }).click()
  }

  noCollaboratorsText() {
    return this.page.getByText('Not shared with anyone yet.')
  }

  pendingInvitesHeading() {
    return this.page.getByRole('heading', { name: 'Pending invites' })
  }

  pendingInviteEmail(email: string) {
    return this.page.getByText(email)
  }

  async cancelPendingInvite(email: string) {
    const inviteCard = this.page
      .locator('[data-slot="card"]')
      .filter({ has: this.page.getByText(email) })
      .first()

    await inviteCard.getByRole('button', { name: 'Cancel' }).click()
  }

  entriesHeading() {
    return this.page.getByRole('heading', { name: 'Journal entries' })
  }

  entryTitle(title: string) {
    return this.page.getByText(title)
  }

  entryContent(content: string) {
    return this.page.getByText(content)
  }

  private entryCard(title: string) {
    return this.page.locator('[data-slot="card"]').filter({ hasText: title }).first()
  }

  async deleteEntry(title: string) {
    const card = this.entryCard(title)
    await card.getByRole('button', { name: 'Delete entry' }).click()

    const dialog = this.page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Delete entry' }).click()
  }
}
