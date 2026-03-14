'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  type DeleteJournalInput,
  type DeleteJournalState,
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

type DeleteJournalButtonProps = {
  journalId: string
  action: (input: DeleteJournalInput) => Promise<DeleteJournalState>
  successRedirectTo?: string
}

export function DeleteJournalButton({ journalId, action, successRedirectTo }: DeleteJournalButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<DeleteJournalState>({
    error: null,
    success: false,
  })
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const nextState = await action({ journalId })
      setState(nextState)

      if (nextState.success) {
        setOpen(false)

        if (successRedirectTo) {
          router.push(successRedirectTo)
          return
        }

        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="text-destructive hover:text-destructive">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete journal</DialogTitle>
          <DialogDescription>
            This will permanently remove this journal and all of its entries. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleDelete} disabled={pending}>
            {pending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
