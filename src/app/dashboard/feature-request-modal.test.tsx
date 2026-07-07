import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'

import { FeatureRequestModal } from '@/app/dashboard/feature-request-modal'

describe('FeatureRequestModal', () => {
  it('opens modal and renders survey content', async () => {
    const user = userEvent.setup()
    const submitAction = vi.fn(async () => ({ error: null, success: true }))
    const dismissAction = vi.fn(async () => ({ error: null, success: true }))

    render(<FeatureRequestModal submitAction={submitAction} dismissAction={dismissAction} />)

    await user.click(screen.getByRole('button', { name: 'Share feedback' }))

    expect(screen.getByText('Help shape SharedJournal')).toBeInTheDocument()
    expect(screen.getByLabelText('Feature request (optional)')).toBeInTheDocument()
  })

  it('submits entered feedback and hides trigger after success', async () => {
    const user = userEvent.setup()
    const submitAction = vi.fn(async () => ({ error: null, success: true }))
    const dismissAction = vi.fn(async () => ({ error: null, success: true }))

    render(<FeatureRequestModal submitAction={submitAction} dismissAction={dismissAction} />)

    await user.click(screen.getByRole('button', { name: 'Share feedback' }))
    await user.type(
      screen.getByLabelText('Feature request (optional)'),
      'Please add journal templates.',
    )
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(submitAction).toHaveBeenCalledWith({
        requestText: 'Please add journal templates.',
      })
    })

    expect(screen.queryByRole('button', { name: 'Share feedback' })).not.toBeInTheDocument()
  })

  it('dismisses survey and hides trigger after skip', async () => {
    const user = userEvent.setup()
    const submitAction = vi.fn(async () => ({ error: null, success: true }))
    const dismissAction = vi.fn(async () => ({ error: null, success: true }))

    render(<FeatureRequestModal submitAction={submitAction} dismissAction={dismissAction} />)

    await user.click(screen.getByRole('button', { name: 'Share feedback' }))
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))

    await waitFor(() => {
      expect(dismissAction).toHaveBeenCalledWith({})
    })

    expect(screen.queryByRole('button', { name: 'Share feedback' })).not.toBeInTheDocument()
  })

  it('renders returned error when submit fails', async () => {
    const user = userEvent.setup()
    const submitAction = vi.fn(async () => ({
      error: 'Unable to submit feature feedback.',
      success: false,
    }))
    const dismissAction = vi.fn(async () => ({ error: null, success: true }))

    render(<FeatureRequestModal submitAction={submitAction} dismissAction={dismissAction} />)

    await user.click(screen.getByRole('button', { name: 'Share feedback' }))
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(screen.getByText('Unable to submit feature feedback.')).toBeInTheDocument()
    })
  })

  it('renders returned error when dismiss fails', async () => {
    const user = userEvent.setup()
    const submitAction = vi.fn(async () => ({ error: null, success: true }))
    const dismissAction = vi.fn(async () => ({
      error: 'Unable to dismiss feature feedback.',
      success: false,
    }))

    render(<FeatureRequestModal submitAction={submitAction} dismissAction={dismissAction} />)

    await user.click(screen.getByRole('button', { name: 'Share feedback' }))
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))

    await waitFor(() => {
      expect(screen.getByText('Unable to dismiss feature feedback.')).toBeInTheDocument()
    })

    expect(screen.getByRole('dialog', { name: 'Help shape SharedJournal' })).toBeInTheDocument()
  })

  describe('accessibility', () => {
    it('has no violations when modal is open', async () => {
      const user = userEvent.setup()
      const submitAction = vi.fn(async () => ({ error: null, success: true }))
      const dismissAction = vi.fn(async () => ({ error: null, success: true }))

      render(<FeatureRequestModal submitAction={submitAction} dismissAction={dismissAction} />)
      await user.click(screen.getByRole('button', { name: 'Share feedback' }))

      expect(await axe(document.body)).toHaveNoViolations()
    })
  })
})
