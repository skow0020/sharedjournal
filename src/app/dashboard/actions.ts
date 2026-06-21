'use server'

import { z } from 'zod'

import { buildOwnerJournalsExportPayload } from '@/data/exports'
import { createJournalForOwner, deleteJournalOwnedByUser } from '@/data/journals'
import { createExportDownloadToken } from '@/lib/export-link-token'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { getCurrentUserEmail } from '@/lib/get-current-user-email'
import { createOwnerJournalsExportZipAndUpload } from '@/lib/journal-export'
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

export type DashboardInvitationActionInput = {
  token: string
}

export type DashboardAcceptInvitationState = {
  error: string | null
  redirectTo: string | null
}

export type DashboardDeclineInvitationState = {
  error: string | null
  success: boolean
}

export type GenerateOwnerExportInput = Record<string, never>

export type GenerateOwnerExportState = {
  error: string | null
  downloadUrl: string | null
  expiresAt: string | null
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

const dashboardInvitationActionSchema = z.object({
  token: z.string().trim().min(1, 'Invitation token is required.'),
})

const generateOwnerExportSchema = z.object({}).strict()

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

export async function acceptDashboardInvitationAction(
  input: DashboardInvitationActionInput,
): Promise<DashboardAcceptInvitationState> {
  const parsedInput = dashboardInvitationActionSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? 'Unable to accept invitation.',
      redirectTo: null,
    }
  }

  const appUser = await getCurrentAppUser()
  const email = await getCurrentUserEmail()

  if (!appUser || !email) {
    return {
      error: 'You must be signed in with the invited email to accept this invitation.',
      redirectTo: `/invitations/${parsedInput.data.token}`,
    }
  }

  const { acceptJournalInvitation } = await import('@/data/invitations')

  const result = await acceptJournalInvitation({
    token: parsedInput.data.token,
    acceptingUserId: appUser.id,
    acceptingEmail: email,
  })

  if (!result.ok) {
    return {
      error: result.message,
      redirectTo: `/invitations/${parsedInput.data.token}`,
    }
  }

  return {
    error: null,
    redirectTo: `/dashboard/journals/${result.journalId}`,
  }
}

export async function declineDashboardInvitationAction(
  input: DashboardInvitationActionInput,
): Promise<DashboardDeclineInvitationState> {
  const parsedInput = dashboardInvitationActionSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? 'Unable to decline invitation.',
      success: false,
    }
  }

  const email = await getCurrentUserEmail()

  if (!email) {
    return {
      error: 'You must be signed in with the invited email to decline this invitation.',
      success: false,
    }
  }

  const { declineJournalInvitation } = await import('@/data/invitations')

  const result = await declineJournalInvitation({
    token: parsedInput.data.token,
    decliningEmail: email,
  })

  if (!result.ok) {
    return {
      error: result.message,
      success: false,
    }
  }

  return {
    error: null,
    success: true,
  }
}

export async function generateOwnerExportAction(
  input: GenerateOwnerExportInput,
): Promise<GenerateOwnerExportState> {
  const currentUser = await getCurrentAppUser()

  if (!currentUser) {
    return {
      error: 'You must be signed in to export journals.',
      downloadUrl: null,
      expiresAt: null,
    }
  }

  const parsedInput = generateOwnerExportSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? 'Unable to generate export.',
      downloadUrl: null,
      expiresAt: null,
    }
  }

  try {
    const ownerEmail = await getCurrentUserEmail()
    const payload = await buildOwnerJournalsExportPayload({
      ownerUserId: currentUser.id,
      ownerEmail,
    })

    if (payload.journals.length === 0) {
      return {
        error: 'You do not have any owner journals to export.',
        downloadUrl: null,
        expiresAt: null,
      }
    }

    const uploadedExport = await createOwnerJournalsExportZipAndUpload({
      ownerUserId: currentUser.id,
      payload,
    })

    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000))
    const token = createExportDownloadToken({
      userId: currentUser.id,
      storageKey: uploadedExport.storageKey,
      fileName: uploadedExport.fileName,
      exp: Math.floor(expiresAt.getTime() / 1000),
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return {
      error: null,
      downloadUrl: `${baseUrl}/api/exports/download?token=${encodeURIComponent(token)}`,
      expiresAt: expiresAt.toISOString(),
    }
  } catch (error) {
    console.error('Failed to generate owner export', {
      userId: currentUser.id,
      error,
    })

    return {
      error: 'Unable to generate export right now. Please try again.',
      downloadUrl: null,
      expiresAt: null,
    }
  }
}
