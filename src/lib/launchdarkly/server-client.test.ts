import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  initMock,
  variationMock,
  waitForInitializationMock,
  mockClient,
} = vi.hoisted(() => {
  const waitForInitializationMock = vi.fn()
  const variationMock = vi.fn()
  const mockClient = {
    waitForInitialization: waitForInitializationMock,
    variation: variationMock,
  }
  const initMock = vi.fn().mockReturnValue(mockClient)

  return {
    initMock,
    variationMock,
    waitForInitializationMock,
    mockClient,
  }
})

vi.mock('@launchdarkly/node-server-sdk', () => ({
  init: initMock,
}))

describe('launchdarkly/server-client', () => {
  const originalSdkKey = process.env.LAUNCHDARKLY_SDK_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    waitForInitializationMock.mockResolvedValue(undefined)
    variationMock.mockResolvedValue(true)

    if (originalSdkKey === undefined) {
      delete process.env.LAUNCHDARKLY_SDK_KEY
    } else {
      process.env.LAUNCHDARKLY_SDK_KEY = originalSdkKey
    }
  })

  it('throws when LAUNCHDARKLY_SDK_KEY is missing', async () => {
    delete process.env.LAUNCHDARKLY_SDK_KEY

    const { getLaunchDarklyServerClient } = await import('@/lib/launchdarkly/server-client')

    await expect(getLaunchDarklyServerClient()).rejects.toThrow('LAUNCHDARKLY_SDK_KEY is not configured.')
    expect(initMock).not.toHaveBeenCalled()
  })

  it('initializes once and caches the LaunchDarkly client', async () => {
    process.env.LAUNCHDARKLY_SDK_KEY = 'sdk-test-123'

    const { getLaunchDarklyServerClient } = await import('@/lib/launchdarkly/server-client')

    const first = await getLaunchDarklyServerClient()
    const second = await getLaunchDarklyServerClient()

    expect(first).toBe(second)
    expect(first).toBe(mockClient)
    expect(initMock).toHaveBeenCalledTimes(1)
    expect(initMock).toHaveBeenCalledWith('sdk-test-123')
    expect(waitForInitializationMock).toHaveBeenCalledTimes(1)
  })

  it('builds user context with optional attributes', async () => {
    const { createLaunchDarklyContext } = await import('@/lib/launchdarkly/server-client')

    expect(createLaunchDarklyContext({ key: 'user-1' })).toEqual({
      kind: 'user',
      key: 'user-1',
    })

    expect(createLaunchDarklyContext({
      key: 'user-2',
      email: 'user@example.com',
      name: 'User Two',
      anonymous: true,
    })).toEqual({
      kind: 'user',
      key: 'user-2',
      email: 'user@example.com',
      name: 'User Two',
      anonymous: true,
    })
  })

  it('evaluates a variation through the initialized client', async () => {
    process.env.LAUNCHDARKLY_SDK_KEY = 'sdk-test-123'
    variationMock.mockResolvedValueOnce(false)

    const {
      createLaunchDarklyContext,
      getLaunchDarklyVariation,
    } = await import('@/lib/launchdarkly/server-client')

    const context = createLaunchDarklyContext({ key: 'user-1' })

    const result = await getLaunchDarklyVariation({
      flagKey: 'new-dashboard',
      context,
      fallback: true,
    })

    expect(result).toBe(false)
    expect(variationMock).toHaveBeenCalledWith('new-dashboard', context, true)
  })
})