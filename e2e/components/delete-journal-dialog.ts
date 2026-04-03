import { type Page } from '@playwright/test'

export class DeleteJournalDialog {
  constructor(readonly page: Page) {}

  async confirm() {
    await this.page
      .getByRole('dialog', { name: 'Delete journal' })
      .getByRole('button', { name: 'Delete journal', exact: true })
      .click()
  }
}
