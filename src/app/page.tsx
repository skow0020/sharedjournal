import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <section className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">SharedJournal</h1>
        <p className="max-w-2xl text-muted-foreground">
          Keep a private journal, collaborate in shared journals, and quickly return to what matters.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Open dashboard
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Personal writing</CardTitle>
            <CardDescription>Capture your thoughts in your own journals.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Shared spaces</CardTitle>
            <CardDescription>Collaborate with invited members in shared journals.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Focused review</CardTitle>
            <CardDescription>Browse journals and entries with a clean dashboard flow.</CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  )
}
