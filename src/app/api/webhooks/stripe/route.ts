import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import {
  cancelSupportPayment,
  completeSupportPayment,
  failSupportPayment,
} from '@/data/support-payments'
import { constructStripeWebhookEvent } from '@/lib/stripe/webhook'

function getPaymentIntentId(value: Stripe.Checkout.Session['payment_intent']) {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  return value.id
}

function getFailureMessage(session: Stripe.Checkout.Session) {
  if (session.status === 'expired') {
    return 'Checkout session expired.'
  }

  return 'Payment did not complete.'
}

export async function POST(request: Request): Promise<NextResponse> {
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 })
  }

  const payload = await request.text()
  let event: Stripe.Event

  try {
    event = constructStripeWebhookEvent(payload, signature)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 })
  }

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session
      const paymentIntentId = getPaymentIntentId(session.payment_intent)

      await completeSupportPayment({
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      })
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session

      await failSupportPayment({
        stripeCheckoutSessionId: session.id,
        failureMessage: getFailureMessage(session),
      })
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session

      await cancelSupportPayment({
        stripeCheckoutSessionId: session.id,
      })
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}
