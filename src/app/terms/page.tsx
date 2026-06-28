import type { Metadata } from 'next'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageFlairShell } from '@/components/page-flair-shell'
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from '@/lib/support-contact'

export const metadata: Metadata = {
  title: 'Terms of Service | SharedJournal',
  description: 'Basic terms for using SharedJournal.',
}

export default function TermsPage() {
  const lastUpdated = format(parseISO('2026-04-19'), 'MMMM d, yyyy')

  return (
    <PageFlairShell contentClassName="max-w-3xl space-y-6">
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
          <CardDescription>Use SharedJournal lawfully and respect other users.</CardDescription>
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
            Account access and journal permissions are controlled by authentication and invitation
            rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>You must keep your account credentials secure.</p>
          <p>Journal owners control collaborator access and invitations.</p>
          <p>
            You retain rights to your content, and grant SharedJournal permission to store and
            display it.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service terms</CardTitle>
          <CardDescription>SharedJournal is provided on an as-available basis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Features may change over time as the product evolves.</p>
          <p>We may suspend accounts that violate these terms.</p>
          <p>
            For support or legal questions, contact{' '}
            <a
              href={SUPPORT_EMAIL_HREF}
              className="underline underline-offset-4 hover:no-underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support payments and refunds</CardTitle>
          <CardDescription>Support payments are optional one-time contributions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Support payments help fund SharedJournal operations and are not tax-deductible
            charitable donations.
          </p>
          <p>
            Refund requests are reviewed case-by-case. Contact{' '}
            <a
              href={SUPPORT_EMAIL_HREF}
              className="underline underline-offset-4 hover:no-underline"
            >
              {SUPPORT_EMAIL}
            </a>{' '}
            with your payment details.
          </p>
          <p>
            Payment processing is handled by Stripe according to Stripe&apos;s terms and policies.
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        These terms are a baseline policy and are not legal advice.
      </p>
      <p className="text-muted-foreground text-xs">
        Return to{' '}
        <Link href="/" className="underline underline-offset-4 hover:no-underline">
          home
        </Link>
        .
      </p>
    </PageFlairShell>
  )
}
