'use client'

import { Trash2Icon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  type DeleteEntryInput,
  type DeleteEntryState,
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

type DeleteEntryButtonProps = {
  journalId: string
  entryId: string
  action: (input: DeleteEntryInput) => Promise<DeleteEntryState>
}

export function DeleteEntryButton({ journalId, entryId, action }: DeleteEntryButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<DeleteEntryState>({
    error: null,
    success: false,
  })
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const nextState = await action({ journalId, entryId })
      setState(nextState)

      if (nextState.success) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      setState({
        error: null,
        success: false,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive h-8 w-8 shrink-0 p-0"
          aria-label="Delete entry"
        >
          <Trash2Icon className="size-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete entry</DialogTitle>
          <DialogDescription>
            This will permanently remove this journal entry and its photos. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleDelete} disabled={pending}>
            {pending ? 'Deleting...' : 'Delete entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}