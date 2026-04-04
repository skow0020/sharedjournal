import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'

const { collaboratorsAccordionMock, pushMock } = vi.hoisted(() => ({
  collaboratorsAccordionMock: vi.fn(),
  pushMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/app/dashboard/delete-journal-button', () => ({
  DeleteJournalButton: ({ journalId, trigger }: { journalId: string, trigger?: React.ReactNode }) => (
    <div data-testid={`delete-journal-${journalId}`}>
      {trigger ?? <button type="button">Delete</button>}
    </div>
  ),
}))

vi.mock('@/app/dashboard/journals/collaborators-accordion', () => ({
  CollaboratorsAccordion: ({ collaborators, maxVisible }: { collaborators: unknown[], maxVisible?: number }) => {
    collaboratorsAccordionMock({ collaborators, maxVisible })
    return (
      <button type="button" data-testid="collaborators-accordion">
        Collaborators ({collaborators.length})
      </button>
    )
  },
}))

import { JournalCard } from '@/app/dashboard/journal-card'

describe('JournalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('navigates when the card is clicked', async () => {
    const user = userEvent.setup()

    render(
      <JournalCard
        journal={{
          id: 'journal-0',
          title: 'Clickable Journal',
          description: null,
          isOwner: true,
        }}
        collaborators={[]}
        deleteAction={vi.fn()}
        recentPhotos={[]}
      />,
    )

    await user.click(screen.getByRole('link', { name: 'Open Clickable Journal' }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/journals/journal-0')
  })

  it('renders shared badge and hides delete button for non-owner journals', () => {
    render(
      <JournalCard
        journal={{
          id: 'journal-1',
          title: 'Shared Journal',
          description: null,
          isOwner: false,
        }}
        collaborators={[]}
        deleteAction={vi.fn()}
        recentPhotos={[]}
      />,
    )

    expect(screen.getByRole('link', { name: 'Open Shared Journal' })).toBeInTheDocument()
    expect(screen.getByText('Shared with you')).toBeInTheDocument()
    expect(screen.queryByTestId('delete-journal-journal-1')).not.toBeInTheDocument()
  })

  it('renders delete button for owner journals', () => {
    render(
      <JournalCard
        journal={{
          id: 'journal-2',
          title: 'Owned Journal',
          description: 'Owner notes',
          isOwner: true,
        }}
        collaborators={[]}
        deleteAction={vi.fn()}
        recentPhotos={[]}
      />,
    )

    expect(screen.getByRole('link', { name: 'Open Owned Journal' })).toBeInTheDocument()
    expect(screen.queryByText('Shared with you')).not.toBeInTheDocument()
    expect(screen.getByTestId('delete-journal-journal-2')).toBeInTheDocument()
  })

  it('passes collaborators with maxVisible of five to the accordion', () => {
    const collaborators = [
      { id: 'c1', displayName: 'Alex', role: 'editor' as const },
      { id: 'c2', displayName: 'Sam', role: 'viewer' as const },
      { id: 'c3', displayName: 'Taylor', role: 'editor' as const },
    ]

    render(
      <JournalCard
        journal={{
          id: 'journal-3',
          title: 'Team Journal',
          description: 'Shared notes',
          isOwner: true,
        }}
        collaborators={collaborators}
        deleteAction={vi.fn()}
        recentPhotos={[]}
      />,
    )

    expect(screen.getByTestId('collaborators-accordion')).toHaveTextContent('Collaborators (3)')
    expect(collaboratorsAccordionMock).toHaveBeenCalledWith({
      collaborators,
      maxVisible: 5,
    })
  })

  it('does not navigate when the collaborators accordion is clicked', async () => {
    const user = userEvent.setup()

    render(
      <JournalCard
        journal={{
          id: 'journal-4',
          title: 'Team Journal',
          description: 'Shared notes',
          isOwner: true,
        }}
        collaborators={[]}
        deleteAction={vi.fn()}
        recentPhotos={[]}
      />,
    )

    await user.click(screen.getByTestId('collaborators-accordion'))

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('does not navigate when the delete button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <JournalCard
        journal={{
          id: 'journal-5',
          title: 'Owner Journal',
          description: null,
          isOwner: true,
        }}
        collaborators={[]}
        deleteAction={vi.fn()}
        recentPhotos={[]}
      />,
    )

    await user.click(screen.getByTestId('delete-journal-journal-5'))

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('navigates when Enter is pressed on the card', async () => {
    const user = userEvent.setup()

    render(
      <JournalCard
        journal={{
          id: 'journal-6',
          title: 'Keyboard Journal',
          description: null,
          isOwner: true,
        }}
        collaborators={[]}
        deleteAction={vi.fn()}
        recentPhotos={[]}
      />,
    )

    const card = screen.getByRole('link', { name: 'Open Keyboard Journal' })
    card.focus()
    await user.keyboard('{Enter}')

    expect(pushMock).toHaveBeenCalledWith('/dashboard/journals/journal-6')
  })

  it('does not navigate for non-activation keys', async () => {
    const user = userEvent.setup()

    render(
      <JournalCard
        journal={{
          id: 'journal-7',
          title: 'Arrow Key Journal',
          description: null,
          isOwner: true,
        }}
        collaborators={[]}
        deleteAction={vi.fn()}
        recentPhotos={[]}
      />,
    )

    const card = screen.getByRole('link', { name: 'Open Arrow Key Journal' })
    card.focus()
    await user.keyboard('{ArrowDown}')

    expect(pushMock).not.toHaveBeenCalled()
  })

  describe('accessibility', () => {
    it('has no violations', async () => {
      const { container } = render(
        <JournalCard
          journal={{
            id: 'journal-a11y',
            title: 'Accessible Journal',
            description: 'A test journal',
            isOwner: true,
          }}
          collaborators={[]}
          deleteAction={vi.fn()}
          recentPhotos={[]}
        />,
      )

      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
