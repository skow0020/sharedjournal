import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with button slot marker', () => {
    render(<Button>Add journal</Button>)

    const button = screen.getByRole('button', { name: 'Add journal' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('data-slot', 'button')
  })

  it('supports outline variant classes', () => {
    render(<Button variant="outline">Cancel</Button>)

    const button = screen.getByRole('button', { name: 'Cancel' })
    expect(button.className).toContain('border')
  })
})
