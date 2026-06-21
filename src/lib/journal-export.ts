import { get, put } from '@vercel/blob'
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

  for (const journal of input.payload.journals) {
    const journalFolder = sanitizePathSegment(journal.title)

    for (const entry of journal.entries) {
      for (const photo of entry.photos) {
        const blobResult = await get(photo.storageKey, { access: 'private' })

        if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
          console.error('Unable to include export photo binary', {
            journalId: journal.id,
            entryId: entry.id,
            photoId: photo.id,
            storageKey: photo.storageKey,
          })
          continue
        }

        const fileExtension = getFileExtensionFromStorageKey(photo.storageKey)
        const photoPath = `photos/${journalFolder}/${entry.id}/${String(photo.position + 1).padStart(2, '0')}-${photo.id}${fileExtension}`
        const binary = await streamToUint8Array(blobResult.stream)

        zip.file(photoPath, binary)
      }
    }
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
