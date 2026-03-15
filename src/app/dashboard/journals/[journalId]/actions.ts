'use server'

import { del } from '@vercel/blob'
import { currentUser as getClerkCurrentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createEntryWithUploadedImagesForJournal } from '@/data/entries'
import {
  createJournalInvitation,
  setInvitationEmailDeliveryFlag,
} from '@/data/invitations'
import { getUserJournalById, updateJournalTitleForOwner } from '@/data/journals'
import { ENTRY_IMAGE_ALLOWED_MIME_TYPES, ENTRY_IMAGE_MAX_FILES } from '@/lib/entry-image-constants'
import { isTempEntryImageStorageKeyForJournal } from '@/lib/entry-image-storage'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { sendInviteEmail } from '@/lib/invitations/send-invite-email'
import { JOURNAL_TITLE_MAX_LENGTH } from '@/lib/journal-constants'

export type UploadedEntryImageInput = {
  tempStorageKey: string
  fileName: string
  mimeType: string
  width: number | null
  height: number | null
}

export type CreateEntryInput = {
  journalId: string
  title: string
  content: string
  entryDate: string
  uploadedImages?: UploadedEntryImageInput[]
}

export type CreateEntryState = {
  error: string | null
  redirectTo: string | null
}

export type CleanupEntryImageUploadsInput = {
  journalId: string
  storageKeys: string[]
}

export type CleanupEntryImageUploadsState = {
  error: string | null
}

export type InviteUserInput = {
  journalId: string
  journalTitle: string
  email: string
}

export type UpdateJournalTitleInput = {
  journalId: string
  title: string
}

export type InviteActionState = {
  error: string | null
  successMessage: string | null
  inviteLink: string | null
}

export type UpdateJournalTitleState = {
  error: string | null
}

const createEntrySchema = z.object({
  journalId: z.string().trim().min(1, 'Journal is required.'),
  title: z.string().trim().max(220, 'Title must be 220 characters or less.'),
  content: z.string().trim().min(1, 'Content is required.'),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Entry date is invalid.'),
  uploadedImages: z
    .array(
      z.object({
        tempStorageKey: z.string().trim().min(1, 'Uploaded image path is required.'),
        fileName: z.string().trim().min(1, 'Uploaded image file name is required.'),
        mimeType: z
          .string()
          .refine(
            (value) =>
              ENTRY_IMAGE_ALLOWED_MIME_TYPES.includes(
                value as (typeof ENTRY_IMAGE_ALLOWED_MIME_TYPES)[number],
              ),
            'Unsupported image type.',
          ),
        width: z.number().int().positive().nullable(),
        height: z.number().int().positive().nullable(),
      }),
    )
    .max(ENTRY_IMAGE_MAX_FILES, `You can upload up to ${ENTRY_IMAGE_MAX_FILES} images per entry.`)
    .default([]),
})

const cleanupEntryImageUploadsSchema = z.object({
  journalId: z.string().trim().min(1, 'Journal is required.'),
  storageKeys: z
    .array(z.string().trim().min(1, 'Storage key is required.'))
    .max(ENTRY_IMAGE_MAX_FILES, `You can upload up to ${ENTRY_IMAGE_MAX_FILES} images per entry.`),
})

const inviteUserSchema = z.object({
  journalId: z.string().trim().min(1, 'Journal is required.'),
  journalTitle: z.string().trim().min(1, 'Journal title is required.'),
  email: z.string().trim().email('Please provide a valid email address.').transform((value) => value.toLowerCase()),
})

const updateJournalTitleSchema = z.object({
  journalId: z.string().trim().min(1, 'Journal is required.'),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(JOURNAL_TITLE_MAX_LENGTH, 'Title must be 180 characters or less.'),
})

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://sharedjournal.app'
  }

  return 'http://localhost:3000'
}

export async function createEntryAction(
  input: CreateEntryInput,
): Promise<CreateEntryState> {
  const currentUser = await getCurrentAppUser()

  if (!currentUser) {
    return {
      error: 'You must be signed in to create an entry.',
      redirectTo: null,
    }
  }

  const parsedInput = createEntrySchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? 'Unable to create entry.',
      redirectTo: null,
    }
  }

  const hasInvalidStorageKey = parsedInput.data.uploadedImages.some(
    (image) => !isTempEntryImageStorageKeyForJournal(image.tempStorageKey, parsedInput.data.journalId),
  )

  if (hasInvalidStorageKey) {
    return {
      error: 'One or more uploaded images are invalid for this journal.',
      redirectTo: null,
    }
  }

  const createdEntry = await createEntryWithUploadedImagesForJournal({
    userId: currentUser.id,
    journalId: parsedInput.data.journalId,
    title: parsedInput.data.title || null,
    content: parsedInput.data.content,
    entryDate: parsedInput.data.entryDate,
    uploadedImages: parsedInput.data.uploadedImages,
  })

  if (!createdEntry) {
    return {
      error: 'You do not have permission to add entries to this journal.',
      redirectTo: null,
    }
  }

  return {
    error: null,
    redirectTo: `/dashboard/journals/${parsedInput.data.journalId}`,
  }
}

export async function cleanupEntryImageUploadsAction(
  input: CleanupEntryImageUploadsInput,
): Promise<CleanupEntryImageUploadsState> {
  const currentUser = await getCurrentAppUser()

  if (!currentUser) {
    return {
      error: 'You must be signed in to remove uploaded images.',
    }
  }

  const parsedInput = cleanupEntryImageUploadsSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? 'Unable to remove uploaded images.',
    }
  }

  if (parsedInput.data.storageKeys.length === 0) {
    return {
      error: null,
    }
  }

  const journal = await getUserJournalById(currentUser.id, parsedInput.data.journalId)

  if (!journal) {
    return {
      error: 'You do not have permission to remove uploaded images for this journal.',
    }
  }

  const hasInvalidStorageKey = parsedInput.data.storageKeys.some(
    (storageKey) => !isTempEntryImageStorageKeyForJournal(storageKey, parsedInput.data.journalId),
  )

  if (hasInvalidStorageKey) {
    return {
      error: 'One or more image paths are invalid for this journal.',
    }
  }

  await del(parsedInput.data.storageKeys)

  return {
    error: null,
  }
}

export async function createInviteAction(
  input: InviteUserInput,
): Promise<InviteActionState> {
  const currentUser = await getCurrentAppUser()

  if (!currentUser) {
    return {
      error: 'You must be signed in to invite users.',
      successMessage: null,
      inviteLink: null,
    }
  }

  const parsedInput = inviteUserSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? 'Unable to create invitation.',
      successMessage: null,
      inviteLink: null,
    }
  }

  const result = await createJournalInvitation({
    inviterUserId: currentUser.id,
    journalId: parsedInput.data.journalId,
    inviteeEmail: parsedInput.data.email,
  })

  if (!result.ok) {
    return {
      error: result.message,
      successMessage: null,
      inviteLink: null,
    }
  }

  const inviteLinkPath = `/invitations/${result.inviteToken}`
  const inviteLink = `${getAppBaseUrl()}${inviteLinkPath}`
  const clerkUser = await getClerkCurrentUser()
  const inviterName = clerkUser?.fullName ?? clerkUser?.username ?? null

  const emailSendResult = await sendInviteEmail({
    toEmail: result.inviteeEmail,
    inviteLink,
    journalTitle: parsedInput.data.journalTitle,
    inviterName,
  })

  const successMessage = emailSendResult.delivered
    ? `Invitation sent to ${result.inviteeEmail}.`
    : `Invitation created for ${result.inviteeEmail}. Copy the link below to share.`

  await setInvitationEmailDeliveryFlag({
    invitationId: result.invitationId,
    emailDelivered: emailSendResult.delivered,
  })

  return {
    error: null,
    successMessage,
    inviteLink,
  }
}

export async function updateJournalTitleAction(
  input: UpdateJournalTitleInput,
): Promise<UpdateJournalTitleState> {
  const currentUser = await getCurrentAppUser()

  if (!currentUser) {
    return {
      error: 'You must be signed in to update this journal.',
    }
  }

  const parsedInput = updateJournalTitleSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? 'Unable to update journal title.',
    }
  }

  const updated = await updateJournalTitleForOwner({
    ownerUserId: currentUser.id,
    journalId: parsedInput.data.journalId,
    title: parsedInput.data.title,
  })

  if (!updated) {
    return {
      error: 'You do not have permission to update this journal.',
    }
  }

  revalidatePath(`/dashboard/journals/${parsedInput.data.journalId}`)

  return {
    error: null,
  }
}
