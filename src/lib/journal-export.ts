import { get, put } from '@vercel/blob'
import pLimit from 'p-limit'
import JSZip from 'jszip'

import type { OwnerJournalExportPayload } from '@/data/exports'

const NON_ALPHANUMERIC = /[^a-zA-Z0-9._-]/g

type UploadOwnerJournalExportInput = {
  ownerUserId: string
  payload: OwnerJournalExportPayload
}

export type UploadedOwnerJournalExport = {
  storageKey: string
  fileName: string
  sizeBytes: number
}

function sanitizePathSegment(value: string): string {
  const sanitized = value.trim().replace(NON_ALPHANUMERIC, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return sanitized || 'untitled'
}

function getFileExtensionFromStorageKey(storageKey: string): string {
  const lastSegment = storageKey.split('/').at(-1) ?? storageKey
  const extensionMatch = lastSegment.match(/\.[a-zA-Z0-9]+$/)
  return extensionMatch?.[0]?.toLowerCase() ?? '.bin'
}

async function streamToUint8Array(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const arrayBuffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

export async function createOwnerJournalsExportZipAndUpload(
  input: UploadOwnerJournalExportInput,
): Promise<UploadedOwnerJournalExport> {
  const zip = new JSZip()

  zip.file('export.json', JSON.stringify(input.payload, null, 2))

  // Use concurrency limit to avoid overwhelming serverless memory/connections
  const limit = pLimit(5)

  // Collect all photo fetch tasks while maintaining order
  type PhotoFetchTask = {
    journalId: string
    entryId: string
    photoId: string
    storageKey: string
    photoPath: string
    promise: Promise<unknown>
  }

  const photoFetchTasks: PhotoFetchTask[] = []

  for (const journal of input.payload.journals) {
    const journalFolder = sanitizePathSegment(journal.title)

    for (const entry of journal.entries) {
      for (const photo of entry.photos) {
        const fileExtension = getFileExtensionFromStorageKey(photo.storageKey)
        const photoPath = `photos/${journalFolder}/${entry.id}/${String(photo.position + 1).padStart(2, '0')}-${photo.id}${fileExtension}`

        photoFetchTasks.push({
          journalId: journal.id,
          entryId: entry.id,
          photoId: photo.id,
          storageKey: photo.storageKey,
          photoPath,
          promise: limit(async () => {
            try {
              return await get(photo.storageKey, { access: 'private' })
            } catch (error) {
              console.error('Unable to include export photo binary', {
                journalId: journal.id,
                entryId: entry.id,
                photoId: photo.id,
                storageKey: photo.storageKey,
                error: error instanceof Error ? error.message : String(error),
              })
              return null
            }
          }),
        })
      }
    }
  }

  // Fetch all photos concurrently, then add to ZIP
  const photoResults = await Promise.all(photoFetchTasks.map((task) => task.promise))

  for (let i = 0; i < photoFetchTasks.length; i++) {
    const task = photoFetchTasks[i]
    const blobResult = photoResults[i] as unknown

    if (
      !blobResult ||
      typeof blobResult !== 'object' ||
      (blobResult as Record<string, unknown>).statusCode !== 200 ||
      !(blobResult as Record<string, unknown>).stream
    ) {
      console.error('Unable to include export photo binary', {
        journalId: task.journalId,
        entryId: task.entryId,
        photoId: task.photoId,
        storageKey: task.storageKey,
      })
      continue
    }

    const binary = await streamToUint8Array(
      (blobResult as Record<string, unknown>).stream as ReadableStream<Uint8Array>,
    )
    zip.file(task.photoPath, binary)
  }

  const zipBytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fileName = `sharedjournal-export-${stamp}.zip`
  const storageKey = `exports/users/${input.ownerUserId}/${crypto.randomUUID()}.zip`

  const uploadedBlob = await put(storageKey, Buffer.from(zipBytes), {
    access: 'private',
    contentType: 'application/zip',
    addRandomSuffix: false,
  })

  return {
    storageKey: uploadedBlob.pathname,
    fileName,
    sizeBytes: zipBytes.byteLength,
  }
}
