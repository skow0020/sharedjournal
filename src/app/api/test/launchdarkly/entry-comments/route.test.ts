import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/test/launchdarkly/entry-comments/route'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/test/launchdarkly/entry-comments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('entry-comments test route', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('NODE_ENV', 'test')
    delete process.env.LAUNCHDARKLY_FLAG_ENTRY_COMMENTS
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete process.env.LAUNCHDARKLY_FLAG_ENTRY_COMMENTS
  })

  it('returns 404 in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const response = await POST(makeRequest({ enabled: true }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Not found.' })
    expect(process.env.LAUNCHDARKLY_FLAG_ENTRY_COMMENTS).toBeUndefined()
  })

  it('returns 400 when enabled is missing or not boolean', async () => {
    const response = await POST(makeRequest({}))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'enabled must be a boolean.' })
    expect(process.env.LAUNCHDARKLY_FLAG_ENTRY_COMMENTS).toBeUndefined()
  })

  it('stores a true override and returns success payload', async () => {
    const response = await POST(makeRequest({ enabled: true }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      entryCommentsEnabled: true,
    })
    expect(process.env.LAUNCHDARKLY_FLAG_ENTRY_COMMENTS).toBe('true')
  })

  it('stores a false override and returns success payload', async () => {
    const response = await POST(makeRequest({ enabled: false }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      entryCommentsEnabled: false,
    })
    expect(process.env.LAUNCHDARKLY_FLAG_ENTRY_COMMENTS).toBe('false')
  })
})
