'use client'

import { upload } from '@vercel/blob/client'
import { format } from 'date-fns'
import { Camera, Mic, MicOff } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

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

type BrowserSpeechRecognitionResult = {
  0?: { transcript?: string }
  isFinal?: boolean
}

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex?: number
  results?: ArrayLike<BrowserSpeechRecognitionResult>
}

type BrowserSpeechRecognitionErrorEvent = Event & {
  error?: string
}

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onstart: ((event: Event) => void) | null
  onend: ((event: Event) => void) | null
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null
  start: () => void
  stop: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

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
  const [isMobile, setIsMobile] = useState(false)
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setIsMobile(false)
      return
    }

    setIsMobile(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSpeechRecognitionSupported(false)
      return
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
    }

    const SpeechRecognitionApi = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

    if (!SpeechRecognitionApi) {
      setIsSpeechRecognitionSupported(false)
      return
    }

    const recognition = new SpeechRecognitionApi()

    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.onstart = () => {
      setSpeechError(null)
      setIsListening(true)
    }
    recognition.onend = () => {
      setIsListening(false)
    }
    recognition.onerror = (event) => {
      setIsListening(false)

      if (event.error === 'not-allowed') {
        setSpeechError('Microphone access is blocked. Enable it to use voice input.')
        return
      }

      if (event.error === 'no-speech') {
        setSpeechError('No speech was detected. Try speaking again.')
        return
      }

      setSpeechError('Voice input is unavailable right now. Please try again.')
    }
    recognition.onresult = (event) => {
      const results = event.results

      if (!results) {
        return
      }

      const startIndex = typeof event.resultIndex === 'number' ? event.resultIndex : 0
      const transcripts: string[] = []

      for (let index = startIndex; index < results.length; index += 1) {
        const result = results[index]

        if (!result || result.isFinal !== true) {
          continue
        }

        const transcript = result[0]?.transcript?.trim()

        if (transcript) {
          transcripts.push(transcript)
        }
      }

      if (transcripts.length === 0) {
        return
      }

      const nextTranscript = transcripts.join(' ')

      setContent((previousContent) => {
        if (previousContent.trim().length === 0) {
          return nextTranscript
        }

        return `${previousContent.trimEnd()} ${nextTranscript}`
      })
    }

    speechRecognitionRef.current = recognition
    setIsSpeechRecognitionSupported(true)

    return () => {
      recognition.stop()
      speechRecognitionRef.current = null
      setIsListening(false)
    }
  }, [])

  function stopVoiceInput() {
    speechRecognitionRef.current?.stop()
  }

  function startVoiceInput() {
    setSpeechError(null)

    const recognition = speechRecognitionRef.current

    if (!recognition) {
      setSpeechError('Voice input is not supported on this device.')
      return
    }

    try {
      recognition.start()
    } catch {
      setSpeechError('Voice input is unavailable right now. Please try again.')
    }
  }

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
    stopVoiceInput()
    setTitle('')
    setContent('')
    setEntryDate(format(new Date(), 'yyyy-MM-dd'))
    setState({ error: null, redirectTo: null })
    setUploadError(null)
    setSpeechError(null)
    setSelectedImages((previousImages) => {
      revokePreviewUrls(previousImages)
      return []
    })
  }

  async function closeAndDiscardDraft() {
    stopVoiceInput()

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
    stopVoiceInput()

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
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader>
          <div className="px-6 pt-6">
          <DialogTitle>Create an entry</DialogTitle>
          <DialogDescription>Fill in the details below to add an entry to this journal.</DialogDescription>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
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
              {isMobile && isSpeechRecognitionSupported ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="w-10"
                    aria-label={isListening ? 'Stop listening' : 'Speak entry'}
                    disabled={pending}
                    onClick={() => {
                      if (isListening) {
                        stopVoiceInput()
                        return
                      }

                      startVoiceInput()
                    }}
                  >
                    {isListening ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
                  </Button>
                  {isListening ? <p className="text-muted-foreground text-xs">Listening for your voice...</p> : null}
                </div>
              ) : null}
              {speechError ? <p className="text-destructive text-sm">{speechError}</p> : null}
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
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                onChange={handleImageSelection}
                disabled={pending}
                tabIndex={-1}
                aria-hidden
              />
              {selectedImages.length < ENTRY_IMAGE_MAX_FILES ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse images
                  </Button>
                  {isMobile ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      aria-label="Take photo"
                      disabled={pending}
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
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
                        className="h-20 w-full rounded-sm object-cover sm:h-24"
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
          </div>
          <DialogFooter className="border-t px-6 py-4">
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
