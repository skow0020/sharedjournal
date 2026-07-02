import { and, asc, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { entryComments, entries, journalMembers } from '@/db/schema'
import { decryptEntryContent, encryptEntryContent } from '@/lib/entry-content-crypto'
import { z } from 'zod'

// --- Types ---
export const CreateEntryCommentSchema = z.object({
  entryId: z.string().uuid(),
  authorUserId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
})
export type CreateEntryCommentInput = z.infer<typeof CreateEntryCommentSchema>
export type CreatedEntryComment = {
  id: string
  entryId: string
  authorUserId: string
  journalId: string
  content: string
  createdAt: Date
}
export type EntryCommentForEntry = {
  id: string
  entryId: string
  authorUserId: string
  content: string
  createdAt: Date
  author: {
    displayName: string | null
  }
}

type CommentsByEntryId = Record<string, EntryCommentForEntry[]>

export async function canUserCommentOnEntry(input: {
  entryId: string
  journalId: string
  userId: string
}): Promise<boolean> {
  const [accessibleEntry] = await db
    .select({ id: entries.id })
    .from(entries)
    .innerJoin(journalMembers, eq(journalMembers.journalId, entries.journalId))
    .where(
      and(
        eq(entries.id, input.entryId),
        eq(entries.journalId, input.journalId),
        eq(journalMembers.userId, input.userId),
        inArray(journalMembers.role, ['owner', 'editor']),
      ),
    )
    .limit(1)

  return Boolean(accessibleEntry)
}

export async function createEntryComment(
  input: CreateEntryCommentInput,
): Promise<CreatedEntryComment | null> {
  const parsedInput = CreateEntryCommentSchema.parse(input)

  const [accessibleEntry] = await db
    .select({ id: entries.id, journalId: entries.journalId })
    .from(entries)
    .innerJoin(journalMembers, eq(journalMembers.journalId, entries.journalId))
    .where(
      and(
        eq(entries.id, parsedInput.entryId),
        eq(journalMembers.userId, parsedInput.authorUserId),
        inArray(journalMembers.role, ['owner', 'editor']),
      ),
    )
    .limit(1)

  if (!accessibleEntry) {
    return null
  }

  const [comment] = await db
    .insert(entryComments)
    .values({
      entryId: parsedInput.entryId,
      authorUserId: parsedInput.authorUserId,
      content: encryptEntryContent(parsedInput.content),
    })
    .returning()

  if (!comment) {
    return null
  }

  const decryptedContent = decryptEntryContent(comment.content)

  return {
    ...comment,
    journalId: accessibleEntry.journalId,
    content: decryptedContent,
  }
}

export async function getCommentsForEntry(entryId: string): Promise<EntryCommentForEntry[]> {
  const commentsByEntry = await getCommentsForEntries([entryId])
  return commentsByEntry[entryId] ?? []
}

export async function getCommentsForEntries(entryIds: string[]): Promise<CommentsByEntryId> {
  if (entryIds.length === 0) {
    return {}
  }

  const comments = await db.query.entryComments.findMany({
    where: inArray(entryComments.entryId, entryIds),
    orderBy: [asc(entryComments.createdAt)],
    with: {
      author: true,
    },
  })

  const commentsByEntryId = Object.fromEntries(
    entryIds.map((entryId) => [entryId, []]),
  ) as CommentsByEntryId

  for (const comment of comments) {
    try {
      commentsByEntryId[comment.entryId]?.push({
        ...comment,
        content: decryptEntryContent(comment.content),
      })
    } catch (error) {
      // Skip comments that cannot be decrypted so one bad row does not break the page.
      console.error('Failed to decrypt journal entry comment content', {
        commentId: comment.id,
        entryId: comment.entryId,
        error,
      })
    }
  }

  return commentsByEntryId
}
