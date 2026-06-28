import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getBlobMock,
  getCurrentAppUserMock,
  getCurrentUserEmailMock,
  buildOwnerJournalsExportPayloadMock,
  createOwnerJournalsExportZipAndUploadMock,
} = vi.hoisted(() => ({
  getBlobMock: vi.fn(),
  getCurrentAppUserMock: vi.fn(),
  getCurrentUserEmailMock: vi.fn(),
  buildOwnerJournalsExportPayloadMock: vi.fn(),
  createOwnerJournalsExportZipAndUploadMock: vi.fn(),
}))

vi.mock('@vercel/blob', () => ({
  get: getBlobMock,
}))

vi.mock('@/lib/get-current-app-user', () => ({
  getCurrentAppUser: getCurrentAppUserMock,
}))

vi.mock('@/lib/get-current-user-email', () => ({
  getCurrentUserEmail: getCurrentUserEmailMock,
}))

vi.mock('@/data/exports', () => ({
  buildOwnerJournalsExportPayload: buildOwnerJournalsExportPayloadMock,
}))

vi.mock('@/data/journals', () => ({
  createJournalForOwner: vi.fn(),
  deleteJournalOwnedByUser: vi.fn(),
}))

vi.mock('@/lib/journal-export', () => ({
  createOwnerJournalsExportZipAndUpload: createOwnerJournalsExportZipAndUploadMock,
}))

import { GET } from '@/app/api/exports/download/route'
import { generateOwnerExportAction } from '@/app/dashboard/actions'

describe('owner export generation to download route flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('EXPORT_LINK_SIGNING_SECRET', 'integration-test-export-secret')

    getCurrentAppUserMock.mockResolvedValue({ id: 'user-1' })
    getCurrentUserEmailMock.mockResolvedValue('owner@example.com')

    buildOwnerJournalsExportPayloadMock.mockResolvedValue({
      version: '1',
      generatedAt: '2026-01-01T00:00:00.000Z',
      ownerUserId: 'user-1',
      ownerEmail: 'owner@example.com',
      journals: [
        {
          id: 'journal-1',
          title: 'Owner Journal',
          description: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          collaborators: [],
          entries: [],
        },
      ],
    })

    createOwnerJournalsExportZipAndUploadMock.mockResolvedValue({
      storageKey: 'exports/users/user-1/generated.zip',
      fileName: 'sharedjournal-export.zip',
      sizeBytes: 2048,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('generates a signed download URL and streams the export zip with token verification', async () => {
    const zipBytes = new TextEncoder().encode('mock-zip-bytes')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(zipBytes)
        controller.close()
      },
    })

    getBlobMock.mockResolvedValue({
      statusCode: 200,
      stream,
      blob: { contentType: 'application/zip' },
    })

    const actionResult = await generateOwnerExportAction({})

    expect(actionResult).toEqual({
      error: null,
      downloadUrl: expect.stringContaining('/api/exports/download?token='),
      expiresAt: expect.any(String),
    })

    const downloadUrl = new URL(actionResult.downloadUrl!, 'http://localhost').toString()
    const response = await GET(new Request(downloadUrl))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/zip')
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="sharedjournal-export.zip"',
    )
    expect(getBlobMock).toHaveBeenCalledWith('exports/users/user-1/generated.zip', {
      access: 'private',
    })

    const downloaded = new Uint8Array(await response.arrayBuffer())
    expect(Array.from(downloaded)).toEqual(Array.from(zipBytes))
  })
})
