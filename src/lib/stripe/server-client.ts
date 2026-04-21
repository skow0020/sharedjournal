import Stripe from 'stripe'

let stripeClient: Stripe | null = null

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

  stripeClient = new Stripe(getStripeSecretKey())
  return stripeClient
}
