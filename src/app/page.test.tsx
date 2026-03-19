import { render, screen } from '@testing-library/react'
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

    expect(screen.getByRole('heading', { name: 'SharedJournal' })).toBeInTheDocument()
    expect(screen.getByText(/Private and collaborative journaling/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Google Play/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /App Store/i })).toBeInTheDocument()
    expect(screen.getByText('Everything in one journal workflow')).toBeInTheDocument()
    expect(screen.getByText('Core flow')).toBeInTheDocument()
  })
})
