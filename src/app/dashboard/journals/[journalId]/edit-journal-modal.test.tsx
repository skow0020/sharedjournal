import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

import { EditJournalModal } from '@/app/dashboard/journals/[journalId]/edit-journal-modal'

describe('EditJournalModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens and pre-fills title and description', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: null }))

    render(
      <EditJournalModal
        journalId="journal-1"
        initialTitle="Family Journal"
        initialDescription="Shared notes"
        action={action}
        trigger={<button type="button">Edit journal</button>}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit journal' }))

    expect(screen.getByRole('heading', { name: 'Edit journal' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Family Journal')
    expect(screen.getByLabelText('Description')).toHaveValue('Shared notes')
  })

  it('submits updated title and description then refreshes', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: null }))

    render(
      <EditJournalModal
        journalId="journal-1"
        initialTitle="Family Journal"
        initialDescription="Shared notes"
        action={action}
        trigger={<button type="button">Edit journal</button>}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit journal' }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Updated Journal')
    await user.clear(screen.getByLabelText('Description'))
    await user.type(screen.getByLabelText('Description'), 'Updated description')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith({
        journalId: 'journal-1',
        title: 'Updated Journal',
        description: 'Updated description',
      })
    })

    expect(refreshMock).toHaveBeenCalled()
  })

  it('shows server error and does not refresh when save fails', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: 'Could not update journal.' }))

    render(
      <EditJournalModal
        journalId="journal-1"
        initialTitle="Family Journal"
        initialDescription={null}
        action={action}
        trigger={<button type="button">Edit journal</button>}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit journal' }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Updated Journal')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Could not update journal.')).toBeInTheDocument()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('resets edited values when reopened', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: null }))

    render(
      <EditJournalModal
        journalId="journal-1"
        initialTitle="Family Journal"
        initialDescription="Shared notes"
        action={action}
        trigger={<button type="button">Edit journal</button>}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit journal' }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Unsaved change')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Edit journal' }))

    expect(screen.getByLabelText('Title')).toHaveValue('Family Journal')
    expect(screen.getByLabelText('Description')).toHaveValue('Shared notes')
  })

  describe('accessibility', () => {
    it('has no violations when open', async () => {
      const user = userEvent.setup()
      const action = vi.fn(async () => ({ error: null }))

      render(
        <EditJournalModal
          journalId="journal-1"
          initialTitle="Family Journal"
          initialDescription="Shared notes"
          action={action}
          trigger={<button type="button">Edit journal</button>}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit journal' }))

      expect(await axe(document.body)).toHaveNoViolations()
    })
  })
})
