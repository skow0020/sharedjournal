'use client'

import { format } from 'date-fns'
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

type CreateEntryState = {
  error: string | null
}

type CreateEntryModalProps = {
  action: (prevState: CreateEntryState, formData: FormData) => Promise<CreateEntryState>
}

const initialState: CreateEntryState = {
  error: null,
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create entry'}
    </Button>
  )
}

export function CreateEntryModal({ action }: CreateEntryModalProps) {
  const [state, formAction] = useActionState(action, initialState)
  const [open, setOpen] = useState(false)
  const defaultEntryDate = format(new Date(), 'yyyy-MM-dd')

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
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="entry-title" className="text-sm font-medium">
              Title
            </label>
            <Input id="entry-title" name="title" maxLength={220} />
          </div>
          <div className="space-y-2">
            <label htmlFor="entry-content" className="text-sm font-medium">
              Content
            </label>
            <Textarea id="entry-content" name="content" required />
          </div>
          <div className="space-y-2">
            <label htmlFor="entry-date" className="text-sm font-medium">
              Entry date
            </label>
            <Input id="entry-date" name="entryDate" type="date" defaultValue={defaultEntryDate} required />
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
