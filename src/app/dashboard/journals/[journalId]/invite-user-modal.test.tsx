import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { InviteUserModal } from '@/app/dashboard/journals/[journalId]/invite-user-modal'

describe('InviteUserModal', () => {
  it('opens modal and renders invite email field', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({
      error: null,
      successMessage: null,
      inviteLink: null,
    }))

    render(<InviteUserModal action={action} />)

    await user.click(screen.getByRole('button', { name: 'Invite' }))

    expect(screen.getByText('Invite a user')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send invite' })).toBeInTheDocument()
  })

  it('submits email to action and renders success state', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async (_prevState: unknown, formData: FormData) => ({
      error: null,
      successMessage: `Invitation created for ${formData.get('email')}.`,
      inviteLink: '/invitations/example-token',
    }))

    render(<InviteUserModal action={action} />)

    await user.click(screen.getByRole('button', { name: 'Invite' }))
    await user.type(screen.getByLabelText('Email'), 'friend@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invite' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalled()
    })

    const [, submittedFormData] = action.mock.calls[0]
    expect(submittedFormData.get('email')).toBe('friend@example.com')

    await waitFor(() => {
      expect(screen.getByText('Invitation created for friend@example.com.')).toBeInTheDocument()
      expect(screen.getByText(/Invite link:/)).toBeInTheDocument()
    })
  })
})
