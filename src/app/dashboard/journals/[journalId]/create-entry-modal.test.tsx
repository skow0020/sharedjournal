import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/journals/journal-1',
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

import { CreateEntryModal } from '@/app/dashboard/journals/[journalId]/create-entry-modal'

describe('CreateEntryModal', () => {
  it('opens modal and renders entry fields', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    expect(screen.getByText('Create an entry')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Content')).toBeInTheDocument()
    expect(screen.getByLabelText('Entry date')).toBeInTheDocument()
  })

  it('submits entry values to the action', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async () => {
      return {
        error: null,
        redirectTo: '/dashboard/journals/journal-1',
      }
    })

    render(<CreateEntryModal journalId="journal-1" action={action} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.type(screen.getByLabelText('Title'), 'Morning Reflection')
    await user.type(screen.getByLabelText('Content'), 'Wrote about priorities for today.')
    await user.clear(screen.getByLabelText('Entry date'))
    await user.type(screen.getByLabelText('Entry date'), '2026-03-07')
    await user.click(screen.getByRole('button', { name: 'Create entry' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalled()
    })

    expect(action).toHaveBeenCalledWith({
      journalId: 'journal-1',
      title: 'Morning Reflection',
      content: 'Wrote about priorities for today.',
      entryDate: '2026-03-07',
    })
    expect(pushMock).not.toHaveBeenCalled()
    expect(refreshMock).toHaveBeenCalled()
  })
})
