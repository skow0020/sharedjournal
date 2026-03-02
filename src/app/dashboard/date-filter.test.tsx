import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { replace } = vi.hoisted(() => ({
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('view=week&date=2024-06-01'),
}))

import { DateFilter } from '@/app/dashboard/date-filter'

describe('DateFilter', () => {
  beforeEach(() => {
    replace.mockClear()
  })

  it('renders with the provided date value', () => {
    render(<DateFilter value="2024-06-01" />)

    const input = screen.getByLabelText('Date')
    expect(input).toHaveValue('2024-06-01')
  })

  it('updates the query string when the date changes', () => {
    render(<DateFilter value="2024-06-01" />)

    const input = screen.getByLabelText('Date')
    fireEvent.change(input, { target: { value: '2024-06-15' } })

    expect(replace).toHaveBeenLastCalledWith('/dashboard?view=week&date=2024-06-15')
  })
})
