import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'

const { replaceMock, useRouterMock, usePathnameMock, useSearchParamsMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useRouterMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}))

import { JournalEntriesDateFilter } from '@/app/dashboard/journals/[journalId]/journal-entries-date-filter'

describe('JournalEntriesDateFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useRouterMock.mockReturnValue({
      replace: replaceMock,
    })
    usePathnameMock.mockReturnValue('/dashboard/journals/journal-1')
    useSearchParamsMock.mockReturnValue(new URLSearchParams())
  })

  it('renders the filter label and input with the provided value', () => {
    render(<JournalEntriesDateFilter value="2026-03-07" />)

    expect(screen.getByLabelText('Filter by date')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-03-07')).toBeInTheDocument()
  })

  it('does not render a clear button when no date is selected', () => {
    render(<JournalEntriesDateFilter value="" />)

    expect(screen.queryByRole('button', { name: 'Clear date filter' })).not.toBeInTheDocument()
  })

  it('sets the entryDate query param and resets pagination when a date is chosen', async () => {
    const user = userEvent.setup()
    useSearchParamsMock.mockReturnValue(new URLSearchParams('entriesPage=2'))

    render(<JournalEntriesDateFilter value="" />)

    const input = screen.getByLabelText('Filter by date')
    await user.click(input)
    await user.paste('2026-03-10')

    expect(replaceMock).toHaveBeenCalledWith(
      '/dashboard/journals/journal-1?entryDate=2026-03-10',
      { scroll: false },
    )
  })

  it('preserves other search params when setting the date', async () => {
    const user = userEvent.setup()
    useSearchParamsMock.mockReturnValue(new URLSearchParams('foo=bar'))

    render(<JournalEntriesDateFilter value="" />)

    const input = screen.getByLabelText('Filter by date')
    await user.click(input)
    await user.paste('2026-03-10')

    expect(replaceMock).toHaveBeenCalledWith(
      '/dashboard/journals/journal-1?foo=bar&entryDate=2026-03-10',
      { scroll: false },
    )
  })

  it('clears the entryDate query param when the clear button is clicked', async () => {
    const user = userEvent.setup()
    useSearchParamsMock.mockReturnValue(new URLSearchParams('entryDate=2026-03-10&foo=bar'))

    render(<JournalEntriesDateFilter value="2026-03-10" />)

    await user.click(screen.getByRole('button', { name: 'Clear date filter' }))

    expect(replaceMock).toHaveBeenCalledWith('/dashboard/journals/journal-1?foo=bar', {
      scroll: false,
    })
  })

  describe('accessibility', () => {
    it('has no violations', async () => {
      const { container } = render(<JournalEntriesDateFilter value="2026-03-07" />)
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
