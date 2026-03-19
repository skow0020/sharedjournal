import { type Page } from '@playwright/test'

export class CreateJournalModal {
  constructor(readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { name: 'Create a journal' })
  }

  async fillTitle(title: string) {
    await this.page.getByLabel('Title').fill(title)
  }

  async fillDescription(description: string) {
    await this.page.getByLabel('Description').fill(description)
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Create journal' }).click()
  }
}
