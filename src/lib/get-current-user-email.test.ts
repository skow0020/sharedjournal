import { beforeEach, describe, expect, it, vi } from 'vitest'

const { currentUserMock, normalizeEmailMock } = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  normalizeEmailMock: vi.fn((value: string) => value.trim().toLowerCase()),
}))

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: currentUserMock,
}))

vi.mock('@/data/invitations', () => ({
  normalizeEmail: normalizeEmailMock,
}))

import { getCurrentUserEmail } from '@/lib/get-current-user-email'

describe('getCurrentUserEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when user is not signed in', async () => {
    currentUserMock.mockResolvedValue(null)

    const result = await getCurrentUserEmail()

    expect(result).toBeNull()
    expect(normalizeEmailMock).not.toHaveBeenCalled()
  })

  it('returns normalized primary email when primaryEmailAddressId exists', async () => {
    currentUserMock.mockResolvedValue({
      primaryEmailAddressId: 'email-2',
      emailAddresses: [
        { id: 'email-1', emailAddress: 'other@example.com' },
        { id: 'email-2', emailAddress: '  USER@Example.com  ' },
      ],
    })

    const result = await getCurrentUserEmail()

    expect(normalizeEmailMock).toHaveBeenCalledWith('  USER@Example.com  ')
    expect(result).toBe('user@example.com')
  })

  it('falls back to first email when primary id is missing', async () => {
    currentUserMock.mockResolvedValue({
      primaryEmailAddressId: 'missing-id',
      emailAddresses: [
        { id: 'email-1', emailAddress: 'first@example.com' },
        { id: 'email-2', emailAddress: 'second@example.com' },
      ],
    })

    const result = await getCurrentUserEmail()

    expect(normalizeEmailMock).toHaveBeenCalledWith('first@example.com')
    expect(result).toBe('first@example.com')
  })

  it('returns null when selected email has no emailAddress', async () => {
    currentUserMock.mockResolvedValue({
      primaryEmailAddressId: 'email-1',
      emailAddresses: [{ id: 'email-1', emailAddress: '' }],
    })

    const result = await getCurrentUserEmail()

    expect(result).toBeNull()
    expect(normalizeEmailMock).not.toHaveBeenCalled()
  })

  it('returns null when user has no email addresses', async () => {
    currentUserMock.mockResolvedValue({
      primaryEmailAddressId: null,
      emailAddresses: [],
    })

    const result = await getCurrentUserEmail()

    expect(result).toBeNull()
    expect(normalizeEmailMock).not.toHaveBeenCalled()
  })
})
