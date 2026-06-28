import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db'
import { entries, entryPhotos, journalMembers, journals, users } from '@/db/schema'
import {
  createJournalForOwner,
  deleteJournalOwnedByUser,
  getCollaboratorsForJournal,
  getRecentPhotosForJournals,
  getUserJournalById,
  getUserJournalCount,
  getUserJournals,
  updateJournalDetailsForOwner,
  updateJournalTitleForOwner,
} from '@/data/journals'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUser(overrides?: { clerkUserId?: string; displayName?: string }) {
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: overrides?.clerkUserId ?? `test_${crypto.randomUUID()}`,
      displayName: overrides?.displayName ?? 'Test User',
    })
    .returning({ id: users.id })

  return user
}

async function createJournal(
  ownerUserId: string,
  title = 'Test Journal',
  description: string | null = null,
) {
  const [journal] = await db
    .insert(journals)
    .values({ ownerUserId, title, description })
    .returning({ id: journals.id })

  return journal
}

async function addMember(
  journalId: string,
  userId: string,
  role: 'owner' | 'editor' | 'viewer' = 'editor',
) {
  await db.insert(journalMembers).values({ journalId, userId, role })
}

// ---------------------------------------------------------------------------
// Teardown helpers
// ---------------------------------------------------------------------------

async function deleteJournals(ids: string[]) {
  for (const id of ids) {
    await db.delete(journals).where(eq(journals.id, id))
  }
}

async function deleteUsers(ids: string[]) {
  for (const id of ids) {
    await db.delete(users).where(eq(users.id, id))
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getUserJournals', () => {
  let ownerId: string
  let memberId: string
  let outsiderId: string
  let journalId1: string
  let journalId2: string
  const extraJournalIds: string[] = []

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const member = await createUser({ displayName: 'Member' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    memberId = member.id
    outsiderId = outsider.id

    const journal1 = await createJournal(ownerId, 'Journal One')
    const journal2 = await createJournal(ownerId, 'Journal Two')

    journalId1 = journal1.id
    journalId2 = journal2.id

    await addMember(journalId1, ownerId, 'owner')
    await addMember(journalId2, ownerId, 'owner')
    await addMember(journalId1, memberId, 'editor')
  })

  afterEach(async () => {
    await deleteJournals([journalId1, journalId2, ...extraJournalIds])
    extraJournalIds.length = 0
    await deleteUsers([ownerId, memberId, outsiderId])
  })

  it('returns all journals the owner belongs to', async () => {
    const result = await getUserJournals(ownerId)

    const ids = result.map((j) => j.id)
    expect(ids).toContain(journalId1)
    expect(ids).toContain(journalId2)
    expect(result.every((journal) => journal.isOwner)).toBe(true)
  })

  it('returns only journals the member belongs to', async () => {
    const result = await getUserJournals(memberId)

    const ids = result.map((j) => j.id)
    expect(ids).toContain(journalId1)
    expect(ids).not.toContain(journalId2)
    expect(result.every((journal) => !journal.isOwner)).toBe(true)
  })

  it('returns empty array for a user with no memberships', async () => {
    const result = await getUserJournals(outsiderId)

    expect(result).toHaveLength(0)
  })

  it('includes title and description in results', async () => {
    const journalWithDesc = await createJournal(ownerId, 'Described Journal', 'A description.')
    await addMember(journalWithDesc.id, ownerId, 'owner')

    const result = await getUserJournals(ownerId)
    const found = result.find((j) => j.id === journalWithDesc.id)

    expect(found?.title).toBe('Described Journal')
    expect(found?.description).toBe('A description.')

    await deleteJournals([journalWithDesc.id])
  })

  it('supports limit and offset with updated_at ordering', async () => {
    const journal3 = await createJournal(ownerId, 'Journal Three')
    const journal4 = await createJournal(ownerId, 'Journal Four')
    extraJournalIds.push(journal3.id, journal4.id)

    await addMember(journal3.id, ownerId, 'owner')
    await addMember(journal4.id, ownerId, 'owner')

    await db
      .update(journals)
      .set({ updatedAt: new Date('2026-03-01T00:00:00.000Z') })
      .where(eq(journals.id, journalId1))
    await db
      .update(journals)
      .set({ updatedAt: new Date('2026-03-02T00:00:00.000Z') })
      .where(eq(journals.id, journalId2))
    await db
      .update(journals)
      .set({ updatedAt: new Date('2026-03-03T00:00:00.000Z') })
      .where(eq(journals.id, journal3.id))
    await db
      .update(journals)
      .set({ updatedAt: new Date('2026-03-04T00:00:00.000Z') })
      .where(eq(journals.id, journal4.id))

    const pageOne = await getUserJournals(ownerId, { limit: 2, offset: 0 })
    const pageTwo = await getUserJournals(ownerId, { limit: 2, offset: 2 })

    expect(pageOne.map((journal) => journal.id)).toEqual([journal4.id, journal3.id])
    expect(pageTwo.map((journal) => journal.id)).toEqual([journalId2, journalId1])
  })

  it('returns empty results when offset is beyond available rows', async () => {
    const result = await getUserJournals(ownerId, { limit: 5, offset: 50 })

    expect(result).toEqual([])
  })
})

describe('getUserJournalCount', () => {
  let ownerId: string
  let memberId: string
  let outsiderId: string
  let journalId1: string
  let journalId2: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const member = await createUser({ displayName: 'Member' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    memberId = member.id
    outsiderId = outsider.id

    const journal1 = await createJournal(ownerId, 'Count Journal One')
    const journal2 = await createJournal(ownerId, 'Count Journal Two')

    journalId1 = journal1.id
    journalId2 = journal2.id

    await addMember(journalId1, ownerId, 'owner')
    await addMember(journalId2, ownerId, 'owner')
    await addMember(journalId1, memberId, 'editor')
  })

  afterEach(async () => {
    await deleteJournals([journalId1, journalId2])
    await deleteUsers([ownerId, memberId, outsiderId])
  })

  it('returns counts scoped by membership', async () => {
    const ownerCount = await getUserJournalCount(ownerId)
    const memberCount = await getUserJournalCount(memberId)
    const outsiderCount = await getUserJournalCount(outsiderId)

    expect(ownerCount).toBe(2)
    expect(memberCount).toBe(1)
    expect(outsiderCount).toBe(0)
  })
})

describe('deleteJournalOwnedByUser', () => {
  let ownerId: string
  let memberId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const member = await createUser({ displayName: 'Member' })

    ownerId = owner.id
    memberId = member.id

    const journal = await createJournal(ownerId, 'Delete Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
    await addMember(journalId, memberId, 'editor')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, memberId])
  })

  it('deletes a journal when requested by its owner', async () => {
    const deleted = await deleteJournalOwnedByUser({
      userId: ownerId,
      journalId,
    })

    expect(deleted).toBe(true)

    const [journal] = await db
      .select({ id: journals.id })
      .from(journals)
      .where(eq(journals.id, journalId))

    expect(journal).toBeUndefined()
  })

  it('does not delete a journal when requested by a non-owner member', async () => {
    const deleted = await deleteJournalOwnedByUser({
      userId: memberId,
      journalId,
    })

    expect(deleted).toBe(false)

    const [journal] = await db
      .select({ id: journals.id })
      .from(journals)
      .where(eq(journals.id, journalId))

    expect(journal?.id).toBe(journalId)
  })
})

describe('getUserJournalById', () => {
  let ownerId: string
  let outsiderId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    outsiderId = outsider.id

    const journal = await createJournal(ownerId, 'Detail Journal', 'Some details.')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, outsiderId])
  })

  it('returns the journal for a member', async () => {
    const result = await getUserJournalById(ownerId, journalId)

    expect(result).not.toBeNull()
    expect(result?.id).toBe(journalId)
    expect(result?.title).toBe('Detail Journal')
    expect(result?.description).toBe('Some details.')
    expect(result?.isOwner).toBe(true)
  })

  it('returns null for a user who is not a member', async () => {
    const result = await getUserJournalById(outsiderId, journalId)

    expect(result).toBeNull()
  })

  it('returns null for a non-existent journal id', async () => {
    const result = await getUserJournalById(ownerId, crypto.randomUUID())

    expect(result).toBeNull()
  })

  it('returns the journal for an editor member', async () => {
    const editor = await createUser({ displayName: 'Editor' })
    await addMember(journalId, editor.id, 'editor')

    const result = await getUserJournalById(editor.id, journalId)

    expect(result?.id).toBe(journalId)
    expect(result?.isOwner).toBe(false)

    await deleteUsers([editor.id])
  })
})

describe('getCollaboratorsForJournal', () => {
  let ownerId: string
  let editorId: string
  let viewerId: string
  let outsiderId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const editor = await createUser({ displayName: 'Editor' })
    const viewer = await createUser({ displayName: 'Viewer' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    editorId = editor.id
    viewerId = viewer.id
    outsiderId = outsider.id

    const journal = await createJournal(ownerId, 'Collab Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
    await addMember(journalId, editorId, 'editor')
    await addMember(journalId, viewerId, 'viewer')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, editorId, viewerId, outsiderId])
  })

  it('returns non-owner collaborators for a journal member', async () => {
    const result = await getCollaboratorsForJournal(ownerId, journalId)

    const ids = result.map((c) => c.id)
    expect(ids).toContain(editorId)
    expect(ids).toContain(viewerId)
    expect(ids).not.toContain(ownerId)
  })

  it('includes displayName and role in results', async () => {
    const result = await getCollaboratorsForJournal(ownerId, journalId)

    const editor = result.find((c) => c.id === editorId)
    expect(editor?.displayName).toBe('Editor')
    expect(editor?.role).toBe('editor')

    const viewer = result.find((c) => c.id === viewerId)
    expect(viewer?.role).toBe('viewer')
  })

  it('returns empty array for a user who is not a member', async () => {
    const result = await getCollaboratorsForJournal(outsiderId, journalId)

    expect(result).toHaveLength(0)
  })

  it('returns empty array when there are no non-owner collaborators', async () => {
    const soloOwner = await createUser({ displayName: 'Solo Owner' })
    const soloJournal = await createJournal(soloOwner.id, 'Solo Journal')
    await addMember(soloJournal.id, soloOwner.id, 'owner')

    const result = await getCollaboratorsForJournal(soloOwner.id, soloJournal.id)

    expect(result).toHaveLength(0)

    await deleteJournals([soloJournal.id])
    await deleteUsers([soloOwner.id])
  })

  it('is also accessible to a non-owner member', async () => {
    const result = await getCollaboratorsForJournal(editorId, journalId)

    // Editor can see collaborators (access control only checks membership, not role)
    expect(result).not.toHaveLength(0)
  })
})

describe('createJournalForOwner', () => {
  let ownerId: string
  const createdJournalIds: string[] = []

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    ownerId = owner.id
  })

  afterEach(async () => {
    await deleteJournals(createdJournalIds)
    createdJournalIds.length = 0
    await deleteUsers([ownerId])
  })

  it('creates a journal and returns its id', async () => {
    const result = await createJournalForOwner({
      ownerUserId: ownerId,
      title: 'New Journal',
      description: null,
    })

    createdJournalIds.push(result.id)

    expect(result.id).toBeDefined()

    const [row] = await db
      .select({ title: journals.title, ownerUserId: journals.ownerUserId })
      .from(journals)
      .where(eq(journals.id, result.id))

    expect(row.title).toBe('New Journal')
    expect(row.ownerUserId).toBe(ownerId)
  })

  it('creates an owner membership for the creating user', async () => {
    const result = await createJournalForOwner({
      ownerUserId: ownerId,
      title: 'Membership Journal',
      description: null,
    })

    createdJournalIds.push(result.id)

    const [membership] = await db
      .select({ role: journalMembers.role })
      .from(journalMembers)
      .where(eq(journalMembers.journalId, result.id))

    expect(membership.role).toBe('owner')
  })

  it('stores the description when provided', async () => {
    const result = await createJournalForOwner({
      ownerUserId: ownerId,
      title: 'Described Journal',
      description: 'A meaningful description.',
    })

    createdJournalIds.push(result.id)

    const [row] = await db
      .select({ description: journals.description })
      .from(journals)
      .where(eq(journals.id, result.id))

    expect(row.description).toBe('A meaningful description.')
  })

  it('stores null description when none is provided', async () => {
    const result = await createJournalForOwner({
      ownerUserId: ownerId,
      title: 'No Description Journal',
      description: null,
    })

    createdJournalIds.push(result.id)

    const [row] = await db
      .select({ description: journals.description })
      .from(journals)
      .where(eq(journals.id, result.id))

    expect(row.description).toBeNull()
  })
})

describe('updateJournalTitleForOwner', () => {
  let ownerId: string
  let nonOwnerId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const nonOwner = await createUser({ displayName: 'Non-owner' })

    ownerId = owner.id
    nonOwnerId = nonOwner.id

    const { id } = await createJournalForOwner({
      ownerUserId: ownerId,
      title: 'Original Title',
      description: null,
    })

    journalId = id

    // Add non-owner as editor to test access control
    await db.insert(journalMembers).values({
      journalId,
      userId: nonOwnerId,
      role: 'editor',
    })
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, nonOwnerId])
  })

  it('updates journal title when user is the owner', async () => {
    const result = await updateJournalTitleForOwner({
      ownerUserId: ownerId,
      journalId,
      title: 'Updated Title',
    })

    expect(result).toBe(true)

    const [row] = await db
      .select({ title: journals.title })
      .from(journals)
      .where(eq(journals.id, journalId))

    expect(row.title).toBe('Updated Title')
  })

  it('returns false when user is not the owner', async () => {
    const result = await updateJournalTitleForOwner({
      ownerUserId: nonOwnerId,
      journalId,
      title: 'Attempted Title',
    })

    expect(result).toBe(false)

    const [row] = await db
      .select({ title: journals.title })
      .from(journals)
      .where(eq(journals.id, journalId))

    expect(row.title).toBe('Original Title')
  })

  it('returns false for non-existent journal', async () => {
    const fakeJournalId = crypto.randomUUID()

    const result = await updateJournalTitleForOwner({
      ownerUserId: ownerId,
      journalId: fakeJournalId,
      title: 'Never Updated',
    })

    expect(result).toBe(false)
  })
})

describe('updateJournalDetailsForOwner', () => {
  let ownerId: string
  let nonOwnerId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const nonOwner = await createUser({ displayName: 'Non-owner' })

    ownerId = owner.id
    nonOwnerId = nonOwner.id

    const { id } = await createJournalForOwner({
      ownerUserId: ownerId,
      title: 'Original Title',
      description: 'Original Description',
    })

    journalId = id

    await db.insert(journalMembers).values({
      journalId,
      userId: nonOwnerId,
      role: 'editor',
    })
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, nonOwnerId])
  })

  it('updates journal title and description when user is the owner', async () => {
    const result = await updateJournalDetailsForOwner({
      ownerUserId: ownerId,
      journalId,
      title: 'Updated Title',
      description: 'Updated Description',
    })

    expect(result).toBe(true)

    const [row] = await db
      .select({ title: journals.title, description: journals.description })
      .from(journals)
      .where(eq(journals.id, journalId))

    expect(row.title).toBe('Updated Title')
    expect(row.description).toBe('Updated Description')
  })

  it('returns false and does not update when user is not the owner', async () => {
    const result = await updateJournalDetailsForOwner({
      ownerUserId: nonOwnerId,
      journalId,
      title: 'Attempted Title',
      description: 'Attempted Description',
    })

    expect(result).toBe(false)

    const [row] = await db
      .select({ title: journals.title, description: journals.description })
      .from(journals)
      .where(eq(journals.id, journalId))

    expect(row.title).toBe('Original Title')
    expect(row.description).toBe('Original Description')
  })

  it('returns false for non-existent journal', async () => {
    const result = await updateJournalDetailsForOwner({
      ownerUserId: ownerId,
      journalId: crypto.randomUUID(),
      title: 'Never Updated',
      description: 'Never Updated',
    })

    expect(result).toBe(false)
  })
})

describe('getRecentPhotosForJournals', () => {
  let ownerId: string
  let outsiderId: string
  let journalId1: string
  let journalId2: string

  async function createEntry(journalId: string, authorUserId: string, entryDate: string) {
    const [entry] = await db
      .insert(entries)
      .values({ journalId, authorUserId, content: 'test', entryDate })
      .returning({ id: entries.id })
    return entry
  }

  async function insertPhoto(entryId: string, position: number, key: string) {
    const [photo] = await db
      .insert(entryPhotos)
      .values({
        entryId,
        storageKey: key,
        imageUrl: `https://example.com/${key}`,
        mimeType: 'image/jpeg',
        position,
      })
      .returning({ id: entryPhotos.id })
    return photo
  }

  beforeEach(async () => {
    const owner = await db
      .insert(users)
      .values({ clerkUserId: `test_${crypto.randomUUID()}`, displayName: 'Owner' })
      .returning({ id: users.id })
    const outsider = await db
      .insert(users)
      .values({ clerkUserId: `test_${crypto.randomUUID()}`, displayName: 'Outsider' })
      .returning({ id: users.id })

    ownerId = owner[0].id
    outsiderId = outsider[0].id

    const j1 = await db
      .insert(journals)
      .values({ ownerUserId: ownerId, title: 'Journal One' })
      .returning({ id: journals.id })
    const j2 = await db
      .insert(journals)
      .values({ ownerUserId: ownerId, title: 'Journal Two' })
      .returning({ id: journals.id })

    journalId1 = j1[0].id
    journalId2 = j2[0].id

    await db
      .insert(journalMembers)
      .values({ journalId: journalId1, userId: ownerId, role: 'owner' })
    await db
      .insert(journalMembers)
      .values({ journalId: journalId2, userId: ownerId, role: 'owner' })
  })

  afterEach(async () => {
    await db.delete(journals).where(eq(journals.id, journalId1))
    await db.delete(journals).where(eq(journals.id, journalId2))
    await db.delete(users).where(eq(users.id, ownerId))
    await db.delete(users).where(eq(users.id, outsiderId))
  })

  it('returns empty map when journalIds array is empty', async () => {
    const result = await getRecentPhotosForJournals([])

    expect(result.size).toBe(0)
  })

  it('returns empty map entry when a journal has no photos', async () => {
    const result = await getRecentPhotosForJournals([journalId1])

    expect(result.has(journalId1)).toBe(false)
  })

  it('returns photos for journals with photos', async () => {
    const entry = await createEntry(journalId1, ownerId, '2026-03-01')
    await insertPhoto(entry.id, 0, 'j1/photo-a.jpg')

    const result = await getRecentPhotosForJournals([journalId1])

    expect(result.get(journalId1)).toHaveLength(1)
  })

  it('caps results at the limitPerJournal default of 3', async () => {
    const entry = await createEntry(journalId1, ownerId, '2026-03-01')
    await insertPhoto(entry.id, 0, 'j1/p0.jpg')
    await insertPhoto(entry.id, 1, 'j1/p1.jpg')
    await insertPhoto(entry.id, 2, 'j1/p2.jpg')
    await insertPhoto(entry.id, 3, 'j1/p3.jpg')

    const result = await getRecentPhotosForJournals([journalId1])

    expect(result.get(journalId1)).toHaveLength(3)
  })

  it('respects a custom limitPerJournal', async () => {
    const entry = await createEntry(journalId1, ownerId, '2026-03-01')
    await insertPhoto(entry.id, 0, 'j1/l0.jpg')
    await insertPhoto(entry.id, 1, 'j1/l1.jpg')

    const result = await getRecentPhotosForJournals([journalId1], 1)

    expect(result.get(journalId1)).toHaveLength(1)
  })

  it('returns photos with id and entryId fields', async () => {
    const entry = await createEntry(journalId1, ownerId, '2026-03-01')
    await insertPhoto(entry.id, 0, 'j1/fld.jpg')

    const result = await getRecentPhotosForJournals([journalId1])
    const photos = result.get(journalId1) ?? []

    expect(photos[0].id).toBeDefined()
    expect(photos[0].entryId).toBe(entry.id)
  })

  it('returns photos scoped per journal when fetching multiple journals', async () => {
    const e1 = await createEntry(journalId1, ownerId, '2026-03-01')
    const e2 = await createEntry(journalId2, ownerId, '2026-03-01')
    await insertPhoto(e1.id, 0, 'j1/multi.jpg')
    await insertPhoto(e2.id, 0, 'j2/multi.jpg')

    const result = await getRecentPhotosForJournals([journalId1, journalId2])

    expect(result.get(journalId1)).toHaveLength(1)
    expect(result.get(journalId2)).toHaveLength(1)
  })
})
