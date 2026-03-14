'use client'

import { useState, useTransition } from 'react'

import {
  type InviteActionState,
  type InviteUserInput,
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

type InviteUserModalProps = {
  journalId: string
  journalTitle: string
  action: (input: InviteUserInput) => Promise<InviteActionState>
}

export function InviteUserModal({ journalId, journalTitle, action }: InviteUserModalProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<InviteActionState>({
    error: null,
    successMessage: null,
    inviteLink: null,
  })
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const nextState = await action({
        journalId,
        journalTitle,
        email,
      })

      setState(nextState)
    })
  }

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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
            <Button type="submit" disabled={pending}>{pending ? 'Sending...' : 'Send invite'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
