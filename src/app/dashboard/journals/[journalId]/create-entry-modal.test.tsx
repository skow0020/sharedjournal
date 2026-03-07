import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CreateEntryModal } from '@/app/dashboard/journals/[journalId]/create-entry-modal'

describe('CreateEntryModal', () => {
  it('opens modal and renders entry fields', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal action={action} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    expect(screen.getByText('Create an entry')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Content')).toBeInTheDocument()
    expect(screen.getByLabelText('Entry date')).toBeInTheDocument()
  })

  it('submits entry values to the action', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async (_prevState: { error: string | null }, formData: FormData) => {
      return {
        error: formData.get('content') ? null : 'Content is required.',
      }
    })

    render(<CreateEntryModal action={action} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.type(screen.getByLabelText('Title'), 'Morning Reflection')
    await user.type(screen.getByLabelText('Content'), 'Wrote about priorities for today.')
    await user.clear(screen.getByLabelText('Entry date'))
    await user.type(screen.getByLabelText('Entry date'), '2026-03-07')
    await user.click(screen.getByRole('button', { name: 'Create entry' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalled()
    })

    const [, submittedFormData] = action.mock.calls[0]
    expect(submittedFormData.get('title')).toBe('Morning Reflection')
    expect(submittedFormData.get('content')).toBe('Wrote about priorities for today.')
    expect(submittedFormData.get('entryDate')).toBe('2026-03-07')
  })
})
