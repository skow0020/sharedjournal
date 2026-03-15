'use client'

import * as React from 'react'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

type EntryPhoto = {
  id: string
  src: string
}

type EntryPhotoGalleryProps = {
  photos: EntryPhoto[]
}

export function EntryPhotoGallery({ photos }: EntryPhotoGalleryProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  const handlePrev = React.useCallback(() => {
    setOpenIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null))
  }, [photos.length])

  const handleNext = React.useCallback(() => {
    setOpenIndex((i) => (i !== null ? (i + 1) % photos.length : null))
  }, [photos.length])

  React.useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, handlePrev, handleNext])

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            aria-label={`View image ${index + 1} of ${photos.length}`}
            onClick={() => setOpenIndex(index)}
            className="focus-visible:ring-ring overflow-hidden rounded-md border focus-visible:ring-2 focus-visible:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={`Entry image ${index + 1}`}
              loading="lazy"
              className="h-32 w-full object-cover transition-opacity hover:opacity-80"
            />
          </button>
        ))}
      </div>

      <Dialog open={openIndex !== null} onOpenChange={(open) => { if (!open) setOpenIndex(null) }}>
        <DialogContent className="max-w-4xl gap-0 p-2">
          <DialogTitle className="sr-only">
            {openIndex !== null ? `Image ${openIndex + 1} of ${photos.length}` : 'Image'}
          </DialogTitle>
          {openIndex !== null && (
            <div className="relative flex items-center justify-center">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Close image"
                  className="absolute right-1 top-1 z-10 border-0 bg-black/40 text-white hover:bg-black/60 hover:text-white"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </DialogClose>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[openIndex].src}
                alt={`Entry image ${openIndex + 1}`}
                className="max-h-[80vh] w-full rounded object-contain"
              />
              {photos.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Previous image"
                    onClick={handlePrev}
                    className="absolute left-1 top-1/2 -translate-y-1/2 border-0 bg-black/40 text-white hover:bg-black/60 hover:text-white"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Next image"
                    onClick={handleNext}
                    className="absolute right-1 top-1/2 -translate-y-1/2 border-0 bg-black/40 text-white hover:bg-black/60 hover:text-white"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
