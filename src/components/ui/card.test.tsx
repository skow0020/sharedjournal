import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card, CardTitle } from '@/components/ui/card'

describe('Card', () => {
  it('renders content', () => {
    render(
      <Card className="custom-card">
        <CardTitle>Journal</CardTitle>
      </Card>,
    )

    const title = screen.getByText('Journal')
    expect(title).toBeInTheDocument()

    const card = title.closest('[data-slot="card"]')
    expect(card).toBeInTheDocument()
  })
})
