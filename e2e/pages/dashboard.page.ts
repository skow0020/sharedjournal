import { type Page } from '@playwright/test'
import { CreateJournalModal } from '../components/create-journal-modal'

export class DashboardPage {
  readonly createJournalModal: CreateJournalModal

  constructor(readonly page: Page) {
    this.createJournalModal = new CreateJournalModal(page)
  }

  async goto() {
    await this.page.goto('/dashboard')
  }

  heading() {
    return this.page.getByRole('heading', { level: 1, name: 'Journals' })
  }

  async openCreateJournalModal(): Promise<CreateJournalModal> {
    await this.page.getByRole('button', { name: 'Toggle theme' }).waitFor()
    await this.page.getByRole('button', { name: 'Add journal' }).click()
    return this.createJournalModal
  }

  journalCard(name: string) {
    return this.page.getByText(name)
  }
}
