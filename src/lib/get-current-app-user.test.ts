import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, currentUserMock, upsertUserByClerkUserIdMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  currentUserMock: vi.fn(),
  upsertUserByClerkUserIdMock: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
  currentUser: currentUserMock,
}))

vi.mock('@/data/users', () => ({
  upsertUserByClerkUserId: upsertUserByClerkUserIdMock,
}))

import { getCurrentAppUser } from '@/lib/get-current-app-user'

describe('getCurrentAppUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when auth has no user id', async () => {
    authMock.mockResolvedValue({ userId: null })

    const result = await getCurrentAppUser()

    expect(result).toBeNull()
    expect(currentUserMock).not.toHaveBeenCalled()
    expect(upsertUserByClerkUserIdMock).not.toHaveBeenCalled()
  })

  it('upserts with only clerkUserId when auth user exists but currentUser is null', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' })
    currentUserMock.mockResolvedValue(null)
    upsertUserByClerkUserIdMock.mockResolvedValue({ id: 'app-user-1' })

    const result = await getCurrentAppUser()

    expect(upsertUserByClerkUserIdMock).toHaveBeenCalledWith({
      clerkUserId: 'clerk_123',
    })
    expect(result).toEqual({ id: 'app-user-1' })
  })

  it('uses fullName when available', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' })
    currentUserMock.mockResolvedValue({
      fullName: 'Pat Smith',
      username: 'pat',
      imageUrl: 'https://example.com/pat.png',
    })
    upsertUserByClerkUserIdMock.mockResolvedValue({ id: 'app-user-1' })

    await getCurrentAppUser()

    expect(upsertUserByClerkUserIdMock).toHaveBeenCalledWith({
      clerkUserId: 'clerk_123',
      displayName: 'Pat Smith',
      imageUrl: 'https://example.com/pat.png',
    })
  })

  it('falls back to username when fullName is missing', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' })
    currentUserMock.mockResolvedValue({
      fullName: null,
      username: 'pat_user',
      imageUrl: 'https://example.com/pat.png',
    })
    upsertUserByClerkUserIdMock.mockResolvedValue({ id: 'app-user-1' })

    await getCurrentAppUser()

    expect(upsertUserByClerkUserIdMock).toHaveBeenCalledWith({
      clerkUserId: 'clerk_123',
      displayName: 'pat_user',
      imageUrl: 'https://example.com/pat.png',
    })
  })

  it('uses null displayName and null imageUrl when both are missing', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' })
    currentUserMock.mockResolvedValue({
      fullName: null,
      username: null,
      imageUrl: null,
    })
    upsertUserByClerkUserIdMock.mockResolvedValue({ id: 'app-user-1' })

    await getCurrentAppUser()

    expect(upsertUserByClerkUserIdMock).toHaveBeenCalledWith({
      clerkUserId: 'clerk_123',
      displayName: null,
      imageUrl: null,
    })
  })
})
