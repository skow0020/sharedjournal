import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'

import { verifyExportDownloadToken } from '@/lib/export-link-token'
import { getCurrentAppUser } from '@/lib/get-current-app-user'

function safeContentDispositionFileName(fileName: string): string {
  const sanitized = fileName.replace(/[\r\n"\\]/g, '').trim()
  return sanitized || 'sharedjournal-export.zip'
}

export async function GET(request: Request): Promise<NextResponse> {
  const appUser = await getCurrentAppUser()

  if (!appUser) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const token = new URL(request.url).searchParams.get('token')

  if (!token) {
    return new NextResponse('Missing token', { status: 400 })
  }

  let verified

  try {
    verified = verifyExportDownloadToken(token)
  } catch {
    return new NextResponse('Export link configuration error', { status: 500 })
  }

  if (!verified.ok) {
    if (verified.reason === 'expired') {
      return new NextResponse('Export link has expired', { status: 410 })
    }

    return new NextResponse('Invalid token', { status: 400 })
  }

  if (verified.payload.userId !== appUser.id) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const blobResult = await get(verified.payload.storageKey, { access: 'private' })

  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return new NextResponse('Not found', { status: 404 })
  }

  const fileName = safeContentDispositionFileName(verified.payload.fileName)

  return new NextResponse(blobResult.stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
