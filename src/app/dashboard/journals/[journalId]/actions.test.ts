import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getClerkCurrentUserMock,
  createEntryForJournalMock,
  createJournalInvitationMock,
  setInvitationEmailDeliveryFlagMock,
  getCurrentAppUserMock,
  sendInviteEmailMock,
} = vi.hoisted(() => ({
  getClerkCurrentUserMock: vi.fn(),
  createEntryForJournalMock: vi.fn(),
  createJournalInvitationMock: vi.fn(),
  setInvitationEmailDeliveryFlagMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
  sendInviteEmailMock: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: getClerkCurrentUserMock,
}))

vi.mock('@/data/entries', () => ({
  createEntryForJournal: createEntryForJournalMock,
}))

vi.mock('@/data/invitations', () => ({
  createJournalInvitation: createJournalInvitationMock,
  setInvitationEmailDeliveryFlag: setInvitationEmailDeliveryFlagMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/lib/invitations/send-invite-email', () => ({
  sendInviteEmail: sendInviteEmailMock,
}))

import {
  createEntryAction,
  createInviteAction,
} from '@/app/dashboard/journals/[journalId]/actions'

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

describe('createEntryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an auth error when the user is signed out', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await createEntryAction({
      journalId: 'journal-1',
      title: 'Morning Reflection',
      content: 'Notes',
      entryDate: '2026-03-14',
    })

    expect(result).toEqual({
      error: 'You must be signed in to create an entry.',
      redirectTo: null,
    })
    expect(createEntryForJournalMock).not.toHaveBeenCalled()
  })

  it('validates payload fields before calling the data helper', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const result = await createEntryAction({
      journalId: 'journal-1',
      title: 'Morning Reflection',
      content: '   ',
      entryDate: '2026/03/14',
    })

    expect(result).toEqual({
      error: 'Content is required.',
      redirectTo: null,
    })
    expect(createEntryForJournalMock).not.toHaveBeenCalled()
  })

  it('returns a permission error when the data helper rejects the mutation', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createEntryForJournalMock.mockResolvedValue(null)

    const result = await createEntryAction({
      journalId: 'journal-1',
      title: 'Morning Reflection',
      content: 'Notes',
      entryDate: '2026-03-14',
    })

    expect(result).toEqual({
      error: 'You do not have permission to add entries to this journal.',
      redirectTo: null,
    })
  })

  it('trims entry values and returns the journal redirect path on success', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createEntryForJournalMock.mockResolvedValue({ id: 'entry-1' })

    const result = await createEntryAction({
      journalId: '  journal-1  ',
      title: '  Morning Reflection  ',
      content: '  Wrote about priorities for today.  ',
      entryDate: '2026-03-14',
    })

    expect(createEntryForJournalMock).toHaveBeenCalledWith({
      userId: 'user-1',
      journalId: 'journal-1',
      title: 'Morning Reflection',
      content: 'Wrote about priorities for today.',
      entryDate: '2026-03-14',
    })
    expect(result).toEqual({
      error: null,
      redirectTo: '/dashboard/journals/journal-1',
    })
  })

  it('passes null title when the trimmed title is empty', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createEntryForJournalMock.mockResolvedValue({ id: 'entry-1' })

    await createEntryAction({
      journalId: 'journal-1',
      title: '   ',
      content: 'Notes',
      entryDate: '2026-03-14',
    })

    expect(createEntryForJournalMock).toHaveBeenCalledWith({
      userId: 'user-1',
      journalId: 'journal-1',
      title: null,
      content: 'Notes',
      entryDate: '2026-03-14',
    })
  })
})

describe('createInviteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://sharedjournal.test'
  })

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    }
  })

  it('returns an auth error when the user is signed out', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await createInviteAction({
      journalId: 'journal-1',
      journalTitle: 'Family Journal',
      email: 'friend@example.com',
    })

    expect(result).toEqual({
      error: 'You must be signed in to invite users.',
      successMessage: null,
      inviteLink: null,
    })
    expect(createJournalInvitationMock).not.toHaveBeenCalled()
  })

  it('validates the email address before calling the data helper', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const result = await createInviteAction({
      journalId: 'journal-1',
      journalTitle: 'Family Journal',
      email: 'not-an-email',
    })

    expect(result).toEqual({
      error: 'Please provide a valid email address.',
      successMessage: null,
      inviteLink: null,
    })
    expect(createJournalInvitationMock).not.toHaveBeenCalled()
  })

  it('returns the helper error when invitation creation fails', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createJournalInvitationMock.mockResolvedValue({
      ok: false,
      error: 'FORBIDDEN',
      message: 'Only journal owners can invite members.',
    })

    const result = await createInviteAction({
      journalId: 'journal-1',
      journalTitle: 'Family Journal',
      email: 'friend@example.com',
    })

    expect(result).toEqual({
      error: 'Only journal owners can invite members.',
      successMessage: null,
      inviteLink: null,
    })
    expect(sendInviteEmailMock).not.toHaveBeenCalled()
  })

  it('creates an invitation, sends email, and records delivery status on success', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createJournalInvitationMock.mockResolvedValue({
      ok: true,
      invitationId: 'inv-1',
      inviteToken: 'token-123',
      inviteeEmail: 'friend@example.com',
      expiresAt: new Date('2026-03-21T00:00:00.000Z'),
    })
    getClerkCurrentUserMock.mockResolvedValue({
      fullName: 'Pat Smith',
      username: 'pat',
    })
    sendInviteEmailMock.mockResolvedValue({
      delivered: true,
      provider: 'resend',
      message: 'Invitation email sent via Resend.',
    })

    const result = await createInviteAction({
      journalId: 'journal-1',
      journalTitle: 'Family Journal',
      email: '  FRIEND@example.com  ',
    })

    expect(createJournalInvitationMock).toHaveBeenCalledWith({
      inviterUserId: 'user-1',
      journalId: 'journal-1',
      inviteeEmail: 'friend@example.com',
    })
    expect(sendInviteEmailMock).toHaveBeenCalledWith({
      toEmail: 'friend@example.com',
      inviteLink: 'https://sharedjournal.test/invitations/token-123',
      journalTitle: 'Family Journal',
      inviterName: 'Pat Smith',
    })
    expect(setInvitationEmailDeliveryFlagMock).toHaveBeenCalledWith({
      invitationId: 'inv-1',
      emailDelivered: true,
    })
    expect(result).toEqual({
      error: null,
      successMessage: 'Invitation sent to friend@example.com.',
      inviteLink: 'https://sharedjournal.test/invitations/token-123',
    })
  })

  it('returns the manual share message when email delivery fails', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createJournalInvitationMock.mockResolvedValue({
      ok: true,
      invitationId: 'inv-1',
      inviteToken: 'token-123',
      inviteeEmail: 'friend@example.com',
      expiresAt: new Date('2026-03-21T00:00:00.000Z'),
    })
    getClerkCurrentUserMock.mockResolvedValue({
      fullName: null,
      username: 'pat',
    })
    sendInviteEmailMock.mockResolvedValue({
      delivered: false,
      provider: 'none',
      message: 'Invite email provider is not configured.',
    })

    const result = await createInviteAction({
      journalId: 'journal-1',
      journalTitle: 'Family Journal',
      email: 'friend@example.com',
    })

    expect(setInvitationEmailDeliveryFlagMock).toHaveBeenCalledWith({
      invitationId: 'inv-1',
      emailDelivered: false,
    })
    expect(result).toEqual({
      error: null,
      successMessage: 'Invitation created for friend@example.com. Copy the link below to share.',
      inviteLink: 'https://sharedjournal.test/invitations/token-123',
    })
  })
})