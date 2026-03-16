import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}))

let intersectionCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null

class MockIntersectionObserver {
  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    intersectionCallback = callback
  }

  observe() {}

  disconnect() {}
}

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/journals/journal-1',
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams('foo=bar'),
}))

import { JournalEntriesInfiniteLoader } from '@/app/dashboard/journals/[journalId]/journal-entries-infinite-loader'

describe('JournalEntriesInfiniteLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    intersectionCallback = null
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  it('requests the next page when the loader scroll target becomes visible', async () => {
    render(<JournalEntriesInfiniteLoader currentPage={1} hasMore />)

    expect(screen.getByText('Scroll to load more entries')).toBeInTheDocument()
    expect(intersectionCallback).not.toBeNull()

    intersectionCallback?.([{ isIntersecting: true }])

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        '/dashboard/journals/journal-1?foo=bar&entriesPage=2',
        { scroll: false },
      )
    })
  })

  it('renders nothing when there are no more entries to load', () => {
    const { container } = render(
      <JournalEntriesInfiniteLoader currentPage={1} hasMore={false} />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
