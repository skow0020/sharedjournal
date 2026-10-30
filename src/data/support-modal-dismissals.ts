import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { supportModalDismissals } from '@/db/schema'

type UpsertSupportModalDismissalInput = {
  userId: string
  nextShowAfterDays?: number
}

export async function upsertSupportModalDismissal(
  input: UpsertSupportModalDismissalInput,
): Promise<{ id: string }> {
  const nextShowAfter = new Date()
  nextShowAfter.setDate(nextShowAfter.getDate() + (input.nextShowAfterDays ?? 7))

  const [dismissal] = await db
    .insert(supportModalDismissals)
    .values({
      userId: input.userId,
      nextShowAfter,
    })
    .onConflictDoUpdate({
      target: supportModalDismissals.userId,
      set: {
        dismissedAt: new Date(),
        nextShowAfter,
      },
    })
    .returning({ id: supportModalDismissals.id })

  return dismissal
}

export async function getSupportModalDismissalForUser(input: {
  userId: string
}): Promise<{
  id: string
  dismissedAt: Date
  nextShowAfter: Date
} | null> {
  const [dismissal] = await db
    .select({
      id: supportModalDismissals.id,
      dismissedAt: supportModalDismissals.dismissedAt,
      nextShowAfter: supportModalDismissals.nextShowAfter,
    })
    .from(supportModalDismissals)
    .where(eq(supportModalDismissals.userId, input.userId))
    .limit(1)

  return dismissal ?? null
}
