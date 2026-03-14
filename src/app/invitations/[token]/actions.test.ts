import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  acceptJournalInvitationMock,
  declineJournalInvitationMock,
  getCurrentAppUserMock,
  getCurrentUserEmailMock,
} = vi.hoisted(() => ({
  acceptJournalInvitationMock: vi.fn(),
  declineJournalInvitationMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
  getCurrentUserEmailMock: vi.fn(),
}))

vi.mock('@/data/invitations', () => ({
  acceptJournalInvitation: acceptJournalInvitationMock,
  declineJournalInvitation: declineJournalInvitationMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/lib/get-current-user-email', () => ({
  getCurrentUserEmail: getCurrentUserEmailMock,
}))

import {
  acceptInvitationAction,
  declineInvitationAction,
} from '@/app/invitations/[token]/actions'

describe('acceptInvitationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to dashboard when the token payload is invalid', async () => {
    const result = await acceptInvitationAction({ token: '   ' })

    expect(result).toEqual({
      redirectTo: '/dashboard',
    })
    expect(getCurrentAppUserMock).not.toHaveBeenCalled()
    expect(acceptJournalInvitationMock).not.toHaveBeenCalled()
  })

  it('redirects back to the invitation when auth context is missing', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)
    getCurrentUserEmailMock.mockResolvedValue('invitee@example.com')

    const result = await acceptInvitationAction({ token: 'invite-token' })

    expect(result).toEqual({
      redirectTo: '/invitations/invite-token',
    })
    expect(acceptJournalInvitationMock).not.toHaveBeenCalled()
  })

  it('redirects back to the invitation when accept fails', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getCurrentUserEmailMock.mockResolvedValue('invitee@example.com')
    acceptJournalInvitationMock.mockResolvedValue({
      ok: false,
      error: 'EMAIL_MISMATCH',
      message: 'You must sign in with the invited email address to accept this invitation.',
    })

    const result = await acceptInvitationAction({ token: 'invite-token' })

    expect(acceptJournalInvitationMock).toHaveBeenCalledWith({
      token: 'invite-token',
      acceptingUserId: 'user-1',
      acceptingEmail: 'invitee@example.com',
    })
    expect(result).toEqual({
      redirectTo: '/invitations/invite-token',
    })
  })

  it('redirects to the journal when acceptance succeeds', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getCurrentUserEmailMock.mockResolvedValue('invitee@example.com')
    acceptJournalInvitationMock.mockResolvedValue({
      ok: true,
      journalId: 'journal-1',
    })

    const result = await acceptInvitationAction({ token: 'invite-token' })

    expect(result).toEqual({
      redirectTo: '/dashboard/journals/journal-1',
    })
  })
})

describe('declineInvitationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to dashboard when the token payload is invalid', async () => {
    const result = await declineInvitationAction({ token: '   ' })

    expect(result).toEqual({
      redirectTo: '/dashboard',
    })
    expect(getCurrentUserEmailMock).not.toHaveBeenCalled()
    expect(declineJournalInvitationMock).not.toHaveBeenCalled()
  })

  it('redirects back to the invitation when the user email is missing', async () => {
    getCurrentUserEmailMock.mockResolvedValue(null)

    const result = await declineInvitationAction({ token: 'invite-token' })

    expect(result).toEqual({
      redirectTo: '/invitations/invite-token',
    })
    expect(declineJournalInvitationMock).not.toHaveBeenCalled()
  })

  it('calls the decline helper and redirects to dashboard on success', async () => {
    getCurrentUserEmailMock.mockResolvedValue('invitee@example.com')
    declineJournalInvitationMock.mockResolvedValue({
      ok: true,
    })

    const result = await declineInvitationAction({ token: 'invite-token' })

    expect(declineJournalInvitationMock).toHaveBeenCalledWith({
      token: 'invite-token',
      decliningEmail: 'invitee@example.com',
    })
    expect(result).toEqual({
      redirectTo: '/dashboard',
    })
  })
})