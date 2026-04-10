import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { initRumMock, initLogsMock } = vi.hoisted(() => ({
  initRumMock: vi.fn(),
  initLogsMock: vi.fn(),
}))

vi.mock('@datadog/browser-rum', () => ({
  datadogRum: {
    init: initRumMock,
  },
}))

vi.mock('@datadog/browser-logs', () => ({
  datadogLogs: {
    init: initLogsMock,
  },
}))

import { DatadogInit } from '@/components/datadog-init'

describe('DatadogInit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('renders nothing', () => {
    const { container } = render(<DatadogInit />)
    expect(container.firstChild).toBeNull()
  })

  it('does not initialize Datadog when client token is missing', () => {
    render(<DatadogInit />)
    expect(initLogsMock).not.toHaveBeenCalled()
    expect(initRumMock).not.toHaveBeenCalled()
  })

  it('initializes browser logs when client token is set', () => {
    vi.stubEnv('NEXT_PUBLIC_DATADOG_CLIENT_TOKEN', 'test-token')

    render(<DatadogInit />)

    expect(initLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientToken: 'test-token',
        service: 'sharedjournal-web',
        forwardErrorsToLogs: true,
      }),
    )
  })

  it('does not initialize RUM when application ID is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_DATADOG_CLIENT_TOKEN', 'test-token')

    render(<DatadogInit />)

    expect(initLogsMock).toHaveBeenCalled()
    expect(initRumMock).not.toHaveBeenCalled()
  })

  it('initializes RUM when both client token and application ID are set', () => {
    vi.stubEnv('NEXT_PUBLIC_DATADOG_CLIENT_TOKEN', 'test-token')
    vi.stubEnv('NEXT_PUBLIC_DATADOG_APPLICATION_ID', 'test-app-id')

    render(<DatadogInit />)

    expect(initRumMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 'test-app-id',
        clientToken: 'test-token',
        defaultPrivacyLevel: 'mask-user-input',
        trackUserInteractions: true,
      }),
    )
  })

  it('uses custom site, service, env, and version when provided', () => {
    vi.stubEnv('NEXT_PUBLIC_DATADOG_CLIENT_TOKEN', 'test-token')
    vi.stubEnv('NEXT_PUBLIC_DATADOG_APPLICATION_ID', 'test-app-id')
    vi.stubEnv('NEXT_PUBLIC_DATADOG_SITE', 'datadoghq.eu')
    vi.stubEnv('NEXT_PUBLIC_DATADOG_SERVICE', 'my-service')
    vi.stubEnv('NEXT_PUBLIC_DATADOG_ENV', 'staging')
    vi.stubEnv('NEXT_PUBLIC_DATADOG_VERSION', '1.2.3')

    render(<DatadogInit />)

    expect(initLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        site: 'datadoghq.eu',
        service: 'my-service',
        env: 'staging',
        version: '1.2.3',
      }),
    )
    expect(initRumMock).toHaveBeenCalledWith(
      expect.objectContaining({
        site: 'datadoghq.eu',
        service: 'my-service',
        env: 'staging',
        version: '1.2.3',
      }),
    )
  })

  it('beforeSend for logs redacts email addresses from messages', () => {
    vi.stubEnv('NEXT_PUBLIC_DATADOG_CLIENT_TOKEN', 'test-token')

    render(<DatadogInit />)

    const [[config]] = initLogsMock.mock.calls as [Parameters<typeof initLogsMock>[0]][]
    const event = { message: 'Error for user@example.com occurred', context: {} }
    config.beforeSend(event)
    expect(event.message).toBe('Error for [REDACTED_EMAIL] occurred')
  })

  it('beforeSend for logs redacts sensitive keys from context', () => {
    vi.stubEnv('NEXT_PUBLIC_DATADOG_CLIENT_TOKEN', 'test-token')

    render(<DatadogInit />)

    const [[config]] = initLogsMock.mock.calls as [Parameters<typeof initLogsMock>[0]][]
    const event = { message: 'test', context: { content: 'my secret journal entry', userId: '123' } }
    config.beforeSend(event)
    expect(event.context).toEqual({ content: '[REDACTED]', userId: '123' })
  })

  it('beforeSend for RUM redacts email from error messages', () => {
    vi.stubEnv('NEXT_PUBLIC_DATADOG_CLIENT_TOKEN', 'test-token')
    vi.stubEnv('NEXT_PUBLIC_DATADOG_APPLICATION_ID', 'test-app-id')

    render(<DatadogInit />)

    const [[config]] = initRumMock.mock.calls as [Parameters<typeof initRumMock>[0]][]
    const event = {
      type: 'error',
      error: { message: 'Failed for admin@example.com' },
      context: {},
    }
    config.beforeSend(event)
    expect((event.error as { message: string }).message).toBe('Failed for [REDACTED_EMAIL]')
  })
})
