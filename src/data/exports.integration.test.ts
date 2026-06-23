import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildOwnerJournalsExportPayload } from '@/data/exports'
import { db } from '@/db'
import { entries, entryComments, entryPhotos, journalMembers, journals, users } from '@/db/schema'
import { encryptEntryContent } from '@/lib/entry-content-crypto'

async function createUser(displayName: string) {
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: `test_${crypto.randomUUID()}`,
      displayName,
    })
    .returning({ id: users.id })

  return user
}

describe('buildOwnerJournalsExportPayload', () => {
  let ownerId: string
  let collaboratorId: string
  let otherOwnerId: string
  const journalIds: string[] = []

  beforeEach(async () => {
    const owner = await createUser('Owner')
    const collaborator = await createUser('Collaborator')
    const otherOwner = await createUser('Other Owner')

    ownerId = owner.id
    collaboratorId = collaborator.id
    otherOwnerId = otherOwner.id
  })

  afterEach(async () => {
    for (const journalId of journalIds) {
      await db.delete(journals).where(eq(journals.id, journalId))
    }

    await db.delete(users).where(eq(users.id, ownerId))
    await db.delete(users).where(eq(users.id, collaboratorId))
    await db.delete(users).where(eq(users.id, otherOwnerId))
  })

  it('returns only owned journals with decrypted and ordered nested data', async () => {
    const [olderJournal] = await db
      .insert(journals)
      .values({
        ownerUserId: ownerId,
        title: 'Older Journal',
        description: 'Old notes',
        createdAt: new Date('2026-06-10T10:00:00.000Z'),
        updatedAt: new Date('2026-06-10T10:00:00.000Z'),
      })
      .returning({ id: journals.id })

    const [newerJournal] = await db
      .insert(journals)
      .values({
        ownerUserId: ownerId,
        title: 'Newer Journal',
        description: 'Recent notes',
        createdAt: new Date('2026-06-11T10:00:00.000Z'),
        updatedAt: new Date('2026-06-11T10:00:00.000Z'),
      })
      .returning({ id: journals.id })

    const [foreignJournal] = await db
      .insert(journals)
      .values({
        ownerUserId: otherOwnerId,
        title: 'Foreign Journal',
      })
      .returning({ id: journals.id })

    journalIds.push(olderJournal.id, newerJournal.id, foreignJournal.id)

    await db.insert(journalMembers).values([
      { journalId: olderJournal.id, userId: ownerId, role: 'owner' },
      { journalId: newerJournal.id, userId: ownerId, role: 'owner' },
      { journalId: newerJournal.id, userId: collaboratorId, role: 'editor' },
      { journalId: foreignJournal.id, userId: otherOwnerId, role: 'owner' },
    ])

    const [goodEntry] = await db
      .insert(entries)
      .values({
        journalId: newerJournal.id,
        authorUserId: collaboratorId,
        title: 'Decrypted Entry',
        content: encryptEntryContent('Top secret entry text'),
        entryDate: '2026-06-11',
        createdAt: new Date('2026-06-11T11:00:00.000Z'),
      })
      .returning({ id: entries.id })

    const [badEntry] = await db
      .insert(entries)
      .values({
        journalId: newerJournal.id,
        authorUserId: ownerId,
        title: 'Broken Entry',
        content: 'enc:v1:bad:bad:bad',
        entryDate: '2026-06-10',
        createdAt: new Date('2026-06-10T11:00:00.000Z'),
      })
      .returning({ id: entries.id })

    const [foreignEntry] = await db
      .insert(entries)
      .values({
        journalId: foreignJournal.id,
        authorUserId: otherOwnerId,
        title: 'Foreign Entry',
        content: encryptEntryContent('Do not include'),
        entryDate: '2026-06-11',
      })
      .returning({ id: entries.id })

    await db.insert(entryPhotos).values([
      {
        entryId: goodEntry.id,
        uploaderUserId: collaboratorId,
        storageKey: `exports-test/${crypto.randomUUID()}-2.jpg`,
        imageUrl: 'https://example.com/2.jpg',
        mimeType: 'image/jpeg',
        width: 100,
        height: 100,
        position: 2,
        createdAt: new Date('2026-06-11T11:00:02.000Z'),
      },
      {
        entryId: goodEntry.id,
        uploaderUserId: collaboratorId,
        storageKey: `exports-test/${crypto.randomUUID()}-1.jpg`,
        imageUrl: 'https://example.com/1.jpg',
        mimeType: 'image/jpeg',
        width: 120,
        height: 120,
        position: 1,
        createdAt: new Date('2026-06-11T11:00:01.000Z'),
      },
    ])

    await db.insert(entryComments).values([
      {
        entryId: goodEntry.id,
        authorUserId: ownerId,
        content: encryptEntryContent('First reflection'),
        createdAt: new Date('2026-06-11T12:00:00.000Z'),
      },
      {
        entryId: goodEntry.id,
        authorUserId: collaboratorId,
        content: encryptEntryContent('Second reflection'),
        createdAt: new Date('2026-06-11T12:05:00.000Z'),
      },
      {
        entryId: foreignEntry.id,
        authorUserId: otherOwnerId,
        content: encryptEntryContent('Foreign reflection'),
      },
    ])

    const payload = await buildOwnerJournalsExportPayload({
      ownerUserId: ownerId,
      ownerEmail: 'owner@example.com',
    })

    expect(payload.version).toBe('1')
    expect(payload.ownerUserId).toBe(ownerId)
    expect(payload.ownerEmail).toBe('owner@example.com')

    // Owned journals only, ordered by updatedAt DESC.
    expect(payload.journals.map((journal) => journal.id)).toEqual([newerJournal.id, olderJournal.id])

    const exportedNewerJournal = payload.journals[0]
    expect(exportedNewerJournal?.collaborators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: ownerId, role: 'owner' }),
        expect.objectContaining({ id: collaboratorId, role: 'editor' }),
      ]),
    )

    // Entries should be ordered by entryDate DESC then createdAt DESC.
    expect(exportedNewerJournal?.entries.map((entry) => entry.id)).toEqual([
      goodEntry.id,
      badEntry.id,
    ])

    const exportedGoodEntry = exportedNewerJournal?.entries[0]
    expect(exportedGoodEntry?.content).toBe('Top secret entry text')
    expect(exportedGoodEntry?.photos.map((photo) => photo.position)).toEqual([1, 2])
    expect(exportedGoodEntry?.reflections.map((reflection) => reflection.content)).toEqual([
      'First reflection',
      'Second reflection',
    ])

    const exportedBadEntry = exportedNewerJournal?.entries[1]
    expect(exportedBadEntry?.content).toBe('')
  })
})
