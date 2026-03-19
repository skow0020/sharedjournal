import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { replaceMock, useRouterMock, useAuthMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useRouterMock: vi.fn(),
  useAuthMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: useAuthMock,
}))

import SignOutTransitionPage from '@/app/auth/sign-out/page'

describe('SignOutTransitionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    })
  })

  it('renders transition loading state', () => {
    useAuthMock.mockReturnValue({ isLoaded: false, isSignedIn: true })

    render(<SignOutTransitionPage />)

    expect(screen.getByText('Signing you out')).toBeInTheDocument()
    expect(screen.getByText('Closing your session and returning home...')).toBeInTheDocument()
  })

  it('redirects signed-out users to home when auth loads', async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false })

    render(<SignOutTransitionPage />)

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/')
    })
  })

  it('redirects signed-in users to dashboard when auth remains active', async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true })

    render(<SignOutTransitionPage />)

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('does not redirect before auth is loaded', () => {
    useAuthMock.mockReturnValue({ isLoaded: false, isSignedIn: false })

    render(<SignOutTransitionPage />)

    expect(replaceMock).not.toHaveBeenCalled()
  })
})
