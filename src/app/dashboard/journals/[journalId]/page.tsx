import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  cleanupEntryImageUploadsAction,
  createEntryAction,
  createInviteAction,
  updateJournalTitleAction,
} from '@/app/dashboard/journals/[journalId]/actions'
import { deleteJournalAction } from '@/app/dashboard/actions'
import { DeleteJournalButton } from '@/app/dashboard/delete-journal-button'
import { CreateEntryModal } from '@/app/dashboard/journals/[journalId]/create-entry-modal'
import { InviteUserModal } from '@/app/dashboard/journals/[journalId]/invite-user-modal'
import { JournalTitleEditor } from '@/app/dashboard/journals/[journalId]/journal-title-editor'
import {
  getJournalEntriesForJournal,
  type JournalEntryForJournal,
} from '@/data/entries'
import { buildEntryPhotoProxyUrl } from '@/lib/entry-image-storage'
import {
  getPendingInvitationsForOwnedJournal,
} from '@/data/invitations'
import { getCollaboratorsForJournal, getUserJournalById } from '@/data/journals'
import { getCurrentAppUser } from '@/lib/get-current-app-user'

type JournalDetailsPageProps = {
  params: Promise<{
    journalId: string
  }>
}

export default async function JournalDetailsPage({ params }: JournalDetailsPageProps) {
  const appUser = await getCurrentAppUser()

  if (!appUser) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Journal</CardTitle>
            <CardDescription>Sign in to view this journal.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const { journalId } = await params
  const journal = await getUserJournalById(appUser.id, journalId)

  if (!journal) {
    notFound()
  }

  const journalTitle = journal.title
  const canEditJournalTitle = journal.ownerUserId === appUser.id

  const entries = await getJournalEntriesForJournal(appUser.id, journalId)
  const collaborators = await getCollaboratorsForJournal(appUser.id, journalId)
  const pendingInvitations = await getPendingInvitationsForOwnedJournal({
    ownerUserId: appUser.id,
    journalId,
  })

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <section className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="text-muted-foreground mb-2 inline-block text-sm underline-offset-4 hover:underline"
            >
              Back to journals
            </Link>
            <JournalTitleEditor
              journalId={journalId}
              title={journal.title}
              canEdit={canEditJournalTitle}
              action={updateJournalTitleAction}
            />
            {journal.description ? (
              <p className="text-muted-foreground text-sm">{journal.description}</p>
            ) : null}
            <div className="space-y-1">
              <Accordion type="single" collapsible>
                <AccordionItem value="collaborators" className="border-none">
                  <AccordionTrigger className="text-muted-foreground py-1 text-sm font-medium hover:no-underline">
                    Collaborators ({collaborators.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    {collaborators.length > 0 ? (
                      <ul className="text-muted-foreground space-y-1 text-sm">
                        {collaborators.map((collaborator) => (
                          <li key={collaborator.id}>{collaborator.displayName || 'Unnamed user'}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">Not shared with anyone yet.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {journal.isOwner ? (
              <DeleteJournalButton
                journalId={journalId}
                action={deleteJournalAction}
                successRedirectTo="/dashboard"
              />
            ) : null}
            <CreateEntryModal
              journalId={journalId}
              action={createEntryAction}
              cleanupAction={cleanupEntryImageUploadsAction}
            />
            <InviteUserModal journalId={journalId} journalTitle={journalTitle} action={createInviteAction} />
          </div>
        </div>
      </section>

      {pendingInvitations.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Pending invites</h2>
          <div className="grid gap-3">
            {pendingInvitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardHeader>
                  <CardTitle className="text-base">{invitation.inviteeEmail}</CardTitle>
                  <CardDescription>
                    {invitation.role} · {invitation.emailDelivered ? 'email delivered' : 'manual share needed'}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
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
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {entry.photos.map((photo, index) => (
                        <Image
                          key={photo.id}
                          src={buildEntryPhotoProxyUrl(entry.id, photo.id)}
                          alt={`Entry image ${index + 1}`}
                          width={640}
                          height={480}
                          unoptimized
                          loading="lazy"
                          className="h-32 w-full rounded-md border object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
