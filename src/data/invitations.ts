import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { journalInvitations, journalMembers, journals, users } from '@/db/schema'

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

export type InvitationDetails = {
  id: string
  journalId: string
  journalTitle: string
  inviteeEmail: string
  role: 'owner' | 'editor' | 'viewer'
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'
  expiresAt: Date
  inviterName: string | null
  createdAt: Date
}

export type InvitationLookupState =
  | InvitationNotFoundState
  | InvitationExpiredState
  | InvitationReadyState
  | InvitationUnavailableState

type InvitationNotFoundState = {
  state: 'not-found'
}

type InvitationExpiredState = {
  state: 'expired'
  invitation: InvitationDetails
}

type InvitationReadyState = {
  state: 'ready'
  invitation: InvitationDetails
}

type InvitationUnavailableState = {
  state: 'unavailable'
  invitation: InvitationDetails
}

export type AcceptJournalInvitationResult =
  | AcceptJournalInvitationSuccess
  | {
      ok: false
      error: 'NOT_FOUND' | 'EXPIRED' | 'EMAIL_MISMATCH' | 'NOT_PENDING'
      message: string
    }

type AcceptJournalInvitationSuccess = {
  ok: true
  journalId: string
}

export type DeclineJournalInvitationResult =
  | DeclineJournalInvitationSuccess
  | {
      ok: false
      error: 'NOT_FOUND' | 'EXPIRED' | 'EMAIL_MISMATCH' | 'NOT_PENDING'
      message: string
    }

type DeclineJournalInvitationSuccess = {
  ok: true
}

export type PendingInvitation = {
  id: string
  journalId: string
  journalTitle: string
  inviteToken: string
  role: 'owner' | 'editor' | 'viewer'
  inviterName: string | null
  expiresAt: Date
  createdAt: Date
}

export type PendingJournalInvitation = {
  id: string
  inviteeEmail: string
  role: 'owner' | 'editor' | 'viewer'
  expiresAt: Date
  createdAt: Date
  emailDelivered: boolean
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string): boolean {
  // Lightweight validation for server action payloads.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now()
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

export async function getInvitationByToken(token: string): Promise<InvitationLookupState> {
  const [invitation] = await db
    .select({
      id: journalInvitations.id,
      journalId: journalInvitations.journalId,
      journalTitle: journals.title,
      inviteeEmail: journalInvitations.inviteeEmail,
      role: journalInvitations.role,
      status: journalInvitations.status,
      expiresAt: journalInvitations.expiresAt,
      inviterName: users.displayName,
      createdAt: journalInvitations.createdAt,
    })
    .from(journalInvitations)
    .innerJoin(journals, eq(journals.id, journalInvitations.journalId))
    .leftJoin(users, eq(users.id, journalInvitations.inviterUserId))
    .where(eq(journalInvitations.inviteToken, token))
    .limit(1)

  if (!invitation) {
    return { state: 'not-found' }
  }

  if (invitation.status !== 'pending') {
    return {
      state: 'unavailable',
      invitation,
    }
  }

  if (isExpired(invitation.expiresAt)) {
    await db
      .update(journalInvitations)
      .set({ status: 'expired' })
      .where(
        and(
          eq(journalInvitations.id, invitation.id),
          eq(journalInvitations.status, 'pending'),
        ),
      )

    return {
      state: 'expired',
      invitation: {
        ...invitation,
        status: 'expired',
      },
    }
  }

  return {
    state: 'ready',
    invitation,
  }
}

export async function acceptJournalInvitation({
  token,
  acceptingUserId,
  acceptingEmail,
}: {
  token: string
  acceptingUserId: string
  acceptingEmail: string
}): Promise<AcceptJournalInvitationResult> {
  const lookup = await getInvitationByToken(token)

  if (lookup.state === 'not-found') {
    return {
      ok: false,
      error: 'NOT_FOUND',
      message: 'Invitation not found.',
    }
  }

  if (lookup.state === 'expired') {
    return {
      ok: false,
      error: 'EXPIRED',
      message: 'This invitation has expired.',
    }
  }

  if (lookup.state === 'unavailable') {
    return {
      ok: false,
      error: 'NOT_PENDING',
      message: 'This invitation is no longer pending.',
    }
  }

  const normalizedAcceptingEmail = normalizeEmail(acceptingEmail)

  if (normalizedAcceptingEmail !== normalizeEmail(lookup.invitation.inviteeEmail)) {
    return {
      ok: false,
      error: 'EMAIL_MISMATCH',
      message: 'You must sign in with the invited email address to accept this invitation.',
    }
  }

  const [existingMembership] = await db
    .select({ id: journalMembers.id })
    .from(journalMembers)
    .where(
      and(
        eq(journalMembers.journalId, lookup.invitation.journalId),
        eq(journalMembers.userId, acceptingUserId),
      ),
    )
    .limit(1)

  if (!existingMembership) {
    await db.insert(journalMembers).values({
      journalId: lookup.invitation.journalId,
      userId: acceptingUserId,
      role: lookup.invitation.role,
    })
  }

  await db
    .update(journalInvitations)
    .set({
      status: 'accepted',
      acceptedByUserId: acceptingUserId,
      acceptedAt: new Date(),
    })
    .where(
      and(
        eq(journalInvitations.id, lookup.invitation.id),
        eq(journalInvitations.status, 'pending'),
      ),
    )

  return {
    ok: true,
    journalId: lookup.invitation.journalId,
  }
}

export async function declineJournalInvitation({
  token,
  decliningEmail,
}: {
  token: string
  decliningEmail: string
}): Promise<DeclineJournalInvitationResult> {
  const lookup = await getInvitationByToken(token)

  if (lookup.state === 'not-found') {
    return {
      ok: false,
      error: 'NOT_FOUND',
      message: 'Invitation not found.',
    }
  }

  if (lookup.state === 'expired') {
    return {
      ok: false,
      error: 'EXPIRED',
      message: 'This invitation has expired.',
    }
  }

  if (lookup.state === 'unavailable') {
    return {
      ok: false,
      error: 'NOT_PENDING',
      message: 'This invitation is no longer pending.',
    }
  }

  if (normalizeEmail(decliningEmail) !== normalizeEmail(lookup.invitation.inviteeEmail)) {
    return {
      ok: false,
      error: 'EMAIL_MISMATCH',
      message: 'You must sign in with the invited email address to decline this invitation.',
    }
  }

  await db
    .update(journalInvitations)
    .set({ status: 'declined' })
    .where(
      and(
        eq(journalInvitations.id, lookup.invitation.id),
        eq(journalInvitations.status, 'pending'),
      ),
    )

  return { ok: true }
}

export async function getPendingInvitationsForEmail(email: string): Promise<PendingInvitation[]> {
  const normalizedEmail = normalizeEmail(email)

  const rows = await db
    .select({
      id: journalInvitations.id,
      journalId: journalInvitations.journalId,
      journalTitle: journals.title,
      inviteToken: journalInvitations.inviteToken,
      role: journalInvitations.role,
      inviterName: users.displayName,
      expiresAt: journalInvitations.expiresAt,
      createdAt: journalInvitations.createdAt,
    })
    .from(journalInvitations)
    .innerJoin(journals, eq(journals.id, journalInvitations.journalId))
    .leftJoin(users, eq(users.id, journalInvitations.inviterUserId))
    .where(
      and(
        eq(journalInvitations.inviteeEmail, normalizedEmail),
        eq(journalInvitations.status, 'pending'),
      ),
    )
    .orderBy(desc(journalInvitations.createdAt))

  const activeInvitations: PendingInvitation[] = []
  const expiredIds: string[] = []

  for (const row of rows) {
    if (isExpired(row.expiresAt)) {
      expiredIds.push(row.id)
      continue
    }

    activeInvitations.push(row)
  }

  for (const invitationId of expiredIds) {
    await db
      .update(journalInvitations)
      .set({ status: 'expired' })
      .where(
        and(
          eq(journalInvitations.id, invitationId),
          eq(journalInvitations.status, 'pending'),
        ),
      )
  }

  return activeInvitations
}

export async function setInvitationEmailDeliveryFlag({
  invitationId,
  emailDelivered,
}: {
  invitationId: string
  emailDelivered: boolean
}) {
  try {
    await db
      .update(journalInvitations)
      .set({ emailDelivered })
      .where(eq(journalInvitations.id, invitationId))
  } catch {
    // Keep invite creation resilient if database schema hasn't been migrated yet.
  }
}

export async function getPendingInvitationsForOwnedJournal({
  ownerUserId,
  journalId,
}: {
  ownerUserId: string
  journalId: string
}): Promise<PendingJournalInvitation[]> {
  const [ownerMembership] = await db
    .select({ id: journalMembers.id })
    .from(journalMembers)
    .where(
      and(
        eq(journalMembers.journalId, journalId),
        eq(journalMembers.userId, ownerUserId),
        eq(journalMembers.role, 'owner'),
      ),
    )
    .limit(1)

  if (!ownerMembership) {
    return []
  }

  try {
    return db
      .select({
        id: journalInvitations.id,
        inviteeEmail: journalInvitations.inviteeEmail,
        role: journalInvitations.role,
        expiresAt: journalInvitations.expiresAt,
        createdAt: journalInvitations.createdAt,
        emailDelivered: journalInvitations.emailDelivered,
      })
      .from(journalInvitations)
      .where(
        and(
          eq(journalInvitations.journalId, journalId),
          eq(journalInvitations.status, 'pending'),
        ),
      )
      .orderBy(desc(journalInvitations.createdAt))
  } catch {
    const rows = await db
      .select({
        id: journalInvitations.id,
        inviteeEmail: journalInvitations.inviteeEmail,
        role: journalInvitations.role,
        expiresAt: journalInvitations.expiresAt,
        createdAt: journalInvitations.createdAt,
      })
      .from(journalInvitations)
      .where(
        and(
          eq(journalInvitations.journalId, journalId),
          eq(journalInvitations.status, 'pending'),
        ),
      )
      .orderBy(desc(journalInvitations.createdAt))

    return rows.map((row) => ({
      ...row,
      emailDelivered: false,
    }))
  }
}
