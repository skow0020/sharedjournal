'use client'

import { XIcon } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useRef, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type JournalEntriesDateFilterProps = {
  value: string
}

export function JournalEntriesDateFilter({ value }: JournalEntriesDateFilterProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  const applyDate = (nextDate: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (nextDate) {
      params.set('entryDate', nextDate)
    } else {
      params.delete('entryDate')
    }

    // Filtering resets pagination back to the first page of results.
    params.delete('entriesPage')

    const query = params.toString()

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  const openDatePicker = () => {
    // Some mobile browsers only focus the field on the first tap and require
    // a second tap to open the native calendar. Requesting the picker
    // explicitly makes a single tap reliably open it.
    try {
      inputRef.current?.showPicker?.()
    } catch {
      // showPicker can throw (e.g. when not triggered by direct user
      // activation) — the field still works via the default browser affordance.
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <label htmlFor="entry-date-filter" className="text-sm font-medium">
        Filter by date
      </label>
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          id="entry-date-filter"
          type="date"
          value={value}
          max="9999-12-31"
          onChange={(event) => applyDate(event.target.value)}
          onClick={openDatePicker}
          aria-busy={isPending}
          className="w-full sm:w-auto"
        />
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => applyDate('')}
            aria-label="Clear date filter"
          >
            <XIcon className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
