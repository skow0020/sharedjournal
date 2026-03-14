import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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

import { InvitationResponseActions } from '@/app/invitations/[token]/invitation-response-actions'

describe('InvitationResponseActions', () => {
  it('runs accept action and navigates to the returned location', async () => {
    const user = userEvent.setup()
    const acceptAction = vi.fn(async () => ({
      redirectTo: '/dashboard/journals/journal-1',
    }))
    const declineAction = vi.fn(async () => ({
      redirectTo: '/dashboard',
    }))

    render(
      <InvitationResponseActions
        token="invite-token"
        acceptAction={acceptAction}
        declineAction={declineAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Accept invite' }))

    await waitFor(() => {
      expect(acceptAction).toHaveBeenCalledWith({ token: 'invite-token' })
      expect(pushMock).toHaveBeenCalledWith('/dashboard/journals/journal-1')
      expect(refreshMock).toHaveBeenCalled()
    })
  })
})