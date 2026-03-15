import {
  ENTRY_IMAGE_ALLOWED_MIME_TYPES,
} from '@/lib/entry-image-constants'

const NON_ALPHANUMERIC_FILENAME = /[^a-zA-Z0-9.-]/g
const MULTIPLE_DASHES = /-+/g
const FILE_EXTENSION_PATTERN = /\.[a-zA-Z0-9]+$/

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .replace(NON_ALPHANUMERIC_FILENAME, '-')
    .replace(MULTIPLE_DASHES, '-')
    .replace(/^-|-$/g, '')
}

function getFileExtension(fileName: string): string {
  const match = fileName.match(FILE_EXTENSION_PATTERN)
  if (!match) {
    return '.jpg'
  }

  return match[0].toLowerCase()
}

function getBaseName(fileName: string): string {
  const normalizedName = fileName.split('/').at(-1) ?? fileName
  const withoutExtension = normalizedName.replace(FILE_EXTENSION_PATTERN, '')
  const sanitized = sanitizePathSegment(withoutExtension)

  return sanitized || 'entry-image'
}

export function isAllowedEntryImageMimeType(mimeType: string): boolean {
  return ENTRY_IMAGE_ALLOWED_MIME_TYPES.includes(mimeType as (typeof ENTRY_IMAGE_ALLOWED_MIME_TYPES)[number])
}

export function buildTempEntryImageStorageKey(input: {
  journalId: string
  fileName: string
  randomId: string
}): string {
  const baseName = getBaseName(input.fileName)
  const extension = getFileExtension(input.fileName)

  return `tmp/journals/${input.journalId}/${baseName}-${input.randomId}${extension}`
}

export function buildFinalEntryImageStorageKey(input: {
  journalId: string
  entryId: string
  fileName: string
  position: number
}): string {
  const baseName = getBaseName(input.fileName)
  const extension = getFileExtension(input.fileName)
  const position = String(input.position + 1).padStart(2, '0')

  return `journals/${input.journalId}/entries/${input.entryId}/${position}-${baseName}${extension}`
}

export function isTempEntryImageStorageKeyForJournal(storageKey: string, journalId: string): boolean {
  return storageKey.startsWith(`tmp/journals/${journalId}/`)
}

export function buildEntryPhotoProxyUrl(entryId: string, photoId: string): string {
  return `/api/entries/${entryId}/photos/${photoId}`
}
