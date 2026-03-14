import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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

import { CreateJournalModal } from '@/app/dashboard/create-journal-modal'

describe('CreateJournalModal', () => {
  it('opens modal and renders journal fields', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))

    render(<CreateJournalModal action={action} />)

    await user.click(screen.getByRole('button', { name: 'Add journal' }))

    expect(screen.getByText('Create a journal')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('submits title and description to the action', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async () => {
      return {
        error: null,
        redirectTo: '/dashboard/journals/journal-1',
      }
    })

    render(<CreateJournalModal action={action} />)

    await user.click(screen.getByRole('button', { name: 'Add journal' }))
    await user.type(screen.getByLabelText('Title'), 'Trip Notes')
    await user.type(screen.getByLabelText('Description'), 'Weekend plans and entries.')
    await user.click(screen.getByRole('button', { name: 'Create journal' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalled()
    })

    expect(action).toHaveBeenCalledWith({
      title: 'Trip Notes',
      description: 'Weekend plans and entries.',
    })
    expect(pushMock).toHaveBeenCalledWith('/dashboard/journals/journal-1')
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('shows validation error when title is missing', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async () => ({
      error: 'Title is required.',
      redirectTo: null,
    }))

    render(<CreateJournalModal action={action} />)

    await user.click(screen.getByRole('button', { name: 'Add journal' }))

    const submitButton = screen.getByRole('button', { name: 'Create journal' })
    const form = submitButton.closest('form')

    if (!form) {
      throw new Error('Create journal form not found')
    }

    form.noValidate = true

    await user.click(screen.getByRole('button', { name: 'Create journal' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalled()
      expect(screen.getByText('Title is required.')).toBeInTheDocument()
    })
  })
})
