import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getBlobMock, getEntryPhotoForUserMock, getCurrentAppUserMock } = vi.hoisted(() => ({
  getBlobMock: vi.fn(),
  getEntryPhotoForUserMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
}))

vi.mock('@vercel/blob', () => ({
  get: getBlobMock,
}))

vi.mock('@/data/entries', () => ({
  getEntryPhotoForUser: getEntryPhotoForUserMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

import { GET } from '@/app/api/entries/[entryId]/photos/[photoId]/route'

function makeParams() {
  return Promise.resolve({ entryId: 'entry-1', photoId: 'photo-1' })
}

describe('entry photo proxy route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
  })

  it('returns 401 when user is not authenticated', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost'), { params: makeParams() })

    expect(response.status).toBe(401)
    await expect(response.text()).resolves.toBe('Unauthorized')
    expect(getEntryPhotoForUserMock).not.toHaveBeenCalled()
  })

  it('returns 404 when photo is not accessible to user', async () => {
    getEntryPhotoForUserMock.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost'), { params: makeParams() })

    expect(getEntryPhotoForUserMock).toHaveBeenCalledWith({
      userId: 'user-1',
      entryId: 'entry-1',
      photoId: 'photo-1',
    })
    expect(response.status).toBe(404)
  })

  it('returns 404 when blob cannot be streamed', async () => {
    getEntryPhotoForUserMock.mockResolvedValue({
      storageKey: 'journals/j1/entries/e1/p1.jpg',
      mimeType: 'image/jpeg',
    })
    getBlobMock.mockResolvedValue({ statusCode: 200, stream: null, blob: { contentType: 'image/jpeg' } })

    const response = await GET(new Request('http://localhost'), { params: makeParams() })

    expect(response.status).toBe(404)
  })

  it('returns 404 when blob lookup returns null', async () => {
    getEntryPhotoForUserMock.mockResolvedValue({
      storageKey: 'journals/j1/entries/e1/p-missing.jpg',
      mimeType: 'image/jpeg',
    })
    getBlobMock.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost'), { params: makeParams() })

    expect(response.status).toBe(404)
  })

  it('returns streamed image with private cache headers', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('abc'))
        controller.close()
      },
    })

    getEntryPhotoForUserMock.mockResolvedValue({
      storageKey: 'journals/j1/entries/e1/p1.jpg',
      mimeType: 'image/webp',
    })

    getBlobMock.mockResolvedValue({
      statusCode: 200,
      stream,
      blob: { contentType: null },
    })

    const response = await GET(new Request('http://localhost'), { params: makeParams() })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/webp')
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=60')
  })

  it('prefers blob content type when present', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('abc'))
        controller.close()
      },
    })

    getEntryPhotoForUserMock.mockResolvedValue({
      storageKey: 'journals/j1/entries/e1/p2.jpg',
      mimeType: 'image/webp',
    })

    getBlobMock.mockResolvedValue({
      statusCode: 200,
      stream,
      blob: { contentType: 'image/jpeg' },
    })

    const response = await GET(new Request('http://localhost'), { params: makeParams() })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
  })
})
