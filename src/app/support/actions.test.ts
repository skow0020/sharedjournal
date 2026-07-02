import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createSupportPaymentMock,
  getCurrentAppUserMock,
  getCurrentUserEmailMock,
  stripeCheckoutCreateMock,
  stripeCheckoutExpireMock,
  getStripeServerClientMock,
} = vi.hoisted(() => ({
  createSupportPaymentMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
  getCurrentUserEmailMock: vi.fn(),
  stripeCheckoutCreateMock: vi.fn(),
  stripeCheckoutExpireMock: vi.fn(),
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
  const env = process.env as Record<string, string | undefined>
  const originalNodeEnv = process.env.NODE_ENV
  const originalNextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalAppUrl = process.env.APP_URL

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
          expire: stripeCheckoutExpireMock,
        },
      },
    })

    createSupportPaymentMock.mockResolvedValue({ id: 'payment-1' })
  })

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete env.NODE_ENV
    } else {
      env.NODE_ENV = originalNodeEnv
    }

    if (originalNextPublicAppUrl === undefined) {
      delete env.NEXT_PUBLIC_APP_URL
    } else {
      env.NEXT_PUBLIC_APP_URL = originalNextPublicAppUrl
    }

    if (originalAppUrl === undefined) {
      delete env.APP_URL
    } else {
      env.APP_URL = originalAppUrl
    }
  })

  it('returns error when user is not signed in', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const result = await createSupportCheckoutAction({ amountCents: 500 })

    expect(result).toEqual({
      error: 'You must be signed in to buy me a coffee.',
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
        success_url:
          'https://sharedjournal.test/buy-me-coffee/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://sharedjournal.test/buy-me-coffee',
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

  it('uses APP_URL when NEXT_PUBLIC_APP_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    process.env.APP_URL = 'https://app-url.test/'

    await createSupportCheckoutAction({ amountCents: 500 })

    expect(stripeCheckoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: 'https://app-url.test/buy-me-coffee/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://app-url.test/buy-me-coffee',
      }),
    )
  })

  it('falls back to production app URL when no env base URL is set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.APP_URL
    env.NODE_ENV = 'production'

    await createSupportCheckoutAction({ amountCents: 500 })

    expect(stripeCheckoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          'https://sharedjournal.app/buy-me-coffee/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://sharedjournal.app/buy-me-coffee',
      }),
    )
  })

  it('falls back to localhost in non-production when no env base URL is set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.APP_URL
    env.NODE_ENV = 'test'

    await createSupportCheckoutAction({ amountCents: 500 })

    expect(stripeCheckoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: 'http://localhost:3000/buy-me-coffee/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:3000/buy-me-coffee',
      }),
    )
  })

  it('returns generic error when stripe session creation throws', async () => {
    stripeCheckoutCreateMock.mockRejectedValue(new Error('stripe unavailable'))

    const result = await createSupportCheckoutAction({ amountCents: 500 })

    expect(result).toEqual({
      error: 'Unable to start checkout right now. Please try again.',
      checkoutUrl: null,
    })
    expect(createSupportPaymentMock).not.toHaveBeenCalled()
    expect(stripeCheckoutExpireMock).not.toHaveBeenCalled()
  })

  it('expires checkout session and returns generic error when payment persistence fails', async () => {
    createSupportPaymentMock.mockRejectedValue(new Error('db unavailable'))

    const result = await createSupportCheckoutAction({ amountCents: 500 })

    expect(result).toEqual({
      error: 'Unable to start checkout right now. Please try again.',
      checkoutUrl: null,
    })

    expect(createSupportPaymentMock).toHaveBeenCalledWith({
      userId: 'user-1',
      stripeCheckoutSessionId: 'cs_test_123',
      amountCents: 500,
      currency: 'usd',
      customerEmail: 'user@example.com',
    })
    expect(stripeCheckoutExpireMock).toHaveBeenCalledWith('cs_test_123')
  })

  it('still returns generic error when persistence fails and session expiry also fails', async () => {
    createSupportPaymentMock.mockRejectedValue(new Error('db unavailable'))
    stripeCheckoutExpireMock.mockRejectedValue(new Error('stripe expire failed'))

    const result = await createSupportCheckoutAction({ amountCents: 500 })

    expect(result).toEqual({
      error: 'Unable to start checkout right now. Please try again.',
      checkoutUrl: null,
    })
    expect(stripeCheckoutExpireMock).toHaveBeenCalledWith('cs_test_123')
  })
})
