import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { getCurrentAppUserMock, redirectMock } = vi.hoisted(() => ({
  getCurrentAppUserMock: vi.fn(),
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

vi.mock('@/app/support/support-button', () => ({
  SupportButton: ({ amountCents }: { amountCents: number }) => <div>Coffee option {amountCents}</div>,
}))

vi.mock('@/app/support/actions', () => ({
  createSupportCheckoutAction: vi.fn(),
}))

import SupportPage from '@/app/support/page'

describe('SupportPage', () => {
  it('redirects signed-out users to sign-in', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    await expect(SupportPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/sign-in')
  })

  it('renders coffee options for signed-in users', async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })

    const page = await SupportPage()
    render(page)

    expect(screen.getByRole('heading', { name: 'Buy me coffee' })).toBeInTheDocument()
    expect(screen.getByText('Coffee option 500')).toBeInTheDocument()
    expect(screen.getByText('Coffee option 1000')).toBeInTheDocument()
    expect(screen.getByText('Coffee option 2500')).toBeInTheDocument()
  })
})
