import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db'
import { journalMembers, journals, users } from '@/db/schema'
import {
  createJournalForOwner,
  getCollaboratorsForJournal,
  getUserJournalById,
  getUserJournals,
} from '@/data/journals'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUser(overrides?: { clerkUserId?: string, displayName?: string }) {
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
    await deleteJournals([journalId1, journalId2])
    await deleteUsers([ownerId, memberId, outsiderId])
  })

  it('returns all journals the owner belongs to', async () => {
    const result = await getUserJournals(ownerId)

    const ids = result.map((j) => j.id)
    expect(ids).toContain(journalId1)
    expect(ids).toContain(journalId2)
  })

  it('returns only journals the member belongs to', async () => {
    const result = await getUserJournals(memberId)

    const ids = result.map((j) => j.id)
    expect(ids).toContain(journalId1)
    expect(ids).not.toContain(journalId2)
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
      .where(
        eq(journalMembers.journalId, result.id),
      )

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
