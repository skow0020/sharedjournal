'use server'

import { z } from 'zod'

import { createSupportPayment } from '@/data/support-payments'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { getCurrentUserEmail } from '@/lib/get-current-user-email'
import { SUPPORT_AMOUNTS, type SupportAmountCents } from '@/lib/support-amounts'
import { getStripeServerClient } from '@/lib/stripe/server-client'

const supportAmountSchema = z
  .number()
  .int()
  .refine((value): value is SupportAmountCents =>
    SUPPORT_AMOUNTS.includes(value as SupportAmountCents),
  )

const supportCheckoutSchema = z.object({
  amountCents: supportAmountSchema,
})

export type CreateSupportCheckoutInput = {
  amountCents: number
}

export type CreateSupportCheckoutState = {
  error: string | null
  checkoutUrl: string | null
}

function resolveAppBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '')
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://sharedjournal.app'
  }

  return 'http://localhost:3000'
}

export async function createSupportCheckoutAction(
  input: CreateSupportCheckoutInput,
): Promise<CreateSupportCheckoutState> {
  const appUser = await getCurrentAppUser()

  if (!appUser) {
    return {
      error: 'You must be signed in to buy me a coffee.',
      checkoutUrl: null,
    }
  }

  const currentUserEmail = await getCurrentUserEmail()

  if (!currentUserEmail) {
    return {
      error: 'Unable to find your account email for checkout.',
      checkoutUrl: null,
    }
  }

  const parsedInput = supportCheckoutSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      error: 'Invalid support amount.',
      checkoutUrl: null,
    }
  }

  const stripe = getStripeServerClient()
  const baseUrl = resolveAppBaseUrl()

  let checkoutSession: { id: string; url: string | null }

  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'auto',
      customer_email: currentUserEmail,
      success_url: `${baseUrl}/buy-me-coffee/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/buy-me-coffee`,
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: parsedInput.data.amountCents,
            product_data: {
              name: 'Buy me a coffee',
              description: 'One-time coffee contribution',
            },
          },
        },
      ],
      metadata: {
        appUserId: appUser.id,
      },
    })
  } catch {
    return {
      error: 'Unable to start checkout right now. Please try again.',
      checkoutUrl: null,
    }
  }

  if (!checkoutSession.url) {
    return {
      error: 'Unable to start checkout right now. Please try again.',
      checkoutUrl: null,
    }
  }

  try {
    await createSupportPayment({
      userId: appUser.id,
      stripeCheckoutSessionId: checkoutSession.id,
      amountCents: parsedInput.data.amountCents,
      currency: 'usd',
      customerEmail: currentUserEmail,
    })
  } catch (error) {
    console.error('Failed to persist support payment after checkout session creation', {
      checkoutSessionId: checkoutSession.id,
      userId: appUser.id,
      error,
    })

    try {
      await stripe.checkout.sessions.expire(checkoutSession.id)
    } catch (expireError) {
      console.error('Failed to expire orphaned support checkout session', {
        checkoutSessionId: checkoutSession.id,
        error: expireError,
      })
    }

    return {
      error: 'Unable to start checkout right now. Please try again.',
      checkoutUrl: null,
    }
  }

  return {
    error: null,
    checkoutUrl: checkoutSession.url,
  }
}
