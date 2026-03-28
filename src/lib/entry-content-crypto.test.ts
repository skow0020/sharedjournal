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
      'ENTRY_CONTENT_ENCRYPTION_KEY is required to encrypt and decrypt journal entries.',
    )
  })

  it('throws when the encryption key is not exactly 32 bytes after base64 decode', () => {
    process.env.ENTRY_CONTENT_ENCRYPTION_KEY = Buffer.alloc(31, 9).toString('base64')

    expect(() => encryptEntryContent('Wrong key length.')).toThrow(
      'ENTRY_CONTENT_ENCRYPTION_KEY must decode to exactly 32 bytes.',
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

  it('throws when encrypted payload has an invalid IV segment length', () => {
    const invalidIvPayload = ['enc', 'v1', Buffer.alloc(4).toString('base64url'), Buffer.alloc(16).toString('base64url'), Buffer.from('secret').toString('base64url')].join(':')

    expect(() => decryptEntryContent(invalidIvPayload)).toThrow('Unable to decrypt journal entry content.')
  })

  it('throws when encrypted payload has an invalid auth tag segment length', () => {
    const invalidAuthTagPayload = ['enc', 'v1', Buffer.alloc(12).toString('base64url'), Buffer.alloc(8).toString('base64url'), Buffer.from('secret').toString('base64url')].join(':')

    expect(() => decryptEntryContent(invalidAuthTagPayload)).toThrow('Unable to decrypt journal entry content.')
  })
})