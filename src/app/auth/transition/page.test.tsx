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

import AuthTransitionPage from '@/app/auth/transition/page'

describe('AuthTransitionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    })
  })

  it('renders transition loading state', () => {
    useAuthMock.mockReturnValue({ isLoaded: false, isSignedIn: false })

    render(<AuthTransitionPage />)

    expect(screen.getByText('Signing you in')).toBeInTheDocument()
    expect(screen.getByText('Preparing your journal dashboard...')).toBeInTheDocument()
  })

  it('redirects signed-in users to dashboard when auth loads', async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true })

    render(<AuthTransitionPage />)

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('redirects signed-out users to home when auth loads', async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false })

    render(<AuthTransitionPage />)

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/')
    })
  })

  it('does not redirect before auth is loaded', () => {
    useAuthMock.mockReturnValue({ isLoaded: false, isSignedIn: true })

    render(<AuthTransitionPage />)

    expect(replaceMock).not.toHaveBeenCalled()
  })
})
