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

import { EntryComments } from '@/app/dashboard/journals/[journalId]/entry-comments'

describe('EntryComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders existing comments with author fallback and content', () => {
    const action = vi.fn(async () => ({ error: null, success: true }))

    render(
      <EntryComments
        entryId="entry-1"
        journalId="journal-1"
        action={action}
        canComment={true}
        comments={[
          {
            id: 'comment-1',
            content: 'First comment',
            createdAt: new Date('2026-03-07T10:00:00.000Z'),
            author: { displayName: 'Pat' },
          },
          {
            id: 'comment-2',
            content: 'Second comment',
            createdAt: new Date('2026-03-07T11:00:00.000Z'),
            author: { displayName: null },
          },
        ]}
      />,
    )

    expect(screen.getByText('First comment')).toBeInTheDocument()
    expect(screen.getByText('Second comment')).toBeInTheDocument()
    expect(screen.getByText(/Pat/)).toBeInTheDocument()
    expect(screen.getByText(/Anonymous/)).toBeInTheDocument()
  })

  it('hides comment form when canComment is false', () => {
    const action = vi.fn(async () => ({ error: null, success: true }))

    render(
      <EntryComments
        entryId="entry-1"
        journalId="journal-1"
        action={action}
        canComment={false}
        comments={[]}
      />,
    )

    expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Post' })).not.toBeInTheDocument()
  })

  it('submits trimmed content and refreshes on success', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: null, success: true }))

    render(
      <EntryComments
        entryId="entry-1"
        journalId="journal-1"
        action={action}
        canComment={true}
        comments={[]}
      />,
    )

    await user.type(screen.getByPlaceholderText('Add a comment...'), '  Great note  ')
    await user.click(screen.getByRole('button', { name: 'Post' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith({
        journalId: 'journal-1',
        entryId: 'entry-1',
        content: 'Great note',
      })
    })
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('renders action error and does not refresh on failure', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: 'Not authorized', success: false }))

    render(
      <EntryComments
        entryId="entry-1"
        journalId="journal-1"
        action={action}
        canComment={true}
        comments={[]}
      />,
    )

    await user.type(screen.getByPlaceholderText('Add a comment...'), 'Attempted comment')
    await user.click(screen.getByRole('button', { name: 'Post' }))

    expect(await screen.findByText('Not authorized')).toBeInTheDocument()
    expect(refreshMock).not.toHaveBeenCalled()
  })
})
