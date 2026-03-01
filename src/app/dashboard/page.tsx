import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CreateJournalModal } from '@/app/dashboard/create-journal-modal'
import { createJournalForOwner } from '@/data/journals'
import { getUserJournals, type UserJournal } from '@/data/journals'
import { getCurrentAppUser } from '@/lib/get-current-app-user'

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

  async function createJournalAction(
    _prevState: { error: string | null },
    formData: FormData,
  ) {
    'use server'

    const currentUser = await getCurrentAppUser()

    if (!currentUser) {
      return {
        error: 'You must be signed in to create a journal.',
      }
    }

    const titleValue = formData.get('title')
    const descriptionValue = formData.get('description')

    const title = typeof titleValue === 'string' ? titleValue.trim() : ''
    const description = typeof descriptionValue === 'string' ? descriptionValue.trim() : ''

    if (!title) {
      return {
        error: 'Title is required.',
      }
    }

    const createdJournal = await createJournalForOwner({
      ownerUserId: currentUser.id,
      title,
      description: description || null,
    })

    redirect(`/dashboard/journals/${createdJournal.id}`)
  }

  const userJournals = await getUserJournals(appUser.id)

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Journals</h1>
          <CreateJournalModal action={createJournalAction} />
        </div>
      </section>

      {userJournals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No journals found</CardTitle>
            <CardDescription>You are not a member of any journals yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        userJournals.map((journal: UserJournal) => (
          <Link key={journal.id} href={`/dashboard/journals/${journal.id}`} className="block">
            <Card className="transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle>{journal.title}</CardTitle>
                <CardDescription>{journal.description || 'No description'}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))
      )}
    </main>
  )
}