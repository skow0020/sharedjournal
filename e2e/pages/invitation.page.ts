import { type Page } from '@playwright/test'

export class InvitationPage {
  constructor(readonly page: Page) {}

  async goto(token: string) {
    await this.page.goto(`/invitations/${token}`)
  }

  notFoundHeading() {
    return this.page.getByText('Invitation not found')
  }

  notFoundMessage() {
    return this.page.getByText('This invitation link is invalid or no longer exists.')
  }
}
