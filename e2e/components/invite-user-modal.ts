import { type Page } from '@playwright/test'

export class InviteUserModal {
  constructor(readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { name: 'Invite a user' })
  }

  async fillEmail(email: string) {
    await this.page.getByLabel('Email').fill(email)
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Send invite' }).click()
  }

  invitationSentText(emailPrefix: string) {
    return this.page.getByText(new RegExp(`Invitation (sent to|created for) ${emailPrefix}`, 'i'))
  }

  inviteLinkText() {
    return this.page.getByText('Invite link:', { exact: false })
  }

  async close() {
    await this.page.getByRole('button', { name: 'Close' }).click()
  }
}
