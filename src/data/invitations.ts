import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { journalInvitations, journalMembers } from '@/db/schema'

export type CreateJournalInvitationInput = {
  inviterUserId: string
  journalId: string
  inviteeEmail: string
}

export type CreateJournalInvitationResult =
  | {
      ok: true
      invitationId: string
      inviteToken: string
      inviteeEmail: string
      expiresAt: Date
    }
  | {
      ok: false
      error: 'FORBIDDEN' | 'INVALID_EMAIL'
      message: string
    }

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string): boolean {
  // Lightweight validation for server action payloads.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function buildInviteToken(): string {
  return `inv_${crypto.randomUUID().replaceAll('-', '')}`
}

export async function createJournalInvitation({
  inviterUserId,
  journalId,
  inviteeEmail,
}: CreateJournalInvitationInput): Promise<CreateJournalInvitationResult> {
  const normalizedEmail = normalizeEmail(inviteeEmail)

  if (!isValidEmail(normalizedEmail)) {
    return {
      ok: false,
      error: 'INVALID_EMAIL',
      message: 'Please provide a valid email address.',
    }
  }

  const [ownerMembership] = await db
    .select({ id: journalMembers.id })
    .from(journalMembers)
    .where(
      and(
        eq(journalMembers.journalId, journalId),
        eq(journalMembers.userId, inviterUserId),
        eq(journalMembers.role, 'owner'),
      ),
    )
    .limit(1)

  if (!ownerMembership) {
    return {
      ok: false,
      error: 'FORBIDDEN',
      message: 'Only journal owners can invite members.',
    }
  }

  await db
    .update(journalInvitations)
    .set({ status: 'revoked' })
    .where(
      and(
        eq(journalInvitations.journalId, journalId),
        eq(journalInvitations.inviteeEmail, normalizedEmail),
        eq(journalInvitations.status, 'pending'),
      ),
    )

  const inviteToken = buildInviteToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const [createdInvitation] = await db
    .insert(journalInvitations)
    .values({
      journalId,
      inviterUserId,
      inviteeEmail: normalizedEmail,
      inviteToken,
      role: 'editor',
      status: 'pending',
      expiresAt,
    })
    .returning({
      invitationId: journalInvitations.id,
      inviteToken: journalInvitations.inviteToken,
      inviteeEmail: journalInvitations.inviteeEmail,
      expiresAt: journalInvitations.expiresAt,
    })

  return {
    ok: true,
    invitationId: createdInvitation.invitationId,
    inviteToken: createdInvitation.inviteToken,
    inviteeEmail: createdInvitation.inviteeEmail,
    expiresAt: createdInvitation.expiresAt,
  }
}
