import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import TermsPage from '@/app/terms/page'

describe('TermsPage', () => {
  it('renders core terms sections and links', () => {
    render(<TermsPage />)

    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument()
    expect(screen.getByText(/Last updated: April 19, 2026/i)).toBeInTheDocument()
    expect(screen.getByText('Acceptable use')).toBeInTheDocument()
    expect(screen.getByText('Accounts and content')).toBeInTheDocument()
    expect(screen.getByText('Service terms')).toBeInTheDocument()
    expect(screen.getByText('Support payments and refunds')).toBeInTheDocument()

    const supportLinks = screen.getAllByRole('link', { name: 'skow0020@gmail.com' })
    expect(supportLinks).toHaveLength(2)
    expect(supportLinks[0]).toHaveAttribute('href', 'mailto:skow0020@gmail.com')
    expect(supportLinks[1]).toHaveAttribute('href', 'mailto:skow0020@gmail.com')
    expect(screen.getByRole('link', { name: 'home' })).toHaveAttribute('href', '/')
  })
})
