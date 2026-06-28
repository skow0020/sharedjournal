import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { PendingJournalInvitation } from '@/data/invitations'
import { OwnedPendingInvitations } from '@/app/dashboard/journals/[journalId]/owned-pending-invitations'

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

function buildInvitation(overrides?: Partial<PendingJournalInvitation>): PendingJournalInvitation {
  return {
    id: 'invite-1',
    inviteeEmail: 'friend@example.com',
    role: 'editor',
    expiresAt: new Date('2026-03-17T00:00:00.000Z'),
    createdAt: new Date('2026-03-10T00:00:00.000Z'),
    emailDelivered: true,
    ...overrides,
  }
}

describe('OwnedPendingInvitations', () => {
  it('removes invitation optimistically on successful cancel', async () => {
    const cancelAction = vi.fn(async () => ({ error: null, success: true }))
    render(
      <OwnedPendingInvitations
        invitations={[buildInvitation()]}
        journalId="journal-1"
        cancelAction={cancelAction}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByText('friend@example.com')).not.toBeInTheDocument()
  })

  it('shows error and keeps invitation visible if cancel fails', async () => {
    const cancelAction = vi.fn(async () => ({ error: 'Something went wrong', success: false }))
    render(
      <OwnedPendingInvitations
        invitations={[buildInvitation()]}
        journalId="journal-1"
        cancelAction={cancelAction}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByText('friend@example.com')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders pending invitations with cancel buttons', () => {
    const cancelAction = vi.fn(async () => ({ error: null, success: true }))

    render(
      <OwnedPendingInvitations
        invitations={[buildInvitation()]}
        journalId="journal-1"
        cancelAction={cancelAction}
      />,
    )

    expect(screen.getByText('friend@example.com')).toBeInTheDocument()
    expect(screen.getByText(/email delivered/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('removes an invitation from the list after a successful cancel', async () => {
    const user = userEvent.setup()
    const cancelAction = vi.fn(async () => ({ error: null, success: true }))
    refreshMock.mockClear()

    render(
      <OwnedPendingInvitations
        invitations={[
          buildInvitation(),
          buildInvitation({ id: 'invite-2', inviteeEmail: 'second@example.com' }),
        ]}
        journalId="journal-1"
        cancelAction={cancelAction}
      />,
    )

    await user.click(screen.getAllByRole('button', { name: 'Cancel' })[0])

    await waitFor(() => {
      expect(cancelAction).toHaveBeenCalledWith({
        journalId: 'journal-1',
        invitationId: 'invite-1',
      })
    })

    await waitFor(() => {
      expect(screen.queryByText('friend@example.com')).not.toBeInTheDocument()
    })

    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('second@example.com')).toBeInTheDocument()
  })

  it('shows an error and keeps the invitation visible when cancel fails', async () => {
    const user = userEvent.setup()
    const cancelAction = vi.fn(async () => ({
      error: 'This invitation is no longer pending.',
      success: false,
    }))

    render(
      <OwnedPendingInvitations
        invitations={[buildInvitation()]}
        journalId="journal-1"
        cancelAction={cancelAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('This invitation is no longer pending.')).toBeInTheDocument()
    expect(screen.getByText('friend@example.com')).toBeInTheDocument()
  })
})
