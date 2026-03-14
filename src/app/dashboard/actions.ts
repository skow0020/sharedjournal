'use server'

import { z } from 'zod'

import { createJournalForOwner } from '@/data/journals'
import { getCurrentAppUser } from '@/lib/get-current-app-user'

export type CreateJournalInput = {
  title: string
  description: string
}

export type CreateJournalState = {
  error: string | null
  redirectTo: string | null
}

const createJournalSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(180, 'Title must be 180 characters or less.'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or less.'),
})

export async function createJournalAction(
  input: CreateJournalInput,
): Promise<CreateJournalState> {
  const currentUser = await getCurrentAppUser()

  if (!currentUser) {
    return {
      error: 'You must be signed in to create a journal.',
      redirectTo: null,
    }
  }

  const parsedInput = createJournalSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? 'Unable to create journal.',
      redirectTo: null,
    }
  }

  const createdJournal = await createJournalForOwner({
    ownerUserId: currentUser.id,
    title: parsedInput.data.title,
    description: parsedInput.data.description || null,
  })

  return {
    error: null,
    redirectTo: `/dashboard/journals/${createdJournal.id}`,
  }
}