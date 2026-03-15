'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  type CreateJournalInput,
  type CreateJournalState,
} from '@/app/dashboard/actions'

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
import { JOURNAL_TITLE_MAX_LENGTH } from '@/lib/journal-constants'

type CreateJournalModalProps = {
  action: (input: CreateJournalInput) => Promise<CreateJournalState>
}

export function CreateJournalModal({ action }: CreateJournalModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [state, setState] = useState<CreateJournalState>({
    error: null,
    redirectTo: null,
  })
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const nextState = await action({ title, description })
      setState(nextState)

      if (nextState.redirectTo) {
        setOpen(false)
        router.push(nextState.redirectTo)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add journal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a journal</DialogTitle>
          <DialogDescription>Fill in the details below to create your journal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="journal-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="journal-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={JOURNAL_TITLE_MAX_LENGTH}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="journal-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="journal-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating...' : 'Create journal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
