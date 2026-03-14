import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createJournalForOwnerMock, getCurrentAppUserMock } = vi.hoisted(() => ({
  createJournalForOwnerMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
}))

vi.mock('@/data/journals', () => ({
  createJournalForOwner: createJournalForOwnerMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

import { createJournalAction } from '@/app/dashboard/actions'

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