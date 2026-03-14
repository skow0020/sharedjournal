'use server'

import { z } from 'zod'

import {
  acceptJournalInvitation,
  declineJournalInvitation,
} from '@/data/invitations'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { getCurrentUserEmail } from '@/lib/get-current-user-email'

export type InvitationActionInput = {
  token: string
}

export type InvitationActionResult = {
  redirectTo: string
}

const invitationActionSchema = z.object({
  token: z.string().trim().min(1, 'Invitation token is required.'),
})

export async function acceptInvitationAction(
  input: InvitationActionInput,
): Promise<InvitationActionResult> {
  const parsedInput = invitationActionSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      redirectTo: '/dashboard',
    }
  }

  const token = parsedInput.data.token
  const appUser = await getCurrentAppUser()
  const email = await getCurrentUserEmail()

  if (!appUser || !email) {
    return {
      redirectTo: `/invitations/${token}`,
    }
  }

  const result = await acceptJournalInvitation({
    token,
    acceptingUserId: appUser.id,
    acceptingEmail: email,
  })

  if (!result.ok) {
    return {
      redirectTo: `/invitations/${token}`,
    }
  }

  return {
    redirectTo: `/dashboard/journals/${result.journalId}`,
  }
}

export async function declineInvitationAction(
  input: InvitationActionInput,
): Promise<InvitationActionResult> {
  const parsedInput = invitationActionSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      redirectTo: '/dashboard',
    }
  }

  const token = parsedInput.data.token
  const email = await getCurrentUserEmail()

  if (!email) {
    return {
      redirectTo: `/invitations/${token}`,
    }
  }

  await declineJournalInvitation({
    token,
    decliningEmail: email,
  })

  return {
    redirectTo: '/dashboard',
  }
}