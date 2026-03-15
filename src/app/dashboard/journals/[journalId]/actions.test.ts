import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getClerkCurrentUserMock,
  createEntryWithUploadedImagesForJournalMock,
  createJournalInvitationMock,
  updateJournalTitleForOwnerMock,
  setInvitationEmailDeliveryFlagMock,
  delMock,
  getCurrentAppUserMock,
  getUserJournalByIdMock,
  sendInviteEmailMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  getClerkCurrentUserMock: vi.fn(),
  createEntryWithUploadedImagesForJournalMock: vi.fn(),
  createJournalInvitationMock: vi.fn(),
  updateJournalTitleForOwnerMock: vi.fn(),
  setInvitationEmailDeliveryFlagMock: vi.fn(),
  delMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
  getUserJournalByIdMock: vi.fn(),
  sendInviteEmailMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: getClerkCurrentUserMock,
}))

vi.mock('@vercel/blob', () => ({
  del: delMock,
}))

vi.mock('@/data/entries', () => ({
  createEntryWithUploadedImagesForJournal: createEntryWithUploadedImagesForJournalMock,
}))

vi.mock('@/data/invitations', () => ({
  createJournalInvitation: createJournalInvitationMock,
  setInvitationEmailDeliveryFlag: setInvitationEmailDeliveryFlagMock,
}))

vi.mock('@/data/journals', () => ({
  getUserJournalById: getUserJournalByIdMock,
  updateJournalTitleForOwner: updateJournalTitleForOwnerMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/lib/invitations/send-invite-email', () => ({
  sendInviteEmail: sendInviteEmailMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

import {
  cleanupEntryImageUploadsAction,
  createEntryAction,
  createInviteAction,
  updateJournalTitleAction,
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
    expect(createEntryWithUploadedImagesForJournalMock).not.toHaveBeenCalled()
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
    expect(createEntryWithUploadedImagesForJournalMock).not.toHaveBeenCalled()
  })

  it('returns a permission error when the data helper rejects the mutation', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createEntryWithUploadedImagesForJournalMock.mockResolvedValue(null)

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
    createEntryWithUploadedImagesForJournalMock.mockResolvedValue({ id: 'entry-1' })

    const result = await createEntryAction({
      journalId: '  journal-1  ',
      title: '  Morning Reflection  ',
      content: '  Wrote about priorities for today.  ',
      entryDate: '2026-03-14',
    })

    expect(createEntryWithUploadedImagesForJournalMock).toHaveBeenCalledWith({
      userId: 'user-1',
      journalId: 'journal-1',
      title: 'Morning Reflection',
      content: 'Wrote about priorities for today.',
      entryDate: '2026-03-14',
      uploadedImages: [],
    })
    expect(result).toEqual({
      error: null,
      redirectTo: '/dashboard/journals/journal-1',
    })
  })

  it('passes null title when the trimmed title is empty', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createEntryWithUploadedImagesForJournalMock.mockResolvedValue({ id: 'entry-1' })

    await createEntryAction({
      journalId: 'journal-1',
      title: '   ',
      content: 'Notes',
      entryDate: '2026-03-14',
    })

    expect(createEntryWithUploadedImagesForJournalMock).toHaveBeenCalledWith({
      userId: 'user-1',
      journalId: 'journal-1',
      title: null,
      content: 'Notes',
      entryDate: '2026-03-14',
      uploadedImages: [],
    })
  })

  it('rejects uploaded image paths that do not belong to the journal', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const result = await createEntryAction({
      journalId: 'journal-1',
      title: 'Morning Reflection',
      content: 'Notes',
      entryDate: '2026-03-14',
      uploadedImages: [
        {
          tempStorageKey: 'tmp/journals/journal-2/wrong.jpg',
          fileName: 'wrong.jpg',
          mimeType: 'image/jpeg',
          width: 1024,
          height: 768,
        },
      ],
    })

    expect(result).toEqual({
      error: 'One or more uploaded images are invalid for this journal.',
      redirectTo: null,
    })
    expect(createEntryWithUploadedImagesForJournalMock).not.toHaveBeenCalled()
  })
})

describe('cleanupEntryImageUploadsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an auth error when the user is signed out', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await cleanupEntryImageUploadsAction({
      journalId: 'journal-1',
      storageKeys: ['tmp/journals/journal-1/image.jpg'],
    })

    expect(result).toEqual({
      error: 'You must be signed in to remove uploaded images.',
    })
  })

  it('returns a permission error when the journal is not accessible', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getUserJournalByIdMock.mockResolvedValue(null)

    const result = await cleanupEntryImageUploadsAction({
      journalId: 'journal-1',
      storageKeys: ['tmp/journals/journal-1/image.jpg'],
    })

    expect(result).toEqual({
      error: 'You do not have permission to remove uploaded images for this journal.',
    })
  })

  it('removes uploaded temp images when input is valid', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getUserJournalByIdMock.mockResolvedValue({ id: 'journal-1' })

    const result = await cleanupEntryImageUploadsAction({
      journalId: 'journal-1',
      storageKeys: ['tmp/journals/journal-1/image.jpg'],
    })

    expect(delMock).toHaveBeenCalledWith(['tmp/journals/journal-1/image.jpg'])
    expect(result).toEqual({ error: null })
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

describe('updateJournalTitleAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an auth error when the user is signed out', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await updateJournalTitleAction({
      journalId: 'journal-1',
      title: 'New title',
    })

    expect(result).toEqual({
      error: 'You must be signed in to update this journal.',
    })
    expect(updateJournalTitleForOwnerMock).not.toHaveBeenCalled()
  })

  it('validates the title before calling the data helper', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const result = await updateJournalTitleAction({
      journalId: 'journal-1',
      title: '   ',
    })

    expect(result).toEqual({
      error: 'Title is required.',
    })
    expect(updateJournalTitleForOwnerMock).not.toHaveBeenCalled()
  })

  it('returns a permission error when the data helper rejects the update', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    updateJournalTitleForOwnerMock.mockResolvedValue(false)

    const result = await updateJournalTitleAction({
      journalId: 'journal-1',
      title: 'New title',
    })

    expect(result).toEqual({
      error: 'You do not have permission to update this journal.',
    })
  })

  it('trims inputs and revalidates the journal page on success', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    updateJournalTitleForOwnerMock.mockResolvedValue(true)

    const result = await updateJournalTitleAction({
      journalId: '  journal-1  ',
      title: '  Fresh title  ',
    })

    expect(updateJournalTitleForOwnerMock).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      journalId: 'journal-1',
      title: 'Fresh title',
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard/journals/journal-1')
    expect(result).toEqual({
      error: null,
    })
  })
})
