import { format } from 'date-fns'
import Link from 'next/link'

import {
  CardContent,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createJournalAction, deleteJournalAction } from '@/app/dashboard/actions'
import { CreateJournalModal } from '@/app/dashboard/create-journal-modal'
import { DeleteJournalButton } from '@/app/dashboard/delete-journal-button'
import { getPendingInvitationsForEmail } from '@/data/invitations'
import { getUserJournals, type UserJournal } from '@/data/journals'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { getCurrentUserEmail } from '@/lib/get-current-user-email'

export default async function DashboardPage() {
  const appUser = await getCurrentAppUser()

  if (!appUser) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Journals</CardTitle>
            <CardDescription>Sign in to view your journals.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const userJournals = await getUserJournals(appUser.id)
  const currentUserEmail = await getCurrentUserEmail()
  const pendingInvitations = currentUserEmail
    ? await getPendingInvitationsForEmail(currentUserEmail)
    : []

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Journals</h1>
          <CreateJournalModal action={createJournalAction} />
        </div>
      </section>

      {pendingInvitations.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Pending invites</h2>
          <div className="grid gap-3">
            {pendingInvitations.map((invitation) => (
              <Link key={invitation.id} href={`/invitations/${invitation.inviteToken}`} className="block">
                <Card className="transition-colors hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle>{invitation.journalTitle}</CardTitle>
                    <CardDescription>
                      Invited as {invitation.role} · Expires {format(invitation.expiresAt, 'MMMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {userJournals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No journals found</CardTitle>
            <CardDescription>You are not a member of any journals yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        userJournals.map((journal: UserJournal) => (
          <Card key={journal.id} className="relative gap-3 transition-colors hover:bg-muted/40">
            <Link
              href={`/dashboard/journals/${journal.id}`}
              aria-label={`Open ${journal.title}`}
              className="focus-visible:ring-ring absolute inset-0 rounded-xl focus-visible:ring-2"
            />
            <CardHeader className="relative z-10 pointer-events-none">
              <CardTitle>{journal.title}</CardTitle>
              <CardDescription>{journal.description || 'No description'}</CardDescription>
            </CardHeader>
            {journal.isOwner ? (
              <CardContent className="relative z-20 pt-0 pointer-events-none">
                <div className="ml-auto w-fit pointer-events-auto">
                  <DeleteJournalButton journalId={journal.id} action={deleteJournalAction} />
                </div>
              </CardContent>
            ) : null}
          </Card>
        ))
      )}
    </main>
  )
}