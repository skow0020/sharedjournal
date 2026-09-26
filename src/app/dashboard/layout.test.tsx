import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import DashboardLayout from '@/app/dashboard/layout'
import { SUPPORT_EMAIL_HREF } from '@/lib/support-contact'

describe('DashboardLayout', () => {
  it('renders the contact link in the footer', () => {
    render(
      <DashboardLayout>
        <div>Dashboard body</div>
      </DashboardLayout>,
    )

    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      SUPPORT_EMAIL_HREF,
    )
  })
})
