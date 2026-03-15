import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getUserJournalById } from '@/data/journals'
import {
  ENTRY_IMAGE_ALLOWED_MIME_TYPES,
  ENTRY_IMAGE_MAX_FILE_BYTES,
} from '@/lib/entry-image-constants'
import { isTempEntryImageStorageKeyForJournal } from '@/lib/entry-image-storage'
import { getCurrentAppUser } from '@/lib/get-current-app-user'

const clientPayloadSchema = z.object({
  journalId: z.string().trim().min(1, 'Journal is required.'),
})

function parseClientPayload(rawPayload: string | null | undefined) {
  if (!rawPayload) {
    return null
  }

  try {
    return JSON.parse(rawPayload)
  } catch {
    return null
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const appUser = await getCurrentAppUser()

  if (!appUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsedPayload = clientPayloadSchema.safeParse(parseClientPayload(clientPayload))

        if (!parsedPayload.success) {
          throw new Error('Invalid upload payload.')
        }

        const journal = await getUserJournalById(appUser.id, parsedPayload.data.journalId)

        if (!journal) {
          throw new Error('You do not have permission to upload images to this journal.')
        }

        if (!isTempEntryImageStorageKeyForJournal(pathname, journal.id)) {
          throw new Error('Invalid upload destination.')
        }

        return {
          allowedContentTypes: [...ENTRY_IMAGE_ALLOWED_MIME_TYPES],
          maximumSizeInBytes: ENTRY_IMAGE_MAX_FILE_BYTES,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => {
        // Application records are created in createEntryAction after explicit submit.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload could not be started.',
      },
      { status: 400 },
    )
  }
}
