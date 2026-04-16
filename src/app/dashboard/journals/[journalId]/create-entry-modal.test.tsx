import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pushMock,
  refreshMock,
  uploadMock,
  createObjectUrlMock,
  revokeObjectUrlMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  uploadMock: vi.fn(),
  createObjectUrlMock: vi.fn(),
  revokeObjectUrlMock: vi.fn(),
}))

vi.mock('@vercel/blob/client', () => ({
  upload: uploadMock,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/journals/journal-1',
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

import { CreateEntryModal } from '@/app/dashboard/journals/[journalId]/create-entry-modal'
import { ENTRY_IMAGE_MAX_FILE_BYTES, ENTRY_IMAGE_MAX_FILES } from '@/lib/entry-image-constants'

type MockRecognitionResult = {
  0: { transcript: string }
  isFinal: boolean
}

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = []

  lang = 'en-US'
  interimResults = false
  continuous = false
  onstart: ((event: Event) => void) | null = null
  onend: ((event: Event) => void) | null = null
  onresult: ((event: Event & { resultIndex?: number, results?: ArrayLike<MockRecognitionResult> }) => void) | null = null
  onerror: ((event: Event & { error?: string }) => void) | null = null

  constructor() {
    MockSpeechRecognition.instances.push(this)
  }

  start() {
    this.onstart?.(new Event('start'))
  }

  stop() {
    this.onend?.(new Event('end'))
  }

  emitFinalTranscript(transcript: string) {
    const resultEvent = Object.assign(new Event('result'), {
      resultIndex: 0,
      results: [
        {
          0: { transcript },
          isFinal: true,
        },
      ] satisfies ArrayLike<MockRecognitionResult>,
    }) as Event & { resultIndex?: number, results?: ArrayLike<MockRecognitionResult> }

    this.onresult?.(resultEvent)
  }
}

class MockImage {
  onload: null | (() => void) = null
  onerror: null | (() => void) = null
  naturalWidth = 1280
  naturalHeight = 720

  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.()
    })
  }
}

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

describe('CreateEntryModal', () => {
  function mockMatchMedia(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(pointer: coarse)' ? matches : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  }

  function getCameraInput(): HTMLInputElement {
    const input = document.querySelector('input[type="file"][capture]')

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Camera input not found')
    }

    return input
  }

  function mockSpeechRecognition(supported: boolean) {
    MockSpeechRecognition.instances = []

    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      writable: true,
      value: supported ? MockSpeechRecognition : undefined,
    })

    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockMatchMedia(false)
    mockSpeechRecognition(false)

    createObjectUrlMock
      .mockReturnValueOnce('blob:preview-1')
      .mockReturnValueOnce('blob:preview-2')
      .mockReturnValue('blob:preview-default')

    vi.stubGlobal('Image', MockImage)

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrlMock,
    })

    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrlMock,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: originalCreateObjectURL,
    })

    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: originalRevokeObjectURL,
    })
  })

  function getFileInput(): HTMLInputElement {
    const input = document.querySelector('input[type="file"]:not([capture])')

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('File input not found')
    }

    return input
  }

  it('opens modal and renders entry fields', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    expect(screen.getByText('Create an entry')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Content')).toBeInTheDocument()
    expect(screen.getByLabelText('Entry date')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Browse images' })).toBeInTheDocument()
  })

  it('submits entry values to the action', async () => {
    const user = userEvent.setup()

    const action = vi.fn(async () => {
      return {
        error: null,
        redirectTo: '/dashboard/journals/journal-1',
      }
    })
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.type(screen.getByLabelText('Title'), 'Morning Reflection')
    await user.type(screen.getByLabelText('Content'), 'Wrote about priorities for today.')
    await user.clear(screen.getByLabelText('Entry date'))
    await user.type(screen.getByLabelText('Entry date'), '2026-03-07')
    await user.click(screen.getByRole('button', { name: 'Create entry' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalled()
    })

    expect(action).toHaveBeenCalledWith({
      journalId: 'journal-1',
      title: 'Morning Reflection',
      content: 'Wrote about priorities for today.',
      entryDate: '2026-03-07',
      uploadedImages: [],
    })
    expect(pushMock).not.toHaveBeenCalled()
    expect(refreshMock).toHaveBeenCalled()
  }, 15000)

  it('uploads an image and includes it in submitted payload', async () => {
    const user = userEvent.setup()

    uploadMock.mockResolvedValue({
      pathname: 'tmp/journals/journal-1/uploaded-1.jpg',
    })

    const action = vi.fn(async () => ({
      error: null,
      redirectTo: '/dashboard/journals/journal-9',
    }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.type(screen.getByLabelText('Title'), 'Photo entry')
    await user.type(screen.getByLabelText('Content'), 'Added one image')

    const file = new File(['binary'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(getFileInput(), file)

    expect(await screen.findByText('Uploaded')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create entry' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalled()
    })

    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadedImages: [
          expect.objectContaining({
            tempStorageKey: 'tmp/journals/journal-1/uploaded-1.jpg',
            fileName: 'photo.jpg',
            mimeType: 'image/jpeg',
            width: 1280,
            height: 720,
          }),
        ],
      }),
    )
    expect(pushMock).toHaveBeenCalledWith('/dashboard/journals/journal-9')
  }, 15000)

  it('shows validation when selected image is invalid or too large', async () => {
    const user = userEvent.setup({ applyAccept: false })

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    const invalidTypeFile = new File(['content'], 'notes.txt', { type: 'text/plain' })
    await user.upload(getFileInput(), invalidTypeFile)
    expect(screen.getByText('Only JPEG, PNG, and WebP images are supported.')).toBeInTheDocument()

    const tooLargeSize = ENTRY_IMAGE_MAX_FILE_BYTES + 1024
    const tooLargeFile = new File(['x'], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(tooLargeFile, 'size', { configurable: true, value: tooLargeSize })
    await user.upload(getFileInput(), tooLargeFile)
    expect(screen.getByText(/Each image must be/)).toBeInTheDocument()
  }, 15000)

  it('shows failed upload state and blocks submit until removed', async () => {
    const user = userEvent.setup()

    uploadMock.mockRejectedValue(new Error('Upload failed unexpectedly'))

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.type(screen.getByLabelText('Title'), 'Failed upload')
    await user.type(screen.getByLabelText('Content'), 'Try again')

    const file = new File(['content'], 'bad.png', { type: 'image/png' })
    await user.upload(getFileInput(), file)

    expect(await screen.findByText('Upload failed unexpectedly')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create entry' }))

    expect(screen.getByText('Remove failed uploads before creating this entry.')).toBeInTheDocument()
    expect(action).not.toHaveBeenCalled()
  }, 15000)

  it('cleans up uploaded images when removing and when canceling draft', async () => {
    const user = userEvent.setup()

    uploadMock.mockResolvedValue({
      pathname: 'tmp/journals/journal-1/uploaded-2.jpg',
    })

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.upload(getFileInput(), new File(['img'], 'first.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByText('Uploaded')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(cleanupAction).toHaveBeenCalledWith({
        journalId: 'journal-1',
        storageKeys: ['tmp/journals/journal-1/uploaded-2.jpg'],
      })
    })

    uploadMock.mockResolvedValueOnce({ pathname: 'tmp/journals/journal-1/uploaded-3.jpg' })
    await user.upload(getFileInput(), new File(['img2'], 'second.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByText('Uploaded')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(cleanupAction).toHaveBeenCalledWith({
        journalId: 'journal-1',
        storageKeys: ['tmp/journals/journal-1/uploaded-3.jpg'],
      })
    })

    expect(screen.queryByText('Create an entry')).not.toBeInTheDocument()
    expect(revokeObjectUrlMock).toHaveBeenCalled()
  }, 15000)

  it('shows max files message when selecting more than allowed', async () => {
    const user = userEvent.setup()

    uploadMock.mockImplementation(async (_storageKey: string, file: File) => ({
      pathname: `tmp/journals/journal-1/${file.name}`,
    }))

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    const files = Array.from({ length: ENTRY_IMAGE_MAX_FILES + 1 }, (_, index) =>
      new File([`f${index}`], `img-${index}.jpg`, { type: 'image/jpeg' }),
    )

    await user.upload(getFileInput(), files)

    expect(screen.getByText(new RegExp(`Only ${ENTRY_IMAGE_MAX_FILES} images can be attached to an entry\\.`))).toBeInTheDocument()
  }, 20000)

  it('shows cleanup error and keeps modal open when cancel cleanup fails', async () => {
    const user = userEvent.setup()

    uploadMock.mockResolvedValue({
      pathname: 'tmp/journals/journal-1/uploaded-fail.jpg',
    })

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: 'Failed to discard draft image.' }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.upload(getFileInput(), new File(['img'], 'fail.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByText('Uploaded')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('Failed to discard draft image.')).toBeInTheDocument()
    expect(screen.getByText('Create an entry')).toBeInTheDocument()
  }, 15000)

  it('does not show Take photo button on non-mobile devices', async () => {
    const user = userEvent.setup()

    mockMatchMedia(false)

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    expect(screen.getByRole('button', { name: 'Browse images' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Take photo' })).not.toBeInTheDocument()
  })

  it('detects mobile using the pointer coarse media query', async () => {
    const user = userEvent.setup()

    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaMock,
    })

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    expect(matchMediaMock).toHaveBeenCalledWith('(pointer: coarse)')
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument()
  })

  it('defaults to non-mobile behavior when matchMedia is unavailable', async () => {
    const user = userEvent.setup()

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    })

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    expect(screen.getByRole('button', { name: 'Browse images' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Take photo' })).not.toBeInTheDocument()
  })

  it('shows Take photo button on mobile devices', async () => {
    const user = userEvent.setup()

    mockMatchMedia(true)

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    expect(screen.getByRole('button', { name: 'Browse images' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument()
  })

  it('shows Speak entry button on mobile when speech recognition is supported', async () => {
    const user = userEvent.setup()

    mockMatchMedia(true)
    mockSpeechRecognition(true)

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    expect(screen.getByRole('button', { name: 'Speak entry' })).toBeInTheDocument()
  })

  it('hides Speak entry button on mobile when speech recognition is unavailable', async () => {
    const user = userEvent.setup()

    mockMatchMedia(true)
    mockSpeechRecognition(false)

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    expect(screen.queryByRole('button', { name: 'Speak entry' })).not.toBeInTheDocument()
  })

  it('appends recognized speech to entry content', async () => {
    const user = userEvent.setup()

    mockMatchMedia(true)
    mockSpeechRecognition(true)

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.type(screen.getByLabelText('Content'), 'Started writing')
    await user.click(screen.getByRole('button', { name: 'Speak entry' }))

    const recognition = MockSpeechRecognition.instances[0]

    if (!recognition) {
      throw new Error('Speech recognition instance not found')
    }

    recognition.emitFinalTranscript('using my voice')

    await waitFor(() => {
      expect(screen.getByLabelText('Content')).toHaveValue('Started writing using my voice')
    })
  })

  it('camera input has capture attribute targeting rear camera', async () => {
    const user = userEvent.setup()

    mockMatchMedia(true)

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    const cameraInput = getCameraInput()
    expect(cameraInput.getAttribute('capture')).toBe('environment')
    expect(cameraInput.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp')
  })

  it('uploads photo taken via camera and includes it in submitted payload', async () => {
    const user = userEvent.setup()

    mockMatchMedia(true)

    uploadMock.mockResolvedValue({
      pathname: 'tmp/journals/journal-1/camera-photo.jpg',
    })

    const action = vi.fn(async () => ({
      error: null,
      redirectTo: '/dashboard/journals/journal-1',
    }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))
    await user.type(screen.getByLabelText('Title'), 'Camera entry')
    await user.type(screen.getByLabelText('Content'), 'Taken with camera')

    const photo = new File(['binary'], 'camera-photo.jpg', { type: 'image/jpeg' })
    await user.upload(getCameraInput(), photo)

    expect(await screen.findByText('Uploaded')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create entry' }))

    await waitFor(() => {
      expect(action).toHaveBeenCalled()
    })

    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadedImages: [
          expect.objectContaining({
            tempStorageKey: 'tmp/journals/journal-1/camera-photo.jpg',
            fileName: 'camera-photo.jpg',
            mimeType: 'image/jpeg',
          }),
        ],
      }),
    )
  }, 15000)

  it('hides both image buttons on mobile when max files are selected', async () => {
    const user = userEvent.setup()

    mockMatchMedia(true)

    uploadMock.mockImplementation(async (_storageKey: string, file: File) => ({
      pathname: `tmp/journals/journal-1/${file.name}`,
    }))

    const action = vi.fn(async () => ({ error: null, redirectTo: null }))
    const cleanupAction = vi.fn(async () => ({ error: null }))

    render(<CreateEntryModal journalId="journal-1" action={action} cleanupAction={cleanupAction} />)

    await user.click(screen.getByRole('button', { name: 'Add entry' }))

    const files = Array.from({ length: ENTRY_IMAGE_MAX_FILES }, (_, index) =>
      new File([`f${index}`], `img-${index}.jpg`, { type: 'image/jpeg' }),
    )

    for (const [index, file] of files.entries()) {
      await user.upload(getFileInput(), file)

      await waitFor(() => {
        expect(screen.getAllByText('Uploaded')).toHaveLength(index + 1)
      })
    }

    expect(screen.queryByRole('button', { name: 'Browse images' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Take photo' })).not.toBeInTheDocument()
  }, 30000)
})
