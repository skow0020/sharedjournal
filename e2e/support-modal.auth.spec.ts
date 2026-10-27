import { expect, test, type APIRequestContext } from '@playwright/test'
import { DashboardPage } from './pages/dashboard.page'
import { SupportModal } from './components/support-modal'

// Helper to set flag state with cleanup to avoid cross-test interference
async function withSupportModalFlag(
  request: APIRequestContext,
  enabled: boolean,
  testFn: () => Promise<void>
) {
  // Set desired state before test
  const setResponse = await request.post('/api/test/launchdarkly/support-modal', {
    data: { enabled },
  })
  expect(setResponse.ok()).toBeTruthy()

  try {
    // Run test with flag in desired state
    await testFn()
  } finally {
    // Always reset to disabled to prevent interference with other tests
    const resetResponse = await request.post('/api/test/launchdarkly/support-modal', {
      data: { enabled: false },
    })
    expect(resetResponse.ok()).toBeTruthy()
  }
}

test.describe('Support Modal', () => {
  test('should display support modal when flag is enabled', async ({ request, page }) => {
    await withSupportModalFlag(request, true, async () => {
      const dashboardPage = new DashboardPage(page)
      await dashboardPage.goto()

      const supportModal = new SupportModal(page)
      await expect(supportModal.heading()).toBeVisible()
    })
  })

  test('should not display support modal when flag is disabled', async ({ request, page }) => {
    await withSupportModalFlag(request, false, async () => {
      const dashboardPage = new DashboardPage(page)
      await dashboardPage.goto()

      const supportModal = new SupportModal(page)
      await expect(supportModal.dialog()).not.toBeVisible()
    })
  })
})
