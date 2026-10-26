import { expect, test } from '@playwright/test'
import { DashboardPage } from './pages/dashboard.page'
import { SupportModal } from './components/support-modal'

test.describe('Support Modal', () => {
  test.beforeEach(async ({ request }) => {
    // Enable support modal for these tests
    const supportModalResponse = await request.post('/api/test/launchdarkly/support-modal', {
      data: {
        enabled: true,
      },
    })
    expect(supportModalResponse.ok()).toBeTruthy()
  })

  test.afterEach(async ({ request }) => {
    // Disable support modal after tests
    const supportModalResponse = await request.post('/api/test/launchdarkly/support-modal', {
      data: {
        enabled: false,
      },
    })
    expect(supportModalResponse.ok()).toBeTruthy()
  })

  test('should display support modal when flag is enabled', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const supportModal = new SupportModal(page)
    await expect(supportModal.heading()).toBeVisible()
  })

  test('should not display support modal when flag is disabled', async ({ request, page }) => {
    // Disable the modal
    const supportModalResponse = await request.post('/api/test/launchdarkly/support-modal', {
      data: {
        enabled: false,
      },
    })
    expect(supportModalResponse.ok()).toBeTruthy()

    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()

    const supportModal = new SupportModal(page)
    await expect(supportModal.dialog()).not.toBeVisible()
  })
})
