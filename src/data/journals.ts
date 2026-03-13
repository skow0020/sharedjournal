import { and, desc, eq, ne } from 'drizzle-orm'

import { db } from '@/db'
import { journalMembers, journals, users } from '@/db/schema'

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

export type JournalCollaborator = {
  id: string
  displayName: string | null
  role: 'owner' | 'editor' | 'viewer'
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

/**
 * Get non-owner collaborators for a journal if the requesting user can access it.
 */
export async function getCollaboratorsForJournal(
  userId: string,
  journalId: string,
): Promise<JournalCollaborator[]> {
  const [membership] = await db
    .select({ id: journalMembers.id })
    .from(journalMembers)
    .where(and(eq(journalMembers.userId, userId), eq(journalMembers.journalId, journalId)))
    .limit(1)

  if (!membership) {
    return []
  }

  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      role: journalMembers.role,
    })
    .from(journalMembers)
    .innerJoin(users, eq(users.id, journalMembers.userId))
    .where(and(eq(journalMembers.journalId, journalId), ne(journalMembers.role, 'owner')))
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
  const [createdJournal] = await db
    .insert(journals)
    .values({
      ownerUserId,
      title,
      description,
    })
    .returning({ id: journals.id })

  try {
    await db.insert(journalMembers).values({
      journalId: createdJournal.id,
      userId: ownerUserId,
      role: 'owner',
    })
  } catch (error) {
    // Neon HTTP driver does not support transactions, so compensate by removing
    // the just-created journal when owner membership creation fails.
    await db.delete(journals).where(eq(journals.id, createdJournal.id))
    throw error
  }

  return createdJournal
}