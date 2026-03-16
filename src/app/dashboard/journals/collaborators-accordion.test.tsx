import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CollaboratorsAccordion } from '@/app/dashboard/journals/collaborators-accordion'

describe('CollaboratorsAccordion', () => {
  it('shows only five collaborators when more are provided', async () => {
    const user = userEvent.setup()
    const collaborators = [
      { id: 'c1', displayName: 'Person 1', role: 'editor' as const },
      { id: 'c2', displayName: 'Person 2', role: 'viewer' as const },
      { id: 'c3', displayName: 'Person 3', role: 'editor' as const },
      { id: 'c4', displayName: 'Person 4', role: 'viewer' as const },
      { id: 'c5', displayName: 'Person 5', role: 'editor' as const },
      { id: 'c6', displayName: 'Person 6', role: 'viewer' as const },
    ]

    render(<CollaboratorsAccordion collaborators={collaborators} maxVisible={5} />)

    await user.click(screen.getByRole('button', { name: 'Collaborators (6)' }))

    expect(screen.getByText('Person 1')).toBeInTheDocument()
    expect(screen.getByText('Person 2')).toBeInTheDocument()
    expect(screen.getByText('Person 3')).toBeInTheDocument()
    expect(screen.getByText('Person 4')).toBeInTheDocument()
    expect(screen.getByText('Person 5')).toBeInTheDocument()
    expect(screen.queryByText('Person 6')).not.toBeInTheDocument()
    expect(screen.getByText('+1 more')).toBeInTheDocument()
  })
})
