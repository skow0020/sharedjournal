import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  replaceMock,
  useRouterMock,
  usePathnameMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
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

import { DateFilter } from '@/app/dashboard/date-filter'

describe('DateFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useRouterMock.mockReturnValue({
      replace: replaceMock,
    })
    usePathnameMock.mockReturnValue('/dashboard')
    useSearchParamsMock.mockReturnValue(new URLSearchParams('view=all'))
  })

  it('renders date label and input with provided value', () => {
    render(<DateFilter value="2026-03-07" />)

    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-03-07')).toBeInTheDocument()
  })

  it('updates date query param when user changes date', async () => {
    const user = userEvent.setup()

    render(<DateFilter value="" />)

    const input = screen.getByLabelText('Date')
    await user.click(input)
    await user.paste('2026-03-10')

    expect(replaceMock).toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/dashboard?view=all&date=2026-03-10')
  })

  it('replaces existing date param and keeps other params', async () => {
    const user = userEvent.setup()

    useSearchParamsMock.mockReturnValue(new URLSearchParams('date=2026-03-01&view=all'))

    render(<DateFilter value="" />)

    const input = screen.getByLabelText('Date')
    await user.click(input)
    await user.paste('2026-03-10')

    expect(replaceMock).toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/dashboard?date=2026-03-10&view=all')
  })
})
