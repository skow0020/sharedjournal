import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

const {
  getCurrentAppUserMock,
  getCurrentUserEmailMock,
  getPendingInvitationsForEmailMock,
  getCollaboratorsForJournalMock,
  getUserJournalCountMock,
  getUserJournalsMock,
  createJournalForOwnerMock,
} = vi.hoisted(() => ({
  getCurrentAppUserMock: vi.fn(),
  getCurrentUserEmailMock: vi.fn(),
  getPendingInvitationsForEmailMock: vi.fn(),
  getCollaboratorsForJournalMock: vi.fn(),
  getUserJournalCountMock: vi.fn(),
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
  getCollaboratorsForJournal: getCollaboratorsForJournalMock,
  getUserJournalCount: getUserJournalCountMock,
  getUserJournals: getUserJournalsMock,
  createJournalForOwner: createJournalForOwnerMock,
}))

import DashboardPage from '@/app/dashboard/page'

async function renderDashboardPage(searchParams?: { page?: string }) {
  const withParams = await DashboardPage({
    searchParams: Promise.resolve(searchParams ?? {}),
  })
  render(withParams)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getCurrentUserEmailMock.mockResolvedValue('owner@example.com')
    getUserJournalCountMock.mockResolvedValue(0)
    getUserJournalsMock.mockResolvedValue([])
    getCollaboratorsForJournalMock.mockResolvedValue([])
    getPendingInvitationsForEmailMock.mockResolvedValue([])
  })

  it('renders sign-in prompt when no app user exists', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    await renderDashboardPage()

    expect(screen.getByText('Your Journals')).toBeInTheDocument()
    expect(screen.getByText('Sign in to view your journals.')).toBeInTheDocument()
    expect(getUserJournalsMock).not.toHaveBeenCalled()
  })

  it('renders empty journal state for signed in user with no journals', async () => {
    await renderDashboardPage()

    expect(screen.getByRole('heading', { name: 'Your Journals' })).toBeInTheDocument()
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
    getUserJournalCountMock.mockResolvedValue(1)
    getCollaboratorsForJournalMock.mockResolvedValue([
      {
        id: 'user-2',
        displayName: 'Alex',
        role: 'editor',
      },
    ])

    await renderDashboardPage()

    expect(screen.getByRole('heading', { name: 'Pending invites' })).toBeInTheDocument()
    expect(screen.getByText('Shared Travel Notes')).toBeInTheDocument()
    expect(screen.getByText(/Invited as editor/i)).toBeInTheDocument()

    expect(screen.getByText('Family Journal')).toBeInTheDocument()
    expect(screen.getByText('Daily family reflections')).toBeInTheDocument()
    expect(screen.getByText('Collaborators (1)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Family Journal' })).toBeInTheDocument()
    expect(screen.getByTestId('delete-journal-journal-1')).toBeInTheDocument()
  })

  it('renders delete button only for journals owned by current user', async () => {
    getUserJournalCountMock.mockResolvedValue(2)
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

  it('renders pager and requests journals for the requested page', async () => {
    getUserJournalCountMock.mockResolvedValue(7)
    getUserJournalsMock.mockResolvedValue([
      {
        id: 'journal-6',
        title: 'Page Two Journal 1',
        description: null,
        isOwner: true,
      },
      {
        id: 'journal-7',
        title: 'Page Two Journal 2',
        description: null,
        isOwner: false,
      },
    ])

    await renderDashboardPage({ page: '2' })

    expect(getUserJournalsMock).toHaveBeenCalledWith('user-1', { limit: 5, offset: 5 })
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/dashboard?page=1')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })
})
