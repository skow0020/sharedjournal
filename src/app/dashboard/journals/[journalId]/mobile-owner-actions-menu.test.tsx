import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

import { MobileOwnerActionsMenu } from '@/app/dashboard/journals/[journalId]/mobile-owner-actions-menu'

describe('MobileOwnerActionsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a menu trigger for owner actions', () => {
    const action = vi.fn(async () => ({ error: null, success: true }))

    render(<MobileOwnerActionsMenu journalId="journal-1" action={action} />)

    expect(screen.getByRole('button', { name: 'Open journal actions' })).toBeInTheDocument()
  })

  it('opens menu and shows delete option', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ error: null, success: true }))

    render(<MobileOwnerActionsMenu journalId="journal-1" action={action} />)

    await user.click(screen.getByRole('button', { name: 'Open journal actions' }))

    expect(screen.getByRole('menuitem', { name: 'Delete journal' })).toBeInTheDocument()
    expect(action).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })
})
