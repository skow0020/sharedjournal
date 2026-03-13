import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db'
import { users } from '@/db/schema'
import { getUserByClerkUserId, upsertUserByClerkUserId } from '@/data/users'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUser(overrides?: {
  clerkUserId?: string
  displayName?: string | null
  imageUrl?: string | null
}) {
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: overrides?.clerkUserId ?? `test_${crypto.randomUUID()}`,
      displayName: overrides?.displayName ?? 'Test User',
      imageUrl: overrides?.imageUrl ?? null,
    })
    .returning({ id: users.id, clerkUserId: users.clerkUserId })

  return user
}

async function deleteUsers(ids: string[]) {
  const uniqueIds = [...new Set(ids)]

  for (const id of uniqueIds) {
    await db.delete(users).where(eq(users.id, id))
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getUserByClerkUserId', () => {
  const createdUserIds: string[] = []

  beforeEach(() => {
    createdUserIds.length = 0
  })

  afterEach(async () => {
    await deleteUsers(createdUserIds)
  })

  it('returns a user id when the user exists', async () => {
    const created = await createUser({ clerkUserId: `clerk_${crypto.randomUUID()}` })
    createdUserIds.push(created.id)

    const result = await getUserByClerkUserId(created.clerkUserId)

    expect(result).toEqual({ id: created.id })
  })

  it('returns undefined when the user does not exist', async () => {
    const result = await getUserByClerkUserId(`missing_${crypto.randomUUID()}`)

    expect(result).toBeUndefined()
  })
})

describe('upsertUserByClerkUserId', () => {
  const createdUserIds: string[] = []

  beforeEach(() => {
    createdUserIds.length = 0
  })

  afterEach(async () => {
    await deleteUsers(createdUserIds)
  })

  it('inserts a new user when no profile fields are provided', async () => {
    const clerkUserId = `clerk_${crypto.randomUUID()}`

    const result = await upsertUserByClerkUserId({ clerkUserId })
    createdUserIds.push(result.id)

    expect(result.id).toBeDefined()

    const [row] = await db
      .select({
        clerkUserId: users.clerkUserId,
        displayName: users.displayName,
        imageUrl: users.imageUrl,
      })
      .from(users)
      .where(eq(users.id, result.id))

    expect(row.clerkUserId).toBe(clerkUserId)
    expect(row.displayName).toBeNull()
    expect(row.imageUrl).toBeNull()
  })

  it('returns the existing user when called again with the same clerk id and no profile fields', async () => {
    const clerkUserId = `clerk_${crypto.randomUUID()}`

    const first = await upsertUserByClerkUserId({ clerkUserId })
    const second = await upsertUserByClerkUserId({ clerkUserId })
    createdUserIds.push(first.id)

    expect(second.id).toBe(first.id)

    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))

    expect(rows).toHaveLength(1)
  })

  it('inserts a new user with profile fields when provided', async () => {
    const clerkUserId = `clerk_${crypto.randomUUID()}`

    const result = await upsertUserByClerkUserId({
      clerkUserId,
      displayName: 'Alice',
      imageUrl: 'https://example.com/alice.png',
    })
    createdUserIds.push(result.id)

    const [row] = await db
      .select({ displayName: users.displayName, imageUrl: users.imageUrl })
      .from(users)
      .where(eq(users.id, result.id))

    expect(row.displayName).toBe('Alice')
    expect(row.imageUrl).toBe('https://example.com/alice.png')
  })

  it('updates an existing user when profile fields are provided', async () => {
    const clerkUserId = `clerk_${crypto.randomUUID()}`

    const inserted = await createUser({
      clerkUserId,
      displayName: 'Before',
      imageUrl: 'https://example.com/before.png',
    })
    createdUserIds.push(inserted.id)

    const result = await upsertUserByClerkUserId({
      clerkUserId,
      displayName: 'After',
      imageUrl: 'https://example.com/after.png',
    })

    expect(result.id).toBe(inserted.id)

    const [row] = await db
      .select({ displayName: users.displayName, imageUrl: users.imageUrl })
      .from(users)
      .where(eq(users.id, inserted.id))

    expect(row.displayName).toBe('After')
    expect(row.imageUrl).toBe('https://example.com/after.png')
  })

  it('supports clearing profile fields to null', async () => {
    const clerkUserId = `clerk_${crypto.randomUUID()}`

    const inserted = await createUser({
      clerkUserId,
      displayName: 'To Clear',
      imageUrl: 'https://example.com/to-clear.png',
    })
    createdUserIds.push(inserted.id)

    await upsertUserByClerkUserId({
      clerkUserId,
      displayName: null,
      imageUrl: null,
    })

    const [row] = await db
      .select({ displayName: users.displayName, imageUrl: users.imageUrl })
      .from(users)
      .where(eq(users.id, inserted.id))

    expect(row.displayName).toBeNull()
    expect(row.imageUrl).toBeNull()
  })
})
