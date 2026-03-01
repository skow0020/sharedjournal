import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Textarea } from '@/components/ui/textarea'

describe('Textarea', () => {
  it('renders with textarea slot marker', () => {
    render(<Textarea aria-label="Description" />)

    const textarea = screen.getByRole('textbox', { name: 'Description' })
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('data-slot', 'textarea')
  })

  it('accepts typed text', async () => {
    const user = userEvent.setup()

    render(<Textarea aria-label="Description" />)

    const textarea = screen.getByRole('textbox', { name: 'Description' })
    await user.type(textarea, 'Journal details')

    expect(textarea).toHaveValue('Journal details')
  })
})
