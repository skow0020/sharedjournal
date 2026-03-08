import { format, parseISO } from 'date-fns'
import { currentUser as getClerkCurrentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

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
import { CreateEntryModal } from '@/app/dashboard/journals/[journalId]/create-entry-modal'
import { InviteUserModal } from '@/app/dashboard/journals/[journalId]/invite-user-modal'
import {
  createEntryForJournal,
  getJournalEntriesForJournal,
  type JournalEntryForJournal,
} from '@/data/entries'
import {
  createJournalInvitation,
  getPendingInvitationsForOwnedJournal,
  setInvitationEmailDeliveryFlag,
} from '@/data/invitations'
import { getCollaboratorsForJournal, getUserJournalById } from '@/data/journals'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { sendInviteEmail } from '@/lib/invitations/send-invite-email'

type JournalDetailsPageProps = {
  params: Promise<{
    journalId: string
  }>
}

type InviteActionState = {
  error: string | null
  successMessage: string | null
  inviteLink: string | null
}

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://sharedjournal.app'
  }

  return 'http://localhost:3000'
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

  async function createEntryAction(
    _prevState: { error: string | null },
    formData: FormData,
  ) {
    'use server'

    const currentUser = await getCurrentAppUser()

    if (!currentUser) {
      return {
        error: 'You must be signed in to create an entry.',
      }
    }

    const titleValue = formData.get('title')
    const contentValue = formData.get('content')
    const entryDateValue = formData.get('entryDate')

    const title = typeof titleValue === 'string' ? titleValue.trim() : ''
    const content = typeof contentValue === 'string' ? contentValue.trim() : ''
    const entryDate = typeof entryDateValue === 'string' ? entryDateValue.trim() : ''

    if (!content) {
      return {
        error: 'Content is required.',
      }
    }

    if (entryDate && !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return {
        error: 'Entry date is invalid.',
      }
    }

    const createdEntry = await createEntryForJournal({
      userId: currentUser.id,
      journalId,
      title: title || null,
      content,
      entryDate: entryDate || null,
    })

    if (!createdEntry) {
      return {
        error: 'You do not have permission to add entries to this journal.',
      }
    }

    redirect(`/dashboard/journals/${journalId}`)
  }

  async function createInviteAction(
    _prevState: InviteActionState,
    formData: FormData,
  ) {
    'use server'

    const currentUser = await getCurrentAppUser()

    if (!currentUser) {
      return {
        error: 'You must be signed in to invite users.',
        successMessage: null,
        inviteLink: null,
      }
    }

    const emailValue = formData.get('email')
    const email = typeof emailValue === 'string' ? emailValue.trim() : ''

    const result = await createJournalInvitation({
      inviterUserId: currentUser.id,
      journalId,
      inviteeEmail: email,
    })

    if (!result.ok) {
      return {
        error: result.message,
        successMessage: null,
        inviteLink: null,
      }
    }

    const inviteLinkPath = `/invitations/${result.inviteToken}`
    const inviteLink = `${getAppBaseUrl()}${inviteLinkPath}`
    const clerkUser = await getClerkCurrentUser()
    const inviterName = clerkUser?.fullName ?? clerkUser?.username ?? null

    // Email transport failures should not block invite creation.
    const emailSendResult = await sendInviteEmail({
      toEmail: result.inviteeEmail,
      inviteLink,
      journalTitle,
      inviterName,
    })

    const successMessage = emailSendResult.delivered
      ? `Invitation sent to ${result.inviteeEmail}.`
      : `Invitation created for ${result.inviteeEmail}. ${emailSendResult.message}`

    await setInvitationEmailDeliveryFlag({
      invitationId: result.invitationId,
      emailDelivered: emailSendResult.delivered,
    })

    return {
      error: null,
      successMessage,
      inviteLink,
    }
  }

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
            <h1 className="text-3xl font-semibold tracking-tight">{journal.title}</h1>
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
            <CreateEntryModal action={createEntryAction} />
            <InviteUserModal action={createInviteAction} />
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
