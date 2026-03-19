import { type Page } from '@playwright/test'

export class SignInPage {
  constructor(readonly page: Page) {}

  emailInput() {
    return this.page
      .locator('input[name="identifier"], input[name="emailAddress"], input[type="email"]')
      .first()
  }

  passwordInput() {
    return this.page.locator('input[type="password"]').first()
  }

  continueButton() {
    return this.page.getByRole('button', { name: 'Continue', exact: true }).first()
  }

  async fillEmail(email: string) {
    await this.emailInput().fill(email)
  }

  async fillPassword(password: string) {
    await this.passwordInput().fill(password)
  }

  async clickContinue() {
    await this.continueButton().click()
  }
}
