import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PrivacyPage from '@/app/privacy/page'

describe('PrivacyPage', () => {
  it('renders core policy sections and links', () => {
    render(<PrivacyPage />)

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.getByText(/Last updated: April 19, 2026/i)).toBeInTheDocument()
    expect(screen.getByText('What we collect')).toBeInTheDocument()
    expect(screen.getByText('How we use data')).toBeInTheDocument()
    expect(screen.getByText('Sharing and retention')).toBeInTheDocument()
    expect(screen.getByText('Payment processing')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'skow0020@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:skow0020@gmail.com',
    )
    expect(screen.getByRole('link', { name: 'home' })).toHaveAttribute('href', '/')
  })
})
