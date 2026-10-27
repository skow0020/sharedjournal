import { type Page } from '@playwright/test'

export class SupportModal {
  constructor(readonly page: Page) {}

  dialog() {
    return this.page.getByRole('dialog')
  }

  heading() {
    return this.page.getByRole('heading', { name: /support SharedJournal/i })
  }

  closeButton() {
    return this.page.getByRole('button', { name: 'Close' }).first()
  }

  maybeLaterButton() {
    return this.page.getByRole('button', { name: /Maybe later/i })
  }

  buyMeCoffeeLink() {
    return this.page.getByRole('link', { name: /Buy me a coffee/i })
  }

  async close() {
    await this.closeButton().click()
  }

  async clickMaybeLater() {
    await this.maybeLaterButton().click()
  }

  async isVisible() {
    return this.dialog().isVisible()
  }
}
