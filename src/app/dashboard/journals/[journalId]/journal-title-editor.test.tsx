import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { JournalTitleEditor } from '@/app/dashboard/journals/[journalId]/journal-title-editor'

describe('JournalTitleEditor', () => {
  it('renders the journal title as a heading', () => {
    render(<JournalTitleEditor title="Family Journal" />)

    expect(screen.getByRole('heading', { name: 'Family Journal' })).toBeInTheDocument()
  })

  it('applies the full title as the title attribute for truncated mobile layouts', () => {
    render(<JournalTitleEditor title="A very long family journal title" />)

    expect(screen.getByTitle('A very long family journal title')).toBeInTheDocument()
  })
})
