import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  acceptDashboardInvitationAction,
  createJournalAction,
  declineDashboardInvitationAction,
  deleteJournalAction,
} from '@/app/dashboard/actions'
import { CreateJournalModal } from '@/app/dashboard/create-journal-modal'
import { JournalCard } from '@/app/dashboard/journal-card'
import { PendingInvitationRow } from '@/app/dashboard/pending-invitation-row'
import { Button } from '@/components/ui/button'
import { getPendingInvitationsForEmail } from '@/data/invitations'
import {
  getCollaboratorsForJournals,
  getRecentPhotosForJournals,
  getUserJournalCount,
  getUserJournals,
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
    redirect('/sign-in')
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
  const collaboratorsByJournal = await getCollaboratorsForJournals(
    userJournals.map((journal) => journal.id),
  )
  const recentPhotosByJournal = await getRecentPhotosForJournals(
    userJournals.map((journal) => journal.id),
  )

  return (
    <main className="relative mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-[#74d9c5]/15 blur-3xl" />
        <div className="absolute bottom-0 -left-32 h-96 w-96 rounded-full bg-[#ff9a7f]/10 blur-3xl" />
      </div>
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Your Journals</h1>
          <CreateJournalModal action={createJournalAction} />
        </div>
      </section>

      {pendingInvitations.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            Pending invites
          </h2>
          <div className="grid gap-3">
            {pendingInvitations.map((invitation) => (
              <PendingInvitationRow
                key={invitation.id}
                invitation={invitation}
                acceptAction={acceptDashboardInvitationAction}
                declineAction={declineDashboardInvitationAction}
              />
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
            recentPhotos={recentPhotosByJournal.get(journal.id) ?? []}
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