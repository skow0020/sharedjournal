'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  type CancelPendingInvitationInput,
  type CancelPendingInvitationState,
} from '@/app/dashboard/journals/[journalId]/actions'
import type { PendingJournalInvitation } from '@/data/invitations'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type OwnedPendingInvitationsProps = {
  invitations: PendingJournalInvitation[]
  journalId: string
  cancelAction: (
    input: CancelPendingInvitationInput,
  ) => Promise<CancelPendingInvitationState>
}

export function OwnedPendingInvitations({
  invitations,
  journalId,
  cancelAction,
}: OwnedPendingInvitationsProps) {
  const router = useRouter()
  const [visibleInvitations, setVisibleInvitations] = useState(invitations)
  const [errorByInvitationId, setErrorByInvitationId] = useState<Record<string, string | null>>({})
  const [activeInvitationId, setActiveInvitationId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleCancel(invitationId: string) {
    setActiveInvitationId(invitationId)
    setErrorByInvitationId((currentErrors) => ({
      ...currentErrors,
      [invitationId]: null,
    }))
    startTransition(async () => {
      const result = await cancelAction({
        journalId,
        invitationId,
      })
      if (result.error) {
        setErrorByInvitationId((currentErrors) => ({
          ...currentErrors,
          [invitationId]: result.error,
        }))
        setActiveInvitationId(null)
        return
      }
      setVisibleInvitations((currentInvitations) =>
        currentInvitations.filter((invitation) => invitation.id !== invitationId),
      )
      setErrorByInvitationId((currentErrors) => {
        const nextErrors = { ...currentErrors }
        delete nextErrors[invitationId]
        return nextErrors
      })
      setActiveInvitationId(null)
      router.refresh()
    })
  }

  if (visibleInvitations.length === 0) {
    return null
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {visibleInvitations.map((invitation) => (
        <Card key={invitation.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <CardTitle className="text-base break-all">{invitation.inviteeEmail}</CardTitle>
                <CardDescription>
                  {invitation.role} · {invitation.emailDelivered ? 'email delivered' : 'manual share needed'}
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => handleCancel(invitation.id)}
              >
                {pending && activeInvitationId === invitation.id ? 'Cancelling...' : 'Cancel'}
              </Button>
            </div>
            {errorByInvitationId[invitation.id] ? (
              <p className="text-destructive text-sm">{errorByInvitationId[invitation.id]}</p>
            ) : null}
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}