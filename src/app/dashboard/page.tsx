import { format } from 'date-fns'
import Link from 'next/link'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createJournalAction, deleteJournalAction } from '@/app/dashboard/actions'
import { CreateJournalModal } from '@/app/dashboard/create-journal-modal'
import { JournalCard } from '@/app/dashboard/journal-card'
import { Button } from '@/components/ui/button'
import { getPendingInvitationsForEmail } from '@/data/invitations'
import {
  getCollaboratorsForJournal,
  getUserJournalCount,
  getUserJournals,
  type JournalCollaborator,
} from '@/data/journals'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { getCurrentUserEmail } from '@/lib/get-current-user-email'

const JOURNALS_PER_PAGE = 5

type DashboardPageProps = {
  searchParams?: Promise<{
    page?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const appUser = await getCurrentAppUser()

  if (!appUser) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Journals</CardTitle>
            <CardDescription>Sign in to view your journals.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const parsedPage = Number.parseInt(resolvedSearchParams?.page ?? '1', 10)
  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage

  const totalJournalCount = await getUserJournalCount(appUser.id)
  const totalPages = Math.max(1, Math.ceil(totalJournalCount / JOURNALS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const offset = (safePage - 1) * JOURNALS_PER_PAGE

  const userJournals = await getUserJournals(appUser.id, {
    limit: JOURNALS_PER_PAGE,
    offset,
  })
  const currentUserEmail = await getCurrentUserEmail()
  const pendingInvitations = currentUserEmail
    ? await getPendingInvitationsForEmail(currentUserEmail)
    : []
  const collaboratorsByJournal = new Map<string, JournalCollaborator[]>(
    await Promise.all(
      userJournals.map(async (journal) => {
        const collaborators = await getCollaboratorsForJournal(appUser.id, journal.id)
        return [journal.id, collaborators] as const
      }),
    ),
  )

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Your Journals</h1>
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
        userJournals.map((journal) => (
          <JournalCard
            key={journal.id}
            journal={journal}
            collaborators={collaboratorsByJournal.get(journal.id) ?? []}
            deleteAction={deleteJournalAction}
          />
        ))
      )}

      {totalPages > 1 ? (
        <section className="flex items-center justify-between gap-3 border-t pt-3">
          <p className="text-muted-foreground text-sm">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {safePage > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard?page=${safePage - 1}`}>Previous</Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            {safePage < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard?page=${safePage + 1}`}>Next</Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </section>
      ) : null}
    </main>
  )
}