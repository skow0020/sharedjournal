import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { getCurrentAppUserMock } = vi.hoisted(() => ({
  getCurrentAppUserMock: vi.fn(),
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@clerk/nextjs', () => ({
  SignInButton: ({ children, forceRedirectUrl }: { children: React.ReactNode, forceRedirectUrl?: string }) => (
    <div data-testid="sign-in-button" data-force-redirect-url={forceRedirectUrl}>{children}</div>
  ),
}))

vi.mock('@/app/support/support-button', () => ({
  SupportButton: ({ amountCents }: { amountCents: number }) => <div>Coffee option {amountCents}</div>,
}))

vi.mock('@/app/support/actions', () => ({
  createSupportCheckoutAction: vi.fn(),
}))

import SupportPage from '@/app/support/page'

describe('SupportPage', () => {
  it('renders a sign-in prompt for signed-out users', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const page = await SupportPage()
    render(page)

    expect(screen.getByText('Sign in to continue')).toBeInTheDocument()
    expect(screen.getByTestId('sign-in-button')).toHaveAttribute('data-force-redirect-url', '/buy-me-coffee')
    expect(screen.getByRole('button', { name: 'Sign in to buy me coffee' })).toBeInTheDocument()
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
