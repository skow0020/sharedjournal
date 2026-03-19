import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { EntryPhotoGallery } from '@/app/dashboard/journals/[journalId]/entry-photo-gallery'

const photos = [
  { id: 'photo-1', src: '/p1.jpg' },
  { id: 'photo-2', src: '/p2.jpg' },
]

describe('EntryPhotoGallery', () => {
  it('opens selected image and supports previous/next controls', async () => {
    const user = userEvent.setup()

    render(<EntryPhotoGallery photos={photos} />)

    await user.click(screen.getByRole('button', { name: 'View image 1 of 2' }))
    expect(screen.getAllByAltText('Entry image 1')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Next image' }))
    expect(screen.getAllByAltText('Entry image 2')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Previous image' }))
    expect(screen.getAllByAltText('Entry image 1')).toHaveLength(2)
  })

  it('supports keyboard navigation while dialog is open', async () => {
    const user = userEvent.setup()

    render(<EntryPhotoGallery photos={photos} />)

    await user.click(screen.getByRole('button', { name: 'View image 1 of 2' }))
    await user.keyboard('{ArrowRight}')

    expect(screen.getAllByAltText('Entry image 2')).toHaveLength(2)

    await user.keyboard('{ArrowLeft}')
    expect(screen.getAllByAltText('Entry image 1')).toHaveLength(2)
  })

  it('hides previous/next buttons for a single image and closes dialog', async () => {
    const user = userEvent.setup()

    render(<EntryPhotoGallery photos={[photos[0]]} />)

    await user.click(screen.getByRole('button', { name: 'View image 1 of 1' }))

    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous image' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close image' }))

    expect(screen.queryByRole('button', { name: 'Close image' })).not.toBeInTheDocument()
  })
})
