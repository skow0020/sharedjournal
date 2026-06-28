import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  completeSupportPaymentMock,
  failSupportPaymentMock,
  cancelSupportPaymentMock,
  constructStripeWebhookEventMock,
} = vi.hoisted(() => ({
  completeSupportPaymentMock: vi.fn(),
  failSupportPaymentMock: vi.fn(),
  cancelSupportPaymentMock: vi.fn(),
  constructStripeWebhookEventMock: vi.fn(),
}))

vi.mock('@/data/support-payments', () => ({
  completeSupportPayment: completeSupportPaymentMock,
  failSupportPayment: failSupportPaymentMock,
  cancelSupportPayment: cancelSupportPaymentMock,
}))

vi.mock('@/lib/stripe/webhook', () => ({
  constructStripeWebhookEvent: constructStripeWebhookEventMock,
}))

import { POST } from '@/app/api/webhooks/stripe/route'

function makeRequest(input: { signature?: string; payload?: string }) {
  const headers = new Headers()

  if (input.signature) {
    headers.set('stripe-signature', input.signature)
  }

  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body: input.payload ?? '{}',
  })
}

describe('Stripe webhook route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    completeSupportPaymentMock.mockResolvedValue(true)
    failSupportPaymentMock.mockResolvedValue(true)
    cancelSupportPaymentMock.mockResolvedValue(true)
  })

  it('returns 400 when stripe signature is missing', async () => {
    const response = await POST(makeRequest({}))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Missing Stripe signature.' })
  })

  it('returns 400 when webhook signature is invalid', async () => {
    constructStripeWebhookEventMock.mockImplementation(() => {
      throw new Error('bad signature')
    })

    const response = await POST(makeRequest({ signature: 't=1,v1=abc' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid webhook signature.' })
  })

  it('completes support payment for checkout.session.completed', async () => {
    constructStripeWebhookEventMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_intent: 'pi_test_123',
        },
      },
    })

    const response = await POST(makeRequest({ signature: 't=1,v1=abc' }))

    expect(response.status).toBe(200)
    expect(completeSupportPaymentMock).toHaveBeenCalledWith({
      stripeCheckoutSessionId: 'cs_test_123',
      stripePaymentIntentId: 'pi_test_123',
    })
  })

  it('fails support payment for checkout.session.async_payment_failed', async () => {
    constructStripeWebhookEventMock.mockReturnValue({
      type: 'checkout.session.async_payment_failed',
      data: {
        object: {
          id: 'cs_test_456',
          status: 'open',
        },
      },
    })

    const response = await POST(makeRequest({ signature: 't=1,v1=abc' }))

    expect(response.status).toBe(200)
    expect(failSupportPaymentMock).toHaveBeenCalledWith({
      stripeCheckoutSessionId: 'cs_test_456',
      failureMessage: 'Payment did not complete.',
    })
  })

  it('completes support payment for checkout.session.async_payment_succeeded', async () => {
    constructStripeWebhookEventMock.mockReturnValue({
      type: 'checkout.session.async_payment_succeeded',
      data: {
        object: {
          id: 'cs_test_222',
          payment_intent: 'pi_test_222',
        },
      },
    })

    const response = await POST(makeRequest({ signature: 't=1,v1=abc' }))

    expect(response.status).toBe(200)
    expect(completeSupportPaymentMock).toHaveBeenCalledWith({
      stripeCheckoutSessionId: 'cs_test_222',
      stripePaymentIntentId: 'pi_test_222',
    })
  })

  it('cancels support payment for checkout.session.expired', async () => {
    constructStripeWebhookEventMock.mockReturnValue({
      type: 'checkout.session.expired',
      data: {
        object: {
          id: 'cs_test_789',
        },
      },
    })

    const response = await POST(makeRequest({ signature: 't=1,v1=abc' }))

    expect(response.status).toBe(200)
    expect(cancelSupportPaymentMock).toHaveBeenCalledWith({
      stripeCheckoutSessionId: 'cs_test_789',
    })
  })

  it('returns 500 when internal webhook processing fails', async () => {
    constructStripeWebhookEventMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_500',
          payment_intent: 'pi_test_500',
        },
      },
    })
    completeSupportPaymentMock.mockRejectedValue(new Error('db unavailable'))

    const response = await POST(makeRequest({ signature: 't=1,v1=abc' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Webhook processing failed.' })
  })
})
