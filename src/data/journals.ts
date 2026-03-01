import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { journalMembers, journals } from '@/db/schema'

export type UserJournal = {
  id: string
  title: string
  description: string | null
}

/**
 * Get journals accessible to a specific user.
 */
export async function getUserJournals(userId: string): Promise<UserJournal[]> {
  return db
    .select({
      id: journals.id,
      title: journals.title,
      description: journals.description,
    })
    .from(journals)
    .innerJoin(journalMembers, eq(journalMembers.journalId, journals.id))
    .where(eq(journalMembers.userId, userId))
    .groupBy(journals.id, journals.title, journals.description, journals.updatedAt)
    .orderBy(desc(journals.updatedAt))
}

export type UserJournalDetails = {
  id: string
  title: string
  description: string | null
}

/**
 * Get a specific journal only if the user has access to it.
 */
export async function getUserJournalById(
  userId: string,
  journalId: string,
): Promise<UserJournalDetails | null> {
  const [journal] = await db
    .select({
      id: journals.id,
      title: journals.title,
      description: journals.description,
    })
    .from(journals)
    .innerJoin(journalMembers, eq(journalMembers.journalId, journals.id))
    .where(and(eq(journalMembers.userId, userId), eq(journals.id, journalId)))
    .limit(1)

  return journal ?? null
}

type CreateJournalInput = {
  ownerUserId: string
  title: string
  description: string | null
}

export async function createJournalForOwner({
  ownerUserId,
  title,
  description,
}: CreateJournalInput): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [createdJournal] = await tx
      .insert(journals)
      .values({
        ownerUserId,
        title,
        description,
      })
      .returning({ id: journals.id })

    await tx.insert(journalMembers).values({
      journalId: createdJournal.id,
      userId: ownerUserId,
      role: 'owner',
    })

    return createdJournal
  })
}