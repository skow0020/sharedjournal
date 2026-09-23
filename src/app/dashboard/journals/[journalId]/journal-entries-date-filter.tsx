'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

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

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-2">
        <label htmlFor="entry-date-filter" className="text-sm font-medium">
          Filter by date
        </label>
        <Input
          id="entry-date-filter"
          type="date"
          value={value}
          max="9999-12-31"
          onChange={(event) => applyDate(event.target.value)}
          aria-busy={isPending}
          className="w-auto"
        />
      </div>
      {value ? (
        <Button type="button" variant="outline" size="sm" onClick={() => applyDate('')}>
          Clear
        </Button>
      ) : null}
    </div>
  )
}
