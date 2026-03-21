'use client'

import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  type DashboardAcceptInvitationState,
  type DashboardDeclineInvitationState,
  type DashboardInvitationActionInput,
} from '@/app/dashboard/actions'
import type { PendingInvitation } from '@/data/invitations'
import { Button } from '@/components/ui/button'

type PendingInvitationRowProps = {
  invitation: PendingInvitation
  acceptAction: (
    input: DashboardInvitationActionInput,
  ) => Promise<DashboardAcceptInvitationState>
  declineAction: (
    input: DashboardInvitationActionInput,
  ) => Promise<DashboardDeclineInvitationState>
}

export function PendingInvitationRow({
  invitation,
  acceptAction,
  declineAction,
}: PendingInvitationRowProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<'accept' | 'decline' | null>(null)
  const [pending, startTransition] = useTransition()

  function handleAccept() {
    setError(null)
    setActiveAction('accept')

    startTransition(async () => {
      const result = await acceptAction({ token: invitation.inviteToken })

      if (result.redirectTo) {
        router.push(result.redirectTo)
        setActiveAction(null)
        return
      }

      if (result.error) {
        setError(result.error)
        setActiveAction(null)
        return
      }

      setActiveAction(null)
    })
  }

  function handleDecline() {
    setError(null)
    setActiveAction('decline')

    startTransition(async () => {
      const result = await declineAction({ token: invitation.inviteToken })

      if (result.error) {
        setError(result.error)
        setActiveAction(null)
        return
      }

      router.refresh()
      setActiveAction(null)
    })
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{invitation.journalTitle}</p>
          <p className="text-muted-foreground text-xs">
            Invited as {invitation.role} · Expires {format(invitation.expiresAt, 'MMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDecline}
            disabled={pending}
          >
            {pending && activeAction === 'decline' ? 'Declining...' : 'Decline'}
          </Button>
          <Button type="button" size="sm" onClick={handleAccept} disabled={pending}>
            {pending && activeAction === 'accept' ? 'Accepting...' : 'Accept'}
          </Button>
        </div>
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  )
}
