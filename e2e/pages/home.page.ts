import { type Page } from '@playwright/test'

export class HomePage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async clickSignIn() {
    await this.page.getByRole('button', { name: 'Sign In' }).click()
  }

  headline() {
    return this.page.getByRole('heading', { name: /Write together/i })
  }

  featureCard(name: string) {
    return this.page.getByText(name)
  }

  signInButton() {
    return this.page.getByRole('button', { name: 'Sign In' })
  }
}
