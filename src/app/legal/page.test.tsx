import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import LegalPage from '@/app/legal/page'
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from '@/lib/support-contact'

describe('LegalPage', () => {
  it('renders legal index content and policy links', () => {
    render(<LegalPage />)

    expect(screen.getByRole('heading', { name: 'Legal' })).toBeInTheDocument()
    expect(screen.getByText(/Legal policies for SharedJournal users in the United States/i)).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Read Privacy Policy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Read Terms of Service' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: SUPPORT_EMAIL })).toHaveAttribute(
      'href',
      SUPPORT_EMAIL_HREF,
    )
    expect(screen.getByText('Support payments')).toBeInTheDocument()
  })
})
