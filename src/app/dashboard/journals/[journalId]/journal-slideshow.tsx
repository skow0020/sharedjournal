'use client'

import * as React from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { JournalPhotoForSlideshow } from '@/data/entries'
import { buildEntryPhotoProxyUrl } from '@/lib/entry-image-storage'

const AUTOPLAY_INTERVAL_MS = 10000

type JournalSlideshowProps = {
  photos: JournalPhotoForSlideshow[]
  trigger: React.ReactNode
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function JournalSlideshow({ photos, trigger }: JournalSlideshowProps) {
  const [open, setOpen] = React.useState(false)
  const [shuffledPhotos, setShuffledPhotos] = React.useState<JournalPhotoForSlideshow[]>([])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isPlaying, setIsPlaying] = React.useState(true)

  const total = shuffledPhotos.length

  const handlePrev = React.useCallback(() => {
    if (total === 0) return
    setCurrentIndex((i) => (i - 1 + total) % total)
  }, [total])

  const handleNext = React.useCallback(() => {
    if (total === 0) return
    setCurrentIndex((i) => {
      if (i + 1 < total) return i + 1
      setShuffledPhotos((prev) => shuffled(prev))
      return 0
    })
  }, [total])

  // Auto-advance
  React.useEffect(() => {
    if (!open || !isPlaying) return
    const timer = setInterval(handleNext, AUTOPLAY_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [open, isPlaying, handleNext])

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'ArrowRight') handleNext()
      else if (e.key === ' ') {
        // Don't intercept Space when an interactive element has focus — the
        // browser should activate it (e.g. Pause/Close button).
        const target = e.target as Element
        if (target.closest('button, input, textarea, select, a[href]')) return
        e.preventDefault()
        setIsPlaying((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handlePrev, handleNext])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setShuffledPhotos(shuffled(photos))
      setCurrentIndex(0)
      setIsPlaying(true)
    }
  }

  const currentPhoto = shuffledPhotos[currentIndex]

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-none h-screen w-screen gap-0 rounded-none border-0 bg-black p-0">
          <DialogTitle className="sr-only">
            Slideshow — photo {currentIndex + 1} of {total}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full-screen photo slideshow. Use left and right arrow keys to navigate, Space to
            play or pause, and Escape to close.
          </DialogDescription>

          {currentPhoto ? (
            <div className="relative flex h-full w-full items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={currentPhoto.id}
                src={buildEntryPhotoProxyUrl(currentPhoto.entryId, currentPhoto.id)}
                alt={`Photo ${currentIndex + 1} of ${total}`}
                className="h-screen w-screen object-cover"
              />

              {/* Top bar */}
              <div className="absolute left-0 right-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent px-4 py-3">
                <span className="text-sm font-medium text-white/80 tabular-nums">
                  {currentIndex + 1} / {total}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
                    onClick={() => setIsPlaying((p) => !p)}
                    className="border-0 bg-transparent text-white hover:bg-white/20 hover:text-white"
                  >
                    {isPlaying ? (
                      <PauseIcon className="h-4 w-4" />
                    ) : (
                      <PlayIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label="Close slideshow"
                      className="border-0 bg-transparent text-white hover:bg-white/20 hover:text-white"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </DialogClose>
                </div>
              </div>

              {/* Prev / Next */}
              {total > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Previous photo"
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 border-0 bg-transparent text-white hover:bg-white/20 hover:text-white"
                  >
                    <ChevronLeftIcon className="h-8 w-8" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Next photo"
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent text-white hover:bg-white/20 hover:text-white"
                  >
                    <ChevronRightIcon className="h-8 w-8" />
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
