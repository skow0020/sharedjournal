import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PendingInvitation } from '@/data/invitations'
import { PendingInvitationRow } from '@/app/dashboard/pending-invitation-row'

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

function buildInvitation(overrides?: Partial<PendingInvitation>): PendingInvitation {
  return {
    id: 'invite-1',
    journalId: 'journal-1',
    journalTitle: 'Team Notes',
    inviteToken: 'token-1',
    role: 'editor',
    inviterName: 'Alex',
    expiresAt: new Date('2026-04-01T12:00:00.000Z'),
    createdAt: new Date('2026-03-20T12:00:00.000Z'),
    ...overrides,
  }
}

describe('PendingInvitationRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders invitation details and action buttons', () => {
    const acceptAction = vi.fn(async () => ({ error: null, redirectTo: '/dashboard/journals/journal-1' }))
    const declineAction = vi.fn(async () => ({ error: null, success: true }))

    render(
      <PendingInvitationRow
        invitation={buildInvitation()}
        acceptAction={acceptAction}
        declineAction={declineAction}
      />,
    )

    expect(screen.getByText('Team Notes')).toBeInTheDocument()
    expect(screen.getByText(/Invited as editor/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
  })

  it('accepts an invitation and navigates to returned route', async () => {
    const user = userEvent.setup()
    const acceptAction = vi.fn(async () => ({ error: null, redirectTo: '/dashboard/journals/journal-1' }))
    const declineAction = vi.fn(async () => ({ error: null, success: true }))

    render(
      <PendingInvitationRow
        invitation={buildInvitation({ inviteToken: 'invite-token' })}
        acceptAction={acceptAction}
        declineAction={declineAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() => {
      expect(acceptAction).toHaveBeenCalledWith({ token: 'invite-token' })
    })

    expect(pushMock).toHaveBeenCalledWith('/dashboard/journals/journal-1')
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('declines an invitation and refreshes the page', async () => {
    const user = userEvent.setup()
    const acceptAction = vi.fn(async () => ({ error: null, redirectTo: '/dashboard/journals/journal-1' }))
    const declineAction = vi.fn(async () => ({ error: null, success: true }))

    render(
      <PendingInvitationRow
        invitation={buildInvitation({ inviteToken: 'invite-token' })}
        acceptAction={acceptAction}
        declineAction={declineAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Decline' }))

    await waitFor(() => {
      expect(declineAction).toHaveBeenCalledWith({ token: 'invite-token' })
    })

    expect(refreshMock).toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('shows accept error and does not navigate', async () => {
    const user = userEvent.setup()
    const acceptAction = vi.fn(async () => ({ error: 'Invite is no longer valid.', redirectTo: null }))
    const declineAction = vi.fn(async () => ({ error: null, success: true }))

    render(
      <PendingInvitationRow
        invitation={buildInvitation()}
        acceptAction={acceptAction}
        declineAction={declineAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    expect(await screen.findByText('Invite is no longer valid.')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('shows decline error and does not refresh', async () => {
    const user = userEvent.setup()
    const acceptAction = vi.fn(async () => ({ error: null, redirectTo: '/dashboard/journals/journal-1' }))
    const declineAction = vi.fn(async () => ({ error: 'Invite is no longer valid.', success: false }))

    render(
      <PendingInvitationRow
        invitation={buildInvitation()}
        acceptAction={acceptAction}
        declineAction={declineAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Decline' }))

    expect(await screen.findByText('Invite is no longer valid.')).toBeInTheDocument()
    expect(refreshMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('shows Accepting... while accept action is in flight', async () => {
    const user = userEvent.setup()
    let resolveAccept: ((value: { error: null, redirectTo: string }) => void) | null = null
    const acceptAction = vi.fn(
      () =>
        new Promise<{ error: null, redirectTo: string }>((resolve) => {
          resolveAccept = resolve
        }),
    )
    const declineAction = vi.fn(async () => ({ error: null, success: true }))

    render(
      <PendingInvitationRow
        invitation={buildInvitation({ inviteToken: 'invite-token' })}
        acceptAction={acceptAction}
        declineAction={declineAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    expect(screen.getByRole('button', { name: 'Accepting...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled()

    expect(resolveAccept).not.toBeNull()
    resolveAccept!({ error: null, redirectTo: '/dashboard/journals/journal-1' })

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard/journals/journal-1')
    })
  })

  it('shows Declining... while decline action is in flight', async () => {
    const user = userEvent.setup()
    let resolveDecline: ((value: { error: null, success: true }) => void) | null = null
    const acceptAction = vi.fn(async () => ({ error: null, redirectTo: '/dashboard/journals/journal-1' }))
    const declineAction = vi.fn(
      () =>
        new Promise<{ error: null, success: true }>((resolve) => {
          resolveDecline = resolve
        }),
    )

    render(
      <PendingInvitationRow
        invitation={buildInvitation({ inviteToken: 'invite-token' })}
        acceptAction={acceptAction}
        declineAction={declineAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Decline' }))

    expect(screen.getByRole('button', { name: 'Declining...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled()

    expect(resolveDecline).not.toBeNull()
    resolveDecline!({ error: null, success: true })

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled()
    })
  })
})
