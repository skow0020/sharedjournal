import { and, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db'
import { journalInvitations, journalMembers, journals, users } from '@/db/schema'
import {
  acceptJournalInvitation,
  createJournalInvitation,
  declineJournalInvitation,
  getPendingInvitationsForEmail,
  getPendingInvitationsForOwnedJournal,
  getInvitationByToken,
  setInvitationEmailDeliveryFlag,
} from '@/data/invitations'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUser(overrides?: { clerkUserId?: string, displayName?: string }) {
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: overrides?.clerkUserId ?? `test_${crypto.randomUUID()}`,
      displayName: overrides?.displayName ?? 'Test User',
    })
    .returning({ id: users.id })

  return user
}

async function createJournal(ownerUserId: string, title = 'Test Journal') {
  const [journal] = await db
    .insert(journals)
    .values({ ownerUserId, title })
    .returning({ id: journals.id })

  return journal
}

async function addMember(
  journalId: string,
  userId: string,
  role: 'owner' | 'editor' | 'viewer' = 'editor',
) {
  await db.insert(journalMembers).values({ journalId, userId, role })
}

async function createInvitation(overrides: {
  journalId: string
  inviterUserId: string
  inviteeEmail: string
  status?: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'
  expiresAt?: Date
  role?: 'owner' | 'editor' | 'viewer'
}) {
  const token = `inv_${crypto.randomUUID().replaceAll('-', '')}`
  const expiresAt = overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const [invitation] = await db
    .insert(journalInvitations)
    .values({
      journalId: overrides.journalId,
      inviterUserId: overrides.inviterUserId,
      inviteeEmail: overrides.inviteeEmail,
      inviteToken: token,
      role: overrides.role ?? 'editor',
      status: overrides.status ?? 'pending',
      expiresAt,
    })
    .returning({ id: journalInvitations.id, inviteToken: journalInvitations.inviteToken })

  return invitation
}

// ---------------------------------------------------------------------------
// Teardown helpers
// ---------------------------------------------------------------------------

async function deleteJournals(ids: string[]) {
  for (const id of ids) {
    await db.delete(journals).where(eq(journals.id, id))
  }
}

async function deleteUsers(ids: string[]) {
  for (const id of ids) {
    await db.delete(users).where(eq(users.id, id))
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createJournalInvitation', () => {
  let ownerId: string
  let nonMemberId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const nonMember = await createUser({ displayName: 'Non Member' })

    ownerId = owner.id
    nonMemberId = nonMember.id

    const journal = await createJournal(ownerId, 'Invite Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, nonMemberId])
  })

  it('creates an invitation when inviter is the journal owner', async () => {
    const result = await createJournalInvitation({
      inviterUserId: ownerId,
      journalId,
      inviteeEmail: 'invitee@example.com',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.inviteToken).toMatch(/^inv_/)
    expect(result.inviteeEmail).toBe('invitee@example.com')
    expect(result.expiresAt).toBeInstanceOf(Date)

    // Verify the invitation is persisted
    const [row] = await db
      .select({ status: journalInvitations.status })
      .from(journalInvitations)
      .where(eq(journalInvitations.id, result.invitationId))

    expect(row.status).toBe('pending')
  })

  it('normalises invitee email to lowercase', async () => {
    const result = await createJournalInvitation({
      inviterUserId: ownerId,
      journalId,
      inviteeEmail: 'Invitee@Example.COM',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.inviteeEmail).toBe('invitee@example.com')
  })

  it('returns FORBIDDEN when the inviter is not the journal owner', async () => {
    const result = await createJournalInvitation({
      inviterUserId: nonMemberId,
      journalId,
      inviteeEmail: 'someone@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('FORBIDDEN')
  })

  it('returns INVALID_EMAIL for a malformed email', async () => {
    const result = await createJournalInvitation({
      inviterUserId: ownerId,
      journalId,
      inviteeEmail: 'not-an-email',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('INVALID_EMAIL')
  })

  it('revokes an existing pending invitation before creating a new one', async () => {
    // Seed an existing pending invitation
    await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'repeat@example.com',
      status: 'pending',
    })

    const result = await createJournalInvitation({
      inviterUserId: ownerId,
      journalId,
      inviteeEmail: 'repeat@example.com',
    })

    expect(result.ok).toBe(true)

    // The old invitation should now be revoked
    const revokedRows = await db
      .select({ status: journalInvitations.status })
      .from(journalInvitations)
      .where(
        and(
          eq(journalInvitations.journalId, journalId),
          eq(journalInvitations.inviteeEmail, 'repeat@example.com'),
          eq(journalInvitations.status, 'revoked'),
        ),
      )

    expect(revokedRows).toHaveLength(1)
  })
})

describe('getInvitationByToken', () => {
  let ownerId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    ownerId = owner.id

    const journal = await createJournal(ownerId, 'Token Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId])
  })

  it('returns not-found for an unknown token', async () => {
    const result = await getInvitationByToken('inv_doesnotexist')

    expect(result.state).toBe('not-found')
  })

  it('returns ready state for a valid pending invitation', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'reader@example.com',
    })

    const result = await getInvitationByToken(invitation.inviteToken)

    expect(result.state).toBe('ready')
    if (result.state !== 'ready') return
    expect(result.invitation.inviteeEmail).toBe('reader@example.com')
    expect(result.invitation.journalTitle).toBe('Token Journal')
  })

  it('returns unavailable state for an accepted invitation', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'accepted@example.com',
      status: 'accepted',
    })

    const result = await getInvitationByToken(invitation.inviteToken)

    expect(result.state).toBe('unavailable')
  })

  it('returns unavailable state for a revoked invitation', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'revoked@example.com',
      status: 'revoked',
    })

    const result = await getInvitationByToken(invitation.inviteToken)

    expect(result.state).toBe('unavailable')
  })

  it('returns expired state and updates status for an expired invitation', async () => {
    const pastDate = new Date(Date.now() - 1000)
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'expired@example.com',
      expiresAt: pastDate,
    })

    const result = await getInvitationByToken(invitation.inviteToken)

    expect(result.state).toBe('expired')

    // Verify the status was updated in the database
    const [row] = await db
      .select({ status: journalInvitations.status })
      .from(journalInvitations)
      .where(eq(journalInvitations.id, invitation.id))

    expect(row.status).toBe('expired')
  })
})

describe('acceptJournalInvitation', () => {
  let ownerId: string
  let acceptorId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const acceptor = await createUser({ displayName: 'Acceptor' })

    ownerId = owner.id
    acceptorId = acceptor.id

    const journal = await createJournal(ownerId, 'Accept Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, acceptorId])
  })

  it('accepts the invitation and creates a journal membership', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'acceptor@example.com',
    })

    const result = await acceptJournalInvitation({
      token: invitation.inviteToken,
      acceptingUserId: acceptorId,
      acceptingEmail: 'acceptor@example.com',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.journalId).toBe(journalId)

    // Verify membership was created
    const [membership] = await db
      .select({ role: journalMembers.role })
      .from(journalMembers)
      .where(
        and(eq(journalMembers.journalId, journalId), eq(journalMembers.userId, acceptorId)),
      )

    expect(membership.role).toBe('editor')

    // Verify invitation status updated
    const [inv] = await db
      .select({ status: journalInvitations.status })
      .from(journalInvitations)
      .where(eq(journalInvitations.id, invitation.id))

    expect(inv.status).toBe('accepted')
  })

  it('returns NOT_FOUND for an unknown token', async () => {
    const result = await acceptJournalInvitation({
      token: 'inv_unknown',
      acceptingUserId: acceptorId,
      acceptingEmail: 'acceptor@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('NOT_FOUND')
  })

  it('returns EXPIRED for an expired invitation', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'acceptor@example.com',
      expiresAt: new Date(Date.now() - 1000),
    })

    const result = await acceptJournalInvitation({
      token: invitation.inviteToken,
      acceptingUserId: acceptorId,
      acceptingEmail: 'acceptor@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('EXPIRED')
  })

  it('returns NOT_PENDING for a non-pending invitation', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'acceptor@example.com',
      status: 'revoked',
    })

    const result = await acceptJournalInvitation({
      token: invitation.inviteToken,
      acceptingUserId: acceptorId,
      acceptingEmail: 'acceptor@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('NOT_PENDING')
  })

  it('returns EMAIL_MISMATCH when accepting email does not match', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'correct@example.com',
    })

    const result = await acceptJournalInvitation({
      token: invitation.inviteToken,
      acceptingUserId: acceptorId,
      acceptingEmail: 'wrong@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('EMAIL_MISMATCH')
  })

  it('does not create a duplicate membership when user is already a member', async () => {
    await addMember(journalId, acceptorId, 'viewer')

    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'acceptor@example.com',
    })

    const result = await acceptJournalInvitation({
      token: invitation.inviteToken,
      acceptingUserId: acceptorId,
      acceptingEmail: 'acceptor@example.com',
    })

    expect(result.ok).toBe(true)

    const memberships = await db
      .select({ id: journalMembers.id })
      .from(journalMembers)
      .where(
        and(eq(journalMembers.journalId, journalId), eq(journalMembers.userId, acceptorId)),
      )

    expect(memberships).toHaveLength(1)
  })
})

describe('declineJournalInvitation', () => {
  let ownerId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    ownerId = owner.id

    const journal = await createJournal(ownerId, 'Decline Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId])
  })

  it('declines the invitation and updates status', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'decliner@example.com',
    })

    const result = await declineJournalInvitation({
      token: invitation.inviteToken,
      decliningEmail: 'decliner@example.com',
    })

    expect(result.ok).toBe(true)

    const [row] = await db
      .select({ status: journalInvitations.status })
      .from(journalInvitations)
      .where(eq(journalInvitations.id, invitation.id))

    expect(row.status).toBe('declined')
  })

  it('returns NOT_FOUND for an unknown token', async () => {
    const result = await declineJournalInvitation({
      token: 'inv_unknown',
      decliningEmail: 'decliner@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('NOT_FOUND')
  })

  it('returns EXPIRED for an expired invitation', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'decliner@example.com',
      expiresAt: new Date(Date.now() - 1000),
    })

    const result = await declineJournalInvitation({
      token: invitation.inviteToken,
      decliningEmail: 'decliner@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('EXPIRED')
  })

  it('returns EMAIL_MISMATCH when decliging email does not match', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'correct@example.com',
    })

    const result = await declineJournalInvitation({
      token: invitation.inviteToken,
      decliningEmail: 'wrong@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('EMAIL_MISMATCH')
  })
})

describe('getPendingInvitationsForEmail', () => {
  let ownerId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    ownerId = owner.id

    const journal = await createJournal(ownerId, 'Email Invites Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId])
  })

  it('returns pending invitations for the given email', async () => {
    await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'recipient@example.com',
    })

    const result = await getPendingInvitationsForEmail('recipient@example.com')

    expect(result).toHaveLength(1)
    expect(result[0].journalTitle).toBe('Email Invites Journal')
    expect(result[0].inviteToken).toMatch(/^inv_/)
  })

  it('returns empty array when no pending invitations exist', async () => {
    const result = await getPendingInvitationsForEmail('nobody@example.com')

    expect(result).toHaveLength(0)
  })

  it('excludes accepted invitations', async () => {
    await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'accepted@example.com',
      status: 'accepted',
    })

    const result = await getPendingInvitationsForEmail('accepted@example.com')

    expect(result).toHaveLength(0)
  })

  it('filters out and expires invitations past their expiry date', async () => {
    const expiredInv = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'mixed@example.com',
      expiresAt: new Date(Date.now() - 1000),
    })
    await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'mixed@example.com',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    const result = await getPendingInvitationsForEmail('mixed@example.com')

    // Only the active one is returned
    expect(result).toHaveLength(1)

    // The expired one should have been updated in the database
    const [row] = await db
      .select({ status: journalInvitations.status })
      .from(journalInvitations)
      .where(eq(journalInvitations.id, expiredInv.id))

    expect(row.status).toBe('expired')
  })

  it('is case-insensitive for email lookup', async () => {
    await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'case@example.com',
    })

    const result = await getPendingInvitationsForEmail('CASE@EXAMPLE.COM')

    expect(result).toHaveLength(1)
  })
})

describe('getPendingInvitationsForOwnedJournal', () => {
  let ownerId: string
  let nonOwnerId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    const nonOwner = await createUser({ displayName: 'Non Owner' })

    ownerId = owner.id
    nonOwnerId = nonOwner.id

    const journal = await createJournal(ownerId, 'Owned Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
    await addMember(journalId, nonOwnerId, 'editor')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId, nonOwnerId])
  })

  it('returns pending invitations for the journal owner', async () => {
    await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'guest@example.com',
    })

    const result = await getPendingInvitationsForOwnedJournal({ ownerUserId: ownerId, journalId })

    expect(result).toHaveLength(1)
    expect(result[0].inviteeEmail).toBe('guest@example.com')
    expect(result[0].emailDelivered).toBe(false)
  })

  it('returns empty array for a non-owner member', async () => {
    await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'guest@example.com',
    })

    const result = await getPendingInvitationsForOwnedJournal({
      ownerUserId: nonOwnerId,
      journalId,
    })

    expect(result).toHaveLength(0)
  })

  it('excludes non-pending invitations', async () => {
    await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'declined@example.com',
      status: 'declined',
    })

    const result = await getPendingInvitationsForOwnedJournal({ ownerUserId: ownerId, journalId })

    expect(result).toHaveLength(0)
  })
})

describe('setInvitationEmailDeliveryFlag', () => {
  let ownerId: string
  let journalId: string

  beforeEach(async () => {
    const owner = await createUser({ displayName: 'Owner' })
    ownerId = owner.id

    const journal = await createJournal(ownerId, 'Email Flag Journal')
    journalId = journal.id

    await addMember(journalId, ownerId, 'owner')
  })

  afterEach(async () => {
    await deleteJournals([journalId])
    await deleteUsers([ownerId])
  })

  it('sets emailDelivered to true', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'flagged@example.com',
    })

    await setInvitationEmailDeliveryFlag({ invitationId: invitation.id, emailDelivered: true })

    const [row] = await db
      .select({ emailDelivered: journalInvitations.emailDelivered })
      .from(journalInvitations)
      .where(eq(journalInvitations.id, invitation.id))

    expect(row.emailDelivered).toBe(true)
  })

  it('sets emailDelivered to false', async () => {
    const invitation = await createInvitation({
      journalId,
      inviterUserId: ownerId,
      inviteeEmail: 'unflagged@example.com',
      // Default is false; insert as true and then reset
    })

    // First set to true
    await setInvitationEmailDeliveryFlag({ invitationId: invitation.id, emailDelivered: true })
    // Then set back to false
    await setInvitationEmailDeliveryFlag({ invitationId: invitation.id, emailDelivered: false })

    const [row] = await db
      .select({ emailDelivered: journalInvitations.emailDelivered })
      .from(journalInvitations)
      .where(eq(journalInvitations.id, invitation.id))

    expect(row.emailDelivered).toBe(false)
  })
})
