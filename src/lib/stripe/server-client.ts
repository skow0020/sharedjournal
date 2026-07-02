import Stripe from 'stripe'

let stripeClient: Stripe | null = null
const STRIPE_API_VERSION = '2026-06-24.dahlia'

function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.')
  }

  return secretKey
}

export function getStripeServerClient(): Stripe {
  if (stripeClient) {
    return stripeClient
  }

  stripeClient = new Stripe(getStripeSecretKey(), {
    apiVersion: STRIPE_API_VERSION,
  })
  return stripeClient
}
