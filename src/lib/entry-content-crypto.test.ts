import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  decryptEntryContent,
  encryptEntryContent,
  isEncryptedEntryContent,
} from '@/lib/entry-content-crypto'

const originalEntryContentEncryptionKey = process.env.ENTRY_CONTENT_ENCRYPTION_KEY
const testEntryContentEncryptionKey = Buffer.alloc(32, 9).toString('base64')

describe('entry-content-crypto', () => {
  beforeEach(() => {
    process.env.ENTRY_CONTENT_ENCRYPTION_KEY = testEntryContentEncryptionKey
  })

  afterEach(() => {
    if (originalEntryContentEncryptionKey === undefined) {
      delete process.env.ENTRY_CONTENT_ENCRYPTION_KEY
      return
    }

    process.env.ENTRY_CONTENT_ENCRYPTION_KEY = originalEntryContentEncryptionKey
  })

  it('encrypts plaintext and decrypts it back to the original value', () => {
    const encryptedValue = encryptEntryContent('Private journal entry.')

    expect(encryptedValue).not.toBe('Private journal entry.')
    expect(isEncryptedEntryContent(encryptedValue)).toBe(true)
    expect(decryptEntryContent(encryptedValue)).toBe('Private journal entry.')
  })

  it('leaves legacy plaintext values readable', () => {
    expect(decryptEntryContent('Legacy unencrypted entry.')).toBe('Legacy unencrypted entry.')
  })

  it('throws when the encryption key is missing', () => {
    delete process.env.ENTRY_CONTENT_ENCRYPTION_KEY

    expect(() => encryptEntryContent('Missing key.')).toThrow(
      'ENTRY_CONTENT_ENCRYPTION_KEY is required to access encrypted journal entries.',
    )
  })

  it('treats enc:v1-prefixed plaintext with wrong part count as legacy plaintext', () => {
    const prefixedPlaintext = 'enc:v1:this is not encrypted content'

    expect(isEncryptedEntryContent(prefixedPlaintext)).toBe(false)
    expect(decryptEntryContent(prefixedPlaintext)).toBe(prefixedPlaintext)
  })

  it('throws when a structurally valid encrypted payload fails decryption', () => {
    const encryptedValue = encryptEntryContent('Private journal entry.')

    process.env.ENTRY_CONTENT_ENCRYPTION_KEY = Buffer.alloc(32, 99).toString('base64')

    expect(() => decryptEntryContent(encryptedValue)).toThrow('Unable to decrypt journal entry content.')

    process.env.ENTRY_CONTENT_ENCRYPTION_KEY = testEntryContentEncryptionKey
  })
})