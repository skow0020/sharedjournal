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

export async function createEntryComment(input: CreateEntryCommentInput) {
  const parsedInput = CreateEntryCommentSchema.parse(input)

  const [accessibleEntry] = await db
    .select({ id: entries.id })
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

  const [comment] = await db.insert(entryComments).values({
    entryId: parsedInput.entryId,
    authorUserId: parsedInput.authorUserId,
    content: encryptEntryContent(parsedInput.content),
  }).returning()

  if (!comment) {
    return null
  }

  const decryptedContent = decryptEntryContent(comment.content)

  return {
    ...comment,
    content: decryptedContent,
  }
}

export async function getCommentsForEntry(entryId: string) {
  const comments = await db.query.entryComments.findMany({
    where: eq(entryComments.entryId, entryId),
    orderBy: [asc(entryComments.createdAt)],
    with: {
      author: true,
    },
  })

  const decryptedComments = [] as typeof comments

  for (const comment of comments) {
    try {
      decryptedComments.push({
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

  return decryptedComments
}
