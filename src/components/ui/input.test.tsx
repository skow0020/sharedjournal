import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('renders with input slot marker', () => {
    render(<Input aria-label="Email" type="email" />)

    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('data-slot', 'input')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('accepts typed text and merges class names', async () => {
    const user = userEvent.setup()

    render(<Input aria-label="Title" className="custom-input" />)

    const input = screen.getByRole('textbox', { name: 'Title' })
    await user.type(input, 'Morning notes')

    expect(input).toHaveValue('Morning notes')
    expect(input.className).toContain('custom-input')
  })
})
