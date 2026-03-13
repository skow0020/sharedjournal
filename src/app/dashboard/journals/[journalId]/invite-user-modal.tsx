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

type InviteUserState = {
  error: string | null
  successMessage: string | null
  inviteLink: string | null
}

type InviteUserModalProps = {
  action: (prevState: InviteUserState, formData: FormData) => Promise<InviteUserState>
}

const initialState: InviteUserState = {
  error: null,
  successMessage: null,
  inviteLink: null,
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return <Button type="submit" disabled={pending}>{pending ? 'Sending...' : 'Send invite'}</Button>
}

export function InviteUserModal({ action }: InviteUserModalProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(action, initialState)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Invite</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>Enter an email address to invite someone to this journal.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="teammate@example.com"
              required
            />
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          {state.successMessage ? <p className="text-sm">{state.successMessage}</p> : null}
          {state.inviteLink ? (
            <p className="text-muted-foreground text-sm break-all">Invite link: {state.inviteLink}</p>
          ) : null}
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
