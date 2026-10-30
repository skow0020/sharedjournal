import { NextResponse } from 'next/server'

const SUPPORT_MODAL_OVERRIDE_ENV_VAR = 'LAUNCHDARKLY_FLAG_SUPPORT_MODAL'

function isEnabledValue(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const payload = await request.json().catch(() => null)
  const enabled =
    payload && typeof payload === 'object' ? (payload as { enabled?: unknown }).enabled : undefined

  if (!isEnabledValue(enabled)) {
    return NextResponse.json({ error: 'enabled must be a boolean.' }, { status: 400 })
  }

  process.env[SUPPORT_MODAL_OVERRIDE_ENV_VAR] = enabled ? 'true' : 'false'

  return NextResponse.json({
    ok: true,
    supportModalEnabled: enabled,
  })
}
