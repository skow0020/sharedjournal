import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ExportJournalsButton } from '@/app/dashboard/export-journals-button'

describe('ExportJournalsButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows download link after successful export generation', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({
      error: null,
      downloadUrl: '/api/exports/download?token=abc',
      expiresAt: '2026-06-21T12:00:00.000Z',
    }))

    render(<ExportJournalsButton action={action} />)

    await user.click(screen.getByRole('button', { name: 'Export journals' }))
    await user.click(screen.getByRole('button', { name: 'Generate export' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith({})
    })

    expect(await screen.findByRole('link', { name: 'Download ZIP' })).toHaveAttribute(
      'href',
      '/api/exports/download?token=abc',
    )
  })

  it('shows an error message when export generation fails', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({
      error: 'Unable to generate export right now. Please try again.',
      downloadUrl: null,
      expiresAt: null,
    }))

    render(<ExportJournalsButton action={action} />)

    await user.click(screen.getByRole('button', { name: 'Export journals' }))
    await user.click(screen.getByRole('button', { name: 'Generate export' }))

    expect(await screen.findByText('Unable to generate export right now. Please try again.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Download export ZIP' })).not.toBeInTheDocument()
  })
})
