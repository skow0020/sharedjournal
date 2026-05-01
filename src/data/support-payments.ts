import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { supportPayments } from '@/db/schema'

type CreateSupportPaymentInput = {
  userId: string
  stripeCheckoutSessionId: string
  amountCents: number
  currency: string
  customerEmail: string
}

type CompleteSupportPaymentInput = {
  stripeCheckoutSessionId: string
  stripePaymentIntentId: string | null
}

type FailSupportPaymentInput = {
  stripeCheckoutSessionId: string
  failureMessage: string | null
}

type CancelSupportPaymentInput = {
  stripeCheckoutSessionId: string
}

export async function createSupportPayment(input: CreateSupportPaymentInput): Promise<{ id: string }> {
  const [createdPayment] = await db
    .insert(supportPayments)
    .values({
      userId: input.userId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      amountCents: input.amountCents,
      currency: input.currency,
      customerEmail: input.customerEmail,
      status: 'pending',
    })
    .returning({ id: supportPayments.id })

  return createdPayment
}

export async function completeSupportPayment(input: CompleteSupportPaymentInput): Promise<boolean> {
  const [updatedPayment] = await db
    .update(supportPayments)
    .set({
      status: 'completed',
      stripePaymentIntentId: input.stripePaymentIntentId,
      failureMessage: null,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(supportPayments.stripeCheckoutSessionId, input.stripeCheckoutSessionId),
        eq(supportPayments.status, 'pending'),
      ),
    )
    .returning({ id: supportPayments.id })

  return Boolean(updatedPayment)
}

export async function failSupportPayment(input: FailSupportPaymentInput): Promise<boolean> {
  const [updatedPayment] = await db
    .update(supportPayments)
    .set({
      status: 'failed',
      failureMessage: input.failureMessage,
    })
    .where(
      and(
        eq(supportPayments.stripeCheckoutSessionId, input.stripeCheckoutSessionId),
        eq(supportPayments.status, 'pending'),
      ),
    )
    .returning({ id: supportPayments.id })

  return Boolean(updatedPayment)
}

export async function cancelSupportPayment(input: CancelSupportPaymentInput): Promise<boolean> {
  const [updatedPayment] = await db
    .update(supportPayments)
    .set({
      status: 'cancelled',
      failureMessage: null,
    })
    .where(
      and(
        eq(supportPayments.stripeCheckoutSessionId, input.stripeCheckoutSessionId),
        eq(supportPayments.status, 'pending'),
      ),
    )
    .returning({ id: supportPayments.id })

  return Boolean(updatedPayment)
}

export async function getSupportPaymentForUserByCheckoutSession(input: {
  userId: string
  stripeCheckoutSessionId: string
}): Promise<{
  id: string
  amountCents: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  createdAt: Date
  completedAt: Date | null
} | null> {
  const [payment] = await db
    .select({
      id: supportPayments.id,
      amountCents: supportPayments.amountCents,
      currency: supportPayments.currency,
      status: supportPayments.status,
      createdAt: supportPayments.createdAt,
      completedAt: supportPayments.completedAt,
    })
    .from(supportPayments)
    .where(
      and(
        eq(supportPayments.userId, input.userId),
        eq(supportPayments.stripeCheckoutSessionId, input.stripeCheckoutSessionId),
      ),
    )
    .orderBy(desc(supportPayments.createdAt))
    .limit(1)

  return payment ?? null
}
