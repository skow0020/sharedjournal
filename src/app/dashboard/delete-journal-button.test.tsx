import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

import { DeleteJournalButton } from '@/app/dashboard/delete-journal-button'

describe('DeleteJournalButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes and refreshes when no redirect is provided', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: null, success: true }))

    render(<DeleteJournalButton journalId="journal-1" action={action} />)

    await user.click(screen.getByRole('button', { name: 'Delete journal' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete journal' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith({ journalId: 'journal-1' })
    })

    expect(refreshMock).toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('deletes and redirects when redirect target is provided', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: null, success: true }))

    render(
      <DeleteJournalButton
        journalId="journal-1"
        action={action}
        successRedirectTo="/dashboard"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete journal' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete journal' }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard')
    })

    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('shows action error and keeps dialog open', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: 'Could not delete journal.', success: false }))

    render(<DeleteJournalButton journalId="journal-1" action={action} />)

    await user.click(screen.getByRole('button', { name: 'Delete journal' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete journal' }))

    expect(await screen.findByText('Could not delete journal.')).toBeInTheDocument()
    expect(refreshMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Delete journal' })).toBeInTheDocument()
  })

  it('clears previous error when reopened in uncontrolled mode', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: 'Could not delete journal.', success: false }))

    render(<DeleteJournalButton journalId="journal-1" action={action} />)

    await user.click(screen.getByRole('button', { name: 'Delete journal' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete journal' }))
    expect(await screen.findByText('Could not delete journal.')).toBeInTheDocument()

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Delete journal' }))

    expect(screen.queryByText('Could not delete journal.')).not.toBeInTheDocument()
  })

  it('clears previous error when reopened in controlled mode', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: 'Could not delete journal.', success: false }))

    function ControlledDeleteJournalButton() {
      const [open, setOpen] = useState(false)

      return (
        <DeleteJournalButton
          journalId="journal-1"
          action={action}
          open={open}
          onOpenChange={setOpen}
          trigger={<button type="button">Open delete dialog</button>}
        />
      )
    }

    render(<ControlledDeleteJournalButton />)

    await user.click(screen.getByRole('button', { name: 'Open delete dialog' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete journal' }))
    expect(await screen.findByText('Could not delete journal.')).toBeInTheDocument()

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Open delete dialog' }))

    expect(screen.queryByText('Could not delete journal.')).not.toBeInTheDocument()
  })

  describe('accessibility', () => {
    it('has no violations when the dialog is open', async () => {
      const user = userEvent.setup()
      const action = vi.fn(async () => ({ error: null, success: true }))

      render(<DeleteJournalButton journalId="journal-1" action={action} />)
      await user.click(screen.getByRole('button', { name: 'Delete journal' }))

      expect(await axe(document.body)).toHaveNoViolations()
    })
  })
})
