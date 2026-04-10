export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  if (!process.env.DD_API_KEY && !process.env.DD_AGENT_HOST) {
    return
  }

  const tracer = (await import('dd-trace')).default

  tracer.init({
    service: process.env.DD_SERVICE ?? 'sharedjournal',
    env: process.env.DD_ENV ?? process.env.NODE_ENV ?? 'development',
    version: process.env.DD_VERSION,
    logInjection: true,
    runtimeMetrics: true,
  })

  tracer.use('http', {
    hooks: {
      request(span, req) {
        if (!span || !req) return
        const url = (req as { url?: string }).url ?? ''
        if (url.includes('/api/entries')) {
          span.setTag('resource.name', '[REDACTED_ENTRY_PATH]')
        }
      },
    },
  })
}
