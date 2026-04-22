import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SupportButton } from '@/app/support/support-button'

describe('SupportButton', () => {
  it('starts checkout and redirects on success', async () => {
    const user = userEvent.setup()
    const redirectToCheckout = vi.fn()

    const action = vi.fn(async () => ({
      error: null,
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123',
    }))

    render(<SupportButton amountCents={1000} action={action} redirectToCheckout={redirectToCheckout} />)

    await user.click(screen.getByRole('button', { name: 'Buy me coffee - $10.00' }))

    expect(action).toHaveBeenCalledWith({ amountCents: 1000 })
    await waitFor(() => {
      expect(redirectToCheckout).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_123')
    })
  })

  it('shows error when checkout cannot start', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async () => ({
      error: 'Unable to start checkout right now. Please try again.',
      checkoutUrl: null,
    }))

    render(<SupportButton amountCents={500} action={action} />)

    await user.click(screen.getByRole('button', { name: 'Buy me coffee - $5.00' }))

    expect(screen.getByText('Unable to start checkout right now. Please try again.')).toBeInTheDocument()
  })

  it('shows error and resets pending state when action rejects', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async () => {
      throw new Error('network failure')
    })

    render(<SupportButton amountCents={500} action={action} />)

    await user.click(screen.getByRole('button', { name: 'Buy me coffee - $5.00' }))

    expect(await screen.findByText('Unable to start checkout right now. Please try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buy me coffee - $5.00' })).toBeEnabled()
  })
})
