import { beforeEach, describe, expect, it, vi } from 'vitest'

const { StripeMock } = vi.hoisted(() => ({
  StripeMock: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: StripeMock,
}))

describe('getStripeServerClient', () => {
  const originalSecretKey = process.env.STRIPE_SECRET_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    if (originalSecretKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY
    } else {
      process.env.STRIPE_SECRET_KEY = originalSecretKey
    }

    StripeMock.mockImplementation(function StripeConstructor() {
      return {
      webhooks: {
        constructEvent: vi.fn(),
      },
      }
    })
  })

  it('throws when STRIPE_SECRET_KEY is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY

    const { getStripeServerClient } = await import('@/lib/stripe/server-client')

    expect(() => getStripeServerClient()).toThrow('STRIPE_SECRET_KEY is not configured.')
    expect(StripeMock).not.toHaveBeenCalled()
  })

  it('creates and caches Stripe client', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'

    const { getStripeServerClient } = await import('@/lib/stripe/server-client')

    const firstClient = getStripeServerClient()
    const secondClient = getStripeServerClient()

    expect(firstClient).toBe(secondClient)
    expect(StripeMock).toHaveBeenCalledTimes(1)
    expect(StripeMock).toHaveBeenCalledWith('sk_test_123')
  })
})
