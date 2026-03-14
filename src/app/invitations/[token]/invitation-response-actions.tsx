'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import {
  type InvitationActionInput,
  type InvitationActionResult,
} from '@/app/invitations/[token]/actions'
import { Button } from '@/components/ui/button'

type InvitationResponseActionsProps = {
  token: string
  acceptAction: (input: InvitationActionInput) => Promise<InvitationActionResult>
  declineAction: (input: InvitationActionInput) => Promise<InvitationActionResult>
}

export function InvitationResponseActions({
  token,
  acceptAction,
  declineAction,
}: InvitationResponseActionsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function runAction(
    action: (input: InvitationActionInput) => Promise<InvitationActionResult>,
  ) {
    startTransition(async () => {
      const result = await action({ token })
      router.push(result.redirectTo)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" disabled={pending} onClick={() => runAction(acceptAction)}>
        Accept invite
      </Button>
      <Button type="button" variant="outline" disabled={pending} onClick={() => runAction(declineAction)}>
        Decline
      </Button>
    </div>
  )
}