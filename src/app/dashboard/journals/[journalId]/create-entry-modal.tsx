'use client'

import { upload } from '@vercel/blob/client'
import { format } from 'date-fns'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import {
  type CleanupEntryImageUploadsInput,
  type CleanupEntryImageUploadsState,
  type CreateEntryInput,
  type CreateEntryState,
} from '@/app/dashboard/journals/[journalId]/actions'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ENTRY_IMAGE_MAX_FILE_BYTES, ENTRY_IMAGE_MAX_FILES } from '@/lib/entry-image-constants'
import {
  buildTempEntryImageStorageKey,
  isAllowedEntryImageMimeType,
} from '@/lib/entry-image-storage'

const MULTIPART_THRESHOLD_BYTES = 4.5 * 1024 * 1024

type SelectedImage = {
  id: string
  fileName: string
  previewUrl: string
  status: 'uploading' | 'uploaded' | 'error'
  tempStorageKey: string | null
  mimeType: string | null
  width: number | null
  height: number | null
  errorMessage: string | null
}

type CreateEntryModalProps = {
  journalId: string
  action: (input: CreateEntryInput) => Promise<CreateEntryState>
  cleanupAction: (input: CleanupEntryImageUploadsInput) => Promise<CleanupEntryImageUploadsState>
}

async function readImageDimensions(file: File): Promise<{ width: number | null, height: number | null }> {
  return new Promise((resolve) => {
    const imageUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null })
      URL.revokeObjectURL(imageUrl)
    }

    image.onerror = () => {
      resolve({ width: null, height: null })
      URL.revokeObjectURL(imageUrl)
    }

    image.src = imageUrl
  })
}

function formatFileSize(sizeInBytes: number): string {
  const megabytes = Math.round((sizeInBytes / (1024 * 1024)) * 10) / 10
  return `${megabytes} MB`
}

function revokePreviewUrls(images: SelectedImage[]) {
  for (const image of images) {
    URL.revokeObjectURL(image.previewUrl)
  }
}

export function CreateEntryModal({ journalId, action, cleanupAction }: CreateEntryModalProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [state, setState] = useState<CreateEntryState>({
    error: null,
    redirectTo: null,
  })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function cleanupUploadedTempImages(storageKeys: string[]) {
    if (storageKeys.length === 0) {
      return null
    }

    const cleanupResult = await cleanupAction({
      journalId,
      storageKeys,
    })

    return cleanupResult.error
  }

  function resetModalState() {
    setTitle('')
    setContent('')
    setEntryDate(format(new Date(), 'yyyy-MM-dd'))
    setState({ error: null, redirectTo: null })
    setUploadError(null)
    setSelectedImages((previousImages) => {
      revokePreviewUrls(previousImages)
      return []
    })
  }

  async function closeAndDiscardDraft() {
    const uploadedStorageKeys = selectedImages
      .filter((image) => image.status === 'uploaded' && image.tempStorageKey)
      .map((image) => image.tempStorageKey as string)

    const cleanupError = await cleanupUploadedTempImages(uploadedStorageKeys)

    if (cleanupError) {
      setState({
        error: cleanupError,
        redirectTo: null,
      })
      return
    }

    resetModalState()
    setOpen(false)
  }

  async function uploadSingleImage(file: File) {
    const imageId = crypto.randomUUID()
    const previewUrl = URL.createObjectURL(file)

    setSelectedImages((previousImages) => [
      ...previousImages,
      {
        id: imageId,
        fileName: file.name,
        previewUrl,
        status: 'uploading',
        tempStorageKey: null,
        mimeType: null,
        width: null,
        height: null,
        errorMessage: null,
      },
    ])

    try {
      const dimensions = await readImageDimensions(file)
      const tempStorageKey = buildTempEntryImageStorageKey({
        journalId,
        fileName: file.name,
        randomId: crypto.randomUUID(),
      })

      const uploadedBlob = await upload(tempStorageKey, file, {
        access: 'private',
        handleUploadUrl: '/api/entry-images/upload',
        clientPayload: JSON.stringify({ journalId }),
        multipart: file.size > MULTIPART_THRESHOLD_BYTES,
      })

      setSelectedImages((previousImages) =>
        previousImages.map((image) => {
          if (image.id !== imageId) {
            return image
          }

          return {
            ...image,
            status: 'uploaded',
            tempStorageKey: uploadedBlob.pathname,
            mimeType: file.type,
            width: dimensions.width,
            height: dimensions.height,
          }
        }),
      )
    } catch (error) {
      setSelectedImages((previousImages) =>
        previousImages.map((image) => {
          if (image.id !== imageId) {
            return image
          }

          return {
            ...image,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Upload failed.',
          }
        }),
      )
    }
  }

  async function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length === 0) {
      return
    }

    const remainingSlots = ENTRY_IMAGE_MAX_FILES - selectedImages.length

    if (remainingSlots <= 0) {
      setUploadError(`You can upload up to ${ENTRY_IMAGE_MAX_FILES} images per entry.`)
      return
    }

    const acceptedFiles = files.slice(0, remainingSlots)

    for (const file of acceptedFiles) {
      if (!isAllowedEntryImageMimeType(file.type)) {
        setUploadError('Only JPEG, PNG, and WebP images are supported.')
        continue
      }

      if (file.size > ENTRY_IMAGE_MAX_FILE_BYTES) {
        setUploadError(`Each image must be ${formatFileSize(ENTRY_IMAGE_MAX_FILE_BYTES)} or smaller.`)
        continue
      }

      setUploadError(null)
      await uploadSingleImage(file)
    }

    if (files.length > acceptedFiles.length) {
      setUploadError(`Only ${ENTRY_IMAGE_MAX_FILES} images can be attached to an entry.`)
    }
  }

  async function handleRemoveImage(imageId: string) {
    const imageToRemove = selectedImages.find((image) => image.id === imageId)

    if (!imageToRemove) {
      return
    }

    if (imageToRemove.status === 'uploaded' && imageToRemove.tempStorageKey) {
      const cleanupError = await cleanupUploadedTempImages([imageToRemove.tempStorageKey])

      if (cleanupError) {
        setState({
          error: cleanupError,
          redirectTo: null,
        })
        return
      }
    }

    URL.revokeObjectURL(imageToRemove.previewUrl)
    setSelectedImages((previousImages) => previousImages.filter((image) => image.id !== imageId))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (selectedImages.some((image) => image.status === 'uploading')) {
      setState({
        error: 'Please wait for all image uploads to finish before creating the entry.',
        redirectTo: null,
      })
      return
    }

    if (selectedImages.some((image) => image.status === 'error')) {
      setState({
        error: 'Remove failed uploads before creating this entry.',
        redirectTo: null,
      })
      return
    }

    const uploadedImages: NonNullable<CreateEntryInput['uploadedImages']> = selectedImages
      .filter((image) => image.status === 'uploaded' && image.tempStorageKey && image.mimeType)
      .map((image) => ({
        tempStorageKey: image.tempStorageKey as string,
        fileName: image.fileName,
        mimeType: image.mimeType as string,
        width: image.width,
        height: image.height,
      }))

    startTransition(async () => {
      const nextState = await action({
        journalId,
        title,
        content,
        entryDate,
        uploadedImages,
      })

      setState(nextState)

      if (nextState.redirectTo) {
        resetModalState()
        setOpen(false)

        if (nextState.redirectTo === pathname) {
          router.refresh()
          return
        }

        router.push(nextState.redirectTo)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true)
          return
        }

        void closeAndDiscardDraft()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Add entry</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an entry</DialogTitle>
          <DialogDescription>Fill in the details below to add an entry to this journal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="entry-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="entry-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={220}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="entry-content" className="text-sm font-medium">
              Content
            </label>
            <Textarea
              id="entry-content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="entry-date" className="text-sm font-medium">
              Entry date
            </label>
            <Input
              id="entry-date"
              name="entryDate"
              type="date"
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Images</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={handleImageSelection}
              disabled={pending}
              tabIndex={-1}
              aria-hidden
            />
            {selectedImages.length < ENTRY_IMAGE_MAX_FILES ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => fileInputRef.current?.click()}
              >
                Browse images
              </Button>
            ) : null}
            <p className="text-muted-foreground text-xs">
              Up to {ENTRY_IMAGE_MAX_FILES} images, {formatFileSize(ENTRY_IMAGE_MAX_FILE_BYTES)} each.
            </p>
            {selectedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {selectedImages.map((image) => (
                  <div key={image.id} className="space-y-2 rounded-md border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.previewUrl}
                      alt={image.fileName}
                      className="h-24 w-full rounded-sm object-cover"
                    />
                    <p className="truncate text-xs">{image.fileName}</p>
                    <p className="text-muted-foreground text-xs">
                      {image.status === 'uploading' ? 'Uploading...' : null}
                      {image.status === 'uploaded' ? 'Uploaded' : null}
                      {image.status === 'error' ? image.errorMessage || 'Upload failed.' : null}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void handleRemoveImage(image.id)
                      }}
                      disabled={pending || image.status === 'uploading'}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            {uploadError ? <p className="text-destructive text-sm">{uploadError}</p> : null}
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void closeAndDiscardDraft()
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || selectedImages.some((image) => image.status === 'uploading')}
            >
              {pending ? 'Creating...' : 'Create entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
