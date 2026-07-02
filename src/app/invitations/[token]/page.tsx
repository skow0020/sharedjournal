import { SignInButton } from '@clerk/nextjs'
import type { ReactNode } from 'react'

import { acceptInvitationAction, declineInvitationAction } from '@/app/invitations/[token]/actions'
import { InvitationResponseActions } from '@/app/invitations/[token]/invitation-response-actions'
import { PageFlairShell } from '@/components/page-flair-shell'
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

function InvitationStateCard({ title, description }: { title: string; description: ReactNode }) {
  return (
    <PageFlairShell contentClassName="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </PageFlairShell>
  )
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params
  const invitationLookup = await getInvitationByToken(token)

  if (invitationLookup.state === 'not-found') {
    return (
      <InvitationStateCard
        title="Invitation not found"
        description="This invitation link is invalid or no longer exists."
      />
    )
  }

  if (invitationLookup.state === 'expired') {
    return (
      <InvitationStateCard
        title="Invitation expired"
        description={
          <>
            This invite to{' '}
            <span className="font-medium">{invitationLookup.invitation.journalTitle}</span> has
            expired.
          </>
        }
      />
    )
  }

  if (invitationLookup.state === 'unavailable') {
    return (
      <InvitationStateCard
        title="Invitation unavailable"
        description={
          <>
            This invitation for{' '}
            <span className="font-medium">{invitationLookup.invitation.journalTitle}</span> is no
            longer pending.
          </>
        }
      />
    )
  }

  const appUser = await getCurrentAppUser()
  const currentUserEmail = await getCurrentUserEmail()
  const requiresSignIn = !appUser || !currentUserEmail
  const emailMatchesInvite =
    !!currentUserEmail && currentUserEmail === invitationLookup.invitation.inviteeEmail

  return (
    <PageFlairShell contentClassName="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Journal invitation</CardTitle>
          <CardDescription>
            You were invited to join{' '}
            <span className="font-medium">{invitationLookup.invitation.journalTitle}</span> as an{' '}
            <span className="font-medium">{invitationLookup.invitation.role}</span>.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4 px-6 pb-6">
          <p className="text-muted-foreground text-sm">
            Invited email:{' '}
            <span className="font-medium">{invitationLookup.invitation.inviteeEmail}</span>
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
              You are signed in as <span className="font-medium">{currentUserEmail}</span>. Sign in
              with <span className="font-medium">{invitationLookup.invitation.inviteeEmail}</span>{' '}
              to accept this invite.
            </p>
          )}
        </div>
      </Card>
    </PageFlairShell>
  )
}
