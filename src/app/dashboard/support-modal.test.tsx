import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportModal } from './support-modal'

describe('SupportModal', () => {
  const mockOnDismiss = vi.fn().mockResolvedValue({ success: true, error: null })

  it('should render modal when open is true', () => {
    render(<SupportModal open={true} onDismiss={mockOnDismiss} />)

    expect(screen.getByText('Support SharedJournal')).toBeInTheDocument()
    expect(
      screen.getByText('If you enjoy using SharedJournal, consider supporting its development.'),
    ).toBeInTheDocument()
  })

  it('should have a link to buy me coffee page', () => {
    render(<SupportModal open={true} onDismiss={mockOnDismiss} />)

    const coffeeLink = screen.getByRole('link', { name: /buy me a coffee/i })
    expect(coffeeLink).toHaveAttribute('href', '/buy-me-coffee')
  })

  it('should call onDismiss with correct days when maybe later button clicked', async () => {
    const user = userEvent.setup()
    render(<SupportModal open={true} onDismiss={mockOnDismiss} />)

    const maybeLaterButton = screen.getByRole('button', { name: /maybe later/i })
    await user.click(maybeLaterButton)

    expect(mockOnDismiss).toHaveBeenCalledWith({ nextShowAfterDays: 30 })
  })

  it('should disable buttons while pending', async () => {
    const user = userEvent.setup()
    const slowDismiss = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ success: true, error: null }), 100)
        }),
    )

    render(<SupportModal open={true} onDismiss={slowDismiss} />)

    const maybeLaterButton = screen.getByRole('button', { name: /maybe later/i })
    await user.click(maybeLaterButton)

    expect(maybeLaterButton).toBeDisabled()
  })
})
