import { and, eq, sql } from 'drizzle-orm'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db'
import { supportPayments, users } from '@/db/schema'
import {
  cancelSupportPayment,
  completeSupportPayment,
  createSupportPayment,
  failSupportPayment,
  getSupportPaymentForUserByCheckoutSession,
} from '@/data/support-payments'

async function createUser(overrides?: { clerkUserId?: string }) {
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: overrides?.clerkUserId ?? `test_${crypto.randomUUID()}`,
      displayName: 'Support User',
    })
    .returning({ id: users.id })

  return user
}

async function createPendingPayment(input: {
  userId: string
  stripeCheckoutSessionId?: string
  amountCents?: number
  currency?: string
  customerEmail?: string
}) {
  const checkoutSessionId = input.stripeCheckoutSessionId ?? `cs_test_${crypto.randomUUID()}`

  const created = await createSupportPayment({
    userId: input.userId,
    stripeCheckoutSessionId: checkoutSessionId,
    amountCents: input.amountCents ?? 500,
    currency: input.currency ?? 'usd',
    customerEmail: input.customerEmail ?? 'supporter@example.com',
  })

  return {
    id: created.id,
    stripeCheckoutSessionId: checkoutSessionId,
  }
}

async function deleteUsers(ids: string[]) {
  const uniqueIds = [...new Set(ids)]

  for (const id of uniqueIds) {
    await db.delete(users).where(eq(users.id, id))
  }
}

describe('support payments data helpers', () => {
  const createdUserIds: string[] = []

  beforeAll(async () => {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_payment_status') THEN
          CREATE TYPE support_payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
        END IF;
      END
      $$;
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_checkout_session_id text NOT NULL,
        stripe_payment_intent_id text,
        amount_cents integer NOT NULL,
        currency varchar(3) DEFAULT 'usd' NOT NULL,
        status support_payment_status DEFAULT 'pending' NOT NULL,
        customer_email varchar(320) NOT NULL,
        failure_message text,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        completed_at timestamp with time zone
      );
    `)

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS support_payments_checkout_session_uidx
      ON support_payments (stripe_checkout_session_id);
    `)

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS support_payments_user_created_at_idx
      ON support_payments (user_id, created_at DESC);
    `)

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS support_payments_status_idx
      ON support_payments (status);
    `)
  })

  beforeEach(() => {
    createdUserIds.length = 0
  })

  afterEach(async () => {
    await deleteUsers(createdUserIds)
  })

  it('creates a pending support payment', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const checkoutSessionId = `cs_test_${crypto.randomUUID()}`
    const result = await createSupportPayment({
      userId: user.id,
      stripeCheckoutSessionId: checkoutSessionId,
      amountCents: 1200,
      currency: 'usd',
      customerEmail: 'donor@example.com',
    })

    const [row] = await db
      .select({
        id: supportPayments.id,
        amountCents: supportPayments.amountCents,
        currency: supportPayments.currency,
        status: supportPayments.status,
        customerEmail: supportPayments.customerEmail,
      })
      .from(supportPayments)
      .where(eq(supportPayments.id, result.id))

    expect(row.id).toBe(result.id)
    expect(row.amountCents).toBe(1200)
    expect(row.currency).toBe('usd')
    expect(row.status).toBe('pending')
    expect(row.customerEmail).toBe('donor@example.com')
  })

  it('completes a pending payment and stores completion fields', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const payment = await createPendingPayment({ userId: user.id })

    const completed = await completeSupportPayment({
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
      stripePaymentIntentId: 'pi_123',
    })

    expect(completed).toBe(true)

    const [row] = await db
      .select({
        status: supportPayments.status,
        stripePaymentIntentId: supportPayments.stripePaymentIntentId,
        failureMessage: supportPayments.failureMessage,
        completedAt: supportPayments.completedAt,
      })
      .from(supportPayments)
      .where(eq(supportPayments.id, payment.id))

    expect(row.status).toBe('completed')
    expect(row.stripePaymentIntentId).toBe('pi_123')
    expect(row.failureMessage).toBeNull()
    expect(row.completedAt).toBeInstanceOf(Date)
  })

  it('returns false when attempting to complete a non-pending payment', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const payment = await createPendingPayment({ userId: user.id })

    await failSupportPayment({
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
      failureMessage: 'Card declined',
    })

    const completed = await completeSupportPayment({
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
      stripePaymentIntentId: 'pi_456',
    })

    expect(completed).toBe(false)
  })

  it('fails a pending payment and stores the failure message', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const payment = await createPendingPayment({ userId: user.id })

    const failed = await failSupportPayment({
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
      failureMessage: 'Payment authentication failed',
    })

    expect(failed).toBe(true)

    const [row] = await db
      .select({
        status: supportPayments.status,
        failureMessage: supportPayments.failureMessage,
      })
      .from(supportPayments)
      .where(eq(supportPayments.id, payment.id))

    expect(row.status).toBe('failed')
    expect(row.failureMessage).toBe('Payment authentication failed')
  })

  it('cancels a pending payment', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const payment = await createPendingPayment({ userId: user.id })

    const cancelled = await cancelSupportPayment({
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
    })

    expect(cancelled).toBe(true)

    const [row] = await db
      .select({
        status: supportPayments.status,
        failureMessage: supportPayments.failureMessage,
      })
      .from(supportPayments)
      .where(eq(supportPayments.id, payment.id))

    expect(row.status).toBe('cancelled')
    expect(row.failureMessage).toBeNull()
  })

  it('returns false when cancelling an unknown checkout session', async () => {
    const cancelled = await cancelSupportPayment({
      stripeCheckoutSessionId: `cs_missing_${crypto.randomUUID()}`,
    })

    expect(cancelled).toBe(false)
  })

  it('returns the payment for the matching user and checkout session', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const checkoutSessionId = `cs_test_${crypto.randomUUID()}`
    await createSupportPayment({
      userId: user.id,
      stripeCheckoutSessionId: checkoutSessionId,
      amountCents: 2500,
      currency: 'usd',
      customerEmail: 'match@example.com',
    })

    const result = await getSupportPaymentForUserByCheckoutSession({
      userId: user.id,
      stripeCheckoutSessionId: checkoutSessionId,
    })

    expect(result).not.toBeNull()
    expect(result?.amountCents).toBe(2500)
    expect(result?.currency).toBe('usd')
    expect(result?.status).toBe('pending')
    expect(result?.createdAt).toBeInstanceOf(Date)
    expect(result?.completedAt).toBeNull()
  })

  it('returns null when checkout session belongs to another user', async () => {
    const owner = await createUser()
    const otherUser = await createUser()
    createdUserIds.push(owner.id, otherUser.id)

    const checkoutSessionId = `cs_test_${crypto.randomUUID()}`
    await createSupportPayment({
      userId: owner.id,
      stripeCheckoutSessionId: checkoutSessionId,
      amountCents: 900,
      currency: 'usd',
      customerEmail: 'owner@example.com',
    })

    const result = await getSupportPaymentForUserByCheckoutSession({
      userId: otherUser.id,
      stripeCheckoutSessionId: checkoutSessionId,
    })

    expect(result).toBeNull()
  })

  it('keeps completed status unchanged when attempting to fail afterwards', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const payment = await createPendingPayment({ userId: user.id })

    await completeSupportPayment({
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
      stripePaymentIntentId: 'pi_complete',
    })

    const failed = await failSupportPayment({
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
      failureMessage: 'late failure',
    })

    expect(failed).toBe(false)

    const [row] = await db
      .select({
        status: supportPayments.status,
        failureMessage: supportPayments.failureMessage,
      })
      .from(supportPayments)
      .where(
        and(
          eq(supportPayments.id, payment.id),
          eq(supportPayments.userId, user.id),
        ),
      )

    expect(row.status).toBe('completed')
    expect(row.failureMessage).toBeNull()
  })
})
