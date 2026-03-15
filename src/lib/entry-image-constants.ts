export const ENTRY_IMAGE_MAX_FILES = 5
export const ENTRY_IMAGE_MAX_FILE_BYTES = 10 * 1024 * 1024

export const ENTRY_IMAGE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type EntryImageAllowedMimeType = (typeof ENTRY_IMAGE_ALLOWED_MIME_TYPES)[number]
