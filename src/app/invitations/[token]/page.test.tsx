import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getInvitationByTokenMock,
  getCurrentAppUserMock,
  getCurrentUserEmailMock,
} = vi.hoisted(() => ({
  getInvitationByTokenMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
  getCurrentUserEmailMock: vi.fn(),
}))

vi.mock('@clerk/nextjs', () => ({
  SignInButton: ({ children }: { children: ReactNode }) => <div data-testid="sign-in-button">{children}</div>,
}))

vi.mock('@/data/invitations', () => ({
  getInvitationByToken: getInvitationByTokenMock,
}))

vi.mock('@/app/invitations/[token]/actions', () => ({
  acceptInvitationAction: vi.fn(),
  declineInvitationAction: vi.fn(),
}))

vi.mock('@/app/invitations/[token]/invitation-response-actions', () => ({
  InvitationResponseActions: () => <div data-testid="invitation-response-actions">Invitation response actions</div>,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/lib/get-current-user-email', () => ({
  getCurrentUserEmail: getCurrentUserEmailMock,
}))

import InvitationPage from '@/app/invitations/[token]/page'

const invitation = {
  id: 'inv-1',
  journalId: 'journal-1',
  journalTitle: 'Family Journal',
  inviteeEmail: 'collab@example.com',
  role: 'editor' as const,
  status: 'pending' as const,
  expiresAt: new Date('2026-03-17T00:00:00.000Z'),
  inviterName: 'Colin',
  createdAt: new Date('2026-03-10T00:00:00.000Z'),
}

async function renderInvitationPage(token = 'invite-token') {
  const page = await InvitationPage({
    params: Promise.resolve({ token }),
  })

  render(page)
}

describe('InvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getInvitationByTokenMock.mockResolvedValue({ state: 'ready', invitation })
    getCurrentAppUserMock.mockResolvedValue(null)
    getCurrentUserEmailMock.mockResolvedValue(null)
  })

  it('renders not found state', async () => {
    getInvitationByTokenMock.mockResolvedValue({ state: 'not-found' })

    await renderInvitationPage()

    expect(screen.getByText('Invitation not found')).toBeInTheDocument()
    expect(screen.getByText('This invitation link is invalid or no longer exists.')).toBeInTheDocument()
  })

  it('renders expired state', async () => {
    getInvitationByTokenMock.mockResolvedValue({
      state: 'expired',
      invitation,
    })

    await renderInvitationPage()

    expect(screen.getByText('Invitation expired')).toBeInTheDocument()
    expect(screen.getByText(/Family Journal/)).toBeInTheDocument()
  })

  it('renders unavailable state', async () => {
    getInvitationByTokenMock.mockResolvedValue({
      state: 'unavailable',
      invitation,
    })

    await renderInvitationPage()

    expect(screen.getByText('Invitation unavailable')).toBeInTheDocument()
    expect(screen.getByText(/no longer pending/i)).toBeInTheDocument()
  })

  it('shows sign in action when user is not signed in', async () => {
    await renderInvitationPage()

    expect(screen.getByText('Journal invitation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in to accept' })).toBeInTheDocument()
    expect(screen.getByTestId('sign-in-button')).toBeInTheDocument()
  })

  it('shows accept and decline actions when signed in with invited email', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getCurrentUserEmailMock.mockResolvedValue('collab@example.com')

    await renderInvitationPage()

    expect(screen.getByTestId('invitation-response-actions')).toBeInTheDocument()
  })

  it('shows mismatch message when signed in with different email', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getCurrentUserEmailMock.mockResolvedValue('different@example.com')

    await renderInvitationPage()

    expect(screen.getByText(/You are signed in as/i)).toBeInTheDocument()
    expect(screen.getByText(/different@example.com/)).toBeInTheDocument()
    expect(screen.getAllByText(/collab@example.com/)).toHaveLength(2)
  })
})
