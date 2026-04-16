'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  type UpdateJournalDetailsInput,
  type UpdateJournalDetailsState,
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
import { JOURNAL_TITLE_MAX_LENGTH } from '@/lib/journal-constants'

type EditJournalModalProps = {
  journalId: string
  initialTitle: string
  initialDescription: string | null
  action: (input: UpdateJournalDetailsInput) => Promise<UpdateJournalDetailsState>
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EditJournalModal({
  journalId,
  initialTitle,
  initialDescription,
  action,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: EditJournalModalProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [state, setState] = useState<UpdateJournalDetailsState>({
    error: null,
  })
  const [pending, startTransition] = useTransition()
  const open = controlledOpen ?? internalOpen

  function setOpen(nextOpen: boolean) {
    if (onOpenChange) {
      onOpenChange(nextOpen)
      return
    }

    setInternalOpen(nextOpen)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      setTitle(initialTitle)
      setDescription(initialDescription ?? '')
      setState({ error: null })
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const nextState = await action({
        journalId,
        title,
        description,
      })

      setState(nextState)

      if (!nextState.error) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit journal</DialogTitle>
          <DialogDescription>Update your journal title and description.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-journal-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="edit-journal-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={JOURNAL_TITLE_MAX_LENGTH}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-journal-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="edit-journal-description"
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
              {pending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}