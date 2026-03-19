import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

import { JournalTitleEditor } from '@/app/dashboard/journals/[journalId]/journal-title-editor'

describe('JournalTitleEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title without edit controls when editing is disabled', () => {
    const action = vi.fn(async () => ({ error: null }))

    render(
      <JournalTitleEditor
        journalId="journal-1"
        title="Family Journal"
        canEdit={false}
        action={action}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Family Journal' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit journal title' })).not.toBeInTheDocument()
  })

  it('shows required validation when saving blank title', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: null }))

    render(
      <JournalTitleEditor
        journalId="journal-1"
        title="Family Journal"
        canEdit
        action={action}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit journal title' }))
    await user.clear(screen.getByLabelText('Journal title'))
    await user.click(screen.getByRole('button', { name: 'Save journal title' }))

    expect(screen.getByText('Title is required.')).toBeInTheDocument()
    expect(action).not.toHaveBeenCalled()
  })

  it('shows action error when save fails', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: 'Could not update title.' }))

    render(
      <JournalTitleEditor
        journalId="journal-1"
        title="Family Journal"
        canEdit
        action={action}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit journal title' }))
    await user.clear(screen.getByLabelText('Journal title'))
    await user.type(screen.getByLabelText('Journal title'), 'Updated Journal')
    await user.click(screen.getByRole('button', { name: 'Save journal title' }))

    expect(await screen.findByText('Could not update title.')).toBeInTheDocument()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('saves title and refreshes when action succeeds', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: null }))

    render(
      <JournalTitleEditor
        journalId="journal-1"
        title="Family Journal"
        canEdit
        action={action}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit journal title' }))
    await user.clear(screen.getByLabelText('Journal title'))
    await user.type(screen.getByLabelText('Journal title'), 'Updated Journal')
    await user.click(screen.getByRole('button', { name: 'Save journal title' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith({ journalId: 'journal-1', title: 'Updated Journal' })
    })

    expect(refreshMock).toHaveBeenCalled()
    expect(screen.queryByRole('textbox', { name: 'Journal title' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Family Journal' })).toBeInTheDocument()
  })
})
