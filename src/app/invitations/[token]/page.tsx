import { SignInButton } from '@clerk/nextjs'

import {
  acceptInvitationAction,
  declineInvitationAction,
} from '@/app/invitations/[token]/actions'
import { InvitationResponseActions } from '@/app/invitations/[token]/invitation-response-actions'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getInvitationByToken } from '@/data/invitations'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { getCurrentUserEmail } from '@/lib/get-current-user-email'

type InvitationPageProps = {
  params: Promise<{
    token: string
  }>
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params
  const invitationLookup = await getInvitationByToken(token)

  if (invitationLookup.state === 'not-found') {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>This invitation link is invalid or no longer exists.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  if (invitationLookup.state === 'expired') {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Invitation expired</CardTitle>
            <CardDescription>
              This invite to <span className="font-medium">{invitationLookup.invitation.journalTitle}</span> has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  if (invitationLookup.state === 'unavailable') {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Invitation unavailable</CardTitle>
            <CardDescription>
              This invitation for <span className="font-medium">{invitationLookup.invitation.journalTitle}</span> is no longer pending.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const appUser = await getCurrentAppUser()
  const currentUserEmail = await getCurrentUserEmail()
  const requiresSignIn = !appUser || !currentUserEmail
  const emailMatchesInvite =
    !!currentUserEmail
    && currentUserEmail === invitationLookup.invitation.inviteeEmail

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Journal invitation</CardTitle>
          <CardDescription>
            You were invited to join <span className="font-medium">{invitationLookup.invitation.journalTitle}</span> as an{' '}
            <span className="font-medium">{invitationLookup.invitation.role}</span>.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4 px-6 pb-6">
          <p className="text-muted-foreground text-sm">
            Invited email: <span className="font-medium">{invitationLookup.invitation.inviteeEmail}</span>
          </p>

          {requiresSignIn ? (
            <SignInButton mode="modal" forceRedirectUrl={`/invitations/${token}`}>
              <Button>Sign in to accept</Button>
            </SignInButton>
          ) : emailMatchesInvite ? (
            <InvitationResponseActions
              token={token}
              acceptAction={acceptInvitationAction}
              declineAction={declineInvitationAction}
            />
          ) : (
            <p className="text-destructive text-sm">
              You are signed in as <span className="font-medium">{currentUserEmail}</span>. Sign in with{' '}
              <span className="font-medium">{invitationLookup.invitation.inviteeEmail}</span> to accept this invite.
            </p>
          )}
        </div>
      </Card>
    </main>
  )
}
