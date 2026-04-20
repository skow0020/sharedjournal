import type { Metadata } from 'next'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Legal | SharedJournal',
  description: 'Legal policies and terms for SharedJournal users.',
}

export default function LegalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Legal</h1>
        <p className="text-muted-foreground text-sm">
          Legal policies for SharedJournal users in the United States.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>
              Learn what data SharedJournal collects and how it is used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/privacy" className="text-sm underline underline-offset-4 hover:no-underline">
              Read Privacy Policy
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
            <CardDescription>
              Review the terms that apply when using SharedJournal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/terms" className="text-sm underline underline-offset-4 hover:no-underline">
              Read Terms of Service
            </Link>
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Questions: <a href="mailto:skow0020@gmail.com" className="underline underline-offset-4 hover:no-underline">skow0020@gmail.com</a>
      </p>
    </main>
  )
}