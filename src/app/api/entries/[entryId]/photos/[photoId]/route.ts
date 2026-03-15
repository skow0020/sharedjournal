import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'

import { getEntryPhotoForUser } from '@/data/entries'
import { getCurrentAppUser } from '@/lib/get-current-app-user'

type EntryPhotoRouteProps = {
  params: Promise<{
    entryId: string
    photoId: string
  }>
}

export async function GET(
  _request: Request,
  { params }: EntryPhotoRouteProps,
): Promise<NextResponse> {
  const appUser = await getCurrentAppUser()

  if (!appUser) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { entryId, photoId } = await params

  const photo = await getEntryPhotoForUser({
    userId: appUser.id,
    entryId,
    photoId,
  })

  if (!photo) {
    return new NextResponse('Not found', { status: 404 })
  }

  const blobResult = await get(photo.storageKey, { access: 'private' })

  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(blobResult.stream, {
    headers: {
      'Content-Type': blobResult.blob.contentType || photo.mimeType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=60',
    },
  })
}
