import { type Page } from '@playwright/test'

export class CreateEntryModal {
  constructor(readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { name: 'Create an entry' })
  }

  async fillTitle(title: string) {
    await this.page
      .getByRole('dialog', { name: 'Create an entry' })
      .getByLabel('Title')
      .fill(title)
  }

  async fillContent(content: string) {
    await this.page.getByLabel('Content').fill(content)
  }

  contentInput() {
    return this.page.getByLabel('Content')
  }

  speakEntryButton() {
    return this.page.getByRole('button', { name: 'Speak entry' })
  }

  async startVoiceInput() {
    await this.speakEntryButton().click()
  }

  async fillEntryDate(date: string) {
    await this.page.getByLabel('Entry date').fill(date)
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Create entry' }).click()
  }
}
