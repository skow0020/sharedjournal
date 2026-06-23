import { beforeEach, describe, expect, it, vi } from 'vitest'
import JSZip from 'jszip'

const {
  getBlobMock,
  putBlobMock,
} = vi.hoisted(() => ({
  getBlobMock: vi.fn(),
  putBlobMock: vi.fn(),
}))

vi.mock('@vercel/blob', () => ({
  get: getBlobMock,
  put: putBlobMock,
}))

import { createOwnerJournalsExportZipAndUpload } from '@/lib/journal-export'
import type { OwnerJournalExportPayload } from '@/data/exports'

describe('createOwnerJournalsExportZipAndUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds ZIP with export.json and photo structure matching payload', async () => {
    const payload: OwnerJournalExportPayload = {
      version: '1',
      generatedAt: '2026-06-22T12:00:00.000Z',
      ownerUserId: 'owner-1',
      ownerEmail: 'owner@example.com',
      journals: [
        {
          id: 'journal-1',
          title: 'Summer Travel',
          description: 'Beach photos',
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-22T00:00:00.000Z',
          collaborators: [
            {
              id: 'user-2',
              displayName: 'Alice',
              role: 'editor',
            },
          ],
          entries: [
            {
              id: 'entry-1',
              title: 'Day 1',
              content: 'Great trip',
              entryDate: '2026-06-10',
              createdAt: '2026-06-10T10:00:00.000Z',
              author: {
                userId: 'owner-1',
                displayName: 'Owner',
              },
              photos: [
                {
                  id: 'photo-1',
                  entryId: 'entry-1',
                  mimeType: 'image/jpeg',
                  width: 1920,
                  height: 1080,
                  position: 0,
                  createdAt: '2026-06-10T10:01:00.000Z',
                  storageKey: 'entries/owner-1/entry-1/photo-1.jpg',
                },
                {
                  id: 'photo-2',
                  entryId: 'entry-1',
                  mimeType: 'image/png',
                  width: 800,
                  height: 600,
                  position: 1,
                  createdAt: '2026-06-10T10:02:00.000Z',
                  storageKey: 'entries/owner-1/entry-1/photo-2.png',
                },
              ],
              reflections: [
                {
                  id: 'reflection-1',
                  entryId: 'entry-1',
                  author: {
                    userId: 'user-2',
                    displayName: 'Alice',
                  },
                  content: 'Beautiful day',
                  createdAt: '2026-06-10T11:00:00.000Z',
                },
              ],
            },
          ],
        },
      ],
    }

    // Stub blob GET for each photo
    getBlobMock
      .mockResolvedValueOnce({
        statusCode: 200,
        stream: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])) // JPEG header
            controller.close()
          },
        }),
        blob: { contentType: 'image/jpeg' },
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        stream: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array([0x89, 0x50, 0x4E, 0x47])) // PNG header
            controller.close()
          },
        }),
        blob: { contentType: 'image/png' },
      })

    putBlobMock.mockResolvedValue({
      pathname: 'exports/users/owner-1/550e8400-e29b-41d4-a716-446655440000.zip',
      url: 'https://blob.example.com/exports/users/owner-1/550e8400-e29b-41d4-a716-446655440000.zip',
    })

    const result = await createOwnerJournalsExportZipAndUpload({
      ownerUserId: 'owner-1',
      payload,
    })

    // Verify filename format: sharedjournal-export-{date}.zip
    expect(result.fileName).toMatch(/^sharedjournal-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.zip$/)
    expect(result.storageKey).toMatch(/^exports\/users\/owner-1\/[a-f0-9-]{36}\.zip$/)
    expect(result.sizeBytes).toBeGreaterThan(0)

    // Verify blob.put was called with correct params
    expect(putBlobMock).toHaveBeenCalledOnce()
    const [putPath, putBuffer, putOptions] = putBlobMock.mock.calls[0]!
    expect(putPath).toMatch(/^exports\/users\/owner-1\/[a-f0-9-]{36}\.zip$/)
    expect(putBuffer).toBeInstanceOf(Buffer)
    expect(putOptions).toMatchObject({
      access: 'private',
      contentType: 'application/zip',
      addRandomSuffix: false,
    })

    // Verify blob.get was called for each photo
    expect(getBlobMock).toHaveBeenCalledTimes(2)
    expect(getBlobMock).toHaveBeenNthCalledWith(1, 'entries/owner-1/entry-1/photo-1.jpg', { access: 'private' })
    expect(getBlobMock).toHaveBeenNthCalledWith(2, 'entries/owner-1/entry-1/photo-2.png', { access: 'private' })

    // Parse and inspect ZIP contents
    const zipBuffer = putBlobMock.mock.calls[0]![1] as Buffer
    const zip = new JSZip()
    await zip.loadAsync(zipBuffer)

    const files = Object.keys(zip.files)

    // Verify export.json exists and contains correct structure
    expect(files).toContain('export.json')
    const jsonFile = zip.files['export.json']
    const jsonContent = JSON.parse(await jsonFile.async('text'))
    expect(jsonContent.version).toBe('1')
    expect(jsonContent.ownerUserId).toBe('owner-1')
    expect(jsonContent.journals).toHaveLength(1)

    // Verify photo paths follow format: photos/{sanitized-journal-title}/{entry-id}/{padded-position}-{photo-id}.{ext}
    expect(files).toContain('photos/Summer-Travel/entry-1/01-photo-1.jpg')
    expect(files).toContain('photos/Summer-Travel/entry-1/02-photo-2.png')

    // Verify photos are stored as files (not directories)
    const photoFile1 = zip.files['photos/Summer-Travel/entry-1/01-photo-1.jpg']
    const photoFile2 = zip.files['photos/Summer-Travel/entry-1/02-photo-2.png']
    expect(photoFile1.dir).toBe(false)
    expect(photoFile2.dir).toBe(false)

    const photo1Bytes = await photoFile1.async('uint8array')
    const photo2Bytes = await photoFile2.async('uint8array')
    expect(Array.from(photo1Bytes)).toEqual([0xFF, 0xD8, 0xFF, 0xE0])
    expect(Array.from(photo2Bytes)).toEqual([0x89, 0x50, 0x4E, 0x47])
  })

  it('skips photos that fail to fetch and logs error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const payload: OwnerJournalExportPayload = {
      version: '1',
      generatedAt: '2026-06-22T12:00:00.000Z',
      ownerUserId: 'owner-1',
      ownerEmail: 'owner@example.com',
      journals: [
        {
          id: 'journal-1',
          title: 'Test Journal',
          description: null,
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-22T00:00:00.000Z',
          collaborators: [],
          entries: [
            {
              id: 'entry-1',
              title: 'Test Entry',
              content: 'Content',
              entryDate: '2026-06-10',
              createdAt: '2026-06-10T10:00:00.000Z',
              author: {
                userId: 'owner-1',
                displayName: 'Owner',
              },
              photos: [
                {
                  id: 'photo-missing',
                  entryId: 'entry-1',
                  mimeType: 'image/jpeg',
                  width: 100,
                  height: 100,
                  position: 0,
                  createdAt: '2026-06-10T10:01:00.000Z',
                  storageKey: 'entries/owner-1/entry-1/missing.jpg',
                },
              ],
              reflections: [],
            },
          ],
        },
      ],
    }

    getBlobMock.mockResolvedValue(null)
    putBlobMock.mockResolvedValue({
      pathname: 'exports/users/owner-1/test.zip',
      url: 'https://blob.example.com/exports/users/owner-1/test.zip',
    })

    await createOwnerJournalsExportZipAndUpload({
      ownerUserId: 'owner-1',
      payload,
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unable to include export photo binary',
      expect.objectContaining({
        journalId: 'journal-1',
        entryId: 'entry-1',
        photoId: 'photo-missing',
        storageKey: 'entries/owner-1/entry-1/missing.jpg',
      }),
    )

    const zipBuffer = putBlobMock.mock.calls[0]![1] as Buffer
    const zip = new JSZip()
    await zip.loadAsync(zipBuffer)

    const files = Object.keys(zip.files)
    expect(files).not.toContain('photos/Test-Journal/entry-1/01-photo-missing.jpg')

    consoleErrorSpy.mockRestore()
  })

  it('sanitizes journal titles with special characters in photo paths', async () => {
    const payload: OwnerJournalExportPayload = {
      version: '1',
      generatedAt: '2026-06-22T12:00:00.000Z',
      ownerUserId: 'owner-1',
      ownerEmail: 'owner@example.com',
      journals: [
        {
          id: 'journal-1',
          title: 'My/Journal::2024!!!',
          description: null,
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-22T00:00:00.000Z',
          collaborators: [],
          entries: [
            {
              id: 'entry-1',
              title: 'Entry',
              content: 'Content',
              entryDate: '2026-06-10',
              createdAt: '2026-06-10T10:00:00.000Z',
              author: {
                userId: 'owner-1',
                displayName: 'Owner',
              },
              photos: [
                {
                  id: 'photo-1',
                  entryId: 'entry-1',
                  mimeType: 'image/jpeg',
                  width: 100,
                  height: 100,
                  position: 0,
                  createdAt: '2026-06-10T10:01:00.000Z',
                  storageKey: 'entries/owner-1/entry-1/photo.jpg',
                },
              ],
              reflections: [],
            },
          ],
        },
      ],
    }

    getBlobMock.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]))
          controller.close()
        },
      }),
      blob: { contentType: 'image/jpeg' },
    })

    putBlobMock.mockResolvedValue({
      pathname: 'exports/users/owner-1/test.zip',
      url: 'https://blob.example.com/exports/users/owner-1/test.zip',
    })

    await createOwnerJournalsExportZipAndUpload({
      ownerUserId: 'owner-1',
      payload,
    })

    const zipBuffer = putBlobMock.mock.calls[0]![1] as Buffer
    const zip = new JSZip()
    await zip.loadAsync(zipBuffer)

    const files = Object.keys(zip.files)
    // Sanitized: special chars replaced with '-', multiple dashes collapsed, trimmed
    expect(files).toContain('photos/My-Journal-2024/entry-1/01-photo-1.jpg')
  })
})
