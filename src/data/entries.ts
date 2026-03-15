import { copy, del } from '@vercel/blob'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { entries, entryPhotos, journalMembers, journals, users } from '@/db/schema'
import { buildFinalEntryImageStorageKey, isTempEntryImageStorageKeyForJournal } from '@/lib/entry-image-storage'

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
  photos: JournalEntryPhoto[]
}

export type JournalEntryPhoto = {
  id: string
  entryId: string
  mimeType: string | null
  width: number | null
  height: number | null
  position: number
}

type UploadedEntryImage = {
  tempStorageKey: string
  fileName: string
  mimeType: string
  width: number | null
  height: number | null
}

type CreateEntryForJournalInput = {
  userId: string
  journalId: string
  title: string | null
  content: string
  entryDate: string | null
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
  const entryRows = await db
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

  if (entryRows.length === 0) {
    return []
  }

  const entryIds = entryRows.map((entry) => entry.id)
  const photoRows = await db
    .select({
      id: entryPhotos.id,
      entryId: entryPhotos.entryId,
      mimeType: entryPhotos.mimeType,
      width: entryPhotos.width,
      height: entryPhotos.height,
      position: entryPhotos.position,
    })
    .from(entryPhotos)
    .where(inArray(entryPhotos.entryId, entryIds))
    .orderBy(asc(entryPhotos.position), asc(entryPhotos.createdAt))

  const photosByEntry = new Map<string, JournalEntryPhoto[]>()

  for (const photo of photoRows) {
    const current = photosByEntry.get(photo.entryId) ?? []
    current.push(photo)
    photosByEntry.set(photo.entryId, current)
  }

  return entryRows.map((entry) => ({
    ...entry,
    photos: photosByEntry.get(entry.id) ?? [],
  }))
}

/**
 * Create an entry in a journal only if the user is a member of that journal.
 */
export async function createEntryForJournal({
  userId,
  journalId,
  title,
  content,
  entryDate,
}: CreateEntryForJournalInput): Promise<{ id: string } | null> {
  const [membership] = await db
    .select({ id: journalMembers.id })
    .from(journalMembers)
    .where(and(eq(journalMembers.userId, userId), eq(journalMembers.journalId, journalId)))
    .limit(1)

  if (!membership) {
    return null
  }

  const [createdEntry] = await db
    .insert(entries)
    .values({
      journalId,
      authorUserId: userId,
      title,
      content,
      ...(entryDate ? { entryDate } : {}),
    })
    .returning({ id: entries.id })

  return createdEntry
}

/**
 * Create an entry and attach uploaded photos in a compensating workflow.
 */
export async function createEntryWithUploadedImagesForJournal(input: {
  userId: string
  journalId: string
  title: string | null
  content: string
  entryDate: string | null
  uploadedImages: UploadedEntryImage[]
}): Promise<{ id: string } | null> {
  const [membership] = await db
    .select({ id: journalMembers.id })
    .from(journalMembers)
    .where(and(eq(journalMembers.userId, input.userId), eq(journalMembers.journalId, input.journalId)))
    .limit(1)

  if (!membership) {
    return null
  }

  const [createdEntry] = await db
    .insert(entries)
    .values({
      journalId: input.journalId,
      authorUserId: input.userId,
      title: input.title,
      content: input.content,
      ...(input.entryDate ? { entryDate: input.entryDate } : {}),
    })
    .returning({ id: entries.id })

  const finalStorageKeys: string[] = []

  try {
    for (const [index, image] of input.uploadedImages.entries()) {
      if (!isTempEntryImageStorageKeyForJournal(image.tempStorageKey, input.journalId)) {
        throw new Error('Uploaded image path is invalid for this journal.')
      }

      const finalStorageKey = buildFinalEntryImageStorageKey({
        journalId: input.journalId,
        entryId: createdEntry.id,
        fileName: image.fileName,
        position: index,
      })

      const copied = await copy(image.tempStorageKey, finalStorageKey, {
        access: 'private',
        contentType: image.mimeType,
        addRandomSuffix: false,
      })

      finalStorageKeys.push(copied.pathname)

      await db.insert(entryPhotos).values({
        entryId: createdEntry.id,
        uploaderUserId: input.userId,
        storageKey: copied.pathname,
        imageUrl: copied.url,
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
        position: index,
      })
    }
  } catch (error) {
    if (finalStorageKeys.length > 0) {
      await del(finalStorageKeys)
    }

    await db
      .delete(entries)
      .where(and(eq(entries.id, createdEntry.id), eq(entries.authorUserId, input.userId)))

    throw error
  }

  const tempStorageKeys = input.uploadedImages.map((image) => image.tempStorageKey)

  if (tempStorageKeys.length > 0) {
    await del(tempStorageKeys)
  }

  return createdEntry
}

/**
 * Return a photo only when the user can access its parent journal entry.
 */
export async function getEntryPhotoForUser(input: {
  userId: string
  entryId: string
  photoId: string
}): Promise<{
  id: string
  storageKey: string
  mimeType: string | null
} | null> {
  const [photo] = await db
    .select({
      id: entryPhotos.id,
      storageKey: entryPhotos.storageKey,
      mimeType: entryPhotos.mimeType,
    })
    .from(entryPhotos)
    .innerJoin(entries, eq(entries.id, entryPhotos.entryId))
    .innerJoin(journalMembers, eq(journalMembers.journalId, entries.journalId))
    .where(
      and(
        eq(entryPhotos.id, input.photoId),
        eq(entryPhotos.entryId, input.entryId),
        eq(journalMembers.userId, input.userId),
      ),
    )
    .limit(1)

  return photo ?? null
}