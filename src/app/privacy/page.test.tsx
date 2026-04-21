import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PrivacyPage from '@/app/privacy/page'
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from '@/lib/support-contact'

describe('PrivacyPage', () => {
  it('renders core policy sections and links', () => {
    render(<PrivacyPage />)

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.getByText(/Last updated: April 19, 2026/i)).toBeInTheDocument()
    expect(screen.getByText('What we collect')).toBeInTheDocument()
    expect(screen.getByText('How we use data')).toBeInTheDocument()
    expect(screen.getByText('Sharing and retention')).toBeInTheDocument()
    expect(screen.getByText('Payment processing')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: SUPPORT_EMAIL })).toHaveAttribute(
      'href',
      SUPPORT_EMAIL_HREF,
    )
    expect(screen.getByRole('link', { name: 'home' })).toHaveAttribute('href', '/')
  })
})
