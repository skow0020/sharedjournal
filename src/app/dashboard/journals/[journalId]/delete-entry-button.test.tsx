import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/react'

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

import { DeleteEntryButton } from '@/app/dashboard/journals/[journalId]/delete-entry-button'

describe('DeleteEntryButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the entry and refreshes the page on success', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: null, success: true }))

    render(<DeleteEntryButton journalId="journal-1" entryId="entry-1" action={action} />)

    await user.click(screen.getByRole('button', { name: 'Delete entry' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete entry' }),
    )

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith({ journalId: 'journal-1', entryId: 'entry-1' })
    })

    expect(refreshMock).toHaveBeenCalled()
  })

  it('shows the action error and keeps the dialog open', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: 'Could not delete entry.', success: false }))

    render(<DeleteEntryButton journalId="journal-1" entryId="entry-1" action={action} />)

    await user.click(screen.getByRole('button', { name: 'Delete entry' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete entry' }),
    )

    expect(await screen.findByText('Could not delete entry.')).toBeInTheDocument()
    expect(refreshMock).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Delete entry' })).toBeInTheDocument()
  })
})
