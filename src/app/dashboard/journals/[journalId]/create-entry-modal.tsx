'use client'

import { format } from 'date-fns'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
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

type CreateEntryModalProps = {
  journalId: string
  action: (input: CreateEntryInput) => Promise<CreateEntryState>
}

export function CreateEntryModal({ journalId, action }: CreateEntryModalProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [state, setState] = useState<CreateEntryState>({
    error: null,
    redirectTo: null,
  })
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const nextState = await action({
        journalId,
        title,
        content,
        entryDate,
      })

      setState(nextState)

      if (nextState.redirectTo) {
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
    <Dialog open={open} onOpenChange={setOpen}>
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
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating...' : 'Create entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
