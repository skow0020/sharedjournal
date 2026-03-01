'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

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

type CreateJournalState = {
  error: string | null;
};

type CreateJournalModalProps = {
  action: (prevState: CreateJournalState, formData: FormData) => Promise<CreateJournalState>;
};

const initialState: CreateJournalState = {
  error: null,
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create journal'}
    </Button>
  )
}

export function CreateJournalModal({ action }: CreateJournalModalProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [open, setOpen] = useState(false)

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
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="journal-title" className="text-sm font-medium">
              Title
            </label>
            <Input id="journal-title" name="title" required maxLength={180} />
          </div>
          <div className="space-y-2">
            <label htmlFor="journal-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea id="journal-description" name="description" maxLength={2000} />
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}