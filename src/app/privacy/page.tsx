import type { Metadata } from 'next'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageFlairShell } from '@/components/page-flair-shell'
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from '@/lib/support-contact'

export const metadata: Metadata = {
  title: 'Privacy Policy | SharedJournal',
  description: 'How SharedJournal collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  const lastUpdated = format(parseISO('2026-04-19'), 'MMMM d, yyyy')

  return (
    <PageFlairShell contentClassName="max-w-3xl space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">
          SharedJournal is designed for private, invitation-only journaling.
        </p>
        <p className="text-muted-foreground text-xs">Last updated: {lastUpdated}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>What we collect</CardTitle>
          <CardDescription>
            We collect only the information needed to operate SharedJournal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Account information from sign-in providers, including email and basic profile details.</p>
          <p>Journal content you create, including text, photos, and invitations you send.</p>
          <p>Basic usage telemetry used to improve app reliability and performance.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How we use data</CardTitle>
          <CardDescription>
            Data is used to provide core product features and keep the app secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Authenticate accounts and manage journal access controls.</p>
          <p>Store and display entries, photos, and collaborator activity.</p>
          <p>Detect abuse, troubleshoot errors, and improve performance.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sharing and retention</CardTitle>
          <CardDescription>
            We do not sell personal data. Data is shared only with service providers needed to run the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Service providers include authentication, hosting, analytics, and database infrastructure.</p>
          <p>Journal content remains private to journal members invited by the journal owner.</p>
          <p>
            You can request account-related support at{' '}
            <a href={SUPPORT_EMAIL_HREF} className="underline underline-offset-4 hover:no-underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment processing</CardTitle>
          <CardDescription>
            Support payments are processed by Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            When you choose to support SharedJournal, payment information is handled by Stripe, our
            payment processor.
          </p>
          <p>
            We store only basic payment records needed for account support history, such as amount,
            currency, and payment status.
          </p>
          <p>We do not store full card numbers or full payment instrument details.</p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        This is a general policy summary and is not legal advice. For questions, contact support.
      </p>
      <p className="text-muted-foreground text-xs">
        Return to <Link href="/" className="underline underline-offset-4 hover:no-underline">home</Link>.
      </p>
    </PageFlairShell>
  )
}
