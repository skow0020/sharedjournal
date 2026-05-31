import { expect, test } from '@playwright/test'
import { DashboardPage } from './pages/dashboard.page'
import { JournalDetailPage } from './pages/journal-detail.page'

test.beforeEach(async ({ request }) => {
  const resetResponse = await request.post('/api/test/launchdarkly/entry-comments', {
    data: {
      enabled: false,
    },
  })

  expect(resetResponse.ok()).toBeTruthy()
})

test('can create a journal, add an entry, comment on it, and invite a collaborator', async ({ page, request }) => {
  const toggleResponse = await request.post('/api/test/launchdarkly/entry-comments', {
    data: {
      enabled: true,
    },
  })
  expect(toggleResponse.ok()).toBeTruthy()

  const journalTitle = `E2E Journal ${Date.now()}`
  const journalDescription = 'Journal created by Playwright end-to-end coverage.'
  const entryTitle = 'First E2E entry'
  const entryContent = 'Entry content written by Playwright for lifecycle coverage.'
  const commentContent = `E2E comment ${Date.now()}`
  const inviteeEmail = `invitee+${Date.now()}@example.com`

  const dashboardPage = new DashboardPage(page)
  await dashboardPage.goto()
  await expect(dashboardPage.heading()).toBeVisible()

  const createJournalModal = await dashboardPage.openCreateJournalModal()
  await expect(createJournalModal.heading()).toBeVisible()
  await createJournalModal.fillTitle(journalTitle)
  await createJournalModal.fillDescription(journalDescription)
  await createJournalModal.submit()

  const journalDetailPage = new JournalDetailPage(page)
  await expect(page).toHaveURL(/\/dashboard\/journals\/[a-z0-9-]+$/i)
  await expect(journalDetailPage.heading(journalTitle)).toBeVisible()
  await expect(journalDetailPage.descriptionText(journalDescription)).toBeVisible()

  const createEntryModal = await journalDetailPage.openCreateEntryModal()
  await expect(createEntryModal.heading()).toBeVisible()
  await createEntryModal.fillTitle(entryTitle)
  await createEntryModal.fillContent(entryContent)
  await createEntryModal.fillEntryDate('2026-03-10')
  await createEntryModal.submit()

  await expect(journalDetailPage.entriesHeading()).toBeVisible()
  await expect(journalDetailPage.entryTitle(entryTitle)).toBeVisible()
  await expect(journalDetailPage.entryContent(entryContent)).toBeVisible()

  await expect(journalDetailPage.commentInput()).toBeVisible()
  await journalDetailPage.addComment(commentContent)
  await expect(journalDetailPage.commentText(commentContent)).toBeVisible()

  await journalDetailPage.deleteEntry(entryTitle)
  await expect(journalDetailPage.entryTitle(entryTitle)).not.toBeVisible()
  await expect(journalDetailPage.entryContent(entryContent)).not.toBeVisible()

  const inviteUserModal = await journalDetailPage.openInviteUserModal()
  await expect(inviteUserModal.heading()).toBeVisible()
  await inviteUserModal.fillEmail(inviteeEmail)
  await inviteUserModal.submit()

  await expect(inviteUserModal.invitationSentText('invitee+')).toBeVisible()
  await expect(inviteUserModal.inviteLinkText()).toBeVisible()

  await inviteUserModal.close()
  await page.reload()

  await expect(journalDetailPage.pendingInvitesHeading()).toBeVisible()
  await expect(journalDetailPage.pendingInviteEmail(inviteeEmail)).toBeVisible()

  await journalDetailPage.openCollaboratorsPanel()
  await expect(journalDetailPage.noCollaboratorsText()).toBeVisible()

  const deleteJournalDialog = await journalDetailPage.openDeleteJournalDialog()
  await deleteJournalDialog.confirm()

  await expect(page).toHaveURL('/dashboard')
  await expect(dashboardPage.journalCard(journalTitle)).not.toBeVisible()
})

test('can edit journal name and delete on details page', async ({ page }) => {
  const journalTitle = `E2E Journal ${Date.now()}`
  const newJournalTitle = `Updated ${journalTitle}`
  const newJournalDescription = 'Secrets galore'

  const dashboardPage = new DashboardPage(page)
  await dashboardPage.goto()
  await expect(dashboardPage.heading()).toBeVisible()

  const createJournalModal = await dashboardPage.openCreateJournalModal()
  await expect(createJournalModal.heading()).toBeVisible()
  await createJournalModal.fillTitle(journalTitle)
  await createJournalModal.submit()

  const journalDetailPage = new JournalDetailPage(page)
  await expect(page).toHaveURL(/\/dashboard\/journals\/[a-z0-9-]+$/i)
  await expect(journalDetailPage.heading(journalTitle)).toBeVisible()

  await journalDetailPage.openEditJournal()
  await journalDetailPage.setJournalTitle(newJournalTitle)
  await journalDetailPage.setJournalDescription(newJournalDescription)
  await journalDetailPage.saveJournalChanges()

  await expect(journalDetailPage.heading(newJournalTitle)).toBeVisible()
  await expect(journalDetailPage.descriptionText(newJournalDescription)).toBeVisible()

  const deleteJournalDialog = await journalDetailPage.openDeleteJournalDialog()
  await deleteJournalDialog.confirm()

  await expect(page).toHaveURL('/dashboard')
  await expect(dashboardPage.journalCard(newJournalTitle)).not.toBeVisible()
})

test('can append journal entry content using mobile speech input', async ({ page }) => {
  await page.addInitScript({
    content: `
      (() => {
        const originalMatchMedia = window.matchMedia?.bind(window)

        window.matchMedia = (query) => {
          if (query === '(pointer: coarse)') {
            return {
              matches: true,
              media: query,
              onchange: null,
              addListener: () => {},
              removeListener: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => false,
            }
          }

          if (originalMatchMedia) {
            return originalMatchMedia(query)
          }

          return {
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          }
        }

        class MockSpeechRecognition {
          constructor() {
            window.__lastMockRecognition = this
            this.lang = 'en-US'
            this.interimResults = false
            this.continuous = false
            this.onstart = null
            this.onend = null
            this.onresult = null
            this.onerror = null
          }

          start() {
            if (typeof this.onstart === 'function') {
              this.onstart(new Event('start'))
            }
          }

          stop() {
            if (typeof this.onend === 'function') {
              this.onend(new Event('end'))
            }
          }
        }

        window.SpeechRecognition = MockSpeechRecognition
        window.webkitSpeechRecognition = undefined

        window.__emitSpeechTranscript = (text) => {
          const recognition = window.__lastMockRecognition

          if (!recognition || typeof recognition.onresult !== 'function') {
            return
          }

          recognition.onresult({
            resultIndex: 0,
            results: [
              {
                0: { transcript: text },
                isFinal: true,
              },
            ],
          })
        }
      })()
    `,
  })

  const journalTitle = `E2E Voice Journal ${Date.now()}`
  const entryTitle = 'Voice Entry'
  const typedContent = 'Started manually'
  const spokenContent = 'and finished by voice'

  const dashboardPage = new DashboardPage(page)
  await dashboardPage.goto()
  await expect(dashboardPage.heading()).toBeVisible()

  const createJournalModal = await dashboardPage.openCreateJournalModal()
  await expect(createJournalModal.heading()).toBeVisible()
  await createJournalModal.fillTitle(journalTitle)
  await createJournalModal.submit()

  const journalDetailPage = new JournalDetailPage(page)
  await expect(page).toHaveURL(/\/dashboard\/journals\/[a-z0-9-]+$/i)
  await expect(journalDetailPage.heading(journalTitle)).toBeVisible()

  const createEntryModal = await journalDetailPage.openCreateEntryModal()
  await expect(createEntryModal.heading()).toBeVisible()
  await expect(createEntryModal.speakEntryButton()).toBeVisible()

  await createEntryModal.fillTitle(entryTitle)
  await createEntryModal.fillContent(typedContent)
  await createEntryModal.startVoiceInput()

  await page.evaluate((text) => {
    ;(window as unknown as { __emitSpeechTranscript?: (value: string) => void }).__emitSpeechTranscript?.(text)
  }, spokenContent)

  await expect(createEntryModal.contentInput()).toHaveValue(`${typedContent} ${spokenContent}`)

  await createEntryModal.fillEntryDate('2026-03-10')
  await createEntryModal.submit()

  await expect(journalDetailPage.entriesHeading()).toBeVisible()
  await expect(journalDetailPage.entryTitle(entryTitle)).toBeVisible()
  await expect(journalDetailPage.entryContent(`${typedContent} ${spokenContent}`)).toBeVisible()

  const deleteJournalDialog = await journalDetailPage.openDeleteJournalDialog()
  await deleteJournalDialog.confirm()

  await expect(page).toHaveURL('/dashboard')
  await expect(dashboardPage.journalCard(journalTitle)).not.toBeVisible()
})