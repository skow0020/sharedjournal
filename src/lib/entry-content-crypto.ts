import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ENTRY_CONTENT_PREFIX = 'enc:v1'
const ENTRY_CONTENT_IV_BYTES = 12
const ENTRY_CONTENT_AUTH_TAG_BYTES = 16
const ENTRY_CONTENT_KEY_BYTES = 32
const ENTRY_CONTENT_PARTS = 5

function normalizeBase64(value: string): string {
  const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/')
  const remainder = normalizedValue.length % 4

  if (remainder === 0) {
    return normalizedValue
  }

  return normalizedValue.padEnd(normalizedValue.length + (4 - remainder), '=')
}

function getEntryContentEncryptionKey(): Buffer {
  const encodedKey = process.env.ENTRY_CONTENT_ENCRYPTION_KEY

  if (!encodedKey) {
    throw new Error('ENTRY_CONTENT_ENCRYPTION_KEY is required to access encrypted journal entries.')
  }

  const key = Buffer.from(normalizeBase64(encodedKey), 'base64')

  if (key.length !== ENTRY_CONTENT_KEY_BYTES) {
    throw new Error('ENTRY_CONTENT_ENCRYPTION_KEY must decode to exactly 32 bytes.')
  }

  return key
}

function decodeRequiredPart(value: string, expectedLength: number, label: string): Buffer {
  const decodedValue = Buffer.from(normalizeBase64(value), 'base64')

  if (decodedValue.length !== expectedLength) {
    throw new Error(`Encrypted entry ${label} is invalid.`)
  }

  return decodedValue
}

export function isEncryptedEntryContent(value: string): boolean {
  if (!value.startsWith(`${ENTRY_CONTENT_PREFIX}:`)) {
    return false
  }

  return value.split(':').length === ENTRY_CONTENT_PARTS
}

export function encryptEntryContent(plaintext: string): string {
  const iv = randomBytes(ENTRY_CONTENT_IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', getEntryContentEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    ENTRY_CONTENT_PREFIX,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':')
}

export function decryptEntryContent(value: string): string {
  if (!value.startsWith(`${ENTRY_CONTENT_PREFIX}:`)) {
    return value
  }

  const parts = value.split(':')

  if (parts.length !== ENTRY_CONTENT_PARTS) {
    return value
  }

  try {
    const iv = decodeRequiredPart(parts[2], ENTRY_CONTENT_IV_BYTES, 'IV')
    const authTag = decodeRequiredPart(parts[3], ENTRY_CONTENT_AUTH_TAG_BYTES, 'auth tag')
    const ciphertext = Buffer.from(normalizeBase64(parts[4]), 'base64')
    const decipher = createDecipheriv('aes-256-gcm', getEntryContentEncryptionKey(), iv)

    decipher.setAuthTag(authTag)

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch (error) {
    throw new Error('Unable to decrypt journal entry content.', {
      cause: error,
    })
  }
}