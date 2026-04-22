import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}))

vi.mock('@clerk/nextjs', () => ({
  SignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

import Home from '@/app/page'

describe('Home page', () => {
  it('redirects signed in users to dashboard', async () => {
    authMock.mockResolvedValue({ userId: 'user-1' })

    await expect(Home()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/dashboard')
  })

  it('renders landing page for signed out users', async () => {
    authMock.mockResolvedValue({ userId: null })

    const page = await Home()
    render(page)

    expect(screen.getByRole('heading', { name: /Write together/i })).toBeInTheDocument()
    expect(screen.getByText(/Private and collaborative journaling/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /How it works/i })).toBeInTheDocument()
    expect(screen.getByText('Personal journals')).toBeInTheDocument()
    expect(screen.getByText('Shared entries')).toBeInTheDocument()
    expect(screen.getByText('Photo support')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buy me coffee' })).toHaveAttribute('href', '/buy-me-coffee')
    expect(screen.getByRole('link', { name: 'Legal' })).toHaveAttribute('href', '/legal')
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms')
  })
})
