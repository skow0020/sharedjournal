import { and, asc, desc, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { entries, entryComments, entryPhotos, journalMembers, journals, users } from '@/db/schema'
import { decryptEntryContent } from '@/lib/entry-content-crypto'

export type OwnerJournalExportPayload = {
  version: '1'
  generatedAt: string
  ownerUserId: string
  ownerEmail: string | null
  journals: OwnerJournalExportJournal[]
}

export type OwnerJournalExportJournal = {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
  collaborators: OwnerJournalExportCollaborator[]
  entries: OwnerJournalExportEntry[]
}

export type OwnerJournalExportCollaborator = {
  id: string
  displayName: string | null
  role: 'owner' | 'editor' | 'viewer'
}

export type OwnerJournalExportEntry = {
  id: string
  title: string | null
  content: string
  entryDate: string
  createdAt: string
  author: {
    userId: string
    displayName: string | null
  }
  photos: OwnerJournalExportPhoto[]
  reflections: OwnerJournalExportReflection[]
}

export type OwnerJournalExportPhoto = {
  id: string
  entryId: string
  mimeType: string | null
  width: number | null
  height: number | null
  position: number
  createdAt: string
  storageKey: string
}

export type OwnerJournalExportReflection = {
  id: string
  entryId: string
  author: {
    userId: string
    displayName: string | null
  }
  content: string
  createdAt: string
}

type ExportEntryRow = {
  id: string
  journalId: string
  title: string | null
  content: string
  entryDate: string
  createdAt: Date
  authorUserId: string
  authorDisplayName: string | null
}

function toIsoString(value: Date): string {
  return value.toISOString()
}

export async function buildOwnerJournalsExportPayload(input: {
  ownerUserId: string
  ownerEmail: string | null
}): Promise<OwnerJournalExportPayload> {
  const ownedJournals = await db
    .select({
      id: journals.id,
      title: journals.title,
      description: journals.description,
      createdAt: journals.createdAt,
      updatedAt: journals.updatedAt,
    })
    .from(journals)
    .where(eq(journals.ownerUserId, input.ownerUserId))
    .orderBy(desc(journals.updatedAt))

  if (ownedJournals.length === 0) {
    return {
      version: '1',
      generatedAt: new Date().toISOString(),
      ownerUserId: input.ownerUserId,
      ownerEmail: input.ownerEmail,
      journals: [],
    }
  }

  const journalIds = ownedJournals.map((journal) => journal.id)

  const collaboratorRows = await db
    .select({
      journalId: journalMembers.journalId,
      id: users.id,
      displayName: users.displayName,
      role: journalMembers.role,
    })
    .from(journalMembers)
    .innerJoin(users, eq(users.id, journalMembers.userId))
    .where(inArray(journalMembers.journalId, journalIds))

  const rawEntries = await db
    .select({
      id: entries.id,
      journalId: entries.journalId,
      title: entries.title,
      content: entries.content,
      entryDate: entries.entryDate,
      createdAt: entries.createdAt,
      authorUserId: entries.authorUserId,
      authorDisplayName: users.displayName,
    })
    .from(entries)
    .innerJoin(users, eq(users.id, entries.authorUserId))
    .where(inArray(entries.journalId, journalIds))
    .orderBy(asc(entries.journalId), desc(entries.entryDate), desc(entries.createdAt))

  const exportEntries: ExportEntryRow[] = rawEntries.map((entry) => {
    let decryptedContent = ''

    try {
      decryptedContent = decryptEntryContent(entry.content)
    } catch (error) {
      console.error('Failed to decrypt journal entry content during export', {
        entryId: entry.id,
        error,
      })
    }

    return {
      ...entry,
      content: decryptedContent,
    }
  })

  const entryIds = exportEntries.map((entry) => entry.id)

  const photoRows = entryIds.length > 0
    ? await db
      .select({
        id: entryPhotos.id,
        entryId: entryPhotos.entryId,
        mimeType: entryPhotos.mimeType,
        width: entryPhotos.width,
        height: entryPhotos.height,
        position: entryPhotos.position,
        createdAt: entryPhotos.createdAt,
        storageKey: entryPhotos.storageKey,
      })
      .from(entryPhotos)
      .where(inArray(entryPhotos.entryId, entryIds))
      .orderBy(asc(entryPhotos.entryId), asc(entryPhotos.position), asc(entryPhotos.createdAt))
    : []

  const reflectionRows = entryIds.length > 0
    ? await db
      .select({
        id: entryComments.id,
        entryId: entryComments.entryId,
        authorUserId: entryComments.authorUserId,
        authorDisplayName: users.displayName,
        content: entryComments.content,
        createdAt: entryComments.createdAt,
      })
      .from(entryComments)
      .innerJoin(users, eq(users.id, entryComments.authorUserId))
      .innerJoin(entries, eq(entries.id, entryComments.entryId))
      .innerJoin(journals, eq(journals.id, entries.journalId))
      .where(
        and(
          inArray(entryComments.entryId, entryIds),
          eq(journals.ownerUserId, input.ownerUserId),
        ),
      )
      .orderBy(asc(entryComments.entryId), asc(entryComments.createdAt))
    : []

  const photosByEntryId = new Map<string, OwnerJournalExportPhoto[]>()

  for (const row of photoRows) {
    const current = photosByEntryId.get(row.entryId) ?? []
    current.push({
      id: row.id,
      entryId: row.entryId,
      mimeType: row.mimeType,
      width: row.width,
      height: row.height,
      position: row.position,
      createdAt: toIsoString(row.createdAt),
      storageKey: row.storageKey,
    })
    photosByEntryId.set(row.entryId, current)
  }

  const reflectionsByEntryId = new Map<string, OwnerJournalExportReflection[]>()

  for (const row of reflectionRows) {
    const current = reflectionsByEntryId.get(row.entryId) ?? []

    try {
      current.push({
        id: row.id,
        entryId: row.entryId,
        author: {
          userId: row.authorUserId,
          displayName: row.authorDisplayName,
        },
        content: decryptEntryContent(row.content),
        createdAt: toIsoString(row.createdAt),
      })
    } catch (error) {
      console.error('Failed to decrypt reflection content during export', {
        reflectionId: row.id,
        entryId: row.entryId,
        error,
      })
    }

    reflectionsByEntryId.set(row.entryId, current)
  }

  const entriesByJournalId = new Map<string, OwnerJournalExportEntry[]>()

  for (const entry of exportEntries) {
    const current = entriesByJournalId.get(entry.journalId) ?? []

    current.push({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      entryDate: entry.entryDate,
      createdAt: toIsoString(entry.createdAt),
      author: {
        userId: entry.authorUserId,
        displayName: entry.authorDisplayName,
      },
      photos: photosByEntryId.get(entry.id) ?? [],
      reflections: reflectionsByEntryId.get(entry.id) ?? [],
    })

    entriesByJournalId.set(entry.journalId, current)
  }

  const collaboratorsByJournalId = new Map<string, OwnerJournalExportCollaborator[]>()

  for (const collaborator of collaboratorRows) {
    const current = collaboratorsByJournalId.get(collaborator.journalId) ?? []
    current.push({
      id: collaborator.id,
      displayName: collaborator.displayName,
      role: collaborator.role,
    })
    collaboratorsByJournalId.set(collaborator.journalId, current)
  }

  return {
    version: '1',
    generatedAt: new Date().toISOString(),
    ownerUserId: input.ownerUserId,
    ownerEmail: input.ownerEmail,
    journals: ownedJournals.map((journal) => ({
      id: journal.id,
      title: journal.title,
      description: journal.description,
      createdAt: toIsoString(journal.createdAt),
      updatedAt: toIsoString(journal.updatedAt),
      collaborators: collaboratorsByJournalId.get(journal.id) ?? [],
      entries: entriesByJournalId.get(journal.id) ?? [],
    })),
  }
}
