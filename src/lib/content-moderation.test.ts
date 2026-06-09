import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { moderateContent } from '@/lib/content-moderation'

const originalEnabled = process.env.CONTENT_MODERATION_ENABLED
const originalProvider = process.env.CONTENT_MODERATION_PROVIDER
const originalApiKey = process.env.CONTENT_MODERATION_API_KEY
const originalFailMode = process.env.CONTENT_MODERATION_FAIL_MODE

describe('moderateContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.CONTENT_MODERATION_PROVIDER = 'openai'
    process.env.CONTENT_MODERATION_API_KEY = 'test-key'
  })

  afterEach(() => {
    if (originalEnabled === undefined) {
      delete process.env.CONTENT_MODERATION_ENABLED
    } else {
      process.env.CONTENT_MODERATION_ENABLED = originalEnabled
    }

    if (originalProvider === undefined) {
      delete process.env.CONTENT_MODERATION_PROVIDER
    } else {
      process.env.CONTENT_MODERATION_PROVIDER = originalProvider
    }

    if (originalApiKey === undefined) {
      delete process.env.CONTENT_MODERATION_API_KEY
    } else {
      process.env.CONTENT_MODERATION_API_KEY = originalApiKey
    }

    if (originalFailMode === undefined) {
      delete process.env.CONTENT_MODERATION_FAIL_MODE
    } else {
      process.env.CONTENT_MODERATION_FAIL_MODE = originalFailMode
    }
  })

  it('returns allow when moderation is disabled', async () => {
    process.env.CONTENT_MODERATION_ENABLED = 'false'

    const result = await moderateContent({
      content: 'safe text',
      contentType: 'entry',
      actionName: 'createEntryAction',
    })

    expect(result).toEqual({ decision: 'allow' })
  })

  it('returns block when provider flags content', async () => {
    process.env.CONTENT_MODERATION_ENABLED = 'true'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ flagged: true }] }),
    }))

    const result = await moderateContent({
      content: 'disallowed text',
      contentType: 'comment',
      actionName: 'addCommentAction',
      requestId: 'req-1',
    })

    expect(result).toEqual({
      decision: 'block',
      reasonCode: 'policy_violation',
    })
  })

  it('sends moderation requests with no-store cache policy', async () => {
    process.env.CONTENT_MODERATION_ENABLED = 'true'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ flagged: false }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await moderateContent({
      content: 'safe text',
      contentType: 'entry',
      actionName: 'createEntryAction',
      requestId: 'req-cache',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/moderations',
      expect.objectContaining({
        cache: 'no-store',
      }),
    )
  })

  it('returns allow when provider outages occur and fail mode is open', async () => {
    process.env.CONTENT_MODERATION_ENABLED = 'true'
    process.env.CONTENT_MODERATION_FAIL_MODE = 'open'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }))

    const result = await moderateContent({
      content: 'safe text',
      contentType: 'entry',
      actionName: 'createEntryAction',
      requestId: 'req-2',
    })

    expect(result).toEqual({ decision: 'allow' })
  })

  it('returns block when provider outages occur and fail mode is closed', async () => {
    process.env.CONTENT_MODERATION_ENABLED = 'true'
    process.env.CONTENT_MODERATION_FAIL_MODE = 'closed'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await moderateContent({
      content: 'safe text',
      contentType: 'entry',
      actionName: 'createEntryAction',
      requestId: 'req-3',
    })

    expect(result).toEqual({
      decision: 'block',
      reasonCode: 'provider_error_fail_closed',
    })
  })
})
