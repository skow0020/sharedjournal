import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createSupportPaymentMock,
  getCurrentAppUserMock,
  getCurrentUserEmailMock,
  stripeCheckoutCreateMock,
  getStripeServerClientMock,
} = vi.hoisted(() => ({
  createSupportPaymentMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
  getCurrentUserEmailMock: vi.fn(),
  stripeCheckoutCreateMock: vi.fn(),
  getStripeServerClientMock: vi.fn(),
}))

vi.mock('@/data/support-payments', () => ({
  createSupportPayment: createSupportPaymentMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/lib/get-current-user-email', () => ({
  getCurrentUserEmail: getCurrentUserEmailMock,
}))

vi.mock('@/lib/stripe/server-client', () => ({
  getStripeServerClient: getStripeServerClientMock,
}))

import { createSupportCheckoutAction } from '@/app/support/actions'

describe('createSupportCheckoutAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.NEXT_PUBLIC_APP_URL = 'https://sharedjournal.test'

    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getCurrentUserEmailMock.mockResolvedValue('user@example.com')

    stripeCheckoutCreateMock.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    })

    getStripeServerClientMock.mockReturnValue({
      checkout: {
        sessions: {
          create: stripeCheckoutCreateMock,
        },
      },
    })

    createSupportPaymentMock.mockResolvedValue({ id: 'payment-1' })
  })

  it('returns error when user is not signed in', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await createSupportCheckoutAction({ amountCents: 500 })

    expect(result).toEqual({
      error: 'You must be signed in to support SharedJournal.',
      checkoutUrl: null,
    })
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
  })

  it('returns error when user email is unavailable', async () => {
    getCurrentUserEmailMock.mockResolvedValue(null)

    const result = await createSupportCheckoutAction({ amountCents: 500 })

    expect(result).toEqual({
      error: 'Unable to find your account email for checkout.',
      checkoutUrl: null,
    })
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
  })

  it('validates supported amounts', async () => {
    const result = await createSupportCheckoutAction({ amountCents: 300 })

    expect(result).toEqual({
      error: 'Invalid support amount.',
      checkoutUrl: null,
    })
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
  })

  it('returns generic error when checkout URL is missing', async () => {
    stripeCheckoutCreateMock.mockResolvedValue({ id: 'cs_test_123', url: null })

    const result = await createSupportCheckoutAction({ amountCents: 500 })

    expect(result).toEqual({
      error: 'Unable to start checkout right now. Please try again.',
      checkoutUrl: null,
    })
  })

  it('creates checkout session and pending payment record', async () => {
    const result = await createSupportCheckoutAction({ amountCents: 2500 })

    expect(result).toEqual({
      error: null,
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123',
    })

    expect(stripeCheckoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        customer_email: 'user@example.com',
        success_url: 'https://sharedjournal.test/support/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://sharedjournal.test/support',
      }),
    )

    expect(createSupportPaymentMock).toHaveBeenCalledWith({
      userId: 'user-1',
      stripeCheckoutSessionId: 'cs_test_123',
      amountCents: 2500,
      currency: 'usd',
      customerEmail: 'user@example.com',
    })
  })
})
