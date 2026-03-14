import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createJournalForOwnerMock,
  deleteJournalOwnedByUserMock,
  getCurrentAppUserMock,
} = vi.hoisted(() => ({
  createJournalForOwnerMock: vi.fn(),
  deleteJournalOwnedByUserMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
}))

vi.mock('@/data/journals', () => ({
  createJournalForOwner: createJournalForOwnerMock,
  deleteJournalOwnedByUser: deleteJournalOwnedByUserMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

import { createJournalAction, deleteJournalAction } from '@/app/dashboard/actions'

describe('createJournalAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an auth error when no app user exists', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await createJournalAction({
      title: 'Trip Notes',
      description: 'Weekend plans',
    })

    expect(result).toEqual({
      error: 'You must be signed in to create a journal.',
      redirectTo: null,
    })
    expect(createJournalForOwnerMock).not.toHaveBeenCalled()
  })

  it('validates required title before calling the data helper', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const result = await createJournalAction({
      title: '   ',
      description: 'Weekend plans',
    })

    expect(result).toEqual({
      error: 'Title is required.',
      redirectTo: null,
    })
    expect(createJournalForOwnerMock).not.toHaveBeenCalled()
  })

  it('trims input values and returns the journal redirect path on success', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createJournalForOwnerMock.mockResolvedValue({ id: 'journal-1' })

    const result = await createJournalAction({
      title: '  Trip Notes  ',
      description: '  Weekend plans and entries.  ',
    })

    expect(createJournalForOwnerMock).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      title: 'Trip Notes',
      description: 'Weekend plans and entries.',
    })
    expect(result).toEqual({
      error: null,
      redirectTo: '/dashboard/journals/journal-1',
    })
  })

  it('passes null description when the trimmed value is empty', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    createJournalForOwnerMock.mockResolvedValue({ id: 'journal-1' })

    await createJournalAction({
      title: 'Trip Notes',
      description: '   ',
    })

    expect(createJournalForOwnerMock).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      title: 'Trip Notes',
      description: null,
    })
  })
})

describe('deleteJournalAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an auth error when no app user exists', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await deleteJournalAction({
      journalId: 'f0cd7f58-022f-44c2-963b-9aaf33dd5f2d',
    })

    expect(result).toEqual({
      error: 'You must be signed in to delete a journal.',
      success: false,
    })
    expect(deleteJournalOwnedByUserMock).not.toHaveBeenCalled()
  })

  it('validates journal id before calling the data helper', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const result = await deleteJournalAction({
      journalId: 'not-a-uuid',
    })

    expect(result).toEqual({
      error: 'Invalid journal id.',
      success: false,
    })
    expect(deleteJournalOwnedByUserMock).not.toHaveBeenCalled()
  })

  it('returns a permission error when no journal is deleted', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    deleteJournalOwnedByUserMock.mockResolvedValue(false)

    const result = await deleteJournalAction({
      journalId: 'f0cd7f58-022f-44c2-963b-9aaf33dd5f2d',
    })

    expect(deleteJournalOwnedByUserMock).toHaveBeenCalledWith({
      userId: 'user-1',
      journalId: 'f0cd7f58-022f-44c2-963b-9aaf33dd5f2d',
    })
    expect(result).toEqual({
      error: 'Journal not found or you do not have permission to delete it.',
      success: false,
    })
  })

  it('returns success when owner journal is deleted', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    deleteJournalOwnedByUserMock.mockResolvedValue(true)

    const result = await deleteJournalAction({
      journalId: 'f0cd7f58-022f-44c2-963b-9aaf33dd5f2d',
    })

    expect(result).toEqual({
      error: null,
      success: true,
    })
  })
})