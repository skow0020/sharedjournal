import { and, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { delMock } = vi.hoisted(() => ({
  delMock: vi.fn(),
}))

vi.mock('@vercel/blob', () => ({
  copy: vi.fn(),
  del: delMock,
}))

import { db } from '@/db'
import { entries, entryPhotos, journalMembers, journals, users } from '@/db/schema'
import {
  createEntryForJournal,
  deleteEntryForJournal,
  getAllPhotosForJournal,
  getEntryPhotoForUser,
  getJournalEntryCountForJournal,
  getJournalEntriesByDate,
  getJournalEntriesForJournal,
} from '@/data/entries'
import { isEncryptedEntryContent } from '@/lib/entry-content-crypto'

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

  it('supports limit and preserves newest-first ordering', async () => {
    await createEntry(journalId, ownerId, {
      title: 'Third Entry',
      content: 'Another one.',
      entryDate: '2026-03-03',
    })
    await createEntry(journalId, ownerId, {
      title: 'Fourth Entry',
      content: 'Latest entry.',
      entryDate: '2026-03-04',
    })

    const result = await getJournalEntriesForJournal(ownerId, journalId, { limit: 2 })

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Fourth Entry')
    expect(result[1].title).toBe('Third Entry')
  })

  it('returns all rows when limit exceeds available entries', async () => {
    const result = await getJournalEntriesForJournal(ownerId, journalId, { limit: 50 })

    expect(result).toHaveLength(2)
  })
})

describe('getJournalEntryCountForJournal', () => {
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

    const journal = await createJournal(ownerId, 'Count Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
    await addMember(journalId, memberId, 'editor')

    await createEntry(journalId, ownerId, { content: 'One', entryDate: '2026-03-01' })
    await createEntry(journalId, ownerId, { content: 'Two', entryDate: '2026-03-02' })
    await createEntry(journalId, ownerId, { content: 'Three', entryDate: '2026-03-03' })
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, memberId, outsiderId])
  })

  it('returns total count for members and zero for non-members', async () => {
    const ownerCount = await getJournalEntryCountForJournal(ownerId, journalId)
    const memberCount = await getJournalEntryCountForJournal(memberId, journalId)
    const outsiderCount = await getJournalEntryCountForJournal(outsiderId, journalId)

    expect(ownerCount).toBe(3)
    expect(memberCount).toBe(3)
    expect(outsiderCount).toBe(0)
  })

  it('matches list length returned by getJournalEntriesForJournal', async () => {
    const count = await getJournalEntryCountForJournal(ownerId, journalId)
    const list = await getJournalEntriesForJournal(ownerId, journalId)

    expect(count).toBe(list.length)
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

    expect(row.content).not.toBe('Some thoughts.')
    expect(isEncryptedEntryContent(row.content)).toBe(true)

    const entriesForJournal = await getJournalEntriesForJournal(ownerId, journalId)

    expect(entriesForJournal[0]?.content).toBe('Some thoughts.')
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

describe('deleteEntryForJournal', () => {
  let ownerId: string
  let authorId: string
  let memberId: string
  let outsiderId: string
  let journalId: string
  let ownerEntryId: string
  let authorEntryId: string

  beforeEach(async () => {
    vi.clearAllMocks()

    const owner = await createUser({ displayName: 'Owner' })
    const author = await createUser({ displayName: 'Author' })
    const member = await createUser({ displayName: 'Member' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    authorId = author.id
    memberId = member.id
    outsiderId = outsider.id

    const journal = await createJournal(ownerId, 'Delete Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
    await addMember(journalId, authorId, 'editor')
    await addMember(journalId, memberId, 'editor')

    const ownerEntry = await createEntry(journalId, ownerId, {
      title: 'Owner entry',
      content: 'Owner content.',
      entryDate: '2026-03-10',
    })
    ownerEntryId = ownerEntry.id

    const authorEntry = await createEntry(journalId, authorId, {
      title: 'Author entry',
      content: 'Author content.',
      entryDate: '2026-03-11',
    })
    authorEntryId = authorEntry.id

    await db.insert(entryPhotos).values({
      entryId: authorEntryId,
      uploaderUserId: authorId,
      storageKey: 'journals/delete-photo.jpg',
      imageUrl: 'https://example.com/delete-photo.jpg',
      mimeType: 'image/jpeg',
      position: 0,
    })
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, authorId, memberId, outsiderId])
  })

  it('allows the journal owner to delete another user\'s entry', async () => {
    const result = await deleteEntryForJournal({
      userId: ownerId,
      journalId,
      entryId: authorEntryId,
    })

    expect(result).toBe(true)

    const rows = await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.id, authorEntryId))

    expect(rows).toHaveLength(0)
    expect(delMock).toHaveBeenCalledWith(['journals/delete-photo.jpg'])
  })

  it('allows the entry author to delete their own entry', async () => {
    const result = await deleteEntryForJournal({
      userId: authorId,
      journalId,
      entryId: authorEntryId,
    })

    expect(result).toBe(true)

    const rows = await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.id, authorEntryId))

    expect(rows).toHaveLength(0)
  })

  it('rejects a member who is neither the owner nor the author', async () => {
    const result = await deleteEntryForJournal({
      userId: memberId,
      journalId,
      entryId: ownerEntryId,
    })

    expect(result).toBe(false)

    const rows = await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.id, ownerEntryId))

    expect(rows).toHaveLength(1)
  })

  it('rejects users outside the journal', async () => {
    const result = await deleteEntryForJournal({
      userId: outsiderId,
      journalId,
      entryId: ownerEntryId,
    })

    expect(result).toBe(false)
  })

  it('rejects an ex-member who authored an entry but was removed from the journal', async () => {
    await db
      .delete(journalMembers)
      .where(
        and(
          eq(journalMembers.journalId, journalId),
          eq(journalMembers.userId, authorId),
        ),
      )

    const result = await deleteEntryForJournal({
      userId: authorId,
      journalId,
      entryId: authorEntryId,
    })

    expect(result).toBe(false)

    const rows = await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.id, authorEntryId))

    expect(rows).toHaveLength(1)
  })
})

describe('getEntryPhotoForUser', () => {
  let ownerId: string
  let memberId: string
  let outsiderId: string
  let journalId: string
  let entryId: string
  let photoId: string
  let otherEntryId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const member = await createUser({ displayName: 'Member' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    memberId = member.id
    outsiderId = outsider.id

    const journal = await createJournal(ownerId, 'Photo Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
    await addMember(journalId, memberId, 'editor')

    const entry1 = await createEntry(journalId, ownerId, { content: 'Entry with photo' })
    entryId = entry1.id

    const entry2 = await createEntry(journalId, ownerId, { content: 'Other entry' })
    otherEntryId = entry2.id

    const [photo] = await db
      .insert(entryPhotos)
      .values({
        entryId: entryId,
        uploaderUserId: ownerId,
        storageKey: 'journals/photo-1.jpg',
        imageUrl: 'https://example.com/photo-1.jpg',
        mimeType: 'image/jpeg',
        position: 0,
      })
      .returning({ id: entryPhotos.id })

    photoId = photo.id
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, memberId, outsiderId])
  })

  it('returns photo details for a journal member', async () => {
    const result = await getEntryPhotoForUser({
      userId: ownerId,
      entryId,
      photoId,
    })

    expect(result).not.toBeNull()
    expect(result?.id).toBe(photoId)
    expect(result?.storageKey).toBe('journals/photo-1.jpg')
    expect(result?.mimeType).toBe('image/jpeg')
  })

  it('allows editor members to access photos', async () => {
    const result = await getEntryPhotoForUser({
      userId: memberId,
      entryId,
      photoId,
    })

    expect(result).not.toBeNull()
    expect(result?.id).toBe(photoId)
  })

  it('denies access to non-members', async () => {
    const result = await getEntryPhotoForUser({
      userId: outsiderId,
      entryId,
      photoId,
    })

    expect(result).toBeNull()
  })

  it('denies access when photoId mismatches the entryId', async () => {
    const [otherPhoto] = await db
      .insert(entryPhotos)
      .values({
        entryId: otherEntryId,
        uploaderUserId: ownerId,
        storageKey: 'journals/photo-2.jpg',
        imageUrl: 'https://example.com/photo-2.jpg',
        mimeType: 'image/jpeg',
        position: 0,
      })
      .returning({ id: entryPhotos.id })

    const result = await getEntryPhotoForUser({
      userId: ownerId,
      entryId,
      photoId: otherPhoto.id,
    })

    expect(result).toBeNull()
  })
})

describe('getAllPhotosForJournal', () => {
  let ownerId: string
  let memberId: string
  let outsiderId: string
  let journalId: string
  let entryId1: string
  let entryId2: string

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
    const owner = await createUser({ displayName: 'Owner' })
    const member = await createUser({ displayName: 'Member' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    memberId = member.id
    outsiderId = outsider.id

    const journal = await createJournal(ownerId, 'Photo Slideshow Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
    await addMember(journalId, memberId, 'editor')

    const entry1 = await createEntry(journalId, ownerId, { entryDate: '2026-03-01' })
    const entry2 = await createEntry(journalId, ownerId, { entryDate: '2026-03-02' })

    entryId1 = entry1.id
    entryId2 = entry2.id

    await insertPhoto(entryId1, 0, 'journals/photo-a.jpg')
    await insertPhoto(entryId1, 1, 'journals/photo-b.jpg')
    await insertPhoto(entryId2, 0, 'journals/photo-c.jpg')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, memberId, outsiderId])
  })

  it('returns all photos for a journal member', async () => {
    const result = await getAllPhotosForJournal(ownerId, journalId)

    expect(result).toHaveLength(3)
  })

  it('returns all photos for an editor member', async () => {
    const result = await getAllPhotosForJournal(memberId, journalId)

    expect(result).toHaveLength(3)
  })

  it('returns empty array for a non-member', async () => {
    const result = await getAllPhotosForJournal(outsiderId, journalId)

    expect(result).toHaveLength(0)
  })

  it('returns photos with id and entryId fields', async () => {
    const result = await getAllPhotosForJournal(ownerId, journalId)

    for (const photo of result) {
      expect(photo.id).toBeDefined()
      expect(photo.entryId).toBeDefined()
    }
  })

  it('orders photos by entry date descending then position ascending', async () => {
    const result = await getAllPhotosForJournal(ownerId, journalId)

    // entry2 (2026-03-02) > entry1 (2026-03-01)
    expect(result[0].entryId).toBe(entryId2)
    // entry1's two photos come next, position 0 then 1
    expect(result[1].entryId).toBe(entryId1)
    expect(result[2].entryId).toBe(entryId1)
  })

  it('returns empty array when journal has no photos', async () => {
    const emptyJournal = await createJournal(ownerId, 'Empty Journal')
    await addMember(emptyJournal.id, ownerId, 'owner')
    await createEntry(emptyJournal.id, ownerId, {})

    const result = await getAllPhotosForJournal(ownerId, emptyJournal.id)

    expect(result).toHaveLength(0)

    await deleteJournals([emptyJournal.id])
  })
})
