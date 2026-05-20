import { and, asc, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { entryComments, entries, journalMembers } from '@/db/schema'
import { z } from 'zod'

// --- Types ---
export const CreateEntryCommentSchema = z.object({
  entryId: z.string().uuid(),
  authorUserId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
})
export type CreateEntryCommentInput = z.infer<typeof CreateEntryCommentSchema>

export async function createEntryComment(input: CreateEntryCommentInput) {
  const [accessibleEntry] = await db
    .select({ id: entries.id })
    .from(entries)
    .innerJoin(journalMembers, eq(journalMembers.journalId, entries.journalId))
    .where(
      and(
        eq(entries.id, input.entryId),
        eq(journalMembers.userId, input.authorUserId),
        inArray(journalMembers.role, ['owner', 'editor']),
      ),
    )
    .limit(1)

  if (!accessibleEntry) {
    return null
  }

  const [comment] = await db.insert(entryComments).values({
    entryId: input.entryId,
    authorUserId: input.authorUserId,
    content: input.content.trim(),
  }).returning()

  return comment
}

export async function getCommentsForEntry(entryId: string) {
  return db.query.entryComments.findMany({
    where: eq(entryComments.entryId, entryId),
    orderBy: [asc(entryComments.createdAt)],
    with: {
      author: true,
    },
  })
}
