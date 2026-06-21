import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getBlobMock, getCurrentAppUserMock, verifyExportDownloadTokenMock } = vi.hoisted(() => ({
  getBlobMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
  verifyExportDownloadTokenMock: vi.fn(),
}))

vi.mock('@vercel/blob', () => ({
  get: getBlobMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/lib/export-link-token', () => ({
  verifyExportDownloadToken: verifyExportDownloadTokenMock,
}))

import { GET } from '@/app/api/exports/download/route'

describe('exports download route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
  })

  it('returns 401 when user is not authenticated', async () => {
    getCurrentAppUserMock.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost/api/exports/download?token=abc'))

    expect(response.status).toBe(401)
    await expect(response.text()).resolves.toBe('Unauthorized')
  })

  it('returns 400 when token is missing', async () => {
    const response = await GET(new Request('http://localhost/api/exports/download'))

    expect(response.status).toBe(400)
    await expect(response.text()).resolves.toBe('Missing token')
  })

  it('returns 400 when token is invalid', async () => {
    verifyExportDownloadTokenMock.mockReturnValue({ ok: false, reason: 'invalid' })

    const response = await GET(new Request('http://localhost/api/exports/download?token=abc'))

    expect(response.status).toBe(400)
    await expect(response.text()).resolves.toBe('Invalid token')
  })

  it('returns 410 when token is expired', async () => {
    verifyExportDownloadTokenMock.mockReturnValue({ ok: false, reason: 'expired' })

    const response = await GET(new Request('http://localhost/api/exports/download?token=abc'))

    expect(response.status).toBe(410)
    await expect(response.text()).resolves.toBe('Export link has expired')
  })

  it('returns 403 when token belongs to another user', async () => {
    verifyExportDownloadTokenMock.mockReturnValue({
      ok: true,
      payload: {
        userId: 'other-user',
        storageKey: 'exports/users/other/file.zip',
        fileName: 'file.zip',
        exp: Math.floor(Date.now() / 1000) + 60,
      },
    })

    const response = await GET(new Request('http://localhost/api/exports/download?token=abc'))

    expect(response.status).toBe(403)
    await expect(response.text()).resolves.toBe('Forbidden')
  })

  it('returns 404 when blob cannot be streamed', async () => {
    verifyExportDownloadTokenMock.mockReturnValue({
      ok: true,
      payload: {
        userId: 'user-1',
        storageKey: 'exports/users/user-1/file.zip',
        fileName: 'file.zip',
        exp: Math.floor(Date.now() / 1000) + 60,
      },
    })

    getBlobMock.mockResolvedValue({
      statusCode: 200,
      stream: null,
      blob: { contentType: 'application/zip' },
    })

    const response = await GET(new Request('http://localhost/api/exports/download?token=abc'))

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toBe('Not found')
  })

  it('returns zip stream for valid request', async () => {
    verifyExportDownloadTokenMock.mockReturnValue({
      ok: true,
      payload: {
        userId: 'user-1',
        storageKey: 'exports/users/user-1/file.zip',
        fileName: 'my-export.zip',
        exp: Math.floor(Date.now() / 1000) + 60,
      },
    })

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('zip'))
        controller.close()
      },
    })

    getBlobMock.mockResolvedValue({
      statusCode: 200,
      stream,
      blob: { contentType: 'application/zip' },
    })

    const response = await GET(new Request('http://localhost/api/exports/download?token=abc'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/zip')
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="my-export.zip"')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })
})
