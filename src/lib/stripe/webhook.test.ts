import { beforeEach, describe, expect, it, vi } from 'vitest'

const { constructEventMock, getStripeServerClientMock } = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  getStripeServerClientMock: vi.fn(),
}))

vi.mock('@/lib/stripe/server-client', () => ({
  getStripeServerClient: getStripeServerClientMock,
}))

describe('constructStripeWebhookEvent', () => {
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  beforeEach(() => {
    vi.clearAllMocks()

    if (originalWebhookSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret
    }

    getStripeServerClientMock.mockReturnValue({
      webhooks: {
        constructEvent: constructEventMock,
      },
    })
  })

  it('throws when STRIPE_WEBHOOK_SECRET is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET

    const { constructStripeWebhookEvent } = await import('@/lib/stripe/webhook')

    expect(() => constructStripeWebhookEvent('payload', 'sig')).toThrow(
      'STRIPE_WEBHOOK_SECRET is not configured.',
    )
    expect(constructEventMock).not.toHaveBeenCalled()
  })

  it('constructs event with payload, signature, and configured webhook secret', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123'
    const expectedEvent = { id: 'evt_123', type: 'checkout.session.completed' }
    constructEventMock.mockReturnValue(expectedEvent)

    const { constructStripeWebhookEvent } = await import('@/lib/stripe/webhook')

    const event = constructStripeWebhookEvent('payload', 'sig')

    expect(event).toEqual(expectedEvent)
    expect(constructEventMock).toHaveBeenCalledWith('payload', 'sig', 'whsec_123')
  })
})
