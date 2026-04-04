import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { JournalSlideshow } from '@/app/dashboard/journals/[journalId]/journal-slideshow'

vi.mock('@/lib/entry-image-storage', () => ({
  buildEntryPhotoProxyUrl: (entryId: string, photoId: string) => `/proxy/${entryId}/${photoId}`,
}))

const photos = [
  { id: 'photo-1', entryId: 'entry-1' },
  { id: 'photo-2', entryId: 'entry-2' },
  { id: 'photo-3', entryId: 'entry-3' },
]

describe('JournalSlideshow', () => {
  it('renders the trigger element', () => {
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    expect(screen.getByRole('button', { name: 'Open Slideshow' })).toBeInTheDocument()
  })

  it('does not show slideshow content before trigger is clicked', () => {
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    expect(screen.queryByLabelText('Close slideshow')).not.toBeInTheDocument()
  })

  it('opens the slideshow when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    expect(screen.getByLabelText('Close slideshow')).toBeInTheDocument()
  })

  it('shows photo counter after opening', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
  })

  it('starts in playing state with Pause button visible', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    expect(screen.getByLabelText('Pause slideshow')).toBeInTheDocument()
  })

  it('toggles to paused when play/pause button is clicked', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    await user.click(screen.getByLabelText('Pause slideshow'))
    expect(screen.getByLabelText('Play slideshow')).toBeInTheDocument()
  })

  it('advances to next photo when Next button is clicked', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    await user.click(screen.getByLabelText('Next photo'))
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument()
  })

  it('goes to previous photo when Prev button is clicked', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    await user.click(screen.getByLabelText('Next photo'))
    await user.click(screen.getByLabelText('Previous photo'))
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
  })

  it('wraps from first to last photo when Prev is clicked on first photo', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    await user.click(screen.getByLabelText('Previous photo'))
    expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument()
  })

  it('navigates forward with ArrowRight key', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument()
  })

  it('navigates backward with ArrowLeft key', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
  })

  it('toggles play/pause with Space key', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    await user.keyboard('{ }')
    expect(screen.getByLabelText('Play slideshow')).toBeInTheDocument()
  })

  it('closes the dialog when Close button is clicked', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    await user.click(screen.getByLabelText('Close slideshow'))
    expect(screen.queryByLabelText('Close slideshow')).not.toBeInTheDocument()
  })

  it('hides prev/next buttons for a single photo', async () => {
    const user = userEvent.setup()
    render(
      <JournalSlideshow
        photos={[{ id: 'photo-1', entryId: 'entry-1' }]}
        trigger={<button>Open Slideshow</button>}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    expect(screen.queryByLabelText('Next photo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Previous photo')).not.toBeInTheDocument()
  })

  it('resets to first photo and playing state when reopened', async () => {
    const user = userEvent.setup()
    render(<JournalSlideshow photos={photos} trigger={<button>Open Slideshow</button>} />)

    // Open, advance, pause, then close
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    await user.click(screen.getByLabelText('Next photo'))
    await user.click(screen.getByLabelText('Pause slideshow'))
    await user.click(screen.getByLabelText('Close slideshow'))

    // Reopen and check reset state
    await user.click(screen.getByRole('button', { name: 'Open Slideshow' }))
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
    expect(screen.getByLabelText('Pause slideshow')).toBeInTheDocument()
  })
})
