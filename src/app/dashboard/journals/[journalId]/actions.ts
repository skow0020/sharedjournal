'use server'

import { currentUser as getClerkCurrentUser } from '@clerk/nextjs/server'
import { z } from 'zod'

import { createEntryForJournal } from '@/data/entries'
import {
  createJournalInvitation,
  setInvitationEmailDeliveryFlag,
} from '@/data/invitations'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { sendInviteEmail } from '@/lib/invitations/send-invite-email'

export type CreateEntryInput = {
  journalId: string
  title: string
  content: string
  entryDate: string
}

export type CreateEntryState = {
  error: string | null
  redirectTo: string | null
}

export type InviteUserInput = {
  journalId: string
  journalTitle: string
  email: string
}

export type InviteActionState = {
  error: string | null
  successMessage: string | null
  inviteLink: string | null
}

const createEntrySchema = z.object({
  journalId: z.string().trim().min(1, 'Journal is required.'),
  title: z.string().trim().max(220, 'Title must be 220 characters or less.'),
  content: z.string().trim().min(1, 'Content is required.'),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Entry date is invalid.'),
})

const inviteUserSchema = z.object({
  journalId: z.string().trim().min(1, 'Journal is required.'),
  journalTitle: z.string().trim().min(1, 'Journal title is required.'),
  email: z.string().trim().email('Please provide a valid email address.').transform((value) => value.toLowerCase()),
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

  const createdEntry = await createEntryForJournal({
    userId: currentUser.id,
    journalId: parsedInput.data.journalId,
    title: parsedInput.data.title || null,
    content: parsedInput.data.content,
    entryDate: parsedInput.data.entryDate,
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