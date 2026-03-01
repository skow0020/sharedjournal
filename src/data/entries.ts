import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { entries, journalMembers, journals, users } from '@/db/schema'

export type JournalEntry = {
  id: string
  title: string | null
  content: string
  journalTitle: string
  authorName: string | null
  createdAt: Date
}

export type JournalEntryForJournal = {
  id: string
  title: string | null
  content: string
  entryDate: string
  authorName: string | null
  createdAt: Date
}

/**
 * Get journal entries for a specific user and date.
 * This function enforces access control by only returning entries from journals
 * that the user is a member of.
 *
 * @param userId - The user's ID (for access control)
 * @param date - The date to filter entries by (format: YYYY-MM-DD)
 */
export async function getJournalEntriesByDate(userId: string, date: string): Promise<JournalEntry[]> {
  return db
    .select({
      id: entries.id,
      title: entries.title,
      content: entries.content,
      journalTitle: journals.title,
      authorName: users.displayName,
      createdAt: entries.createdAt,
    })
    .from(entries)
    .innerJoin(journalMembers, eq(journalMembers.journalId, entries.journalId))
    .innerJoin(journals, eq(journals.id, entries.journalId))
    .innerJoin(users, eq(users.id, entries.authorUserId))
    .where(
      and(
        eq(journalMembers.userId, userId),
        eq(entries.entryDate, date),
      ),
    )
    .orderBy(desc(entries.createdAt))
}

/**
 * Get entries for a specific journal, only if the user is a member of that journal.
 */
export async function getJournalEntriesForJournal(
  userId: string,
  journalId: string,
): Promise<JournalEntryForJournal[]> {
  return db
    .select({
      id: entries.id,
      title: entries.title,
      content: entries.content,
      entryDate: entries.entryDate,
      authorName: users.displayName,
      createdAt: entries.createdAt,
    })
    .from(entries)
    .innerJoin(journalMembers, eq(journalMembers.journalId, entries.journalId))
    .innerJoin(users, eq(users.id, entries.authorUserId))
    .where(
      and(
        eq(journalMembers.userId, userId),
        eq(entries.journalId, journalId),
      ),
    )
    .orderBy(desc(entries.entryDate), desc(entries.createdAt))
}