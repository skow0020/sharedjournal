import { and, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db'
import { entries, journalMembers, journals, users } from '@/db/schema'
import {
  createEntryForJournal,
  getJournalEntriesByDate,
  getJournalEntriesForJournal,
} from '@/data/entries'

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

async function createJournal(ownerUserId: string, title = 'Test Journal') {
  const [journal] = await db
    .insert(journals)
    .values({ ownerUserId, title })
    .returning({ id: journals.id })

  return journal
}

async function addMember(journalId: string, userId: string, role: 'owner' | 'editor' | 'viewer' = 'editor') {
  await db.insert(journalMembers).values({ journalId, userId, role })
}

async function createEntry(journalId: string, authorUserId: string, overrides?: {
  title?: string
  content?: string
  entryDate?: string
}) {
  const [entry] = await db
    .insert(entries)
    .values({
      journalId,
      authorUserId,
      title: overrides?.title ?? null,
      content: overrides?.content ?? 'Test content.',
      ...(overrides?.entryDate ? { entryDate: overrides.entryDate } : {}),
    })
    .returning({ id: entries.id })

  return entry
}

// ---------------------------------------------------------------------------
// Teardown helpers — delete by ID to avoid touching unrelated rows
// ---------------------------------------------------------------------------

async function deleteJournals(ids: string[]) {
  for (const id of ids) {
    // Cascades to journalMembers and entries via FK ON DELETE CASCADE
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

describe('getJournalEntriesForJournal', () => {
  let ownerId: string
  let memberId: string
  let outsiderId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const member = await createUser({ displayName: 'Member' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    memberId = member.id
    outsiderId = outsider.id

    const journal = await createJournal(ownerId, 'Shared Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
    await addMember(journalId, memberId, 'editor')

    await createEntry(journalId, ownerId, {
      title: 'First Entry',
      content: 'Hello world.',
      entryDate: '2026-03-01',
    })
    await createEntry(journalId, ownerId, {
      title: 'Second Entry',
      content: 'Another day.',
      entryDate: '2026-03-02',
    })
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, memberId, outsiderId])
  })

  it('returns entries visible to the owner', async () => {
    const result = await getJournalEntriesForJournal(ownerId, journalId)

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Second Entry')
    expect(result[1].title).toBe('First Entry')
  })

  it('returns entries visible to an editor member', async () => {
    const result = await getJournalEntriesForJournal(memberId, journalId)

    expect(result).toHaveLength(2)
  })

  it('returns empty array for a user who is not a member', async () => {
    const result = await getJournalEntriesForJournal(outsiderId, journalId)

    expect(result).toHaveLength(0)
  })

  it('returns entries ordered by entryDate descending', async () => {
    const result = await getJournalEntriesForJournal(ownerId, journalId)

    expect(result[0].entryDate).toBe('2026-03-02')
    expect(result[1].entryDate).toBe('2026-03-01')
  })

  it('includes authorName in results', async () => {
    const result = await getJournalEntriesForJournal(ownerId, journalId)

    expect(result[0].authorName).toBe('Owner')
  })
})

describe('getJournalEntriesByDate', () => {
  let ownerId: string
  let outsiderId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    outsiderId = outsider.id

    const journal = await createJournal(ownerId, 'Date Filter Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')

    await createEntry(journalId, ownerId, { content: 'Entry on March 5', entryDate: '2026-03-05' })
    await createEntry(journalId, ownerId, { content: 'Entry on March 7', entryDate: '2026-03-07' })
    await createEntry(journalId, ownerId, { content: 'Another on March 7', entryDate: '2026-03-07' })
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, outsiderId])
  })

  it('returns only entries matching the requested date', async () => {
    const result = await getJournalEntriesByDate(ownerId, '2026-03-07')

    expect(result).toHaveLength(2)
    expect(result.every((e) => e.content.includes('March 7'))).toBe(true)
  })

  it('returns empty array for a date with no entries', async () => {
    const result = await getJournalEntriesByDate(ownerId, '2026-01-01')

    expect(result).toHaveLength(0)
  })

  it('returns empty array for a non-member on a date with entries', async () => {
    const result = await getJournalEntriesByDate(outsiderId, '2026-03-07')

    expect(result).toHaveLength(0)
  })

  it('includes journalTitle in results', async () => {
    const result = await getJournalEntriesByDate(ownerId, '2026-03-05')

    expect(result[0].journalTitle).toBe('Date Filter Journal')
  })
})

describe('createEntryForJournal', () => {
  let ownerId: string
  let outsiderId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    outsiderId = outsider.id

    const journal = await createJournal(ownerId, 'Write Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, outsiderId])
  })

  it('creates and returns an entry for a journal member', async () => {
    const result = await createEntryForJournal({
      userId: ownerId,
      journalId,
      title: 'New entry',
      content: 'Some thoughts.',
      entryDate: '2026-03-10',
    })

    expect(result).not.toBeNull()
    expect(result?.id).toBeDefined()

    // Verify it persists in the database
    const [row] = await db
      .select({ content: entries.content })
      .from(entries)
      .where(and(eq(entries.id, result!.id), eq(entries.journalId, journalId)))

    expect(row.content).toBe('Some thoughts.')
  })

  it('returns null and does not insert when user is not a member', async () => {
    const result = await createEntryForJournal({
      userId: outsiderId,
      journalId,
      title: null,
      content: 'Should not appear.',
      entryDate: null,
    })

    expect(result).toBeNull()

    const rows = await db
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.content, 'Should not appear.'), eq(entries.journalId, journalId)))

    expect(rows).toHaveLength(0)
  })

  it('creates an entry with a null title when none is provided', async () => {
    const result = await createEntryForJournal({
      userId: ownerId,
      journalId,
      title: null,
      content: 'Untitled content.',
      entryDate: null,
    })

    expect(result?.id).toBeDefined()

    const [row] = await db
      .select({ title: entries.title })
      .from(entries)
      .where(eq(entries.id, result!.id))

    expect(row.title).toBeNull()
  })
})
