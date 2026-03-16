import { and, desc, eq, ne, sql } from 'drizzle-orm'

import { db } from '@/db'
import { journalMembers, journals, users } from '@/db/schema'

export type UserJournal = {
  id: string
  title: string
  description: string | null
  isOwner: boolean
}

type GetUserJournalsInput = {
  limit?: number
  offset?: number
}

/**
 * Get journals accessible to a specific user.
 */
export async function getUserJournals(
  userId: string,
  input: GetUserJournalsInput = {},
): Promise<UserJournal[]> {
  const { limit, offset } = input

  const query = db
    .select({
      id: journals.id,
      title: journals.title,
      description: journals.description,
      isOwner: sql<boolean>`${journals.ownerUserId} = ${userId}`,
    })
    .from(journals)
    .innerJoin(journalMembers, eq(journalMembers.journalId, journals.id))
    .where(eq(journalMembers.userId, userId))
    .groupBy(journals.id, journals.title, journals.description, journals.updatedAt)
    .orderBy(desc(journals.updatedAt))

  if (typeof limit === 'number') {
    query.limit(limit)
  }

  if (typeof offset === 'number') {
    query.offset(offset)
  }

  return query
}

export async function getUserJournalCount(userId: string): Promise<number> {
  const [result] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(journalMembers)
    .where(eq(journalMembers.userId, userId))

  return result?.count ?? 0
}

/**
 * Delete a journal only if the requesting user is the owner.
 */
export async function deleteJournalOwnedByUser(input: {
  userId: string
  journalId: string
}): Promise<boolean> {
  const deleted = await db
    .delete(journals)
    .where(and(eq(journals.id, input.journalId), eq(journals.ownerUserId, input.userId)))
    .returning({ id: journals.id })

  return deleted.length > 0
}

export type UserJournalDetails = {
  id: string
  title: string
  description: string | null
  ownerUserId: string
  isOwner: boolean
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
      ownerUserId: journals.ownerUserId,
      isOwner: sql<boolean>`${journals.ownerUserId} = ${userId}`,
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

type UpdateJournalTitleInput = {
  ownerUserId: string
  journalId: string
  title: string
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

export async function updateJournalTitleForOwner({
  ownerUserId,
  journalId,
  title,
}: UpdateJournalTitleInput): Promise<boolean> {
  const [updatedJournal] = await db
    .update(journals)
    .set({ title })
    .where(and(eq(journals.id, journalId), eq(journals.ownerUserId, ownerUserId)))
    .returning({ id: journals.id })

  return Boolean(updatedJournal)
}
