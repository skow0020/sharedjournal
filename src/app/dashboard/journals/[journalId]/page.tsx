import { getCommentsForEntry } from '@/data/comments'
import { EntryComments } from './entry-comments'
import { format, parseISO } from 'date-fns'
import { ImagesIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OwnedPendingInvitations } from '@/app/dashboard/journals/[journalId]/owned-pending-invitations'
import {
  addCommentAction,
  cancelPendingInvitationAction,
  cleanupEntryImageUploadsAction,
  createEntryAction,
  createInviteAction,
  deleteEntryAction,
  updateJournalDetailsAction,
} from '@/app/dashboard/journals/[journalId]/actions'
import { CollaboratorsAccordion } from '@/app/dashboard/journals/collaborators-accordion'
import { deleteJournalAction } from '@/app/dashboard/actions'
import { CreateEntryModal } from '@/app/dashboard/journals/[journalId]/create-entry-modal'
import { DeleteEntryButton } from '@/app/dashboard/journals/[journalId]/delete-entry-button'
import { InviteUserModal } from '@/app/dashboard/journals/[journalId]/invite-user-modal'
import { JournalEntriesInfiniteLoader } from '@/app/dashboard/journals/[journalId]/journal-entries-infinite-loader'
import { OwnerActionsMenu } from '@/app/dashboard/journals/[journalId]/owner-actions-menu'
import { JournalTitleEditor } from '@/app/dashboard/journals/[journalId]/journal-title-editor'
import {
  getAllPhotosForJournal,
  getJournalEntryCountForJournal,
  getJournalEntriesForJournal,
  type JournalEntryForJournal,
} from '@/data/entries'
import { buildEntryPhotoProxyUrl } from '@/lib/entry-image-storage'
import { EntryPhotoGallery } from '@/app/dashboard/journals/[journalId]/entry-photo-gallery'
import { JournalSlideshow } from '@/app/dashboard/journals/[journalId]/journal-slideshow'
import {
  getPendingInvitationsForOwnedJournal,
} from '@/data/invitations'
import { getCollaboratorsForJournal, getUserJournalById } from '@/data/journals'
import { PageFlairBackdrop } from '@/components/page-flair-shell'
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
  const { journalId } = await params

  // Ignore extension-like path probes (e.g. browser installHook.js.map requests)
  // so they don't execute auth-dependent journal page logic.
  if (journalId.includes('.')) {
    notFound()
  }

  const appUser = await getCurrentAppUser()

  if (!appUser) {
    redirect('/sign-in')
  }

  const journal = await getUserJournalById(appUser.id, journalId)

  if (!journal) {
    notFound()
  }

  const journalTitle = journal.title
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const parsedEntriesPage = Number.parseInt(resolvedSearchParams?.entriesPage ?? '1', 10)
  const currentEntriesPage = Number.isNaN(parsedEntriesPage) || parsedEntriesPage < 1
    ? 1
    : parsedEntriesPage

  const [totalEntryCount, entries, allPhotos] = await Promise.all([
    getJournalEntryCountForJournal(appUser.id, journalId),
    getJournalEntriesForJournal(appUser.id, journalId, {
      limit: currentEntriesPage * ENTRIES_PER_PAGE,
    }),
    getAllPhotosForJournal(appUser.id, journalId),
  ])

  // Fetch comments for all entries (flat, not paginated)
  const entryCommentsMap = Object.fromEntries(
    await Promise.all(
      entries.map(async (entry) => [entry.id, await getCommentsForEntry(entry.id)] as const),
    ),
  )

  // Determine if user can comment (editor or owner)
  const canComment = journal.role === 'editor' || journal.role === 'owner'
  const collaborators = await getCollaboratorsForJournal(appUser.id, journalId)
  const pendingInvitations = journal.isOwner
    ? await getPendingInvitationsForOwnedJournal({
        ownerUserId: appUser.id,
        journalId,
      })
    : []
  const hasMoreEntries = entries.length < totalEntryCount

  return (
    <main className="relative mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <PageFlairBackdrop
        className="fixed inset-0 -z-10 overflow-hidden"
        topOrbClassName="-top-32 right-0 h-96 w-96 bg-[#86e6d3]/24"
        bottomOrbClassName="bottom-0 -left-32 h-96 w-96 bg-[#ffab92]/18"
      />
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
                  title={journal.title}
                />
              </div>
            </div>
            {journal.description ? (
              <p className="text-muted-foreground text-sm">{journal.description}</p>
            ) : null}
            <div className="space-y-1">
              <CollaboratorsAccordion collaborators={collaborators} />
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:justify-end">
            {allPhotos.length > 0 ? (
              <JournalSlideshow
                photos={allPhotos}
                trigger={
                  <Button type="button" variant="outline" size="sm">
                    <ImagesIcon className="size-4" aria-hidden />
                    <span className="sr-only sm:not-sr-only">Slideshow</span>
                  </Button>
                }
              />
            ) : null}
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
              <OwnerActionsMenu
                journalId={journalId}
                journalTitle={journal.title}
                journalDescription={journal.description}
                deleteAction={deleteJournalAction}
                updateAction={updateJournalDetailsAction}
              />
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
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <CardTitle>{entry.title || 'Untitled entry'}</CardTitle>
                        <CardDescription>
                          {format(parseISO(entry.entryDate), 'MMMM d, yyyy')} · {entry.authorName || 'Unknown author'}
                        </CardDescription>
                      </div>
                      {journal.isOwner || entry.authorUserId === appUser.id ? (
                        <DeleteEntryButton
                          journalId={journalId}
                          entryId={entry.id}
                          action={deleteEntryAction}
                        />
                      ) : null}
                    </div>
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
                    <EntryComments
                      entryId={entry.id}
                      journalId={journalId}
                      action={addCommentAction}
                      comments={entryCommentsMap[entry.id] || []}
                      canComment={canComment}
                    />
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
