import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

import { OwnerActionsMenu } from '@/app/dashboard/journals/[journalId]/owner-actions-menu'

describe('OwnerActionsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens edit modal from the menu', async () => {
    const user = userEvent.setup()
    const deleteAction = vi.fn(async () => ({ error: null, success: true }))
    const updateAction = vi.fn(async () => ({ error: null }))

    render(
      <OwnerActionsMenu
        journalId="journal-1"
        journalTitle="Family Journal"
        journalDescription="Shared notes"
        deleteAction={deleteAction}
        updateAction={updateAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Open journal actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit journal' }))

    expect(screen.getByRole('heading', { name: 'Edit journal' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Family Journal')
    expect(screen.getByLabelText('Description')).toHaveValue('Shared notes')
    expect(screen.queryByRole('menuitem', { name: 'Delete journal' })).not.toBeInTheDocument()
  })

  it('opens delete dialog from the menu', async () => {
    const user = userEvent.setup()
    const deleteAction = vi.fn(async () => ({ error: null, success: true }))
    const updateAction = vi.fn(async () => ({ error: null }))

    render(
      <OwnerActionsMenu
        journalId="journal-1"
        journalTitle="Family Journal"
        journalDescription="Shared notes"
        deleteAction={deleteAction}
        updateAction={updateAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Open journal actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete journal' }))

    expect(await screen.findByRole('heading', { name: 'Delete journal' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Edit journal' })).not.toBeInTheDocument()
  })
})
