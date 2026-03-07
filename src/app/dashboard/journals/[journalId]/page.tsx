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
import { CreateEntryModal } from '@/app/dashboard/journals/[journalId]/create-entry-modal'
import { InviteUserModal } from '@/app/dashboard/journals/[journalId]/invite-user-modal'
import {
  createEntryForJournal,
  getJournalEntriesForJournal,
  type JournalEntryForJournal,
} from '@/data/entries'
import { createJournalInvitation } from '@/data/invitations'
import { getUserJournalById } from '@/data/journals'
import { getCurrentAppUser } from '@/lib/get-current-app-user'

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

    return {
      error: null,
      successMessage: `Invitation created for ${result.inviteeEmail}. Email sending will be added next.`,
      inviteLink: `/invitations/${result.inviteToken}`,
    }
  }

  const entries = await getJournalEntriesForJournal(appUser.id, journalId)

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <section className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Link href="/dashboard" className="text-muted-foreground text-sm underline-offset-4 hover:underline">
              Back to journals
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">{journal.title}</h1>
            {journal.description ? (
              <p className="text-muted-foreground text-sm">{journal.description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <CreateEntryModal action={createEntryAction} />
            <InviteUserModal action={createInviteAction} />
          </div>
        </div>
      </section>

      {entries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No entries yet</CardTitle>
            <CardDescription>This journal does not have any entries yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        entries.map((entry: JournalEntryForJournal) => (
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
        ))
      )}
    </main>
  )
}
