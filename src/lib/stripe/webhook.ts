import { getStripeServerClient } from '@/lib/stripe/server-client'

function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.')
  }

  return webhookSecret
}

export function constructStripeWebhookEvent(payload: string, signature: string) {
  const stripe = getStripeServerClient()

  return stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret())
}
