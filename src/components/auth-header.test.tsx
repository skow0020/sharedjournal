import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { usePathnameMock, authState } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  authState: {
    isSignedIn: false,
  },
}))

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}))

vi.mock('@clerk/nextjs', () => ({
  Show: ({ when, children }: { when: 'signed-in' | 'signed-out', children: ReactNode }) => {
    if (when === 'signed-in') {
      return authState.isSignedIn ? <>{children}</> : null
    }

    return authState.isSignedIn ? null : <>{children}</>
  },
  SignInButton: ({ children, forceRedirectUrl }: { children: ReactNode, forceRedirectUrl?: string }) => (
    <div data-testid="sign-in-wrapper" data-force-redirect-url={forceRedirectUrl}>
      {children}
    </div>
  ),
  SignUpButton: ({ children, forceRedirectUrl }: { children: ReactNode, forceRedirectUrl?: string }) => (
    <div data-testid="sign-up-wrapper" data-force-redirect-url={forceRedirectUrl}>
      {children}
    </div>
  ),
  UserButton: () => <div data-testid="user-button">User menu</div>,
}))

import { AuthHeader } from '@/components/auth-header'

describe('AuthHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.isSignedIn = false
    usePathnameMock.mockReturnValue('/')
  })

  it('hides header on auth sign-in transition route', () => {
    usePathnameMock.mockReturnValue('/auth/transition')

    render(<AuthHeader />)

    expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign Up' })).not.toBeInTheDocument()
  })

  it('hides header on auth sign-out transition route', () => {
    usePathnameMock.mockReturnValue('/auth/sign-out')

    render(<AuthHeader />)

    expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign Up' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('user-button')).not.toBeInTheDocument()
  })

  it('shows sign-in and sign-up buttons with transition redirect for signed-out users', () => {
    render(<AuthHeader />)

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument()
    expect(screen.getByTestId('sign-in-wrapper')).toHaveAttribute('data-force-redirect-url', '/auth/transition')
    expect(screen.getByTestId('sign-up-wrapper')).toHaveAttribute('data-force-redirect-url', '/auth/transition')
  })

  it('shows user button for signed-in users', () => {
    authState.isSignedIn = true

    render(<AuthHeader />)

    expect(screen.getByTestId('user-button')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign Up' })).not.toBeInTheDocument()
  })
})
