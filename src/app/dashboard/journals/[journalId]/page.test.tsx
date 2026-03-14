import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getCurrentAppUserMock,
  getUserJournalByIdMock,
  getCollaboratorsForJournalMock,
  getJournalEntriesForJournalMock,
  getPendingInvitationsForOwnedJournalMock,
  notFoundMock,
  redirectMock,
} = vi.hoisted(() => ({
  getCurrentAppUserMock: vi.fn(),
  getUserJournalByIdMock: vi.fn(),
  getCollaboratorsForJournalMock: vi.fn(),
  getJournalEntriesForJournalMock: vi.fn(),
  getPendingInvitationsForOwnedJournalMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  redirectMock: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}))

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}))

vi.mock('@/app/dashboard/journals/[journalId]/create-entry-modal', () => ({
  CreateEntryModal: () => <div data-testid="create-entry-modal">Create entry modal</div>,
}))

vi.mock('@/app/dashboard/journals/[journalId]/invite-user-modal', () => ({
  InviteUserModal: () => <div data-testid="invite-user-modal">Invite user modal</div>,
}))

vi.mock('@/app/dashboard/delete-journal-button', () => ({
  DeleteJournalButton: () => <div data-testid="delete-journal-button">Delete journal</div>,
}))

vi.mock('@/app/dashboard/journals/[journalId]/actions', () => ({
  createEntryAction: vi.fn(),
  createInviteAction: vi.fn(),
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/data/journals', () => ({
  getUserJournalById: getUserJournalByIdMock,
  getCollaboratorsForJournal: getCollaboratorsForJournalMock,
}))

vi.mock('@/data/entries', () => ({
  getJournalEntriesForJournal: getJournalEntriesForJournalMock,
  createEntryForJournal: vi.fn(),
}))

vi.mock('@/data/invitations', () => ({
  createJournalInvitation: vi.fn(),
  getPendingInvitationsForOwnedJournal: getPendingInvitationsForOwnedJournalMock,
  setInvitationEmailDeliveryFlag: vi.fn(),
}))

vi.mock('@/lib/invitations/send-invite-email', () => ({
  sendInviteEmail: vi.fn(),
}))

import JournalDetailsPage from '@/app/dashboard/journals/[journalId]/page'

async function renderJournalDetailsPage(journalId = 'journal-1') {
  const page = await JournalDetailsPage({
    params: Promise.resolve({ journalId }),
  })

  render(page)
}

describe('JournalDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getUserJournalByIdMock.mockResolvedValue({
      id: 'journal-1',
      title: 'Family Journal',
      description: 'Shared notes and reflections',
      isOwner: true,
    })
    getCollaboratorsForJournalMock.mockResolvedValue([
      {
        id: 'user-2',
        displayName: 'Alex',
        role: 'editor',
      },
    ])
    getJournalEntriesForJournalMock.mockResolvedValue([
      {
        id: 'entry-1',
        title: 'Morning Reflection',
        content: 'Wrote about goals for the day.',
        entryDate: '2026-03-10',
        authorName: 'Colin',
        createdAt: new Date('2026-03-10T09:00:00.000Z'),
      },
    ])
    getPendingInvitationsForOwnedJournalMock.mockResolvedValue([
      {
        id: 'inv-1',
        inviteeEmail: 'friend@example.com',
        role: 'editor',
        expiresAt: new Date('2026-03-17T00:00:00.000Z'),
        createdAt: new Date('2026-03-10T00:00:00.000Z'),
        emailDelivered: true,
      },
    ])
  })

  it('renders sign-in prompt when user is not authenticated', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    await renderJournalDetailsPage()

    expect(screen.getByText('Journal')).toBeInTheDocument()
    expect(screen.getByText('Sign in to view this journal.')).toBeInTheDocument()
    expect(getUserJournalByIdMock).not.toHaveBeenCalled()
  })

  it('calls notFound when journal is unavailable to the user', async () => {
    getUserJournalByIdMock.mockResolvedValue(null)

    await expect(renderJournalDetailsPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFoundMock).toHaveBeenCalled()
  })

  it('renders journal details with collaborators, pending invites, and entries', async () => {
    await renderJournalDetailsPage()

    expect(screen.getByRole('link', { name: 'Back to journals' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Family Journal' })).toBeInTheDocument()
    expect(screen.getByText('Shared notes and reflections')).toBeInTheDocument()

    expect(screen.getByText('Collaborators (1)')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Pending invites' })).toBeInTheDocument()
    expect(screen.getByText('friend@example.com')).toBeInTheDocument()
    expect(screen.getByText(/email delivered/i)).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Journal entries' })).toBeInTheDocument()
    expect(screen.getByText('Morning Reflection')).toBeInTheDocument()
    expect(screen.getByText('Wrote about goals for the day.')).toBeInTheDocument()

    expect(screen.getByTestId('create-entry-modal')).toBeInTheDocument()
    expect(screen.getByTestId('invite-user-modal')).toBeInTheDocument()
    expect(screen.getByTestId('delete-journal-button')).toBeInTheDocument()
  })

  it('renders empty entries state when there are no journal entries', async () => {
    getJournalEntriesForJournalMock.mockResolvedValue([])
    getPendingInvitationsForOwnedJournalMock.mockResolvedValue([])

    await renderJournalDetailsPage()

    expect(screen.getByRole('heading', { name: 'Journal entries' })).toBeInTheDocument()
    expect(screen.getByText('No entries yet')).toBeInTheDocument()
    expect(screen.getByText('This journal does not have any entries yet.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pending invites' })).not.toBeInTheDocument()
  })

  it('does not render delete button for journals shared with the user', async () => {
    getUserJournalByIdMock.mockResolvedValue({
      id: 'journal-1',
      title: 'Family Journal',
      description: 'Shared notes and reflections',
      isOwner: false,
    })

    await renderJournalDetailsPage()

    expect(screen.queryByTestId('delete-journal-button')).not.toBeInTheDocument()
  })
})
