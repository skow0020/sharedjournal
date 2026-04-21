import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import LegalPage from '@/app/legal/page'

describe('LegalPage', () => {
  it('renders legal index content and policy links', () => {
    render(<LegalPage />)

    expect(screen.getByRole('heading', { name: 'Legal' })).toBeInTheDocument()
    expect(screen.getByText(/Legal policies for SharedJournal users in the United States/i)).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Read Privacy Policy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Read Terms of Service' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: 'skow0020@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:skow0020@gmail.com',
    )
    expect(screen.getByText('Support payments')).toBeInTheDocument()
  })
})
