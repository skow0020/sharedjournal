import { createHmac, timingSafeEqual } from 'crypto'

export type ExportDownloadTokenPayload = {
  userId: string
  storageKey: string
  fileName: string
  exp: number
}

export type VerifyExportDownloadTokenResult =
  | {
      ok: true
      payload: ExportDownloadTokenPayload
    }
  | {
      ok: false
      reason: 'invalid' | 'expired'
    }

function getExportLinkSigningSecret(): string {
  const secret = process.env.EXPORT_LINK_SIGNING_SECRET

  if (!secret) {
    throw new Error('EXPORT_LINK_SIGNING_SECRET is required for export download links.')
  }

  return secret
}

function signPayload(payloadPart: string): string {
  return createHmac('sha256', getExportLinkSigningSecret()).update(payloadPart).digest('base64url')
}

function encodePayload(payload: ExportDownloadTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodePayload(payloadPart: string): ExportDownloadTokenPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8'),
    ) as Partial<ExportDownloadTokenPayload>

    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.storageKey !== 'string' ||
      typeof parsed.fileName !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null
    }

    return {
      userId: parsed.userId,
      storageKey: parsed.storageKey,
      fileName: parsed.fileName,
      exp: parsed.exp,
    }
  } catch {
    return null
  }
}

export function createExportDownloadToken(payload: ExportDownloadTokenPayload): string {
  const payloadPart = encodePayload(payload)
  const signaturePart = signPayload(payloadPart)

  return `${payloadPart}.${signaturePart}`
}

export function verifyExportDownloadToken(token: string): VerifyExportDownloadTokenResult {
  const [payloadPart, signaturePart, extraPart] = token.split('.')

  if (!payloadPart || !signaturePart || extraPart) {
    return { ok: false, reason: 'invalid' }
  }

  const expectedSignature = signPayload(payloadPart)

  try {
    const incomingBuffer = Buffer.from(signaturePart)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (
      incomingBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(incomingBuffer, expectedBuffer)
    ) {
      return { ok: false, reason: 'invalid' }
    }
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  const decodedPayload = decodePayload(payloadPart)

  if (!decodedPayload) {
    return { ok: false, reason: 'invalid' }
  }

  if (decodedPayload.exp <= Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' }
  }

  return {
    ok: true,
    payload: decodedPayload,
  }
}
