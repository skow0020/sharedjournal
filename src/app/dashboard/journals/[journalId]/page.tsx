import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { OwnedPendingInvitations } from '@/app/dashboard/journals/[journalId]/owned-pending-invitations'
import {
  cancelPendingInvitationAction,
  cleanupEntryImageUploadsAction,
  createEntryAction,
  createInviteAction,
  updateJournalTitleAction,
} from '@/app/dashboard/journals/[journalId]/actions'
import { CollaboratorsAccordion } from '@/app/dashboard/journals/collaborators-accordion'
import { deleteJournalAction } from '@/app/dashboard/actions'
import { DeleteJournalButton } from '@/app/dashboard/delete-journal-button'
import { CreateEntryModal } from '@/app/dashboard/journals/[journalId]/create-entry-modal'
import { InviteUserModal } from '@/app/dashboard/journals/[journalId]/invite-user-modal'
import { JournalEntriesInfiniteLoader } from '@/app/dashboard/journals/[journalId]/journal-entries-infinite-loader'
import { JournalTitleEditor } from '@/app/dashboard/journals/[journalId]/journal-title-editor'
import { MobileOwnerActionsMenu } from '@/app/dashboard/journals/[journalId]/mobile-owner-actions-menu'
import {
  getJournalEntryCountForJournal,
  getJournalEntriesForJournal,
  type JournalEntryForJournal,
} from '@/data/entries'
import { buildEntryPhotoProxyUrl } from '@/lib/entry-image-storage'
import { EntryPhotoGallery } from '@/app/dashboard/journals/[journalId]/entry-photo-gallery'
import {
  getPendingInvitationsForOwnedJournal,
} from '@/data/invitations'
import { getCollaboratorsForJournal, getUserJournalById } from '@/data/journals'
import { getCurrentAppUser } from '@/lib/get-current-app-user'

type JournalDetailsPageProps = {
  params: Promise<{
    journalId: string
  }>
  searchParams?: Promise<{
    entriesPage?: string
  }>
}

const ENTRIES_PER_PAGE = 10

export default async function JournalDetailsPage({ params, searchParams }: JournalDetailsPageProps) {
  const appUser = await getCurrentAppUser()

  if (!appUser) {
    redirect('/sign-in')
  }

  const { journalId } = await params
  const journal = await getUserJournalById(appUser.id, journalId)

  if (!journal) {
    notFound()
  }

  const journalTitle = journal.title
  const canEditJournalTitle = journal.ownerUserId === appUser.id
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const parsedEntriesPage = Number.parseInt(resolvedSearchParams?.entriesPage ?? '1', 10)
  const currentEntriesPage = Number.isNaN(parsedEntriesPage) || parsedEntriesPage < 1
    ? 1
    : parsedEntriesPage

  const [totalEntryCount, entries] = await Promise.all([
    getJournalEntryCountForJournal(appUser.id, journalId),
    getJournalEntriesForJournal(appUser.id, journalId, {
      limit: currentEntriesPage * ENTRIES_PER_PAGE,
    }),
  ])
  const collaborators = await getCollaboratorsForJournal(appUser.id, journalId)
  const pendingInvitations = journal.isOwner
    ? await getPendingInvitationsForOwnedJournal({
        ownerUserId: appUser.id,
        journalId,
      })
    : []
  const hasMoreEntries = entries.length < totalEntryCount

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <section className="space-y-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Link
              href="/dashboard"
              className="text-muted-foreground mb-2 inline-block text-sm underline-offset-4 hover:underline"
            >
              Back to journals
            </Link>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <JournalTitleEditor
                  journalId={journalId}
                  title={journal.title}
                  canEdit={canEditJournalTitle}
                  action={updateJournalTitleAction}
                />
              </div>
              {journal.isOwner ? (
                <MobileOwnerActionsMenu
                  journalId={journalId}
                  action={deleteJournalAction}
                />
              ) : null}
            </div>
            {journal.description ? (
              <p className="text-muted-foreground text-sm">{journal.description}</p>
            ) : null}
            <div className="space-y-1">
              <CollaboratorsAccordion collaborators={collaborators} />
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:justify-end">
            <CreateEntryModal
              journalId={journalId}
              action={createEntryAction}
              cleanupAction={cleanupEntryImageUploadsAction}
            />
            {journal.isOwner ? (
              <InviteUserModal
                journalId={journalId}
                journalTitle={journalTitle}
                action={createInviteAction}
              />
            ) : null}
            {journal.isOwner ? (
              <div className="hidden sm:block">
                <DeleteJournalButton
                  journalId={journalId}
                  action={deleteJournalAction}
                  successRedirectTo="/dashboard"
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {pendingInvitations.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Pending invites</h2>
          <OwnedPendingInvitations
            invitations={pendingInvitations}
            journalId={journalId}
            cancelAction={cancelPendingInvitationAction}
          />
        </section>
      ) : null}

      <section className="space-y-3 border-t pt-2">
        <h2 className="text-xl font-semibold tracking-tight">Journal entries</h2>
        {entries.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No entries yet</CardTitle>
              <CardDescription>This journal does not have any entries yet.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid gap-3">
              {entries.map((entry: JournalEntryForJournal) => (
                <Card key={entry.id}>
                  <CardHeader>
                    <CardTitle>{entry.title || 'Untitled entry'}</CardTitle>
                    <CardDescription>
                      {format(parseISO(entry.entryDate), 'MMMM d, yyyy')} · {entry.authorName || 'Unknown author'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 whitespace-pre-wrap">{entry.content}</p>
                    {entry.photos.length > 0 ? (
                      <EntryPhotoGallery
                        photos={entry.photos.map((photo) => ({
                          id: photo.id,
                          src: buildEntryPhotoProxyUrl(entry.id, photo.id),
                        }))}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
            <JournalEntriesInfiniteLoader
              currentPage={currentEntriesPage}
              hasMore={hasMoreEntries}
            />
          </>
        )}
      </section>

    </main>
  )
}
