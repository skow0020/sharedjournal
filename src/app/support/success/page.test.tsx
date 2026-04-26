import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { getCurrentAppUserMock, getSupportPaymentForUserByCheckoutSessionMock, redirectMock } = vi.hoisted(() => ({
  getCurrentAppUserMock: vi.fn(),
  getSupportPaymentForUserByCheckoutSessionMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/data/support-payments', () => ({
  getSupportPaymentForUserByCheckoutSession: getSupportPaymentForUserByCheckoutSessionMock,
}))

import SupportSuccessPage from '@/app/support/success/page'

describe('SupportSuccessPage', () => {
  it('redirects signed-out users to buy-me-coffee', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    await expect(SupportSuccessPage({})).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/buy-me-coffee')
  })

  it('renders missing session state', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const page = await SupportSuccessPage({
      searchParams: Promise.resolve({}),
    })
    render(page)

    expect(screen.getByText('Checkout session not found')).toBeInTheDocument()
  })

  it('renders pending payment state when record is not found', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getSupportPaymentForUserByCheckoutSessionMock.mockResolvedValue(null)

    const page = await SupportSuccessPage({
      searchParams: Promise.resolve({ session_id: 'cs_test_123' }),
    })
    render(page)

    expect(screen.getByText('Contribution record not found')).toBeInTheDocument()
  })

  it('renders completed payment summary', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getSupportPaymentForUserByCheckoutSessionMock.mockResolvedValue({
      id: 'payment-1',
      amountCents: 1000,
      currency: 'usd',
      status: 'completed',
      createdAt: new Date('2026-04-19T10:00:00.000Z'),
      completedAt: new Date('2026-04-19T10:01:00.000Z'),
    })

    const page = await SupportSuccessPage({
      searchParams: Promise.resolve({ session_id: 'cs_test_123' }),
    })
    render(page)

    expect(screen.getByText('Thanks for the coffee!')).toBeInTheDocument()
    expect(screen.getByText('Status: Completed')).toBeInTheDocument()
    expect(screen.getByText('Amount: $10.00')).toBeInTheDocument()
  })
})
