'use server'

import { z } from 'zod'

import { createJournalForOwner, deleteJournalOwnedByUser } from '@/data/journals'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { JOURNAL_TITLE_MAX_LENGTH } from '@/lib/journal-constants'

export type CreateJournalInput = {
  title: string
  description: string
}

export type CreateJournalState = {
  error: string | null
  redirectTo: string | null
}

export type DeleteJournalInput = {
  journalId: string
}

export type DeleteJournalState = {
  error: string | null
  success: boolean
}

const createJournalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(JOURNAL_TITLE_MAX_LENGTH, 'Title must be 180 characters or less.'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or less.'),
})

const deleteJournalSchema = z.object({
  journalId: z.string().uuid('Invalid journal id.'),
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

export async function deleteJournalAction(
  input: DeleteJournalInput,
): Promise<DeleteJournalState> {
  const currentUser = await getCurrentAppUser()

  if (!currentUser) {
    return {
      error: 'You must be signed in to delete a journal.',
      success: false,
    }
  }

  const parsedInput = deleteJournalSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? 'Unable to delete journal.',
      success: false,
    }
  }

  const deleted = await deleteJournalOwnedByUser({
    userId: currentUser.id,
    journalId: parsedInput.data.journalId,
  })

  if (!deleted) {
    return {
      error: 'Journal not found or you do not have permission to delete it.',
      success: false,
    }
  }

  return {
    error: null,
    success: true,
  }
}
