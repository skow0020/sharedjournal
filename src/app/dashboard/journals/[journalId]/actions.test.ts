import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getClerkCurrentUserMock,
  createEntryWithUploadedImagesForJournalMock,
  createEntryCommentMock,
  deleteEntryForJournalMock,
  createJournalInvitationMock,
  updateJournalDetailsForOwnerMock,
  setInvitationEmailDeliveryFlagMock,
  delMock,
  getCurrentAppUserMock,
  getUserJournalByIdMock,
  sendInviteEmailMock,
  revalidatePathMock,
  headersMock,
} = vi.hoisted(() => ({
  getClerkCurrentUserMock: vi.fn(),
  createEntryWithUploadedImagesForJournalMock: vi.fn(),
  createEntryCommentMock: vi.fn(),
  deleteEntryForJournalMock: vi.fn(),
  createJournalInvitationMock: vi.fn(),
  updateJournalDetailsForOwnerMock: vi.fn(),
  setInvitationEmailDeliveryFlagMock: vi.fn(),
  delMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
  getUserJournalByIdMock: vi.fn(),
  sendInviteEmailMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  headersMock: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: getClerkCurrentUserMock,
}))

vi.mock('@vercel/blob', () => ({
  del: delMock,
}))

vi.mock('@/data/entries', () => ({
  createEntryWithUploadedImagesForJournal: createEntryWithUploadedImagesForJournalMock,
  deleteEntryForJournal: deleteEntryForJournalMock,
}))

vi.mock('@/data/comments', () => ({
  createEntryComment: createEntryCommentMock,
}))

vi.mock('@/data/invitations', () => ({
  createJournalInvitation: createJournalInvitationMock,
  setInvitationEmailDeliveryFlag: setInvitationEmailDeliveryFlagMock,
}))

vi.mock('@/data/journals', () => ({
  getUserJournalById: getUserJournalByIdMock,
  updateJournalDetailsForOwner: updateJournalDetailsForOwnerMock,
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

vi.mock('next/headers', () => ({
  headers: headersMock,
}))

import {
  addCommentAction,
  cleanupEntryImageUploadsAction,
  createEntryAction,
  createInviteAction,
  deleteEntryAction,
  updateJournalDetailsAction,
} from '@/app/dashboard/journals/[journalId]/actions'

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
const originalServerAppUrl = process.env.APP_URL
const originalVercelUrl = process.env.VERCEL_URL
const originalVercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
const VALID_JOURNAL_ID = '4f687c5a-6576-4e05-a0f8-e4cdfdebe295'
const VALID_ENTRY_ID = '26a0908b-c293-43f5-94c0-9b5d53fcc592'

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

describe('deleteEntryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an auth error when the user is signed out', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await deleteEntryAction({
      journalId: '4f687c5a-6576-4e05-a0f8-e4cdfdebe295',
      entryId: '26a0908b-c293-43f5-94c0-9b5d53fcc592',
    })

    expect(result).toEqual({
      error: 'You must be signed in to delete an entry.',
      success: false,
    })
    expect(deleteEntryForJournalMock).not.toHaveBeenCalled()
  })

  it('validates the payload before deleting an entry', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const result = await deleteEntryAction({
      journalId: 'journal-1',
      entryId: 'entry-1',
    })

    expect(result).toEqual({
      error: 'Invalid journal id.',
      success: false,
    })
    expect(deleteEntryForJournalMock).not.toHaveBeenCalled()
  })

  it('returns a permission error when the data helper rejects the deletion', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    deleteEntryForJournalMock.mockResolvedValue(false)

    const result = await deleteEntryAction({
      journalId: '4f687c5a-6576-4e05-a0f8-e4cdfdebe295',
      entryId: '26a0908b-c293-43f5-94c0-9b5d53fcc592',
    })

    expect(deleteEntryForJournalMock).toHaveBeenCalledWith({
      userId: 'user-1',
      journalId: '4f687c5a-6576-4e05-a0f8-e4cdfdebe295',
      entryId: '26a0908b-c293-43f5-94c0-9b5d53fcc592',
    })
    expect(result).toEqual({
      error: 'Entry not found or you do not have permission to delete it.',
      success: false,
    })
  })

  it('revalidates the journal page when deletion succeeds', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    deleteEntryForJournalMock.mockResolvedValue(true)

    const result = await deleteEntryAction({
      journalId: '4f687c5a-6576-4e05-a0f8-e4cdfdebe295',
      entryId: '26a0908b-c293-43f5-94c0-9b5d53fcc592',
    })

    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard/journals/4f687c5a-6576-4e05-a0f8-e4cdfdebe295')
    expect(result).toEqual({
      error: null,
      success: true,
    })
  })
})

describe('createInviteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://sharedjournal.test'
    delete process.env.APP_URL
    delete process.env.VERCEL_URL
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL
    headersMock.mockResolvedValue(new Headers())
  })

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    }

    if (originalServerAppUrl === undefined) {
      delete process.env.APP_URL
    } else {
      process.env.APP_URL = originalServerAppUrl
    }

    if (originalVercelUrl === undefined) {
      delete process.env.VERCEL_URL
    } else {
      process.env.VERCEL_URL = originalVercelUrl
    }

    if (originalVercelProductionUrl === undefined) {
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL
    } else {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = originalVercelProductionUrl
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

  it('builds the invite link from the request host when app url is not configured', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    headersMock.mockResolvedValue(
      new Headers({
        'x-forwarded-host': 'preview.sharedjournal.app',
        'x-forwarded-proto': 'https',
      }),
    )
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
      delivered: false,
      provider: 'none',
      message: 'Invite email provider is not configured.',
    })

    const result = await createInviteAction({
      journalId: 'journal-1',
      journalTitle: 'Family Journal',
      email: 'friend@example.com',
    })

    expect(sendInviteEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteLink: 'https://preview.sharedjournal.app/invitations/token-123',
      }),
    )
    expect(result).toEqual({
      error: null,
      successMessage: 'Invitation created for friend@example.com. Copy the link below to share.',
      inviteLink: 'https://preview.sharedjournal.app/invitations/token-123',
    })
  })

  it('uses the first forwarded host and protocol when headers contain proxy lists', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    headersMock.mockResolvedValue(
      new Headers({
        'x-forwarded-host': 'preview.sharedjournal.app, internal.proxy.local',
        'x-forwarded-proto': 'https, http',
      }),
    )
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
      delivered: false,
      provider: 'none',
      message: 'Invite email provider is not configured.',
    })

    const result = await createInviteAction({
      journalId: 'journal-1',
      journalTitle: 'Family Journal',
      email: 'friend@example.com',
    })

    expect(result).toEqual({
      error: null,
      successMessage: 'Invitation created for friend@example.com. Copy the link below to share.',
      inviteLink: 'https://preview.sharedjournal.app/invitations/token-123',
    })
  })

  it('builds the invite link from vercel env when no app url or request host is available', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    process.env.VERCEL_URL = 'sharedjournal-preview.vercel.app'
    headersMock.mockResolvedValue(new Headers())
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
      delivered: false,
      provider: 'none',
      message: 'Invite email provider is not configured.',
    })

    const result = await createInviteAction({
      journalId: 'journal-1',
      journalTitle: 'Family Journal',
      email: 'friend@example.com',
    })

    expect(result).toEqual({
      error: null,
      successMessage: 'Invitation created for friend@example.com. Copy the link below to share.',
      inviteLink: 'https://sharedjournal-preview.vercel.app/invitations/token-123',
    })
  })
})

describe('addCommentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an auth error when the user is signed out', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await addCommentAction({
      journalId: VALID_JOURNAL_ID,
      entryId: VALID_ENTRY_ID,
      content: 'Looks good.',
    })

    expect(result).toEqual({
      error: 'You must be signed in to comment.',
      success: false,
    })
    expect(createEntryCommentMock).not.toHaveBeenCalled()
  })

  it('validates input before calling the data helper', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const result = await addCommentAction({
      journalId: 'journal-1',
      entryId: VALID_ENTRY_ID,
      content: 'Looks good.',
    })

    expect(result).toEqual({
      error: 'Invalid journal id.',
      success: false,
    })
    expect(createEntryCommentMock).not.toHaveBeenCalled()
  })

  it('returns a permission error when comment creation is rejected', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createEntryCommentMock.mockResolvedValue(null)

    const result = await addCommentAction({
      journalId: VALID_JOURNAL_ID,
      entryId: VALID_ENTRY_ID,
      content: 'Looks good.',
    })

    expect(createEntryCommentMock).toHaveBeenCalledWith({
      entryId: VALID_ENTRY_ID,
      authorUserId: 'user-1',
      content: 'Looks good.',
    })
    expect(result).toEqual({
      error: 'You do not have permission to comment on this entry.',
      success: false,
    })
  })

  it('creates a comment and revalidates the journal page on success', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createEntryCommentMock.mockResolvedValue({ id: 'comment-1' })

    const result = await addCommentAction({
      journalId: VALID_JOURNAL_ID,
      entryId: VALID_ENTRY_ID,
      content: '  Great entry!  ',
    })

    expect(createEntryCommentMock).toHaveBeenCalledWith({
      entryId: VALID_ENTRY_ID,
      authorUserId: 'user-1',
      content: 'Great entry!',
    })
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/journals/${VALID_JOURNAL_ID}`)
    expect(result).toEqual({
      error: null,
      success: true,
    })
  })
})

describe('updateJournalDetailsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an auth error when the user is signed out', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await updateJournalDetailsAction({
      journalId: 'journal-1',
      title: 'New title',
      description: 'New description',
    })

    expect(result).toEqual({
      error: 'You must be signed in to update this journal.',
    })
    expect(updateJournalDetailsForOwnerMock).not.toHaveBeenCalled()
  })

  it('validates the title before calling the data helper', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const result = await updateJournalDetailsAction({
      journalId: 'journal-1',
      title: '   ',
      description: 'New description',
    })

    expect(result).toEqual({
      error: 'Title is required.',
    })
    expect(updateJournalDetailsForOwnerMock).not.toHaveBeenCalled()
  })

  it('validates description length before calling the data helper', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const result = await updateJournalDetailsAction({
      journalId: 'journal-1',
      title: 'New title',
      description: 'x'.repeat(2001),
    })

    expect(result).toEqual({
      error: 'Description must be 2000 characters or less.',
    })
    expect(updateJournalDetailsForOwnerMock).not.toHaveBeenCalled()
  })

  it('returns a permission error when the data helper rejects the update', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    updateJournalDetailsForOwnerMock.mockResolvedValue(false)

    const result = await updateJournalDetailsAction({
      journalId: 'journal-1',
      title: 'New title',
      description: 'New description',
    })

    expect(result).toEqual({
      error: 'You do not have permission to update this journal.',
    })
  })

  it('trims inputs and revalidates the journal page on success', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    updateJournalDetailsForOwnerMock.mockResolvedValue(true)

    const result = await updateJournalDetailsAction({
      journalId: '  journal-1  ',
      title: '  Fresh title  ',
      description: '  Updated description  ',
    })

    expect(updateJournalDetailsForOwnerMock).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      journalId: 'journal-1',
      title: 'Fresh title',
      description: 'Updated description',
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard/journals/journal-1')
    expect(result).toEqual({
      error: null,
    })
  })
})
