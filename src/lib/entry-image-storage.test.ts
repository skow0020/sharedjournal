import { describe, expect, it } from 'vitest'

import {
  buildEntryPhotoProxyUrl,
  buildFinalEntryImageStorageKey,
  buildTempEntryImageStorageKey,
  isAllowedEntryImageMimeType,
  isTempEntryImageStorageKeyForJournal,
} from '@/lib/entry-image-storage'

describe('entry-image-storage helpers', () => {
  it('accepts allowed image mime types', () => {
    expect(isAllowedEntryImageMimeType('image/jpeg')).toBe(true)
    expect(isAllowedEntryImageMimeType('image/png')).toBe(true)
    expect(isAllowedEntryImageMimeType('image/webp')).toBe(true)
    expect(isAllowedEntryImageMimeType('application/pdf')).toBe(false)
  })

  it('builds temp keys with sanitized base name and lowercase extension', () => {
    const key = buildTempEntryImageStorageKey({
      journalId: 'journal-1',
      fileName: 'my photo(1).PNG',
      randomId: 'rand-1',
    })

    expect(key).toBe('tmp/journals/journal-1/my-photo-1-rand-1.png')
  })

  it('falls back to default extension and filename when name is missing', () => {
    const key = buildTempEntryImageStorageKey({
      journalId: 'journal-2',
      fileName: '   ',
      randomId: 'rand-2',
    })

    expect(key).toBe('tmp/journals/journal-2/entry-image-rand-2.jpg')
  })

  it('builds final keys with 1-based padded positions', () => {
    const key = buildFinalEntryImageStorageKey({
      journalId: 'journal-1',
      entryId: 'entry-9',
      fileName: 'trip photo.webp',
      position: 1,
    })

    expect(key).toBe('journals/journal-1/entries/entry-9/02-trip-photo.webp')
  })

  it('validates temp storage key prefix for a journal', () => {
    expect(isTempEntryImageStorageKeyForJournal('tmp/journals/journal-1/a.jpg', 'journal-1')).toBe(
      true,
    )
    expect(isTempEntryImageStorageKeyForJournal('tmp/journals/journal-2/a.jpg', 'journal-1')).toBe(
      false,
    )
  })

  it('builds entry photo proxy urls', () => {
    expect(buildEntryPhotoProxyUrl('entry-1', 'photo-2')).toBe(
      '/api/entries/entry-1/photos/photo-2',
    )
  })
})
