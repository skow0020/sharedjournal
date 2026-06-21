import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createExportDownloadToken,
  verifyExportDownloadToken,
} from '@/lib/export-link-token'

describe('export-link-token', () => {
  beforeEach(() => {
    vi.stubEnv('EXPORT_LINK_SIGNING_SECRET', 'test-signing-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates and verifies a valid token', () => {
    const token = createExportDownloadToken({
      userId: 'user-1',
      storageKey: 'exports/users/user-1/a.zip',
      fileName: 'export.zip',
      exp: Math.floor(Date.now() / 1000) + 60,
    })

    const result = verifyExportDownloadToken(token)

    expect(result).toEqual({
      ok: true,
      payload: {
        userId: 'user-1',
        storageKey: 'exports/users/user-1/a.zip',
        fileName: 'export.zip',
        exp: expect.any(Number),
      },
    })
  })

  it('returns invalid when token is tampered', () => {
    const token = createExportDownloadToken({
      userId: 'user-1',
      storageKey: 'exports/users/user-1/a.zip',
      fileName: 'export.zip',
      exp: Math.floor(Date.now() / 1000) + 60,
    })

    const tampered = `${token}abc`
    const result = verifyExportDownloadToken(tampered)

    expect(result).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('returns expired when token has expired', () => {
    const token = createExportDownloadToken({
      userId: 'user-1',
      storageKey: 'exports/users/user-1/a.zip',
      fileName: 'export.zip',
      exp: Math.floor(Date.now() / 1000) - 1,
    })

    const result = verifyExportDownloadToken(token)

    expect(result).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  it('throws when secret is missing for token creation', () => {
    vi.unstubAllEnvs()

    expect(() => createExportDownloadToken({
      userId: 'user-1',
      storageKey: 'exports/users/user-1/a.zip',
      fileName: 'export.zip',
      exp: Math.floor(Date.now() / 1000) + 60,
    })).toThrow('EXPORT_LINK_SIGNING_SECRET is required for export download links.')
  })
})
