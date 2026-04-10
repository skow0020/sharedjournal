'use client'

import { useEffect } from 'react'
import { datadogLogs } from '@datadog/browser-logs'
import { datadogRum } from '@datadog/browser-rum'

const SENSITIVE_KEYS = ['content', 'password', 'token', 'secret', 'key', 'email', 'authorization']
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g

function redactSensitiveContext(context: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(context)) {
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
      redacted[k] = '[REDACTED]'
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      redacted[k] = redactSensitiveContext(v as Record<string, unknown>)
    } else {
      redacted[k] = v
    }
  }
  return redacted
}

export function DatadogInit() {
  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN
    const applicationId = process.env.NEXT_PUBLIC_DATADOG_APPLICATION_ID
    const site = process.env.NEXT_PUBLIC_DATADOG_SITE ?? 'datadoghq.com'
    const service = process.env.NEXT_PUBLIC_DATADOG_SERVICE ?? 'sharedjournal-web'
    const env = process.env.NEXT_PUBLIC_DATADOG_ENV ?? process.env.NODE_ENV ?? 'development'
    const version = process.env.NEXT_PUBLIC_DATADOG_VERSION

    if (!clientToken) {
      return
    }

    datadogLogs.init({
      clientToken,
      site,
      service,
      env,
      version,
      forwardErrorsToLogs: true,
      sessionSampleRate: 100,
      beforeSend(event) {
        if (event.message) {
          event.message = event.message.replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
        }
        if (event.context) {
          event.context = redactSensitiveContext(event.context as Record<string, unknown>)
        }
        return true
      },
    })

    if (!applicationId) {
      return
    }

    datadogRum.init({
      applicationId,
      clientToken,
      site,
      service,
      env,
      version,
      sessionSampleRate: 100,
      sessionReplaySampleRate: 0,
      defaultPrivacyLevel: 'mask-user-input',
      trackResources: true,
      trackLongTasks: true,
      trackUserInteractions: true,
      beforeSend(event) {
        if (event.type === 'error') {
          const err = event.error as { message?: string, stack?: string }
          if (err.message) {
            err.message = err.message.replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
          }
        }
        if (event.context) {
          event.context = redactSensitiveContext(event.context as Record<string, unknown>)
        }
        return true
      },
    })
  }, [])

  return null
}
