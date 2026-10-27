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

  it('should not render modal when open is false', () => {
    render(<SupportModal open={false} onDismiss={mockOnDismiss} />)

    // Modal title should not be in the document when open is false
    expect(screen.queryByText('Support SharedJournal')).not.toBeInTheDocument()
  })

  it('should handle failed dismissal gracefully', async () => {
    const user = userEvent.setup()
    const failingDismiss = vi.fn().mockResolvedValue({ success: false, error: 'Failed to dismiss' })

    render(<SupportModal open={true} onDismiss={failingDismiss} />)

    const maybeLaterButton = screen.getByRole('button', { name: /maybe later/i })
    await user.click(maybeLaterButton)

    expect(failingDismiss).toHaveBeenCalledWith({ nextShowAfterDays: 30 })
    // Modal should still be open after failed dismissal
    expect(screen.getByText('Support SharedJournal')).toBeInTheDocument()
  })

  it('should close modal when dismiss succeeds', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SupportModal open={true} onDismiss={mockOnDismiss} />)

    const maybeLaterButton = screen.getByRole('button', { name: /maybe later/i })
    await user.click(maybeLaterButton)

    // The component should have called onDismiss
    expect(mockOnDismiss).toHaveBeenCalledWith({ nextShowAfterDays: 30 })

    // Rerender to simulate component state update after successful dismiss
    rerender(<SupportModal open={false} onDismiss={mockOnDismiss} />)
    expect(screen.queryByText('Support SharedJournal')).not.toBeInTheDocument()
  })

  it('should enable buy coffee button when not pending', () => {
    render(<SupportModal open={true} onDismiss={mockOnDismiss} />)

    const coffeeLink = screen.getByRole('link', { name: /buy me a coffee/i })
    expect(coffeeLink).toHaveAttribute('href', '/buy-me-coffee')
    expect(coffeeLink).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('should render with proper accessibility attributes', () => {
    render(<SupportModal open={true} onDismiss={mockOnDismiss} />)

    const heading = screen.getByRole('heading', { name: /support SharedJournal/i })
    expect(heading).toBeInTheDocument()

    const description = screen.getByText(
      'If you enjoy using SharedJournal, consider supporting its development.',
    )
    expect(description).toBeInTheDocument()
  })

  it('should handle ESC key to dismiss with 7 days', async () => {
    const user = userEvent.setup()
    render(<SupportModal open={true} onDismiss={mockOnDismiss} />)

    // Press Escape key - Dialog should respond to this and trigger onOpenChange(false)
    await user.keyboard('{Escape}')

    // Give it time to process the dismissal
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockOnDismiss).toHaveBeenCalledWith({ nextShowAfterDays: 7 })
  })

  it('should handle clicking coffee button when not pending', async () => {
    const user = userEvent.setup()
    render(<SupportModal open={true} onDismiss={mockOnDismiss} />)

    const coffeeLink = screen.getByRole('link', { name: /buy me a coffee/i })
    
    // Verify it's not disabled when not pending
    expect(coffeeLink).not.toHaveAttribute('aria-disabled', 'true')
    
    // The click handler should execute (though navigation may be prevented in tests)
    await user.click(coffeeLink)
  })
})
