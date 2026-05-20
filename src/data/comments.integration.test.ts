import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createEntryComment, getCommentsForEntry } from '@/data/comments'
import { db } from '@/db'
import { entries, entryComments, journalMembers, journals, users } from '@/db/schema'

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

async function createJournal(ownerUserId: string, title = 'Comment Journal') {
  const [journal] = await db
    .insert(journals)
    .values({ ownerUserId, title })
    .returning({ id: journals.id })

  return journal
}

async function addMember(journalId: string, userId: string, role: 'owner' | 'editor' | 'viewer') {
  await db.insert(journalMembers).values({ journalId, userId, role })
}

async function createEntry(journalId: string, authorUserId: string) {
  const [entry] = await db
    .insert(entries)
    .values({
      journalId,
      authorUserId,
      title: 'Entry title',
      content: 'Encrypted in production helpers; plain for integration fixture.',
      entryDate: '2026-03-07',
    })
    .returning({ id: entries.id })

  return entry
}

describe('comments data helpers', () => {
  let ownerId: string
  let editorId: string
  let viewerId: string
  let outsiderId: string
  let journalId: string
  let entryId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const editor = await createUser({ displayName: 'Editor' })
    const viewer = await createUser({ displayName: 'Viewer' })
    const outsider = await createUser({ displayName: 'Outsider' })

    ownerId = owner.id
    editorId = editor.id
    viewerId = viewer.id
    outsiderId = outsider.id

    const journal = await createJournal(ownerId)
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
    await addMember(journalId, editorId, 'editor')
    await addMember(journalId, viewerId, 'viewer')

    const entry = await createEntry(journalId, ownerId)
    entryId = entry.id
  })

  afterEach(async () => {
    await db.delete(journals).where(eq(journals.id, journalId))
    await db.delete(users).where(eq(users.id, ownerId))
    await db.delete(users).where(eq(users.id, editorId))
    await db.delete(users).where(eq(users.id, viewerId))
    await db.delete(users).where(eq(users.id, outsiderId))
  })

  it('creates comments for owner and editor and trims content', async () => {
    const ownerComment = await createEntryComment({
      entryId,
      authorUserId: ownerId,
      content: '  Owner note  ',
    })

    const editorComment = await createEntryComment({
      entryId,
      authorUserId: editorId,
      content: 'Editor note',
    })

    expect(ownerComment).not.toBeNull()
    expect(editorComment).not.toBeNull()
    expect(ownerComment?.content).toBe('Owner note')

    const comments = await getCommentsForEntry(entryId)
    expect(comments).toHaveLength(2)
    expect(comments[0]?.content).toBe('Owner note')
    expect(comments[1]?.content).toBe('Editor note')
  })

  it('does not allow viewer or outsider to comment', async () => {
    const viewerComment = await createEntryComment({
      entryId,
      authorUserId: viewerId,
      content: 'Viewer note',
    })

    const outsiderComment = await createEntryComment({
      entryId,
      authorUserId: outsiderId,
      content: 'Outsider note',
    })

    expect(viewerComment).toBeNull()
    expect(outsiderComment).toBeNull()

    const commentsInDb = await db
      .select({ id: entryComments.id })
      .from(entryComments)
      .where(eq(entryComments.entryId, entryId))

    expect(commentsInDb).toHaveLength(0)
  })

  it('returns empty list when entry has no comments', async () => {
    const comments = await getCommentsForEntry(entryId)

    expect(comments).toEqual([])
  })
})
