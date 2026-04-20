import Link from 'next/link'
import { format, parseISO } from 'date-fns'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata = {
  title: 'Terms of Service | SharedJournal',
  description: 'Basic terms for using SharedJournal.',
}

export default function TermsPage() {
  const lastUpdated = format(parseISO('2026-04-19'), 'MMMM d, yyyy')

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground text-sm">
          By using SharedJournal, you agree to these basic terms.
        </p>
        <p className="text-muted-foreground text-xs">Last updated: {lastUpdated}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Acceptable use</CardTitle>
          <CardDescription>
            Use SharedJournal lawfully and respect other users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Do not use the service for unlawful, abusive, or unauthorized activity.</p>
          <p>Do not attempt to disrupt, reverse engineer, or compromise the service.</p>
          <p>You are responsible for content you create and share in journals.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounts and content</CardTitle>
          <CardDescription>
            Account access and journal permissions are controlled by authentication and invitation rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>You must keep your account credentials secure.</p>
          <p>Journal owners control collaborator access and invitations.</p>
          <p>You retain rights to your content, and grant SharedJournal permission to store and display it.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service terms</CardTitle>
          <CardDescription>
            SharedJournal is provided on an as-available basis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Features may change over time as the product evolves.</p>
          <p>We may suspend accounts that violate these terms.</p>
          <p>
            For support or legal questions, contact{' '}
            <a href="mailto:skow0020@gmail.com" className="underline underline-offset-4 hover:no-underline">
              skow0020@gmail.com
            </a>
            .
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        These terms are a baseline policy and are not legal advice.
      </p>
      <p className="text-muted-foreground text-xs">
        Return to <Link href="/" className="underline underline-offset-4 hover:no-underline">home</Link>.
      </p>
    </main>
  )
}
