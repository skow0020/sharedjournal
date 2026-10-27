import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/test/launchdarkly/support-modal/route'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/test/launchdarkly/support-modal', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('support-modal test route', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('NODE_ENV', 'test')
    delete process.env.LAUNCHDARKLY_FLAG_SUPPORT_MODAL
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete process.env.LAUNCHDARKLY_FLAG_SUPPORT_MODAL
  })

  it('returns 404 in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const response = await POST(makeRequest({ enabled: true }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Not found.' })
    expect(process.env.LAUNCHDARKLY_FLAG_SUPPORT_MODAL).toBeUndefined()
  })

  it('returns 400 when enabled is missing or not boolean', async () => {
    const response = await POST(makeRequest({}))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'enabled must be a boolean.' })
    expect(process.env.LAUNCHDARKLY_FLAG_SUPPORT_MODAL).toBeUndefined()
  })

  it('stores a true override and returns success payload', async () => {
    const response = await POST(makeRequest({ enabled: true }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      supportModalEnabled: true,
    })
    expect(process.env.LAUNCHDARKLY_FLAG_SUPPORT_MODAL).toBe('true')
  })

  it('stores a false override and returns success payload', async () => {
    const response = await POST(makeRequest({ enabled: false }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      supportModalEnabled: false,
    })
    expect(process.env.LAUNCHDARKLY_FLAG_SUPPORT_MODAL).toBe('false')
  })
})
