'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type JournalEntriesInfiniteLoaderProps = {
  currentPage: number
  hasMore: boolean
}

export function JournalEntriesInfiniteLoader({
  currentPage,
  hasMore,
}: JournalEntriesInfiniteLoaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const [lastRequestedPage, setLastRequestedPage] = useState(currentPage)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setLastRequestedPage(currentPage)
  }, [currentPage])

  useEffect(() => {
    if (!hasMore || !triggerRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return
        }

        const nextPage = currentPage + 1

        if (lastRequestedPage >= nextPage) {
          return
        }

        setLastRequestedPage(nextPage)

        startTransition(() => {
          const params = new URLSearchParams(searchParams.toString())
          params.set('entriesPage', String(nextPage))
          router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        })
      },
      {
        rootMargin: '240px 0px',
      },
    )

    observer.observe(triggerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [currentPage, hasMore, lastRequestedPage, pathname, router, searchParams])

  if (!hasMore) {
    return null
  }

  return (
    <div
      ref={triggerRef}
      aria-live="polite"
      className="text-muted-foreground py-4 text-center text-sm"
    >
      {isPending ? 'Loading more entries...' : 'Scroll to load more entries'}
    </div>
  )
}
