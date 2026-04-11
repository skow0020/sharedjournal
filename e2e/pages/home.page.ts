import { type Locator, type Page } from '@playwright/test'

export class HomePage {
  private readonly signInButton: Locator

  constructor(readonly page: Page) {
    this.signInButton = this.page.locator('section').getByRole('button', { name: 'Sign In' })
  }

  async goto() {
    await this.page.goto('/')
  }

  async clickSignIn() {
    await this.signInButton.first().click()
  }

  headline() {
    return this.page.getByRole('heading', { name: /Write together/i })
  }

  featureCard(name: string) {
    return this.page.getByText(name)
  }
}
