import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getCurrentAppUserMock,
  getCurrentUserEmailMock,
  getPendingInvitationsForEmailMock,
  getUserJournalsMock,
  createJournalForOwnerMock,
} = vi.hoisted(() => ({
  getCurrentAppUserMock: vi.fn(),
  getCurrentUserEmailMock: vi.fn(),
  getPendingInvitationsForEmailMock: vi.fn(),
  getUserJournalsMock: vi.fn(),
  createJournalForOwnerMock: vi.fn(),
}))

vi.mock('@/app/dashboard/create-journal-modal', () => ({
  CreateJournalModal: ({ children }: { children?: ReactNode }) => (
    <div data-testid="create-journal-modal">{children ?? 'Create journal modal'}</div>
  ),
}))

vi.mock('@/app/dashboard/delete-journal-button', () => ({
  DeleteJournalButton: ({ journalId }: { journalId: string }) => (
    <div data-testid={`delete-journal-${journalId}`}>Delete</div>
  ),
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/lib/get-current-user-email', () => ({
  getCurrentUserEmail: getCurrentUserEmailMock,
}))

vi.mock('@/data/invitations', () => ({
  getPendingInvitationsForEmail: getPendingInvitationsForEmailMock,
}))

vi.mock('@/data/journals', () => ({
  getUserJournals: getUserJournalsMock,
  createJournalForOwner: createJournalForOwnerMock,
}))

import DashboardPage from '@/app/dashboard/page'

async function renderDashboardPage() {
  const page = await DashboardPage()
  render(page)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getCurrentUserEmailMock.mockResolvedValue('owner@example.com')
    getUserJournalsMock.mockResolvedValue([])
    getPendingInvitationsForEmailMock.mockResolvedValue([])
  })

  it('renders sign-in prompt when no app user exists', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    await renderDashboardPage()

    expect(screen.getByText('Journals')).toBeInTheDocument()
    expect(screen.getByText('Sign in to view your journals.')).toBeInTheDocument()
    expect(getUserJournalsMock).not.toHaveBeenCalled()
  })

  it('renders empty journal state for signed in user with no journals', async () => {
    await renderDashboardPage()

    expect(screen.getByRole('heading', { name: 'Journals' })).toBeInTheDocument()
    expect(screen.getByText('No journals found')).toBeInTheDocument()
    expect(screen.getByText('You are not a member of any journals yet.')).toBeInTheDocument()
    expect(screen.getByTestId('create-journal-modal')).toBeInTheDocument()
  })

  it('renders pending invites and journal list for signed in user', async () => {
    getPendingInvitationsForEmailMock.mockResolvedValue([
      {
        id: 'inv-1',
        journalId: 'journal-a',
        journalTitle: 'Shared Travel Notes',
        inviteToken: 'token-123',
        role: 'editor',
        inviterName: 'Taylor',
        expiresAt: new Date('2026-03-17T00:00:00.000Z'),
        createdAt: new Date('2026-03-10T00:00:00.000Z'),
      },
    ])

    getUserJournalsMock.mockResolvedValue([
      {
        id: 'journal-1',
        title: 'Family Journal',
        description: 'Daily family reflections',
        isOwner: true,
      },
    ])

    await renderDashboardPage()

    expect(screen.getByRole('heading', { name: 'Pending invites' })).toBeInTheDocument()
    expect(screen.getByText('Shared Travel Notes')).toBeInTheDocument()
    expect(screen.getByText(/Invited as editor/i)).toBeInTheDocument()

    expect(screen.getByText('Family Journal')).toBeInTheDocument()
    expect(screen.getByText('Daily family reflections')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Family Journal' })).toBeInTheDocument()
    expect(screen.getByTestId('delete-journal-journal-1')).toBeInTheDocument()
  })

  it('renders delete button only for journals owned by current user', async () => {
    getUserJournalsMock.mockResolvedValue([
      {
        id: 'journal-1',
        title: 'Owned Journal',
        description: null,
        isOwner: true,
      },
      {
        id: 'journal-2',
        title: 'Shared With Me',
        description: null,
        isOwner: false,
      },
    ])

    await renderDashboardPage()

    expect(screen.getByRole('link', { name: 'Open Owned Journal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Shared With Me' })).toBeInTheDocument()
    expect(screen.getByTestId('delete-journal-journal-1')).toBeInTheDocument()
    expect(screen.queryByTestId('delete-journal-journal-2')).not.toBeInTheDocument()
  })

  it('does not fetch pending invitations when current user email is unavailable', async () => {
    getCurrentUserEmailMock.mockResolvedValue(null)

    await renderDashboardPage()

    expect(getPendingInvitationsForEmailMock).not.toHaveBeenCalled()
  })
})
