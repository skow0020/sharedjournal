import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  handleUploadMock,
  getCurrentAppUserMock,
  getUserJournalByIdMock,
  isTempStorageKeyForJournalMock,
} = vi.hoisted(() => ({
  handleUploadMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
  getUserJournalByIdMock: vi.fn(),
  isTempStorageKeyForJournalMock: vi.fn(),
}))

vi.mock('@vercel/blob/client', () => ({
  handleUpload: handleUploadMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/data/journals', () => ({
  getUserJournalById: getUserJournalByIdMock,
}))

vi.mock('@/lib/entry-image-storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/entry-image-storage')>(
    '@/lib/entry-image-storage',
  )

  return {
    ...actual,
    isTempEntryImageStorageKeyForJournal: isTempStorageKeyForJournalMock,
  }
})

import { POST } from '@/app/api/entry-images/upload/route'

type UploadHandlerOptions = {
  onBeforeGenerateToken: (pathname: string, clientPayload: string | undefined) => Promise<unknown>
  onUploadCompleted: () => Promise<unknown> | unknown
}

function makeRequest() {
  return new Request('http://localhost/api/entry-images/upload', {
    method: 'POST',
    body: JSON.stringify({ type: 'blob.generate-client-token' }),
  })
}

describe('entry image upload route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getUserJournalByIdMock.mockResolvedValue({ id: 'journal-1' })
    isTempStorageKeyForJournalMock.mockReturnValue(true)
  })

  it('returns 401 when user is not authenticated', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(handleUploadMock).not.toHaveBeenCalled()
  })

  it('returns 400 when client payload is invalid', async () => {
    handleUploadMock.mockImplementation(async (options: UploadHandlerOptions) => {
      await options.onBeforeGenerateToken('tmp/journals/journal-1/file.jpg', 'not-json')
      return { ok: true }
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid upload payload.' })
  })

  it('returns 400 when client payload is empty', async () => {
    handleUploadMock.mockImplementation(async (options: UploadHandlerOptions) => {
      await options.onBeforeGenerateToken('tmp/journals/journal-1/file.jpg', undefined)
      return { ok: true }
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid upload payload.' })
  })

  it('returns 400 when user cannot upload to journal', async () => {
    getUserJournalByIdMock.mockResolvedValue(null)

    handleUploadMock.mockImplementation(async (options: UploadHandlerOptions) => {
      await options.onBeforeGenerateToken(
        'tmp/journals/journal-1/file.jpg',
        JSON.stringify({ journalId: 'journal-1' }),
      )
      return { ok: true }
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'You do not have permission to upload images to this journal.',
    })
  })

  it('returns 400 when upload destination is invalid', async () => {
    isTempStorageKeyForJournalMock.mockReturnValue(false)

    handleUploadMock.mockImplementation(async (options: UploadHandlerOptions) => {
      await options.onBeforeGenerateToken(
        'tmp/journals/journal-1/file.jpg',
        JSON.stringify({ journalId: 'journal-1' }),
      )
      return { ok: true }
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid upload destination.' })
  })

  it('returns upload metadata when upload setup succeeds', async () => {
    handleUploadMock.mockImplementation(async (options: UploadHandlerOptions) => {
      const token = await options.onBeforeGenerateToken(
        'tmp/journals/journal-1/file.jpg',
        JSON.stringify({ journalId: 'journal-1' }),
      )

      await options.onUploadCompleted()

      return {
        token,
        done: true,
      }
    })

    const response = await POST(makeRequest())

    expect(getUserJournalByIdMock).toHaveBeenCalledWith('user-1', 'journal-1')
    expect(response.status).toBe(200)

    const payload = await response.json()
    expect(payload.done).toBe(true)
    expect(payload.token.addRandomSuffix).toBe(true)
    expect(payload.token.maximumSizeInBytes).toBeGreaterThan(0)
  })

  it('returns generic upload error message for non-Error throwables', async () => {
    handleUploadMock.mockRejectedValue('bad state')

    const response = await POST(makeRequest())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Upload could not be started.' })
  })
})
